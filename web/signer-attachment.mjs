// Reuse only a server-verified attachment of this exact signer and policy.
export async function ensureSignerAttached({api,addSigners,wallet,record}){
 const status=()=>api('management/signer-status',{id:record.id});
 if((await status()).attached)return;
 try{await addSigners({address:wallet,signers:[{signerId:record.proposal.grant.signerId,policyIds:[record.proposal.grant.policyId]}]});}
 catch(error){if((await status()).attached)return;throw error;}
 if(!(await status()).attached)throw Error('Wallet authorization is not attached. Retry to resume setup.');
}
