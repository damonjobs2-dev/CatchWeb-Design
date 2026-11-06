// Isolated headless regression test for our own fixture, not a user's browser session.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium} = await import(process.env.CATCHART_PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(new URL('../scripts/observe-page.js', import.meta.url), 'utf8');
const fixture = new URL('./fixture.html', import.meta.url);
const out = process.env.CATCHART_EVIDENCE_DIR;
const browser = await chromium.launch({headless:true, channel:process.env.CATCHART_BROWSER_CHANNEL || undefined});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(fixture.href);
  const observe = (target=page) => target.evaluate(`(${source})()`);
  const heading = evidence => evidence.samples.find(s=>s.tag==='h1');
  const desktop = await observe();
  assert.equal(heading(desktop).styles['font-size'], '64px');
  assert.equal(desktop.variables['--color-primary'], '#b52726');
  assert.equal(desktop.variables['--private-session'], undefined);
  assert.ok(desktop.samples.some(s=>s.state.disabled));
  assert.ok(desktop.animations.some(a=>a.timing.duration===2000 && a.timing.easing==='linear'));
  assert.ok(desktop.rules.some(r=>r.selector.includes(':hover')));
  assert.ok(!JSON.stringify(desktop).includes('DO_NOT_CAPTURE_THIS_VALUE'));
  if(out){await mkdir(out,{recursive:true});await page.screenshot({path:resolve(out,'website-desktop.png')});}
  await page.locator('#toggle').hover();
  await page.waitForTimeout(250); // wait for the fixture's 200ms transition to finish
  const hover = await observe();
  assert.ok(hover.samples.some(s=>s.tag==='button' && s.state.hovered && s.styles.transform==='matrix(1, 0, 0, 1, 0, -4)'));
  await page.locator('#toggle').click();
  assert.ok((await observe()).samples.some(s=>s.tag==='button' && s.state.selected));
  await page.locator('.grid').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.grid')).opacity==='1');
  const scrolled = await observe();
  assert.ok(scrolled.scroll.y>0);
  if(out){await page.screenshot({path:resolve(out,'website-scroll.png')});}
  const mobilePage = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mobilePage.goto(fixture.href);
  const mobile = await observe(mobilePage);
  assert.equal(heading(mobile).styles['font-size'], '40px');
  assert.ok(!mobile.samples.some(s=>s.state.selected));
  if(out){await mobilePage.screenshot({path:resolve(out,'website-mobile.png')});}
  await mobilePage.goto(fixture.href+'?page=detail');
  const detail=await observe(mobilePage);
  assert.equal(new URL(detail.url).searchParams.get('page'),'detail');
  assert.ok(detail.samples.some(s=>s.tag==='section' && s.styles['grid-template-columns']==='358px'));
  if(out){await writeFile(resolve(out,'website-evidence.json'),JSON.stringify({desktop,hover,scrolled,mobile,detail},null,2));}
  console.log('Observer: desktop/mobile, hover/selected/disabled, animations, page variant, data minimization passed.');
} finally {await browser.close();}
