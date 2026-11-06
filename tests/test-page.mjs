// Isolated local artifact tests. Never attaches to the user's browser session.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.CATCHART_PLAYWRIGHT_MODULE||'playwright');
const folder=await mkdtemp(join(tmpdir(),'catchart-page-test-'));
const state=(name,color)=>({name,basis:'measured',evidenceIds:['fixture'],styles:{'background-color':color,color:'#ffffff',padding:'12px 20px'}});
const fixture={title:'Local fixture',colors:[{name:'Brand',group:'品牌色',value:'#abc',basis:'measured',evidenceIds:['fixture']},{name:'Overlay',group:'辅助色',value:'#23284d80',basis:'measured',evidenceIds:['fixture']}],fontFamilies:{english:['Helvetica Neue'],chinese:['苹方（PingFang SC）']},typography:[{name:'Body',sample:'正文内容',basis:'measured',evidenceIds:['fixture'],styles:{'font-size':'16px','font-weight':'400','line-height':'24px'}},{name:'Heading',sample:'真实标题',basis:'measured',evidenceIds:['fixture'],styles:{'font-size':'40px','font-weight':'600','line-height':'48px'}}],foundations:{spacing:[{name:'Buttons gap',value:'16px',basis:'measured',evidenceIds:['fixture']}],padding:[{name:'Navigation padding',sides:{top:'0px',right:'16px',bottom:'0px',left:'16px'},basis:'measured',evidenceIds:['fixture']}],border:[{name:'Outline',basis:'measured',evidenceIds:['fixture'],styles:{'border-width':'1px','border-style':'solid','border-color':'#4E83FD','border-radius':'100px'}}],radius:[{name:'Small corner',value:'4px',basis:'inferred',evidenceIds:['fixture']},{name:'Large corner',value:'100px',basis:'measured',evidenceIds:['fixture']},{name:'Unknown corner',basis:'untested',evidenceIds:[]}],shadow:[{name:'Shadow sample',basis:'measured',evidenceIds:['fixture'],styles:{'box-shadow':'rgba(68,116,189,0.05) 0px 38px 76px'},shadowLayers:[{color:'#4474BD',opacity:'5%',offsetX:'0px',offsetY:'38px',blur:'76px',spread:'0px',inset:false}]}],icons:[{name:'Distinctive icon',value:'line icon',basis:'observed',evidenceIds:['fixture']}]},components:[{name:'Fixture action',kind:'button',label:'Example',states:[state('default','#111111'),state('hover','#2255aa'),state('focus','#553388'),state('selected','#225522'),{name:'loading',basis:'untested',evidenceIds:[],note:'No evidence'}]}]};
await writeFile(join(folder,'data.json'),JSON.stringify(fixture));
execFileSync(process.env.CATCHART_PYTHON||'python3',[fileURLToPath(new URL('../scripts/build-page.py',import.meta.url)),join(folder,'data.json'),'--out',join(folder,'index.html')]);
await writeFile(join(folder,'empty.json'),JSON.stringify({title:'No featured components'}));
execFileSync(process.env.CATCHART_PYTHON||'python3',[fileURLToPath(new URL('../scripts/build-page.py',import.meta.url)),join(folder,'empty.json'),'--out',join(folder,'empty.html')]);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.emulateMedia({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(join(folder,'index.html')).href+'#page-category-0');
 await page.getByRole('button',{name:'Fixture action：加载',exact:true}).click();assert.match(await page.locator('.stage').innerText(),/No evidence/);
 await page.getByRole('button',{name:'Fixture action：默认',exact:true}).click();const demo=page.locator('.stage button');await demo.hover();assert.equal(await demo.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(34, 85, 170)');
 assert.match(await page.locator('.state-meta').innerText(),/悬停/);await page.mouse.move(10,10);assert.equal(await demo.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(17, 17, 17)');assert.doesNotMatch(await page.locator('.state-meta').innerText(),/悬停/);await demo.focus();assert.match(await page.locator('.state-meta').innerText(),/焦点/);await demo.evaluate(n=>n.blur());assert.doesNotMatch(await page.locator('.state-meta').innerText(),/焦点/);await demo.click();assert.equal(await page.getByRole('button',{name:'Fixture action：选中',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Fixture action：加载',exact:true}).focus();await page.keyboard.press('Enter');assert.match(await page.locator('.stage').innerText(),/No evidence/);
 // The grouped category is the current public route; individual component routes were retired.
 assert.equal(await page.locator('#nav .nav-group').filter({hasText:'页面'}).getByRole('link',{name:'按钮',exact:true}).count(),1);
 const pageTab=page.locator('.doc-tabs a[data-group="页面"]');assert.equal(await pageTab.getAttribute('href'),'#page-category-0');await pageTab.click();
 assert.equal(await page.locator('#colors').isVisible(),true);assert.equal(await page.locator('#typography').isVisible(),true);
 assert.equal(await page.locator('#nav a[href="#motion"]').count(),0);
 assert.match(await page.locator('#colors').innerText(),/#AABBCC/);assert.match(await page.locator('#colors').innerText(),/不透明度 50.2%/);
 assert.deepEqual(await page.locator('#typography .type-meta h3').allTextContents(),['Heading','Body']);
 assert.match(await page.locator('#typography').innerText(),/字号 40px/);assert.match(await page.locator('#typography').innerText(),/英文字体/);assert.doesNotMatch(await page.locator('#typography').innerText(),/font-size:/);
 assert.match(await page.locator('#spacing .padding-illustration').innerText(),/左 16px/);
 assert.equal(await page.locator('#spacing .padding-illustration').evaluate(n=>getComputedStyle(n).fontSize),'12px');
 assert.equal(await page.locator('#border .border-preview').evaluate(n=>getComputedStyle(n).borderTopWidth),'1px');
 await page.setViewportSize({width:1440,height:600});await page.locator('#spacing').evaluate(n=>scrollTo(0,n.getBoundingClientRect().top+scrollY-100));
 await page.waitForFunction(()=>document.querySelector('#nav a[aria-current]')?.hash==='#spacing');
 assert.equal(await page.locator('#typography').isVisible(),true); // Manual scrolling keeps neighboring sections in the document.
 await page.locator('#directory-search').fill('字体');assert.equal(await page.locator('#nav a:visible').count(),1);
 await page.locator('#directory-search').press('Escape');assert.ok(await page.locator('#nav a:visible').count()>5);
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});
  for(const route of ['overview','colors','typography','page-category-0']){
   await page.goto(pathToFileURL(join(folder,'index.html')).href+'#'+route);
   await page.locator('#'+route).waitFor({state:'visible'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width+' '+route);
   if(process.env.CATCHART_SCREENSHOT_DIR&&route==='typography'){await mkdir(process.env.CATCHART_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.CATCHART_SCREENSHOT_DIR,'template-typography-'+width+'.png')})}
  }
  if(width===390){
   assert.ok(await page.locator('#typography .type-sample').first().evaluate(n=>n.getBoundingClientRect().width>=innerWidth-50),'mobile specimen must span the content width');
   const toggle=page.getByRole('button',{name:'目录',exact:true});await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await page.locator('#nav a[href="#colors"]').click();await page.locator('#colors').waitFor({state:'visible'});
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  }
 }
 await page.goto(pathToFileURL(join(folder,'index.html')).href+'#radius');
 assert.equal(await page.locator('#radius .radius-table tbody tr').count(),3);
 assert.deepEqual(await page.locator('#radius .radius-corner span').evaluateAll(ns=>ns.map(n=>n.style.borderTopLeftRadius)),['4px','100px']);
 assert.equal(await page.locator('#radius tbody tr:last-child .radius-corner').count(),0);
 assert.match(await page.locator('#radius tbody tr:first-child').innerText(),/视觉估计/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'radius table overflow');
 await page.goto(pathToFileURL(join(folder,'index.html')).href+'#shadow');
 const shadow=page.locator('#shadow');await shadow.waitFor({state:'visible'});for(const value of ['#4474BD','5%','38px','76px','0px'])assert.ok((await shadow.innerText()).includes(value),value);
 assert.match(await page.locator('.foundation-shadow-example').evaluate(n=>getComputedStyle(n).boxShadow),/38px 76px/);
 assert.equal(await page.locator('#nav a[href="#icons"]').count(),1);
 await page.goto(pathToFileURL(join(folder,'empty.html')).href);
 assert.equal(await page.locator('#nav a[href="#icons"]').count(),0);
 assert.equal(await page.locator('.doc-tabs a[data-group="页面"]').isVisible(),false);
 assert.equal(await page.locator('#nav .nav-group').filter({hasText:'页面'}).count(),0);
 assert.equal(await page.locator('.overview-links a[href="#components"]').count(),0);
 await page.goto(pathToFileURL(join(folder,'index.html')).href+'#missing-route');
 await page.locator('#overview').waitFor({state:'visible'});await page.waitForFunction(()=>scrollY<5);
 // Two brands change document chrome while the measured specimen stays intact.
 for(const [brand,accent] of [['red','#B42318'],['yellow','#FFDD00']]){
  await writeFile(join(folder,brand+'.json'),JSON.stringify({...fixture,documentTheme:{accent,basis:'measured',evidenceIds:['brand']}}));
  execFileSync(process.env.CATCHART_PYTHON||'python3',[fileURLToPath(new URL('../scripts/build-page.py',import.meta.url)),join(folder,brand+'.json'),'--out',join(folder,brand+'.html')]);
  await page.goto(pathToFileURL(join(folder,brand+'.html')).href+'#page-category-0');
  assert.equal(await page.locator('.stage button').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(17, 17, 17)');
  const activeColor=await page.locator('#nav a[aria-current]').evaluate(n=>getComputedStyle(n).color);
  assert.notEqual(activeColor,'rgb(40, 93, 211)');
  assert.notEqual(activeColor,'rgb(255, 221, 0)');
 }
 assert.deepEqual(errors,[]);console.log('PASS: offline rendering, unknown-state handling, hover/focus/selection recovery, continuous reading, current-section tracking, populated group links, readable foundations, category navigation/search, mobile menu, route fallback, responsive overflow, no page errors.');
}finally{await browser.close()}
