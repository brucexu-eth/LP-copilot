import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingConfig,allowedOrigin} from '../src/hosting.mjs';

const hosted={HOST:'0.0.0.0',ENABLE_HOSTED_TESTNET:'1',APP_ORIGIN:'https://lpcopilot.brucexu.xyz',PRIVY_APP_ID:'test',PRIVY_APP_SECRET:'test',PRIVY_ALLOWED_USER_IDS:'did:privy:test'};
test('hosted startup requires HTTPS, explicit activation, authentication and no simulation lab',()=>{
 assert.equal(hostingConfig({}).host,'127.0.0.1');
 assert.equal(hostingConfig(hosted).origin,hosted.APP_ORIGIN);
 for(const override of [{ENABLE_HOSTED_TESTNET:''},{APP_ORIGIN:''},{APP_ORIGIN:'http://lpcopilot.brucexu.xyz'},{APP_ORIGIN:'https://lpcopilot.brucexu.xyz/path'},{PRIVY_APP_SECRET:''},{PRIVY_ALLOWED_USER_IDS:' '},{ENABLE_SIMULATION_LAB:'1'},{PORT:'NaN'}])assert.throws(()=>hostingConfig({...hosted,...override}));
});
test('HTTPS origin works behind a proxy and forwarded or hostile origins do not gain access',()=>{
 const req=origin=>({headers:{host:'container:3400',origin,'x-forwarded-proto':'https','x-forwarded-host':'evil.example'}});
 assert.equal(allowedOrigin(req(hosted.APP_ORIGIN),hosted.APP_ORIGIN),true);
 for(const bad of ['http://lpcopilot.brucexu.xyz','https://evil.example','null'])assert.equal(allowedOrigin(req(bad),hosted.APP_ORIGIN),false);
 assert.equal(allowedOrigin(req(undefined),hosted.APP_ORIGIN),true);
 assert.equal(allowedOrigin({headers:{host:'localhost:3400',origin:'http://localhost:3400'}},null),true);
});
