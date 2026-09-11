import {openStore} from './store.mjs';
import {createAgent} from './agent.mjs';
import {resolve} from 'node:path';
export function createWorkspace({env=process.env,compare,store,agent}={}){
 const model=agent||createAgent({env,compare});let db=store,active=0;
 const getStore=()=>db??=openStore(resolve(env.LP_DATA_DIR||'./data','workspace.sqlite'));
 return {
  configured:()=>model.configured(),
  history:(userId)=>getStore().history(userId),
  async chat(userId,input){
   if(!input||Object.keys(input).sort().join(',')!=='question,requestId'||typeof input.question!=='string'||!input.question.trim()||input.question.length>4000||typeof input.requestId!=='string')throw Object.assign(Error('Provide question and requestId only.'),{status:400,expose:true});
   if(!model.configured())throw Object.assign(Error('DeepSeek is not configured. No mock AI answer was substituted.'),{status:503,expose:true});
   if(active>=2)throw Object.assign(Error('Investigation capacity reached. Retry later.'),{status:429,expose:true});
   const s=getStore(),previous=s.history(userId).filter(x=>x.state==='COMPLETE').slice(-4).flatMap(x=>[{role:'user',content:x.question},{role:'assistant',content:x.result.answer}]);
   const {cached}=s.begin(userId,input.requestId,input.question);if(cached)return cached;
   active++;
   try{const result=await model.run(input.question,previous);s.finish(userId,input.requestId,result);return result;}
   catch(e){s.fail(userId,input.requestId);throw e;}
   finally{active--;}
  },
  close:()=>db?.close(),
 };
}
