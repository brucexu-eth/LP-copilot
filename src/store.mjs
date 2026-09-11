import Database from 'better-sqlite3';
import {mkdirSync,chmodSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
const fail=(status,message)=>Object.assign(Error(message),{status,expose:true});
export function openStore(path){
 if(path!==':memory:'){mkdirSync(dirname(path),{recursive:true,mode:0o700});}
 const db=new Database(path);if(path!==':memory:')chmodSync(path,0o600);
 db.pragma('journal_mode = WAL');db.pragma('synchronous = FULL');db.pragma('busy_timeout = 3000');
 db.transaction(()=>db.exec(readFileSync(new URL('../migrations/001_workspace.sql',import.meta.url),'utf8')))();
 const list=db.prepare("SELECT request_id,question,state,result_json,created_at,updated_at FROM chat_requests WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20");
 return {
  close:()=>db.close(),
  history(userId){return list.all(userId).reverse().map(r=>({requestId:r.request_id,question:r.question,state:r.state==='RUNNING'&&Date.now()-r.updated_at>90000?'INTERRUPTED':r.state,result:r.result_json?JSON.parse(r.result_json):null,createdAt:r.created_at}));},
  begin:db.transaction((userId,id,question)=>{
   if(!/^did:privy:[A-Za-z0-9_-]+$/.test(userId)||! /^[0-9a-f-]{36}$/.test(id))throw fail(400,'Invalid request identity.');
   const old=db.prepare('SELECT * FROM chat_requests WHERE user_id=? AND request_id=?').get(userId,id);
   if(old){
    if(old.question!==question)throw fail(409,'Request ID already belongs to a different question.');
    if(old.state==='COMPLETE')return {cached:JSON.parse(old.result_json)};
    if(old.state==='RUNNING'&&Date.now()-old.updated_at<=90000)throw fail(409,'This request is already running. Refresh history.');
    throw fail(409,'Prior request failed or was interrupted. Submit with a new request ID.');
   }
   if(db.prepare("SELECT 1 FROM chat_requests WHERE user_id=? AND state='RUNNING' AND updated_at>? LIMIT 1").get(userId,Date.now()-90000))throw fail(409,'Another request is running for this account.');
   const count=db.prepare('SELECT COUNT(*) AS n FROM chat_requests WHERE user_id=? AND created_at>?').get(userId,Date.now()-3600000).n;
   if(count>=20)throw fail(429,'Hourly investigation limit reached.');
   const now=Date.now();db.prepare("INSERT INTO chat_requests(user_id,request_id,question,state,created_at,updated_at) VALUES(?,?,?,'RUNNING',?,?)").run(userId,id,question,now,now);return {cached:null};
  }),
  finish(userId,id,result){const data=JSON.stringify(result);if(data.length>200000)throw fail(503,'Investigation result too large.');const r=db.prepare("UPDATE chat_requests SET state='COMPLETE',result_json=?,updated_at=? WHERE user_id=? AND request_id=? AND state='RUNNING'").run(data,Date.now(),userId,id);if(r.changes!==1)throw fail(409,'Request no longer running.');},
  fail(userId,id){db.prepare("UPDATE chat_requests SET state='FAILED',updated_at=? WHERE user_id=? AND request_id=? AND state='RUNNING'").run(Date.now(),userId,id);},
 };
}
