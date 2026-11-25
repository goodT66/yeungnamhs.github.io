/**
 * 2027 admission score kernel. Never substitutes guesses for unverified formulas.
 * Student data remains in the authenticated page only.
 */
const finite=n=>typeof n==="number"&&Number.isFinite(n);
export function sumFinalComponents(parts){
  if(!Array.isArray(parts)||parts.length!==5)throw Error("환산총점계산의 59~63행이 필요합니다.");
  return parts.reduce((a,v)=>a+(v===null||v===""?0:finite(v)?v:(()=>{throw Error("숫자가 아닌 환산 구성요소")})()),0);
}
export function calculateReferenceTotals(s){
  const k=s?.korean,m=s?.math,t=s?.inquiry;
  if(!k||!m||!Array.isArray(t)||t.length!==2)return {percentileSum:null,standardSum:null};
  const ok=key=>[k[key],m[key],t[0][key],t[1][key]].every(finite);
  return {
    percentileSum:ok("percentile")?k.percentile+m.percentile+(t[0].percentile+t[1].percentile)/2:null,
    standardSum:ok("standard")?k.standard+m.standard+t[0].standard+t[1].standard:null
  };
}
const SOCIAL=new Set(["경제","동아시아사","사회·문화","생활과 윤리","세계사","세계지리","윤리와 사상","정치와 법","한국지리"]);
const SCIENCE=new Set(["물리학 Ⅰ","물리학 Ⅱ","생명과학 Ⅰ","생명과학 Ⅱ","지구과학 Ⅰ","지구과학 Ⅱ","화학 Ⅰ","화학 Ⅱ"]);
export function checkEligibility(rule,s){
  const reasons=[];
  if(rule.mathChoice){
    const choice=s?.math?.choice||"";
    const m=choice.includes("미")?"미":choice.includes("기")?"기":choice.includes("확")?"확":"";
    if(!m||!rule.mathChoice.includes(m))reasons.push("수학 선택 제한");
  }
  const iq=(s?.inquiry||[]).filter(x=>x?.subject);
  if(rule.inquiryCount&&iq.length<rule.inquiryCount)reasons.push("탐구 과목 수 부족");
  if(rule.inquiryChoice==="과"&&iq.some(x=>!SCIENCE.has(x.subject)))reasons.push("과학탐구 필수");
  if(rule.inquiryChoice==="사"&&iq.some(x=>!SOCIAL.has(x.subject)))reasons.push("사회탐구 필수");
  if(rule.inquiryChoice&&!["과","사","사과"].includes(rule.inquiryChoice))reasons.push("특수 탐구 자격 요강 확인");
  return {eligible:reasons.length===0,reasons};
}
const read=(s,key)=>key.split(".").reduce((o,k)=>o&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined,s);
function term(t,s){
  let n=read(s,t.field);
  if(t.kind==="lookup"){
    if(!t.table||!Object.prototype.hasOwnProperty.call(t.table,String(n)))throw Error("공식 점수표의 해당 등급/원점수 항목 누락");
    n=t.table[String(n)];
  }
  if(!finite(n))throw Error("성적 또는 변환표 누락: "+t.field);
  return n*(t.weight??1)+(t.offset??0);
}
function evalBlock(b,s){
  if(!b)throw Error("검증된 계산식 없음");
  if(b.kind==="constant"&&finite(b.value))return b.value;
  if(b.kind==="sum"&&Array.isArray(b.terms))return b.terms.reduce((a,t)=>a+term(t,s),0);
  if(b.kind==="best"&&Array.isArray(b.terms)&&Number.isInteger(b.count)&&b.count>0&&b.count<=b.terms.length)
    return b.terms.map(t=>term(t,s)).sort((a,b)=>b-a).slice(0,b.count).reduce((a,b)=>a+b,0);
  if(b.kind==="multiply"&&Array.isArray(b.blocks))return b.blocks.reduce((p,x)=>p*evalBlock(x,s),1);
  if(b.kind==="subtract"&&b.blocks?.length===2)return evalBlock(b.blocks[0],s)-evalBlock(b.blocks[1],s);
  if(b.kind==="divide"&&b.blocks?.length===2){
    const d=evalBlock(b.blocks[1],s);if(!d)throw Error("0으로 나누기");return evalBlock(b.blocks[0],s)/d;
  }
  throw Error("지원하지 않는 계산 연산: "+b.kind);
}
export function calculateUniversityScore(rule,student,definition){
  const eligibility=checkEligibility(rule,student);
  if(!eligibility.eligible)return {status:"ineligible",score:null,reasons:eligibility.reasons};
  if(!definition||definition.verified!==true||definition.typeId!==rule.typeId)
    return {status:"unverified",score:null,reasons:["원본과 대조하여 검증된 대학별 공식 없음"]};
  try{
    const score=evalBlock(definition.formula,student);
    if(!finite(score))throw Error("점수 오류");
    return {status:"calculated",score,reasons:[]};
  }catch(e){return {status:"unavailable",score:null,reasons:[e.message]};}
}
export function classifyAgainstVerifiedCutoffs(score,cutoffs){
  if(!finite(score)||cutoffs?.verified!==true)return {status:"unavailable",label:null};
  const names=["안정","적정","소신","상향"];
  const vals=names.map(n=>cutoffs[n]);
  if(vals.some(v=>!finite(v))||vals.some((v,i)=>i>0&&v>vals[i-1]))return {status:"unavailable",label:null};
  const i=vals.findIndex(v=>score>=v);
  return {status:"classified",label:i<0?"위험":names[i]};
}