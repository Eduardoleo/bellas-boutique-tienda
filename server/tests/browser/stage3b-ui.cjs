// Optional real-browser regressions. Playwright is installed in an isolated QA directory.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function main(){
 const origin=new URL(process.env.BB_QA_CLIENT_URL||'http://127.0.0.1:5187');
 if(origin.hostname!=='127.0.0.1'||origin.protocol!=='http:')throw new Error('QA requires an explicit loopback demo URL');
 if(!process.env.BB_QA_PLAYWRIGHT_MODULE||!process.env.BB_QA_EVIDENCE_DIR)throw new Error('Configure isolated Playwright and evidence directory');
 const out=path.resolve(process.env.BB_QA_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
 const {chromium}=require(process.env.BB_QA_PLAYWRIGHT_MODULE),browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],observations=[];
 try{
  const page=await browser.newPage({hasTouch:true});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  for(const [width,height]of [[1366,768],[390,844],[360,800],[768,1024]]){
   await page.setViewportSize({width,height});await page.goto(origin.href,{waitUntil:'networkidle'});
   const home=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,images:[...document.querySelectorAll('.hero-image')].map(el=>el.getBoundingClientRect().height),logo:document.querySelector('.home-logo').getBoundingClientRect().toJSON(),search:document.querySelector('.home-header-right').getBoundingClientRect().toJSON()}));
   assert.ok(home.scroll<=width+1);assert.ok(home.images.every(h=>h>=200));if(width<=768)assert.ok(home.logo.bottom<=home.search.top);
   await page.screenshot({path:path.join(out,'regression-home-'+width+'.png'),fullPage:true});
   await page.locator('.home-hamburger-btn').tap();const menu=await page.locator('.hamburger-menu').boundingBox();assert.ok(menu.width<=width);
   const overflow=await page.locator('.hamburger-menu').evaluate(el=>el.scrollWidth>el.clientWidth);assert.equal(overflow,false);
   await page.getByRole('button',{name:'Hombre',exact:true}).tap();await page.getByRole('button',{name:'Mujer',exact:true}).tap();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.category-filters')).opacity==='1');
   await page.screenshot({path:path.join(out,'regression-menu-'+width+'.png'),fullPage:false});
   await page.locator('.category-btn').first().tap();await page.waitForTimeout(500);assert.equal(await page.locator('.hamburger-menu').count(),0);assert.ok((await page.locator('main').innerText()).length>20);
   await page.locator('.home-hamburger-btn').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');await page.keyboard.press('Escape');assert.equal(await page.locator('.hamburger-menu').count(),0);
   observations.push({width,height,homeImageHeights:home.images,menuWidth:menu.width,horizontalOverflow:false,navigation:true,keyboardMenu:true});
  }
  let registrations=0;page.on('request',r=>{if(r.url().endsWith('/api/auth/register')&&r.method()==='POST')registrations++});await page.goto(new URL('/register',origin).href);
  for(const [id,value]of Object.entries({name:'Synthetic',apellidos:'Fixture',email:'synthetic@example.test',password:'Synthetic123!',confirmPassword:'Synthetic123!',cedula:'1'.repeat(20),phone:'1'.repeat(24)}))await page.locator('#'+id).fill(value);
  assert.equal(await page.locator('#cedula').getAttribute('maxlength'),'20');assert.equal(await page.locator('#phone').getAttribute('maxlength'),'24');await page.locator('button[type=submit]').click();assert.equal(await page.locator('[role=alert]').count(),2);assert.equal(registrations,0);
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'responsive-results.json'),JSON.stringify({browser:browser.version(),origin:origin.origin,observations,invalidRegistrationBlocked:true,pageErrors:errors},null,2));console.log('Real Edge: 4 viewports, menu/keyboard/navigation, invalid registration blocked; passed');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
