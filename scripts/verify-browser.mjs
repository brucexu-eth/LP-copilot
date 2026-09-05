import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const results=[];const artifactDir=new URL('../artifacts/',import.meta.url);await mkdir(artifactDir,{recursive:true});
try {
 for(const width of [1280,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:3400');
  await page.getByRole('button',{name:'Read & compare'}).click();
  await page.locator('#results').waitFor({state:'visible',timeout:45000});
  assert.match(await page.locator('#position-kind').innerText(),/HYPOTHETICAL/);
  assert.equal(await page.locator('.candidate').count(),3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL(`desktop-${width}.png`,artifactDir).pathname,fullPage:true});
  await page.locator('#mode').selectOption('nft');
  assert.equal(await page.locator('#results').isVisible(),false);
  await page.locator('#token-id').fill(process.env.SAMPLE_TOKEN_ID||'1361432');
  await page.getByRole('button',{name:'Read & compare'}).click();
  await page.locator('#results').waitFor({state:'visible',timeout:45000});
  assert.match(await page.locator('#position-kind').innerText(),/ONCHAIN NFT/);
  await page.screenshot({path:new URL(`nft-${width}.png`,artifactDir).pathname,fullPage:true});
  await page.locator('#token-id').fill('1');
  assert.equal(await page.locator('#results').isVisible(),false);
  await page.getByRole('button',{name:'Read & compare'}).click();
  await page.locator('#status.error').waitFor({timeout:45000});
  assert.equal(await page.locator('#results').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({width,learning:'passed',liveNft:'passed',invalidNft:'rejected; old results hidden',overflow:false,pageErrors:errors});
  await page.close();
 }
 console.log(JSON.stringify(results,null,2));
 await writeFile(new URL('browser-verification.json',artifactDir),JSON.stringify(results,null,2));
} finally {await browser.close();}
