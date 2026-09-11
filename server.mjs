import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createAuth} from './src/auth.mjs';
import {historyFor,historyMode} from './src/history.mjs';
import {createWorkspace} from './src/workspace.mjs';
import {simulationService} from './src/simulation-http.mjs';
import {walletBalances} from './src/wallets.mjs';
import {readdir} from 'node:fs/promises';
import {client,readPool,readPosition,readHistory,validateFresh,validatePositionId} from './src/data.mjs';
import {analyze,learningPosition} from './src/math.mjs';
const publicDir=new URL('./public/',import.meta.url);
const assets=new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
export function createApp(deps={readPool,readPosition,readHistory:historyFor,client}) {
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
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://auth.privy.io https://api.privy.io; frame-src https://auth.privy.io; img-src 'self' data: https://auth.privy.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/simulation')return simulation.handle(req,res,json);
  if(['/lab','/lab.js','/lab.css'].includes(path)){
   if(!simulation.allowed(req))return json(404,{error:'Not found'});
   if(req.method!=='GET')return json(405,{error:'GET required'});
   const file=path==='/lab'?'lab.html':path.slice(1);res.setHeader('Content-Type',path==='/lab'?'text/html; charset=utf-8':path.endsWith('.js')?'text/javascript':'text/css');
   try{res.end(await readFile(new URL(file,publicDir)));}catch{json(503,{error:'Simulation assets unavailable'});}return;
  }
  if(req.method==='GET'&&path==='/api/config') return json(200,{...auth.publicConfig(),graphMode,aiConfigured:workspace.configured()});
  if(['/api/chat','/api/conversations'].includes(path)){
   try{
    if(path==='/api/chat'&&req.method!=='POST'||path==='/api/conversations'&&req.method!=='GET')return json(405,{error:'Method not allowed'});
    if(req.headers.origin&&req.headers.origin!==(process.env.APP_ORIGIN||`http://${req.headers.host}`))return json(403,{error:'Cross-origin request denied'});
    const account=await auth.session(req.headers.authorization);
    if(path==='/api/conversations')return json(200,{items:workspace.history(account.userId)});
    if(req.headers['content-type']!=='application/json')return json(415,{error:'application/json required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)return json(413,{error:'Request too large'});}
    let input;try{input=JSON.parse(raw);}catch{return json(400,{error:'Invalid JSON'});}
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
  if(req.method==='GET'&&path==='/api/health') return json(200,{ok:true,mode:'read-only',version:'0.1.0'});
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
 server.on('listening',()=>simulation.start());
 server.on('close',()=>{workspace.close();simulation.close();});
 server.requestTimeout=20000;server.headersTimeout=10000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3400);
 if(!['127.0.0.1','localhost','::1'].includes(host)) throw new Error('This development MVP binds to loopback only. Public hosting needs a separate security review.');
 createApp().listen(port,host,()=>console.log(`LP Copilot read-only workbench: http://${host}:${port}`));
}
