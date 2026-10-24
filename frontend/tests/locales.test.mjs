import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const catalogues = Object.fromEntries(["en","gu","hi"].map(lang=>[lang,JSON.parse(readFileSync(new URL(`../lib/messages/${lang}.json`,import.meta.url),"utf8"))]));
test("all interface catalogues have matching keys and interpolation parameters",()=>{
  const keys = Object.keys(catalogues.en).sort();
  for(const lang of ["gu","hi"]){
    assert.deepEqual(Object.keys(catalogues[lang]).sort(),keys);
    for(const key of keys){
      assert.ok(catalogues[lang][key].trim(),`${lang}: empty translation for ${key}`);
      assert.deepEqual(catalogues[lang][key].match(/\{\w+\}/g)||[],catalogues.en[key].match(/\{\w+\}/g)||[]);
    }
  }
});
test("long account, safety and chat copy is translated, not only navigation",()=>{
  for(const lang of ["gu","hi"])for(const key of ["Before creating your account","Direct exchange chat","Moderator workflow","Report a safety concern","Your confirmation is saved. Waiting for your neighbour."]){
    assert.notEqual(catalogues[lang][key],key);
    assert.match(catalogues[lang][key],lang==="gu"?/[\u0a80-\u0aff]/:/[\u0900-\u097f]/);
  }
});
