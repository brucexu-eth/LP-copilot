import React from 'react';
import {withdrawalProjection,pnlPercent} from '../src/scenario-values.mjs';
import {fmt} from './PoolViews.jsx';
export function WithdrawalProjection({analysis,outcome,performance,fees,costs}){
 const p=withdrawalProjection(analysis,outcome,performance,{fees,costs});
 const signed=(n,d=6)=>{const rounded=Number(n.toFixed(d));return rounded===0?'0':(rounded>0?'+':'')+fmt(rounded,d);};
 return <section className="withdrawal-projection" aria-label="Holdings and withdrawal breakdown">
  <h3>{outcome.action==='EXIT'?'Exit now, then hold':'Withdraw at this price'}</h3>
  <div className="scenario-result"><div><small>Portfolio value after exit · USDC</small><strong>{p.netValue===null?'—':fmt(p.netValue,4)}</strong></div><div><small>Total profit / loss · USDC</small><strong className={p.pnl<0?'loss':'gain'}>{p.pnl===null?'—':signed(p.pnl,4)}</strong><small>{pnlPercent(p.pnl,p.deposited)===null?'—':signed(pnlPercent(p.pnl,p.deposited),2)+'%'} of deposited capital</small></div></div>
  <p className="small-note">Since deposit · excludes past gas · future fees {fmt(p.futureFees)} / costs {fmt(costs)} USDC assumed.</p>
  <div className="pool-table"><table><thead><tr><th>Holdings</th><th>Today</th><th>At {fmt(outcome.price)} USDC / WETH</th><th>Change</th></tr></thead><tbody>
   <tr><th>USDC · principal</th><td>{fmt(analysis.initial.usdc,6)}</td><td>{fmt(outcome.usdc,6)}</td><td>{signed(outcome.usdc-analysis.initial.usdc)}</td></tr>
   <tr><th>WETH · principal</th><td>{fmt(analysis.initial.weth,9)}</td><td>{fmt(outcome.weth,9)}</td><td>{signed(outcome.weth-analysis.initial.weth,9)}</td></tr>
   <tr><th>Principal value · USDC</th><td>{fmt(p.currentPrincipal,4)}</td><td>{fmt(outcome.inventoryValue,4)}</td><td>{signed(outcome.inventoryValue-p.currentPrincipal,4)}</td></tr>
  </tbody></table></div>
  {outcome.action==='WIDEN'&&<p className="small-note">Principal includes unused tokens held outside the wider LP: {fmt(p.idle.usdc,6)} USDC + {fmt(p.idle.weth,9)} WETH. Those tokens are already in the wallet.</p>}
  <p><strong>{outcome.action==='EXIT'?'Tokens returned when exiting now':'Tokens returned if you withdraw at this price'}: {p.known?`${fmt(p.returnedUsdc,6)} USDC + ${fmt(p.returnedWeth,9)} WETH`:'Awaiting claimable-token accounting'}</strong></p>
  <p className="small-note">Withdrawal returns both tokens; WETH is not sold for USDC.</p>
  <details><summary>Calculation details</summary>
  <div className="withdrawal-ledger">
   {[['Principal value at the chosen price',outcome.inventoryValue],['Currently claimable tokens, valued at that price',p.claimableValue],['Assumed additional fees',p.futureFees],['Less assumed future costs',-costs],['Net value after withdrawal, including idle tokens',p.netValue],['Plus previously received principal and fees',p.received],['Less total deposited',p.deposited===null?null:-p.deposited]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value===null?'—':fmt(value,6)} USDC</strong></div>)}
   <div className="withdrawal-total"><span>Total profit / loss since deposit</span><strong className={p.pnl<0?'loss':'gain'}>{p.pnl===null?'—':signed(p.pnl,6)+' USDC'}</strong></div>
  </div>
  <p className="small-note">Total profit / loss = net value after withdrawal + previous receipts − deposits. Past gas is excluded; future costs use your assumption ({fmt(costs)} USDC). Values are test USDC equivalents, not a guaranteed sale price. No withdrawal is sent by this simulation.</p></details>
 </section>;
}
