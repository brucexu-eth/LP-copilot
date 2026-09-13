const loopback=new Set(['127.0.0.1','localhost','::1']);

export function hostingConfig(env=process.env){
 const host=env.HOST||'127.0.0.1',port=Number(env.PORT||3400);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer between 1 and 65535');
 let origin=null;
 if(env.APP_ORIGIN){
  const url=new URL(env.APP_ORIGIN);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin!==env.APP_ORIGIN)throw Error('APP_ORIGIN must be an exact HTTP(S) origin without a path');
  origin=url.origin;
 }
 if(!loopback.has(host)){
  if(env.ENABLE_HOSTED_TESTNET!=='1'||!origin?.startsWith('https://'))throw Error('Hosted testnet requires ENABLE_HOSTED_TESTNET=1 and an HTTPS APP_ORIGIN');
  if(!env.PRIVY_APP_ID||!env.PRIVY_APP_SECRET||!env.PRIVY_ALLOWED_USER_IDS?.trim())throw Error('Hosted testnet requires Privy credentials and an explicit user allowlist');
  if(env.ENABLE_SIMULATION_LAB==='1')throw Error('The simulation lab must remain disabled on hosted instances');
 }
 return {host,port,origin};
}

export function allowedOrigin(req,origin){
 return !req.headers.origin||req.headers.origin===(origin||`http://${req.headers.host}`);
}
