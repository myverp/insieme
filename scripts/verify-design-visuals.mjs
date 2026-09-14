import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser=await chromium.connectOverCDP(process.env.DESIGN_CDP);
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('http://localhost:3000'));
const out='docs/validation/production-design';
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Current Watchlist:',exact:false}).click();
const disposable=page.locator('.manager-list-item').filter({hasText:'Design shared QA'}).first();
if(await disposable.count()) {
  await disposable.getByRole('button',{name:'Use list'}).click();
  await page.getByRole('button',{name:'Current Watchlist: Design shared QA',exact:true}).click();
  await page.getByText('Settings for Design shared QA',{exact:true}).click();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('button',{name:'Current Watchlist: My Watchlist',exact:true}).waitFor();
}
await page.keyboard.press('Escape');
await page.getByRole('link',{name:'Discover',exact:true}).click();
await page.locator('#film-search').fill('matrix');
await page.getByRole('button',{name:'Search',exact:true}).first().click();
await page.locator('.discovery-card').first().waitFor({timeout:90000});
const luminance=hex=>hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const contrast=[];
for(const theme of ['light','dark']) {
  await page.evaluate(t=>{localStorage.setItem('insieme-theme',t);document.documentElement.dataset.theme=t},theme);
  const tokens=await page.locator('html').evaluate(e=>Object.fromEntries(['background','surface','text','muted','accent','accent-soft','accent-dark','on-accent','field','field-border'].map(k=>[k,getComputedStyle(e).getPropertyValue('--'+k).trim().replace('#','')])));
  for(const [a,b,min] of [['text','background',4.5],['muted','background',4.5],['muted','surface',4.5],['accent','background',4.5],['accent-dark','accent-soft',4.5],['on-accent','accent',4.5],['field-border','field',3]]) {
    const expand=x=>x.length===3?x.split('').map(c=>c+c).join(''):x;
    const value=ratio(expand(tokens[a]),expand(tokens[b]));contrast.push({theme,pair:`${a}/${b}`,ratio:+value.toFixed(2)});assert(value>=min,`${theme} ${a}/${b} contrast ${value}`);
  }
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.mouse.move(0,0);
    await page.locator('#film-search').focus();
    await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(400);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const columns=await page.locator('.search-results').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width===1440?6:2);
    await page.screenshot({path:`${out}/${width===1440?'desktop':`mobile-${width}`}-${theme}.png`,fullPage:true});
  }
}
await page.getByRole('button',{name:'Filters',exact:true}).click();await page.waitForTimeout(350);
await page.screenshot({path:`${out}/mobile-filters.png`});
await page.getByRole('button',{name:'Close filters'}).click();
await page.getByRole('button',{name:'Current Watchlist:',exact:false}).click();await page.waitForTimeout(350);
await page.screenshot({path:`${out}/mobile-watchlists.png`});
await page.getByRole('button',{name:'Close Watchlist manager'}).click();
// Edge fixtures only for layout/fallback; functional checks use live film data.
await page.route('**/api/movies?*',route=>route.fulfill({json:{movies:[{id:1,title:'An extraordinarily long film title with many words and a very long uninterruptedwordthatmustneveroverflowtheviewport',year:'2026',rating:null,ratingStatus:'unrated',poster:null},{id:2,title:'A broken poster',year:'2026',rating:null,ratingStatus:'unrated',poster:'https://image.tmdb.org/t/p/w342/design-qa-missing.jpg'}]}}));
await page.locator('#film-search').fill('edge fixtures');await page.getByRole('button',{name:'Search',exact:true}).first().click();
await page.locator('.search-results .poster-placeholder').nth(1).waitFor();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
for(const poster of await page.locator('.search-results .poster-placeholder').all()) {const box=await poster.boundingBox();assert(Math.abs(box.height/box.width-1.5)<.02);}
await page.screenshot({path:`${out}/mobile-edge-fixtures.png`});
await page.unroute('**/api/movies?*');
await page.getByRole('link',{name:'Design QA',exact:true}).click();
await page.locator('#theme').selectOption('system');
await page.emulateMedia({colorScheme:'light'});
assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 241, 232)');
await page.emulateMedia({colorScheme:'dark'});
assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 28, 40)');
await page.locator('#theme').selectOption('light');await page.reload();
assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 241, 232)');
await page.locator('#theme').selectOption('dark');await page.reload();
assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 28, 40)');
await page.emulateMedia({reducedMotion:'reduce'});
await page.getByRole('link',{name:'Back to Watchlist'}).click();
await page.getByRole('button',{name:'Current Watchlist:',exact:false}).click();
assert.equal(await page.locator('dialog[open]').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.keyboard.press('Escape');
console.log('PASS: Owner deletion, final six/two-column captures, overflow, poster fallback/long-title fixtures, system/live preference/explicit reload, reduced motion. Contrast:',JSON.stringify(contrast));
await browser.close();
