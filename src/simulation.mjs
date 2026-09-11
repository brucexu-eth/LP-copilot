// Offline synthetic ledger: intentionally imports no RPC, wallet, signer or quote SDK.
import Database from 'better-sqlite3';
import {mkdirSync,chmodSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
const fail=message=>Object.assign(Error(message),{simulationError:true});
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const active=s=>s.job&&['QUEUED','RUNNING','BLOCKED'].includes(s.job.status);
const fee=200; // Synthetic fixed $2, NOT a gas estimate or LI.FI quote.
function log(s,event,detail){s.events.push({sequence:++s.sequence,event,detail,at:s.now,source:'SIMULATION'});s.events=s.events.slice(-100);}
function assertLedger(s){if(![s.cash,s.deployed,s.unclaimed,s.funded,s.feesAccrued,s.feesSpent].every(x=>integer(x,0,1e12))||s.cash+s.deployed+s.unclaimed+s.feesSpent!==s.funded+s.feesAccrued)throw Error('Synthetic ledger invariant failed');}
function initial(now){return {mode:'SIMULATION',realExecution:false,now,cash:0,deployed:0,unclaimed:0,funded:0,feesAccrued:0,feesSpent:0,price:3000,range:null,policy:null,policyVersion:0,job:null,sequence:0,positionNumber:0,events:[],actions:0,lastActionAt:0,day:Math.floor(now/86400000),dailyCount:0,lastMonitorAt:0};}
function policyGate(s,job){
 const p=s.policy;if(!p||p.status!=='ACTIVE')return 'Policy is paused, revoked or absent';
 if(p.expiresAt<=s.now)return 'Policy expired';
 if(p.version!==job.policyVersion)return 'Policy changed: review this job';
 if(job.amount>p.maxCapital||(['ENTER','INCREASE'].includes(job.kind)&&s.deployed+job.amount>p.maxCapital))return 'Capital limit exceeded';
 if(job.fee>p.maxFee)return 'Fee limit exceeded';
 if(Math.floor(s.now/86400000)!==s.day){s.day=Math.floor(s.now/86400000);s.dailyCount=0;}
 if(s.dailyCount>=p.maxDaily)return 'Daily action limit reached';
 if(Math.abs(s.price-job.quotePrice)*10000>job.quotePrice*p.maxSlippageBps)return 'Synthetic price changed beyond policy slippage';
 return null;
}
function queue(s,kind,amount=0,automatic=false){
 if(active(s))throw fail('Finish or recover the current job first');
 if(['ENTER','INCREASE'].includes(kind)&&(!integer(amount,100,1000000)||s.cash<amount+fee))throw fail('Insufficient simulated cash, including fixed $2 fee');
 if(kind==='ENTER'&&s.deployed)throw fail('A simulated position already exists');
 if(['INCREASE','DECREASE','EXIT','REBALANCE'].includes(kind)&&!s.deployed)throw fail('No simulated position');
 if(kind==='DECREASE'&&(!integer(amount,1,s.deployed)||amount===s.deployed))throw fail('Choose a partial amount or use EXIT');
 if(kind==='COLLECT'&&!s.unclaimed)throw fail('No simulated unclaimed fees');
 if(['EXIT','REBALANCE'].includes(kind))amount=s.deployed;
 const phases={FUND:['QUOTE','BRIDGE'],ENTER:['QUOTE','SWAP','MINT'],INCREASE:['INCREASE'],DECREASE:['DECREASE'],COLLECT:['COLLECT'],EXIT:['REMOVE','COLLECT'],REBALANCE:['REMOVE','COLLECT','QUOTE','SWAP','MINT']}[kind];
 if(!phases)throw fail('Unsupported simulation action');
 const job={id:`sim-job-${s.sequence+1}`,kind,amount,automatic,status:'QUEUED',phase:0,phases,policyVersion:s.policy?.version,quotePrice:s.price,fee:['FUND','COLLECT','EXIT','DECREASE'].includes(kind)?0:fee,failAt:null,failureInjected:false};
 if(kind!=='FUND'){const reason=policyGate(s,job);if(reason)throw fail(reason);}
 s.job=job;log(s,'JOB_QUEUED',`${kind}: mock adapter only; no signature or transaction hash`);
}
function command(s,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['requestId','action','amount','price','maxCapital','maxFee','maxDaily','maxSlippageBps','expiresInMinutes','automatic','phase'].includes(k)))throw fail('Unsupported command fields');
 const {action}=input;
 const fields={FUND:['amount'],ENTER:['amount'],INCREASE:['amount'],DECREASE:['amount'],COLLECT:[],EXIT:[],REBALANCE:[],POLICY:['maxCapital','maxFee','maxDaily','maxSlippageBps','expiresInMinutes','automatic'],PAUSE:[],REVOKE:[],RESUME:[],RECOVER:[],PRICE:['price'],ACCRUE:[],FAIL:['phase']};
 if(typeof action!=='string'||!Object.hasOwn(fields,action)||Object.keys(input).some(k=>!['requestId','action',...fields[action]].includes(k)))throw fail('Unexpected parameters for action');
 if(action==='POLICY'){
  if(active(s))throw fail('Recover or finish the job before changing policy');
  if(!integer(input.maxCapital,100,1000000)||!integer(input.maxFee,0,10000)||!integer(input.maxDaily,1,20)||!integer(input.maxSlippageBps,1,500)||!integer(input.expiresInMinutes,1,1440)||typeof input.automatic!=='boolean')throw fail('Invalid simulation policy limits');
  s.policy={status:'ACTIVE',version:++s.policyVersion,maxCapital:input.maxCapital,maxFee:input.maxFee,maxDaily:input.maxDaily,maxSlippageBps:input.maxSlippageBps,expiresAt:s.now+input.expiresInMinutes*60000,automatic:input.automatic,signer:'MOCK — no Privy permission'};log(s,'POLICY_ACTIVE','Simulation-only approval; does not grant real authority');
 }else if(['PAUSE','REVOKE'].includes(action)){
  if(!s.policy)throw fail('No policy');s.policy.status=action==='PAUSE'?'PAUSED':'REVOKED';
  if(active(s)){s.job.status='BLOCKED';s.job.reason='Policy '+s.policy.status;}log(s,action,'Further simulated steps stopped; completed steps remain in ledger');
 }else if(action==='RESUME'){
  if(!s.job||s.job.status!=='BLOCKED')throw fail('No blocked job');
  // A revoked/expired policy is never silently reactivated by retry.
  const reason=s.job.kind==='FUND'?null:policyGate(s,s.job);if(reason)throw fail(reason);
  s.job.status='RUNNING';s.job.reason=null;log(s,'RESUME','Continue from next uncommitted phase, not from the beginning');
 }else if(action==='RECOVER'){
  if(!active(s))throw fail('No unfinished job');s.job.status='CANCELLED';s.job.reason='User cancelled; keep current simulated balances';log(s,'RECOVER','No rollback fiction: deployed capital, cash and unclaimed fees remain where the completed steps left them');
 }else if(action==='PRICE'){
  if(!integer(input.price,100,100000))throw fail('Invalid synthetic price');s.price=input.price;log(s,'PRICE','User-supplied synthetic price, not a market feed');
 }else if(action==='ACCRUE'){
  if(!s.deployed)throw fail('No simulated position');s.unclaimed+=300;s.feesAccrued+=300;log(s,'FEES','Fixture adds $3, NOT measured yield or a forecast');
 }else if(action==='FAIL'){
  if(!active(s)||!s.job.phases.slice(s.job.phase).includes(input.phase))throw fail('Choose a remaining phase');s.job.failAt=input.phase;log(s,'FAILURE_ARMED',input.phase);
 }else{
  if(action==='FUND'&&!integer(input.amount,100,1000000))throw fail('Funding must be 100..1000000 synthetic cents');
  queue(s,action,input.amount||0);
 }
 assertLedger(s);
}
function advance(s){
 const j=s.job;
 if(j&&['QUEUED','RUNNING'].includes(j.status)){
  const reason=j.kind==='FUND'?null:policyGate(s,j);if(reason){j.status='BLOCKED';j.reason=reason;log(s,'BLOCKED',reason);return;}
  const phase=j.phases[j.phase];
  if(j.failAt===phase&&!j.failureInjected){j.failureInjected=true;j.status='BLOCKED';j.reason=`Injected mock ${phase} failure`;log(s,'BLOCKED',j.reason);return;}
  if(['MINT','INCREASE'].includes(phase)&&s.cash<j.amount+j.fee){j.status='BLOCKED';j.reason='Insufficient simulated cash at execution';log(s,'BLOCKED',j.reason);return;}
  if(phase==='BRIDGE'){s.cash+=j.amount;s.funded+=j.amount;}
  if(phase==='REMOVE'){s.cash+=s.deployed;s.deployed=0;s.range=null;}
  if(phase==='COLLECT'){s.cash+=s.unclaimed;s.unclaimed=0;}
  if(phase==='DECREASE'){s.cash+=j.amount;s.deployed-=j.amount;}
  if(['MINT','INCREASE'].includes(phase)){s.cash-=j.amount+j.fee;s.deployed+=j.amount;s.feesSpent+=j.fee;if(phase==='MINT'){s.positionNumber++;s.range={lower:Math.floor(s.price*.9),upper:Math.ceil(s.price*1.1)};}}
  log(s,'PHASE_COMMITTED',`${j.id} ${phase} — SYNTHETIC; quote/swap/bridge are fixture transitions`);
  j.phase++;j.status=j.phase===j.phases.length?'COMPLETE':'RUNNING';
  if(j.status==='COMPLETE'){if(j.kind!=='FUND')s.dailyCount++;s.lastActionAt=s.now;log(s,'JOB_COMPLETE',j.id);}
 }else if(!active(s)&&s.policy?.status==='ACTIVE'&&s.policy.automatic&&s.policy.expiresAt>s.now&&s.deployed&&s.now-s.lastActionAt>=60000&&s.range&&(s.price<s.range.lower||s.price>s.range.upper)){
  // Deliberately deterministic mock observer. No AI timing or live trading.
  s.lastMonitorAt=s.now;
  try{queue(s,'REBALANCE',s.deployed,true);}catch(e){if(!e.simulationError)throw e;if(s.events.at(-1)?.detail!==e.message)log(s,'MONITOR_SKIPPED',e.message);}
 }
 assertLedger(s);
}
export function openSimulation(path,{clock=Date.now}={}){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new Database(path);if(path!==':memory:')chmodSync(path,0o600);
 db.pragma('journal_mode=WAL');db.pragma('synchronous=FULL');db.pragma('busy_timeout=3000');db.pragma('foreign_keys=ON');
 db.transaction(()=>{db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY)');db.exec(readFileSync(new URL('../migrations/002_simulation.sql',import.meta.url),'utf8'));})();
 const get=id=>{if(typeof id!=='string'||! /^[a-f0-9]{48}$/.test(id))throw fail('Unknown simulation session');const row=db.prepare('SELECT state_json FROM simulation_sessions WHERE id=?').get(id);if(!row)throw fail('Unknown simulation session');return JSON.parse(row.state_json);};
 const save=(id,s)=>db.prepare('UPDATE simulation_sessions SET state_json=?,updated_at=? WHERE id=?').run(JSON.stringify(s),clock(),id);
 return {
  close:()=>db.close(),
  create:db.transaction(()=>{if(db.prepare('SELECT COUNT(*) n FROM simulation_sessions').get().n>=200)throw fail('Local lab capacity reached');const id=randomBytes(24).toString('hex'),s=initial(clock());log(s,'CREATED','Separate synthetic workspace — no credentials, wallets or real balances');db.prepare('INSERT INTO simulation_sessions VALUES(?,?,?)').run(id,JSON.stringify(s),clock());return id;}).immediate,
  get,
  command:db.transaction((id,input)=>{
   const s=get(id);s.now=clock();if(!input||typeof input.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.requestId))throw fail('UUID v4 request ID required');
   const canonical=JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a],[b])=>a.localeCompare(b))));
   const old=db.prepare('SELECT command_json FROM simulation_requests WHERE session_id=? AND request_id=?').get(id,input.requestId);
   if(old){if(old.command_json!==canonical)throw fail('Request ID cannot be reused for another command');return s;}
   if(s.actions>=5000)throw fail('Local session action limit reached');command(s,input);s.actions++;
   db.prepare('INSERT INTO simulation_requests VALUES(?,?,?)').run(id,input.requestId,canonical);save(id,s);return s;
  }).immediate,
  tick:db.transaction(()=>{
   const rows=db.prepare('SELECT id,state_json FROM simulation_sessions LIMIT 200').all();
   for(const row of rows){const s=JSON.parse(row.state_json),before=s.sequence;s.now=clock();advance(s);if(s.sequence!==before)save(row.id,s);}
  }).immediate,
 };
}
