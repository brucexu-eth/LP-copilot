import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createApp} from '../server.mjs';import {simulationService} from '../src/simulation-http.mjs';
const dir=mkdtempSync(join(tmpdir(),'lp-lab-browser-'));const path=join(dir,'simulation.sqlite');let server,url;
async function boot(){server=createApp({simulation:simulationService({enabled:true,path,interval:250})});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;}
const stop=()=>new Promise(r=>server.close(r));await boot();const browser=await chromium.launch({headless:true});
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],external=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/lab');await page.locator('#start').click();await expect(page.locator('#connection')).toContainText('SIMULATION ONLY');
  const state=async()=>{const response=await context.request.get(url+'/api/simulation');assert.equal(response.status(),200);return response.json();};
  const done=()=>expect.poll(async()=>(await state()).job?.status,{timeout:10000}).toBe('COMPLETE');
  await page.locator('[data-action="FUND"]').click();await done();await page.locator('#policy-form button').click();await expect(page.locator('#policy-status')).toContainText('ACTIVE');await page.locator('#plan-form textarea').fill('Manual mock research note');await page.locator('#plan-form button').click();await expect(page.locator('#plan-summary')).toContainText('DRAFT');await page.reload();await expect(page.locator('#plan-summary')).toContainText('Manual mock research note');await page.locator('#confirm-plan').click();await expect(page.locator('#plan-summary')).toContainText('CONFIRMED');await page.locator('#execute-plan').click();await done();await expect(page.locator('#position-summary')).toContainText('2700–3300');assert.equal((await state()).deployed,80000);
  await page.locator('[data-action="ACCRUE"]').click();await expect.poll(async()=>(await state()).unclaimed).toBe(300);
  await page.locator('#phase').selectOption('MINT');await page.locator('[data-action="REBALANCE"]').click();await page.locator('[data-action="FAIL"]').click();await expect.poll(async()=>(await state()).job.status,{timeout:10000}).toBe('BLOCKED');assert.equal((await state()).deployed,0);
  // Stop and restart the actual HTTP service + database while preserving browser cookie.
  await page.goto('about:blank');await stop();await boot();await page.goto(url+'/lab');await expect(page.locator('#job')).toContainText('BLOCKED');
  await page.locator('[data-action="RESUME"]').click();await done();assert.equal((await state()).deployed,80000);assert.equal((await state()).cash,19900);
  await page.locator('[data-action="EXIT"]').click();await done();assert.equal((await state()).deployed,0);assert.equal((await state()).cash,99900);
  await page.locator('[data-action="REVOKE"]').click();await expect(page.locator('#policy-status')).toContainText('REVOKED');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log(JSON.stringify({width,offlineLifecycle:'passed',partialFailureRestartResume:'passed',exitAndRevoke:'passed',externalRequests:external.length,pageErrors:errors.length}));await context.close();
 }
}finally{await browser.close();await stop();rmSync(dir,{recursive:true,force:true});}
