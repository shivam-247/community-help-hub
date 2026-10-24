// Exercise real API + browser flows using an isolated test database and fictional members.
import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const root=resolve(import.meta.dirname,"../.."), temp=mkdtempSync(join(tmpdir(),"chh-exchange-"));
const python=process.env.PYTHON_BIN||"python", base="http://127.0.0.1:3110", backend="http://127.0.0.1:8110";
const password=randomBytes(24).toString("base64url"), email="moderator@example.com";
const hash=execFileSync(python,["-c","import sys;from argon2 import PasswordHasher;print(PasswordHasher().hash(sys.stdin.read()))"],{input:password,encoding:"utf8"}).trim();
const env={...process.env,APP_ENV:"test",DATABASE_URL:`sqlite:///${temp}/db.sqlite`,JWT_SECRET_KEY:randomBytes(48).toString("hex"),MFA_ENCRYPTION_KEY:randomBytes(32).toString("base64"),ADMIN_BOOTSTRAP_EMAIL:email,ADMIN_BOOTSTRAP_PASSWORD_HASH:hash,ADMIN_BOOTSTRAP_NAME:"Test Moderator",APP_ORIGIN:base,API_BASE_URL:backend,NEXT_TELEMETRY_DISABLED:"1",DEMO_SEED_ENABLED:"false",MOCK_CHECKOUT_ENABLED:"true"};
const services=[],errors=[];let browser,phase="startup";
function serve(command,args,cwd){const child=spawn(command,args,{cwd,env,stdio:["ignore","pipe","pipe"]});services.push(child);for(const output of [child.stdout,child.stderr])output.on("data",d=>writeFileSync(join(temp,"server.log"),d,{flag:"a"}));}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1500)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error("Server not ready");}
async function request(path,token,method="GET",body){const r=await fetch(backend+path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.ok(r.ok,`${method} ${path}: ${r.status}`);return data;}
async function navigate(page,url){
  try { await page.goto(url); }
  catch(error){
    // Compiling a new dev route can trigger Fast Refresh in another open tab.
    if(!error.message.includes("net::ERR_ABORTED")) throw error;
    await page.waitForLoadState("domcontentloaded");
    await page.goto(url);
  }
}
async function account(name){const token=(await request("/auth/signup",null,"POST",{name,email:`${name.toLowerCase()}@example.com`,password,locality:"Satellite, Ahmedabad",privacy_consent:true,terms_accepted:true,adult_confirmed:true,policy_version:"2026-10-10"})).access_token;return{token,user:await request("/auth/me",token)};}
try{
  serve(python,["-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8110"],join(root,"backend"));await ready(backend+"/health");
  serve(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","3110"],join(root,"frontend"));await ready(base);
  const moderator=(await request("/auth/login",null,"POST",{email,password})).access_token;
  const asha=await account("Asha"),ravi=await account("Ravi");
  const verification=await request("/verification/submit",asha.token,"POST",{proof_type:"Reference",proof_value:"The society secretary agreed to confirm my residency at reception."});
  await request(`/admin/verifications/${verification.id}`,moderator,"PATCH",{approve:true,reviewer_comment:"Residency independently checked with the society secretary."});
  const post=await request("/posts",asha.token,"POST",{type:"Offer help",title:"Books for our neighbours this weekend",description:"School books are available to collect at our society reception this weekend.",locality:"Satellite, Ahmedabad",category:"Donations & Giveaways"});
  const response=await request(`/posts/${post.id}/respond`,ravi.token,"POST",{message:"I can collect these books on Sunday."});await request(`/requests/${response.id}`,asha.token,"PATCH",{action:"accept"});
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  async function pageFor(token){const context=await browser.newContext({viewport:{width:390,height:900},hasTouch:true});await context.addCookies([{name:"chh_session",value:token,url:base,httpOnly:true,sameSite:"Lax"}]);const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));return page;}
  const a=await pageFor(asha.token),b=await pageFor(ravi.token),admin=await pageFor(moderator);
  phase="two-person chat";
  await a.goto(`${base}/messages/${response.id}`);await b.goto(`${base}/messages/${response.id}`);
  await a.getByLabel("Message to your neighbour",{exact:true}).fill("Meet at reception on Sunday.");await a.getByRole("button",{name:"Send message",exact:true}).click();
  await b.getByText("Meet at reception on Sunday.",{exact:true}).waitFor();
  await a.getByRole("button",{name:"Safety options",exact:true}).click();await a.getByLabel("Report reason",{exact:true}).fill("Test safety case about suspicious exchange instructions.");await a.getByRole("button",{name:"Submit report",exact:true}).click();await a.getByText(/USR-/).waitFor();await a.keyboard.press("Escape");
  phase="mutual closure";
  await a.getByRole("button",{name:"Confirm exchange completed",exact:true}).click();await a.getByText("Your confirmation is saved. Waiting for your neighbour.",{exact:true}).waitFor();
  await b.getByRole("button",{name:"Confirm exchange completed",exact:true}).click();
  for(const page of [a,b]){await page.getByRole("heading",{name:"Conversation closed",exact:true}).waitFor();assert.equal(await page.getByRole("log").count(),0);assert.equal(await page.getByLabel("Message to your neighbour",{exact:true}).count(),0);await page.reload();await page.getByRole("heading",{name:"Conversation closed",exact:true}).waitFor();}
  phase="verification progress";
  await request("/account/profile",asha.token,"PATCH",{name:"Asha",locality:"Satellite, Ahmedabad",contact_phone:"9876543210"});
  await request(`/admin/users/${asha.user.id}/trust`,moderator,"PATCH",{phone_verified:true,address_verified:true,note:"Called the saved phone and independently checked the society reference."});
  await a.goto(base+"/settings?tab=trust");await a.getByText("2 of 3 checks complete",{exact:true}).waitFor();
  phase="moderator case and plan tools";
  await admin.goto(base+"/admin");await admin.getByRole("button",{name:"User reports",exact:true}).click();await admin.getByText(/Test safety case about suspicious exchange instructions/).waitFor();
  await admin.getByRole("button",{name:/User & Role Management/}).click();
  const row=admin.locator("tr").filter({has:admin.getByRole("link",{name:"Asha",exact:true})});await row.getByText("Manage plan & account",{exact:true}).click();
  await row.locator(`#member-note-${asha.user.id}`).fill("Approved college presentation grant for this member.");await row.locator(`#member-plan-${asha.user.id}`).selectOption("plus");await row.getByRole("button",{name:"Save plan grant",exact:true}).click();
  await admin.getByText("Change saved in the moderation audit trail.",{exact:true}).first().waitFor();assert.equal((await request("/billing",asha.token)).plan,"plus");
  phase="fuller language switching and unchanged user content";
  for(const lang of ["gu","hi"]){
    await a.goto(base+"/signup");await a.getByLabel("Language / ભાષા / भाषा").selectOption(lang);
    await a.waitForFunction(l=>document.documentElement.lang===l,lang);
    const text=await a.locator("main").innerText();assert.ok(!text.includes("Before creating your account"));assert.ok(!text.includes("We use your display name"));assert.match(text,lang==="gu"?/[\u0a80-\u0aff]/:/[\u0900-\u097f]/);
    await navigate(a,`${base}/post/${post.id}`);await a.getByRole("heading",{name:post.title,exact:true}).waitFor();
    assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await a.screenshot({path:join(temp,`post-${lang}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log("PASS: two live chat windows close and clear logs; trust progress; moderator reports and plan grants; Gujarati/Hindi copy with unchanged user content.");console.log(`Diagnostics: ${temp}`);
}catch(e){console.error(`FAILED ${phase}: ${e.message}`);console.error(`Diagnostics: ${temp}`);process.exitCode=1;}finally{await browser?.close();services.forEach(s=>s.kill("SIGTERM"));}
