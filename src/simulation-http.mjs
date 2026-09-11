import {openSimulation} from './simulation.mjs';
import {resolve} from 'node:path';
export function simulationService({enabled=process.env.ENABLE_SIMULATION_LAB==='1',path=resolve(process.env.SIMULATION_DB_PATH||'data/simulation.sqlite'),interval=1000,store}={}){
 let db=null,timer=null,fault=false;
 const local=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&['127.0.0.1','localhost','[::1]'].includes(new URL(`http://${req.headers.host}`).hostname);
 const get=()=>db||(db=store||openSimulation(path));
 const session=req=>{const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('lp_sim='));return cookie?.slice(7);};
 return {
  enabled,
  start(){if(!enabled||timer)return;get();timer=setInterval(()=>{try{db.tick();}catch{fault=true;clearInterval(timer);timer=null;console.error('Simulation worker stopped: internal storage error. No live execution exists.');}},interval);timer.unref();},
  close(){if(timer)clearInterval(timer);timer=null;db?.close();db=null;},
  allowed(req){try{return enabled&&local(req);}catch{return false;}},
  async handle(req,res,json){
   if(!this.allowed(req))return json(404,{error:'Not found'});
   if(!['GET','POST'].includes(req.method))return json(405,{error:'GET or POST required'});
   const allowedOrigin=`http://${req.headers.host}`;
   if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!==allowedOrigin)return json(403,{error:'Cross-origin request denied'});
   try{
    let id=session(req);
    // GET never creates a workspace. Explicit POST INIT establishes a local-only mock session.
    if(req.method==='GET'){if(!id)return json(401,{error:'Start a simulation first'});return json(200,{...get().get(id),workerStatus:fault?'FAILED':'RUNNING'});}
    if(req.headers['content-type']!=='application/json')return json(415,{error:'application/json required'});
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return json(413,{error:'Request too large'});}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON'});}
    if(input?.action==='INIT'){
     if(Object.keys(input).some(k=>k!=='action'))return json(400,{error:'Unexpected INIT field'});
     if(id)get().get(id);else{id=get().create();res.setHeader('Set-Cookie',`lp_sim=${id}; HttpOnly; SameSite=Strict; Path=/api/simulation; Max-Age=2592000`);}
     return json(200,{...get().get(id),workerStatus:fault?'FAILED':'RUNNING'});
    }
    if(!id)return json(401,{error:'Start a simulation first'});
    if(fault)return json(503,{error:'Simulation worker failed; restart only after checking local storage'});
    return json(200,{...get().command(id,input),workerStatus:'RUNNING'});
   }catch(e){return json(e.simulationError?400:503,{error:e.simulationError?e.message:'Simulation storage unavailable'});}
  },
 };
}
