import {fundingQuote} from '../src/funding.mjs';
// Public quote-only fixture address; not an owned wallet or execution authorization.
const wallet='0x000000000000000000000000000000000000dEaD';
const q=await fundingQuote({wallets:[{address:wallet}]},{wallet,chainId:42161,amount:'100000000'});
console.log(JSON.stringify(q));
