import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {client,readPool,readPosition,readHistory,validateFresh,validatePositionId} from './src/data.mjs';
import {analyze,learningPosition} from './src/math.mjs';
const publicDir=new URL('./public/',import.meta.url);
const assets=new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
export function createApp(deps={readPool,readPosition,readHistory,client}) {
 let cached=null,loading=null;
 async function snapshot() {
  if(cached&&Date.now()-cached.at<30000) {validateFresh(cached.state.blockTimestamp);return cached.state;}
  if(!loading) loading=deps.readPool(deps.client()).then(state=>{cached={state,at:Date.now()};return state;}).finally(()=>{loading=null;});
  return loading;
 }
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&path==='/api/health') return json(200,{ok:true,mode:'read-only',version:'0.1.0'});
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
 server.requestTimeout=20000;server.headersTimeout=10000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3400);
 if(!['127.0.0.1','localhost','::1'].includes(host)) throw new Error('This development MVP binds to loopback only. Public hosting needs a separate security review.');
 createApp().listen(port,host,()=>console.log(`LP Copilot read-only workbench: http://${host}:${port}`));
}
