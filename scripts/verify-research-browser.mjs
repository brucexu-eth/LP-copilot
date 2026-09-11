import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {generateKeyPair,SignJWT} from 'jose';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createApp} from '../server.mjs';
import {createAuth} from '../src/auth.mjs';
import {createWorkspace} from '../src/workspace.mjs';
import {openStore} from '../src/store.mjs';
const {privateKey,publicKey}=await generateKeyPair('ES256');
const subject='did:privy:browser-test';
const token=await new SignJWT({sid:'fixture-session'}).setProtectedHeader({alg:'ES256',typ:'JWT'}).setIssuer('privy.io').setAudience('fixture-app').setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(privateKey);
const auth=createAuth({PRIVY_APP_ID:'fixture-app',PRIVY_APP_SECRET:'fixture-secret',PRIVY_ALLOWED_USER_IDS:subject},{verificationKey:publicKey,getUser:async id=>({id,linked_accounts:[]})});
const dir=await mkdtemp(join(tmpdir(),'lp-browser-')),path=join(dir,'workspace.sqlite');
const agent={configured:()=>true,run:async()=>({answer:'Browser fixture answer — HOLD and EXIT differ. Not a live AI response.',evidence:[{history:{status:'mock',synthetic:true}}],syntheticHistory:true,execution:'disabled',model:'TEST FIXTURE'})};
const code=(await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Research}from'./web/Research.jsx';createRoot(document.getElementById('auth-root')).render(<Research getAccessToken={async()=>${JSON.stringify(token)}}/>);`,resolveDir:resolve('.'),loader:'jsx'},bundle:true,write:false,format:'esm',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}})).outputFiles[0].text;
let server;const browser=await chromium.launch({headless:true});
async function start(){const workspace=createWorkspace({store:openStore(path),agent});server=createApp({auth,workspace});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;}
async function stop(){await new Promise(r=>server.close(r));server=null;}
try{
 let url=await start();
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/auth-assets/login.js',route=>route.fulfill({contentType:'text/javascript',body:code}));
  await page.goto(url);await page.getByLabel('Your question',{exact:true}).fill(`Explain my position ${width}`);await page.getByRole('button',{name:'Ask LP Copilot',exact:true}).click();
  await page.locator('.research-answer').filter({hasText:`Explain my position ${width}`}).getByText('Browser fixture answer',{exact:false}).waitFor();
  await page.reload();await page.locator('.research-answer').filter({hasText:`Explain my position ${width}`}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log(JSON.stringify({width,fixtureChat:'passed',savedAfterReload:true,mockWarning:await page.getByText('MOCK HISTORY',{exact:false}).count(),errors}));await page.close();
 }
 const unauthorized=await fetch(url+'/api/conversations');assert.equal(unauthorized.status,401);
 await stop();url=await start();const r=await fetch(url+'/api/conversations',{headers:{Authorization:`Bearer ${token}`}});assert.equal((await r.json()).items.length,2);
 console.log('Restart recovery passed; authentication and AI in this harness are explicit test fixtures, not real Privy login.');
}finally{await browser.close();if(server)await stop();await rm(dir,{recursive:true,force:true});}
