import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {createAuth} from '../src/auth.mjs';
const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try {
 for(const width of [1280,390]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url().split('?')[0],status:r.status()});});
  await page.goto(url);
  if(createAuth().publicConfig().privyAppId){
   await page.getByRole('button',{name:'Sign in with Privy'}).click({timeout:25000});
   await page.getByPlaceholder('your@email.com').waitFor({timeout:15000});
   // Do not submit an email, create an account, or request a code during this read-only smoke test.
  } else await page.getByText('Privy is not configured.',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed.filter(r=>r.url.startsWith(url)),[]);
  console.log(JSON.stringify({width,loginModal:createAuth().publicConfig().privyAppId?'passed':'not configured',pageErrors:errors,upstreamFailures:failed}));
  await page.close();
 }
} finally {await browser.close();await new Promise(r=>server.close(r));}
