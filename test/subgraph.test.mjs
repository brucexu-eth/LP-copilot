import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeEventTopics} from 'viem';

test('the deployed pool ABI uses the explicit event fields required by Graph Node',()=>{
 const abi=JSON.parse(readFileSync(new URL('../subgraph/abis/Pool.json',import.meta.url),'utf8'));
 const swap=abi.find(x=>x.type==='event'&&x.name==='Swap');
 assert.equal(swap.anonymous,false);
 const topics=encodeEventTopics({abi,eventName:'Swap',args:{sender:'0x1111111111111111111111111111111111111111',recipient:'0x2222222222222222222222222222222222222222'}});
 assert.equal(topics.length,3);
});
