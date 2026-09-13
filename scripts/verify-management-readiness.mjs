// Read-only evidence for the second public-testnet run. Never signs or sends.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createTestnet} from '../src/testnet.mjs';
import {managedGraph} from '../src/managed-graph.mjs';
import {compareManagedPosition} from '../src/management-math.mjs';
import Database from 'better-sqlite3';
const wallet='0xEB22BD75B27F1Ae0557EC67F8b3f064955079102';
const account={userId:'did:privy:cmtxylrnn07ln0cjnmidw9t51',wallets:[{address:wallet}]};
const service=createTestnet();
try{
 const state=await service.state(account,wallet),position=state.positions.find(p=>BigInt(p.liquidity)>0n);
 assert.ok(position&&BigInt(position.liquidity)>0n,'Expected the real active test position');
 const db=new Database(new URL('../data/management.sqlite',import.meta.url).pathname,{readonly:true});
 const mandates=db.prepare('SELECT body FROM mandates WHERE user_id=?').all(account.userId).map(r=>JSON.parse(r.body)).map(m=>({id:m.id,tokenId:m.tokenId,status:m.status,mode:m.mode,operations:m.operations,events:m.events,assessments:db.prepare('SELECT body FROM assessments WHERE mandate_id=? ORDER BY rowid DESC LIMIT 3').all(m.id).map(r=>JSON.parse(r.body))}));db.close();
 const automaticEvidence=await readFile(new URL('../artifacts/automatic-acceptance.json',import.meta.url),'utf8').then(JSON.parse).catch(()=>null);
 const report={verifiedAt:new Date().toISOString(),chainId:84532,wallet,position,balances:state.balances,simulation:compareManagedPosition(state.state,position),graph:await managedGraph(),mandates,automaticPublicTestnetAcceptance:!!automaticEvidence,automaticEvidence};
 await writeFile(new URL('../artifacts/management-readiness.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({tokenId:position.tokenId,active:BigInt(position.liquidity)>0n,graph:report.graph.status,mandates:mandates.length}));
}finally{service.close();}
