// Isolated signup OTP, publishing authorization and responsive/accessibility checks.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'), temp=mkdtempSync(join(tmpdir(),'chh-verification-'));
const python=process.env.PYTHON_BIN||'python', base='http://127.0.0.1:3114', backend='http://127.0.0.1:8114';
const password=randomBytes(24).toString('base64url'), adminEmail='moderator@example.com';
const hash=execFileSync(python,['-c','import sys;from argon2 import PasswordHasher;print(PasswordHasher().hash(sys.stdin.read()))'],{input:password,encoding:'utf8'}).trim();
const env={...process.env,APP_ENV:'test',DATABASE_URL:`sqlite:///${temp}/db.sqlite`,JWT_SECRET_KEY:randomBytes(48).toString('hex'),MFA_ENCRYPTION_KEY:randomBytes(32).toString('base64'),ADMIN_BOOTSTRAP_EMAIL:adminEmail,ADMIN_BOOTSTRAP_PASSWORD_HASH:hash,ADMIN_BOOTSTRAP_NAME:'Test Moderator',APP_ORIGIN:base,API_BASE_URL:backend,NEXT_TELEMETRY_DISABLED:'1',DEMO_SEED_ENABLED:'false',SMTP_HOST:'smtp.example.invalid',SMTP_FROM:'hub@example.invalid',TEST_MAIL_PATH:join(temp,'mail.json')};
const services=[],errors=[];let browser,phase='startup';
function serve(command,args,cwd){const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe']});services.push(child);for(const out of [child.stdout,child.stderr])out.on('data',d=>writeFileSync(join(temp,'server.log'),d,{flag:'a'}));}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1500)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Server not ready');}
async function request(path,token,method='GET',body,status=200){const r=await fetch(backend+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,status,`${method} ${path}`);return r.json();}
const post={type:'Offer help',title:'School books for our neighbours',description:'School books are available for neighbours to collect at our society reception this weekend.',locality:'Satellite, Ahmedabad'};
try{
  // Capture delivery only in this test process. Production SMTP is never replaced.
  serve(python,['-c',"import os,json,uvicorn;from pathlib import Path;from app import product;product.send_email=lambda to,subject,body,*args:Path(os.environ['TEST_MAIL_PATH']).write_text(json.dumps({'to':to,'body':body}));uvicorn.run('app.main:app',host='127.0.0.1',port=8114)"],join(root,'backend'));await ready(backend+'/health');
  serve(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3114'],join(root,'frontend'));await ready(base);
  const admin=(await request('/auth/login',null,'POST',{email:adminEmail,password})).access_token;await request('/posts',admin,'POST',post,403);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:900},hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  phase='signup OTP';await page.goto(base+'/signup');await page.locator('#auth-name').fill('Test Neighbour');await page.locator('#auth-email').fill('neighbour@example.com');await page.locator('#auth-password').fill(password);await page.locator('#auth-locality').fill('Satellite, Ahmedabad');
  for(const id of ['privacy_consent','terms_accepted','adult_confirmed'])await page.locator(`#auth-${id}`).check();
  await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByRole('heading',{name:'Verify your email',exact:true}).waitFor();
  await page.getByText('A six-digit code is queued for your email. Check your inbox and spam folder. It expires in 10 minutes.',{exact:true}).waitFor();
  const token=(await context.cookies()).find(c=>c.name==='chh_session').value;
  for(const width of [360,390,768,1280]){
    await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`OTP overflow at ${width}`);
    await page.addScriptTag({path:join(root,'frontend/node_modules/axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'));return r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id);});assert.deepEqual(violations,[],`OTP accessibility at ${width}`);
  }
  for(let i=0;i<100&&!existsSync(env.TEST_MAIL_PATH);i++)await new Promise(r=>setTimeout(r,500));
  assert.ok(existsSync(env.TEST_MAIL_PATH),'Test mail delivery was not captured');const mail=JSON.parse(readFileSync(env.TEST_MAIL_PATH,'utf8'));assert.equal(mail.to,'neighbour@example.com');const code=mail.body.match(/Your code is (\d{6})/)[1];
  await page.getByLabel('Six-digit email code',{exact:true}).fill(code==='000000'?'999999':'000000');await page.getByRole('button',{name:'Verify email code',exact:true}).click();await page.getByText('Incorrect verification code.',{exact:true}).waitFor();
  await page.getByLabel('Six-digit email code',{exact:true}).fill(code);await page.getByRole('button',{name:'Verify email code',exact:true}).click();await page.getByText('Email verified.',{exact:true}).waitFor();await request('/posts',token,'POST',post,403);
  phase='unverified publishing screen';await page.goto(base+'/create-post');await page.getByRole('heading',{name:'Verify your community before posting',exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).count(),0);
  for(const language of ['gu','hi','en']){await page.getByLabel('Language / ભાષા / भाषा').selectOption(language);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const evidence=await request('/verification/submit',token,'POST',{proof_type:'Reference',proof_value:'The society secretary has agreed to independently confirm my residency.'});await request('/posts',token,'POST',post,403);await request(`/admin/verifications/${evidence.id}`,admin,'PATCH',{approve:true,reviewer_comment:'Independently confirmed residency with the society secretary.'});
  phase='approval unlocks publishing';await page.getByRole('button',{name:'Check approval again',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill(post.title);await page.getByLabel('Details',{exact:true}).fill(post.description);await page.getByRole('button',{name:'Preview notice',exact:true}).click();await page.getByRole('button',{name:'Publish notice',exact:true}).click();await page.waitForURL(/\/post\/\d+$/);
  phase='changed area locks publishing again';await request('/account/profile',token,'PATCH',{name:'Test Neighbour',locality:'Vastrapur, Ahmedabad',contact_phone:null});await request('/posts',token,'POST',post,403);await page.goto(base+'/create-post');await page.getByRole('heading',{name:'Verify your community before posting',exact:true}).waitFor();assert.deepEqual(errors,[]);
  phase='mail-provider unavailable fallback';
  const oldBackend=services[0]; await new Promise(resolve=>{oldBackend.once('exit',resolve);oldBackend.kill('SIGTERM');});
  env.SMTP_HOST=''; env.SMTP_FROM='';
  serve(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8114'],join(root,'backend'));await ready(backend+'/health');
  await context.clearCookies();await page.goto(base+'/signup');await page.locator('#auth-name').fill('Second Neighbour');await page.locator('#auth-email').fill('second@example.com');await page.locator('#auth-password').fill(password);await page.locator('#auth-locality').fill('Satellite, Ahmedabad');
  for(const id of ['privacy_consent','terms_accepted','adult_confirmed'])await page.locator(`#auth-${id}`).check();
  await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByText('Email delivery is not configured yet. You can request community review now; publishing stays locked until approval.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Continue to community verification',exact:true}).click();await page.waitForURL('**/settings?tab=trust');await page.getByRole('button',{name:'Submit reference for review',exact:true}).waitFor();
  const second=(await context.cookies()).find(c=>c.name==='chh_session').value;assert.equal((await request('/account/trust',second)).can_post,false);assert.deepEqual(errors,[]);
  console.log('PASS: signup OTP queued and captured by test mail transport, wrong-code rejection, verification, four responsive/accessibility widths, unverified/staff API denial, pending denial, approval unlocking UI publishing, changed-area revocation, unavailable-mail fallback to community review.');console.log(`Diagnostics: ${temp}`);
}catch(e){console.error(`FAILED ${phase}: ${e.stack}`);console.error(`Diagnostics: ${temp}`);process.exitCode=1;}finally{await browser?.close();services.forEach(s=>s.kill('SIGTERM'));}
