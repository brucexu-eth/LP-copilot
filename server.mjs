import {createPositionPerformance} from './src/position-performance.mjs';
import {createPoolCatalog} from './src/pool-catalog.mjs';
import {createManagement} from './src/management.mjs';
import {createTestnet} from './src/testnet.mjs';
import {terminalChat} from './src/terminal-chat.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createAuth} from './src/auth.mjs';
import {historyFor,historyMode} from './src/history.mjs';
import {createWorkspace} from './src/workspace.mjs';
import {simulationService} from './src/simulation-http.mjs';
import {fundingQuote} from './src/funding.mjs';
import {walletBalances} from './src/wallets.mjs';
import {readdir} from 'node:fs/promises';
import {client,readPool,readPosition,readHistory,validateFresh,validatePositionId} from './src/data.mjs';
import {analyze,learningPosition} from './src/math.mjs';
const publicDir=new URL('./public/',import.meta.url);
const assets=new Map([['/graph-setup.html',['graph-setup.html','text/html']],['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
export function createApp(deps={readPool,readPosition,readHistory:historyFor,client}) {
 const testnet=deps.testnet||createTestnet();
 const performance=createPositionPerformance({testnet});
 const catalog=deps.catalog||createPoolCatalog();
 const management=deps.management||createManagement({testnet});
 const simulation=deps.simulation||simulationService();
 const graphMode=historyMode();
 const auth=deps.auth||createAuth();
 const workspace=deps.workspace||createWorkspace({compare:async({mode,tokenId})=>{
  if(mode==='nft')validatePositionId(tokenId);
  const state=await snapshot();
  const position=mode==='nft'?await deps.readPosition(tokenId,state,deps.client()):learningPosition(state);
  const result=analyze(state,position),history=await deps.readHistory(state);validateFresh(state.blockTimestamp);
  return {state,result,history,execution:'disabled'};
 }});
 let cached=null,loading=null;
 async function snapshot() {
  if(cached&&Date.now()-cached.at<30000) {validateFresh(cached.state.blockTimestamp);return cached.state;}
  if(!loading) loading=deps.readPool(deps.client()).then(state=>{cached={state,at:Date.now()};return state;}).finally(()=>{loading=null;});
  return loading;
 }
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://auth.privy.io https://api.privy.io https://explorer-api.walletconnect.com https://*.rpc.privy.systems https://sepolia.base.org; frame-src https://auth.privy.io; img-src 'self' data: https://auth.privy.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/terminal/')){
   try{
    if(!['GET','POST'].includes(req.method))return json(405,{error:'Method not allowed'});
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(403,{error:'Cross-origin request denied'});
    if(req.method==='GET'&&path==='/api/terminal/pools')return json(200,await catalog.discover());
    const account=await auth.session(req.headers.authorization);
    if(req.method==='GET'&&path==='/api/terminal/management/list')return json(200,{items:management.list(account)});
    if(req.method==='GET'&&path==='/api/terminal/state')return json(200,await testnet.state(account,new URL(req.url,'http://localhost').searchParams.get('wallet')));
    if(req.method!=='POST'||req.headers['content-type']!=='application/json')return json(400,{error:'JSON POST required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return json(413,{error:'Request too large'});}
    let input;try{input=JSON.parse(raw);}catch{return json(400,{error:'Invalid JSON'});}
    if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{error:'Invalid input'});
    if(path==='/api/terminal/management/authorize-operation')return json(200,await management.authorizeOperation(account,input.id));
    if(path==='/api/terminal/management/cleanup-check')return json(200,await management.cleanupCheck(account,input.id));
    if(path==='/api/terminal/performance')return json(200,await performance.get(account,input));
    if(path==='/api/terminal/management/session')return json(200,await management.proposal(account,input.id,true));
    if(path==='/api/terminal/management/proposal')return json(200,await management.proposal(account,input.id));
    if(path==='/api/terminal/management/signer')return json(200,await management.configureSigner(account,input.id));
    if(path==='/api/terminal/management/signer-status')return json(200,await management.signerStatus(account,input.id));
    if(path==='/api/terminal/management/activate')return json(200,await management.activate(account,input.id,input.trigger));
    if(path==='/api/terminal/management/signer-removed')return json(200,await management.signerRemoved(account,input.id));
    if(path==='/api/terminal/management/create')return json(200,await management.create(account,input));
    if(path==='/api/terminal/management/control')return json(200,await management.change(account,input.id,input.action));
    if(path==='/api/terminal/management/assess')return json(200,await management.assess(account,input.id,{force:input.force===true,reason:'operator-request'}));
    if(path==='/api/terminal/management/demo-execute')return json(200,await management.executeDemo(account,input.id));
    if(path==='/api/terminal/management/demo')return json(200,await management.assess(account,input.id,{force:true,demo:true,reason:'demo'}));
    if(path==='/api/terminal/management/simulate')return json(200,await management.simulate(account,input));
    if(path==='/api/terminal/preview')return json(200,await testnet.preview(account,input));
    if(path==='/api/terminal/prepare')return json(200,await testnet.prepare(account,input.id,input.index));
    if(path==='/api/terminal/intent')return json(200,await testnet.intent(account,input.id,input.index));
    if(path==='/api/terminal/discard'){testnet.getPlan(account,input.id);const m=management.list(account).find(m=>m.proposal?.plan.id===input.id);if(m&&m.status==='WATCHING')await management.change(account,m.id,'PAUSE');return json(200,await testnet.discard(account,input.id));}
    if(path==='/api/terminal/cancel')return json(200,await testnet.cancel(account,input.id,input.index));
    if(path==='/api/terminal/record')return json(200,await testnet.record(account,input.id,input.index,input.hash));
    if(path==='/api/terminal/reconcile')return json(200,await testnet.reconcile(account,input.id));
    if(path==='/api/terminal/chat'){
     let context=null;
     if(input.wallet&&input.tokenId){
      const live=await testnet.state(account,input.wallet),position=live.positions.find(p=>p.tokenId===input.tokenId);
      const monitor=management.list(account).find(m=>m.tokenId===input.tokenId&&!m.executionOnly);
      context={chain:'Base Sepolia testnet',price:live.state.price,block:live.state.blockNumber,position:position?{tokenId:position.tokenId,low:position.low,high:position.high,inRange:live.state.tick>=position.tickLower&&live.state.tick<position.tickUpper}:null,monitor:monitor?{status:monitor.status,mode:monitor.mode,execution:monitor.job?.status,lastDecision:monitor.assessments?.[0]?.result,expiresAt:monitor.expiresAt}:null};
     }
     return json(200,await terminalChat(input,{context}));
    }
    return json(404,{error:'Not found'});
   }catch(e){return json(e.expose?e.status:503,{error:e.expose?e.message:'Live request failed. No sample data was substituted. Retry or use the form controls.'});}
  }
  if(path==='/api/simulation')return simulation.handle(req,res,json);
  if(['/lab','/lab.js','/lab.css'].includes(path)){
   if(!simulation.allowed(req))return json(404,{error:'Not found'});
   if(req.method!=='GET')return json(405,{error:'GET required'});
   const file=path==='/lab'?'lab.html':path.slice(1);res.setHeader('Content-Type',path==='/lab'?'text/html; charset=utf-8':path.endsWith('.js')?'text/javascript':'text/css');
   try{res.end(await readFile(new URL(file,publicDir)));}catch{json(503,{error:'Simulation assets unavailable'});}return;
  }
  if(req.method==='GET'&&path==='/api/config') return json(200,{...auth.publicConfig(),graphMode,aiConfigured:workspace.configured(),simulationEnabled:process.env.ENABLE_SIMULATION_LAB==='1'});
  if(['/api/chat','/api/conversations','/api/funding-quote'].includes(path)){
   try{
    if(['/api/chat','/api/funding-quote'].includes(path)&&req.method!=='POST'||path==='/api/conversations'&&req.method!=='GET')return json(405,{error:'Method not allowed'});
    if(req.headers.origin&&req.headers.origin!==(process.env.APP_ORIGIN||`http://${req.headers.host}`))return json(403,{error:'Cross-origin request denied'});
    const account=await auth.session(req.headers.authorization);
    if(path==='/api/conversations')return json(200,{items:workspace.history(account.userId)});
    if(req.headers['content-type']!=='application/json')return json(415,{error:'application/json required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)return json(413,{error:'Request too large'});}
    let input;try{input=JSON.parse(raw);}catch{return json(400,{error:'Invalid JSON'});}
    if(path==='/api/funding-quote')return json(200,await (deps.fundingQuote||fundingQuote)(account,input));
    return json(200,await workspace.chat(account.userId,input));
   }catch(e){return json(e.expose===true&&[400,401,403,409,429,503].includes(e.status)?e.status:503,{error:e.expose===true&&[400,401,403,409,429,503].includes(e.status)?e.message:'Investigation unavailable. No result was substituted.'});}
  }
  if(path==='/api/wallets'){
   if(req.method!=='GET')return json(405,{error:'GET required'});
   try{const account=await auth.session(req.headers.authorization);return json(200,await (deps.walletBalances||walletBalances)(account.wallets));}
   catch(e){return json([401,403].includes(e.status)?e.status:503,{error:[401,403].includes(e.status)?e.message:'Wallet balances unavailable. Missing data is not zero.'});}
  }
  if(path==='/api/me') {
   if(req.method!=='GET') return json(405,{error:'GET required'});
   try {return json(200,await auth.session(req.headers.authorization));}
   catch(e) {return json([401,403,503].includes(e.status)?e.status:503,{error:[401,403,503].includes(e.status)?e.message:'Authentication unavailable.'});}
  }
  if(req.method==='GET'&&path.startsWith('/auth-assets/')) {
   const name=path.slice('/auth-assets/'.length);
   if(!/^[a-zA-Z0-9_.-]+\.(js|css)$/.test(name)) return json(404,{error:'Not found'});
   try {
    const dir=new URL('./public/auth-assets/',import.meta.url);
    if(!(await readdir(dir)).includes(name)) return json(404,{error:'Not found'});
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(new URL(name,dir)));return;
   } catch {return json(404,{error:'Auth assets unavailable. Run npm run build.'});}
  }
  if(req.method==='GET'&&path==='/api/health') return json(200,{ok:true,mode:'testnet-assisted',executionChainId:84532,version:'0.2.0'});
  if(req.method==='HEAD'&&assets.has(path)) {res.writeHead(200,{'Content-Type':assets.get(path)[1]});res.end();return;}
  if(req.method==='GET'&&assets.has(path)) {
   const [name,type]=assets.get(path);res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await readFile(new URL(name,publicDir)));return;
  }
  if(path!=='/api/analyze') return json(404,{error:'Not found'});
  if(req.method!=='POST') return json(405,{error:'POST required'});
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`) return json(403,{error:'Cross-origin request denied'});
  if(req.headers['content-type']!=='application/json') return json(415,{error:'application/json required'});
  let body='';
  try {
   for await(const chunk of req) {body+=chunk;if(body.length>2048) return json(413,{error:'Request too large'});}
   let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON'});}
   if(!input||!['learning','nft'].includes(input.mode)||Object.keys(input).some(k=>!['mode','tokenId'].includes(k))) return json(400,{error:'Choose learning or nft mode; no other parameters are accepted.'});
   if(input.mode==='nft') {try{validatePositionId(input.tokenId);}catch(e){return json(400,{error:e.message});}}
   const state=await snapshot();
   let position;
   if(input.mode==='nft') {
    try {position=await deps.readPosition(input.tokenId,state,deps.client());}
    catch {return json(422,{error:'Cannot load this NFT. Verify it exists in the supported USDC/WETH 0.3% pool and that the RPC is available.'});}
   } else position=learningPosition(state);
   let result;try {result=analyze(state,position);}catch {return json(422,{error:'Position has zero liquidity or an unsupported range; comparison cannot be calculated.'});}
   const history=await deps.readHistory(state);
   validateFresh(state.blockTimestamp);
   return json(200,{state,result,history,explanationMode:'Deterministic learning notes — no AI model is used in this iteration.',execution:'disabled'});
  } catch {
   // Never return provider errors: they can contain credential-bearing RPC URLs.
   return json(503,{error:'Live data unavailable or stale. No sample data was substituted. Check ETH_RPC_URL and retry.'});
  }
 });
 server.on('listening',()=>{simulation.start();if(deps.readPool===readPool)management.start();});
 server.on('close',()=>{workspace.close();simulation.close();management.close();testnet.close();});
 server.requestTimeout=20000;server.headersTimeout=10000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3400);
 if(!['127.0.0.1','localhost','::1'].includes(host)) throw new Error('This development MVP binds to loopback only. Public hosting needs a separate security review.');
 createApp().listen(port,host,()=>console.log(`LP Copilot Base Sepolia terminal: http://${host}:${port}`));
}
