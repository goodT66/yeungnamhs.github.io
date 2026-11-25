import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {sumFinalComponents,calculateReferenceTotals,calculateUniversityScore,classifyAgainstVerifiedCutoffs} from "./calculator.mjs";
const catalog=JSON.parse(fs.readFileSync(new URL("./catalog.json",import.meta.url),"utf8"));
test("563 exact source type IDs, no duplicates",()=>{
 assert.equal(catalog.count,563);
 assert.equal(catalog.rules.length,563);
 assert.equal(new Set(catalog.rules.map(x=>x.typeId)).size,563);
});
test("source final assembly uses five components (59 through 63)",()=>{
 assert.equal(sumFinalComponents([0,0,null,857,null]),857);
 assert.equal(sumFinalComponents([10,20,30,40,50]),150);
 assert.throws(()=>sumFinalComponents([1,2]));
});
test("source baseline example gives percentile 246 / standard 360",()=>{
 const s={korean:{percentile:88,standard:123},math:{percentile:74,standard:116},inquiry:[{percentile:75,standard:58},{percentile:93,standard:63}]};
 assert.deepEqual(calculateReferenceTotals(s),{percentileSum:246,standardSum:360});
});
test("never fabricate a university score for an unverified rule",()=>{
 const r=catalog.rules[0];
 const s={math:{choice:"미적분"},inquiry:[{subject:"화학 Ⅰ"},{subject:"물리학 Ⅰ"}]};
 assert.deepEqual(calculateUniversityScore(r,s,null).score,null);
 assert.equal(calculateUniversityScore(r,s,null).status,"unverified");
});
test("synthetic verified weight and English conversion",()=>{
 const r={typeId:"TEST"};
 const s={korean:{standard:125},math:{standard:140},english:{grade:2}};
 const def={typeId:"TEST",verified:true,formula:{kind:"sum",terms:[{field:"korean.standard",weight:.3},{field:"math.standard",weight:.4},{field:"english.grade",kind:"lookup",table:{1:100,2:95},weight:.1}]}};
 assert.equal(calculateUniversityScore(r,s,def).score,103);
});
test("unsupported cutoff never becomes admission advice",()=>{
 assert.equal(classifyAgainstVerifiedCutoffs(900,null).label,null);
 assert.equal(classifyAgainstVerifiedCutoffs(910,{verified:true,안정:920,적정:900,소신:890,상향:880}).label,"적정");
});