// Deterministic proposals derived from tool evidence, not model-parsed prose.
export function researchPlans(evidence){
 if(!Array.isArray(evidence)||!evidence.length)return [];
 const e=evidence.at(-1),candidates=e?.result?.candidates;
 if(!Array.isArray(candidates))return [];
 return candidates.filter(c=>['HOLD','WIDEN','EXIT'].includes(c.action)).flatMap(c=>{
  if(c.action!=='EXIT'&&(!Number.isFinite(c.range?.low)||!Number.isFinite(c.range?.high)||c.range.low<=0||c.range.high<=c.range.low))return [];
  return [{action:c.action,label:c.label,range:c.range?{low:c.range.low,high:c.range.high}:null,explanation:c.explanation,source:'SERVER_TOOL_EVIDENCE',evidenceIndex:evidence.length-1,syntheticHistory:e.history?.synthetic===true,positionKind:e.result.position?.kind||'unknown',execution:'disabled',status:'REVIEW_REQUIRED',amount:null,warning:'Comparison candidate, not an AI recommendation or authorization. Specify capital and risk limits separately. No execution payload.'}];
 });
}
