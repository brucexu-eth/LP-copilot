import {POOL} from './config.mjs';
import {readHistory as readLiveHistory} from './data.mjs';

// Explicitly synthetic development data. Never labelled as a provider response.
export function mockHistory() {
 return {
  status:'mock',source:'Synthetic Graph-shaped fixture',synthetic:true,executionEligible:false,
  pool:POOL,blockNumber:null,observedAt:null,
  message:'MOCK HISTORY — invented development values, not The Graph or market evidence. Trading is disabled.',
  note:'Fixed fixture dates intentionally remain historical. Do not interpret as current volume, TVL or fees.',
  days:[
   {date:1788998400,volumeUSD:'1000000',tvlUSD:'20000000',feesUSD:'3000'},
   {date:1788912000,volumeUSD:'800000',tvlUSD:'20500000',feesUSD:'2400'},
   {date:1788825600,volumeUSD:'1200000',tvlUSD:'19800000',feesUSD:'3600'},
  ],
 };
}
export function historyMode(env=process.env){
 const mode=env.GRAPH_MODE||'live';
 if(!['live','mock'].includes(mode))throw Error('GRAPH_MODE must be live or mock.');
 return mode;
}
export async function historyFor(state,{env=process.env,live=readLiveHistory}={}){
 return historyMode(env)==='mock'?mockHistory():live(state);
}
export function requireLiveEvidence(history){
 if(history?.status!=='verified'||history.synthetic===true||history.executionEligible===false)throw Error('Verified live history is required; mock/missing history cannot authorize execution.');
}
