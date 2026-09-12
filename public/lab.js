const $=s=>document.querySelector(s);let current=null,poll=null,busy=false;
const dollars=c=>(c/100).toFixed(2),cents=s=>Math.round(Number(s)*100);
async function api(input){const r=await fetch('/api/simulation',input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{});const body=await r.json();if(!r.ok)throw Error(body.error||'Request failed');return body;}
function render(s){if(current&&s.sequence<current.sequence)return;current=s;$('#connection').textContent=`SIMULATION ONLY · worker ${s.workerStatus} · 不含任何真实资金`;
 $('#balances').textContent=`模拟现金 $${dollars(s.cash)} | 模拟 LP $${dollars(s.deployed)} | 虚构待领费 $${dollars(s.unclaimed)}\n累计模拟入金 $${dollars(s.funded)} | 模拟费用支出 $${dollars(s.feesSpent)} | 合成价格 $${s.price}`;
 $('#policy-status').textContent=s.policy?`MOCK ${s.policy.status==='ACTIVE'&&s.policy.expiresAt<=Date.now()?'EXPIRED':s.policy.status} · 到期 ${new Date(s.policy.expiresAt).toLocaleString()} · 已用 ${s.dailyCount}/${s.policy.maxDaily} 次；不授予真实 signer 权限`:'尚无模拟策略';
 $('#job').textContent=s.job?`${s.job.id} · ${s.job.kind} · ${s.job.status}\n已完成 ${s.job.phase}/${s.job.phases.length} 个模拟阶段：${s.job.phases.join(' → ')}${s.job.reason?'\n'+s.job.reason:''}`:'尚无任务';
 $('#plan-summary').textContent=s.plan?`MOCK v${s.plan.version} · ${s.plan.status} · ${s.plan.source}\n投入 $${dollars(s.plan.amount)} · 区间 ${s.plan.range.lower}–${s.plan.range.upper}\n${s.plan.reason}`:'暂无方案';
 $('#position-summary').textContent=s.deployed?`模拟仓位 #${s.positionNumber} · $${dollars(s.deployed)} · 区间 ${s.range?.lower}–${s.range?.upper}；暂停管理不等于退出仓位`:'当前无模拟仓位';
 $('#confirm-plan').disabled=s.plan?.status!=='DRAFT';$('#execute-plan').disabled=s.plan?.status!=='CONFIRMED';
 $('#events').replaceChildren(...s.events.slice().reverse().map(e=>{const li=document.createElement('li');li.textContent=`#${e.sequence} ${e.event}: ${e.detail}`;return li;}));}
async function refresh(){try{render(await api());}catch(e){$('#connection').textContent='连接异常：显示的旧状态可能已过期';$('#error').textContent=e.message;}}
async function send(input){if(busy)return;busy=true;$('#error').textContent='';try{render(await api(input.action==='INIT'?input:{requestId:crypto.randomUUID(),...input}));if(!poll)poll=setInterval(refresh,1000);}catch(e){$('#error').textContent=e.message;}finally{busy=false;}}
$('#plan-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);send({action:'DRAFT',amount:cents(f.get('amount')),lower:Number(f.get('lower')),upper:Number(f.get('upper')),reason:f.get('reason')});};
$('#confirm-plan').onclick=()=>send({action:'CONFIRM_PLAN',version:current?.plan?.version});
$('#execute-plan').onclick=()=>send({action:'EXECUTE_PLAN',version:current?.plan?.version});
$('#start').onclick=()=>send({action:'INIT'});
$('#policy-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);send({action:'POLICY',maxCapital:cents(f.get('maxCapital')),maxFee:cents(f.get('maxFee')),maxDaily:Number(f.get('maxDaily')),maxSlippageBps:Number(f.get('maxSlippageBps')),expiresInMinutes:Number(f.get('expiresInMinutes')),automatic:f.has('automatic')});};
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>{const action=button.dataset.action,input={action};if(action==='FUND')input.amount=cents($('#fund').value);if(['ENTER','INCREASE','DECREASE'].includes(action))input.amount=cents($('#capital').value);if(action==='PRICE')input.price=Number($('#price').value);if(action==='FAIL')input.phase=$('#phase').value;send(input);};
window.addEventListener('pagehide',()=>{if(poll)clearInterval(poll);poll=null;});
api().then(s=>{render(s);poll=setInterval(refresh,1000);}).catch(()=>{});
