import {calculateReferenceTotals,calculateUniversityScore} from "./calculator.mjs";
const host=document.getElementById("admission2027Panel");
if(host){
 const byId=id=>host.querySelector("#"+id);
 const cls=byId("admission2027Class"),person=byId("admission2027Student"),univ=byId("admission2027University"),type=byId("admission2027Type"),state=byId("admission2027Status"),output=byId("admission2027Result");
 const view=document.getElementById("susiResultView");
 const str=v=>String(v??"").trim();
 const idx=v=>/^\d+$/.test(str(v))?String(Number(v)):"";
 const num=v=>str(v)!==""&&Number.isFinite(Number(str(v).replaceAll(",","")))?Number(str(v).replaceAll(",","")):null;
 const key=(c,n,name)=>JSON.stringify([idx(c),idx(n),str(name).normalize("NFKC").replace(/[\p{White_Space}\p{P}\p{Cf}]/gu,"")]);
 let rows=[],catalog=[],owner=null,working=null,ready=false;
 function fill(select,items,placeholder){select.replaceChildren(new Option(placeholder,""));items.forEach(x=>select.add(new Option(x.text,x.value)));}
 function reset(){rows=[];owner=null;ready=false;working=null;fill(cls,[],"반 선택");fill(person,[],"학생 선택");fill(univ,[],"대학 선택");fill(type,[],"환산 유형 선택");output.replaceChildren();state.textContent="교사 인증 후 조회할 수 있습니다.";}
 const same=user=>user&&window.getCurrentUser?.()===user;
 function scores(raw,p){
  const math=str(raw[8]);const choice=math.includes("미")?"미적분":math.includes("기")?"기하":math.includes("확")?"확률과통계":math;
  return {korean:{choice:str(raw[5]),standard:num(p?.[7]),percentile:num(p?.[8]),grade:num(p?.[9])},
   math:{choice,standard:num(p?.[12]),percentile:num(p?.[13]),grade:num(p?.[14])},
   english:{grade:num(p?.[16]||raw[11])},history:{grade:num(p?.[18]||raw[12])},
   inquiry:[{subject:str(raw[13]),standard:num(p?.[21]),percentile:num(p?.[22]),grade:num(p?.[23])},{subject:str(raw[15]),standard:num(p?.[26]),percentile:num(p?.[27]),grade:num(p?.[28])}].filter(x=>x.subject)
  };
 }
 async function load(){
  const user=window.getCurrentUser?.();if(!user){reset();return;}
  if(working&&same(owner))return working;
  owner=user;state.textContent="인증된 수능 가채점 성적과 환산 유형을 조회하는 중입니다.";
  const task=(async()=>{
   const [file,raw,percentiles,roster]=await Promise.all([fetch("./admission2027/catalog.json"),window.fetchCsatPrelimRows(),window.fetchCsatPercentileRows(),window.getStudentInfoRowsFromServer()]);
   if(!file.ok)throw Error("환산 유형 목록을 불러오지 못했습니다.");
   const db=await file.json();if(db.count!==563||db.rules?.length!==563)throw Error("563개 환산 유형 목록이 올바르지 않습니다.");
   if(!same(user)){reset();return;}
   catalog=db.rules;
   const names=new Map(roster.filter(r=>Array.isArray(r)&&idx(r[0])==="3").map(r=>[idx(r[1])+":"+idx(r[2]),str(r[3])]));
   const percents=new Map(),duplicated=new Set();
   for(const row of percentiles){
    if(!Array.isArray(row))continue;
    const id=key(row[1],row[2],row[4]);
    if(percents.has(id))duplicated.add(id);else percents.set(id,row);
   }
   rows=[];
   for(const r of raw.slice(1)){
    if(!Array.isArray(r)||idx(r[1])!=="3")continue;
    const c=idx(r[2]),n=idx(r[3]),name=names.get(c+":"+n);
    if(!name||name!==str(r[4]))continue;
    const id=key(c,n,name);
    rows.push({id,c,n,name,student:scores(r,duplicated.has(id)?null:percents.get(id))});
   }
   fill(cls,[...new Set(rows.map(x=>x.c))].sort((a,b)=>Number(a)-Number(b)).map(c=>({text:c+"반",value:c})),"반 선택");
   fill(person,[],"학생 선택");
   fill(univ,[...new Set(catalog.map(x=>x.university))].sort((a,b)=>a.localeCompare(b,"ko")).map(v=>({text:v,value:v})),"대학 선택");
   fill(type,[],"환산 유형 선택");
   state.textContent="2027학년도 수능 가채점 제출 학생 "+rows.length+"명 / 원본에서 추출한 환산 유형 563개 (대학별 환산식 검증은 별도)";
   ready=true;
  })();
  working=task;
  try{await task;}catch(e){if(same(user))state.textContent="조회 오류: "+e.message;}finally{if(working===task)working=null;}
 }
 function line(label,v){const x=document.createElement("p");x.className="text-sm text-gray-700";const b=document.createElement("strong");b.textContent=label+" ";x.append(b,document.createTextNode(v));output.append(x);}
 function render(){
  output.replaceChildren();
  const entry=rows.find(r=>r.id===person.value),rule=catalog.find(r=>r.typeId===type.value);
  if(!entry){line("안내:","학생을 먼저 선택해 주세요.");return;}
  const s=entry.student,tot=calculateReferenceTotals(s);
  line("학생:",entry.c+"반 "+entry.n+"번 "+entry.name);
  line("선택과목:",s.korean.choice+" / "+s.math.choice+" / "+s.inquiry.map(x=>x.subject).join(", "));
  line("표점합 (국·수·탐2):",tot.standardSum===null?"미제공":String(tot.standardSum));
  line("백분위합 (국·수·탐평균):",tot.percentileSum===null?"미제공":String(tot.percentileSum));
  if(rule){
   const evaluated=calculateUniversityScore(rule,s,null);
   line("환산 유형:",rule.typeId);
   line("대학별 환산점수:",evaluated.score===null?"검증된 환산 공식 미연결 — 산출 보류":String(evaluated.score));
   line("안정·적정 등 지원판정:","모집단위별 검증된 2027학년도 지원선이 없어 산출 보류");
  }else line("안내:","대학 및 환산 유형을 선택해 주세요.");
 }
 cls.addEventListener("change",()=>{fill(person,rows.filter(x=>x.c===cls.value).sort((a,b)=>Number(a.n)-Number(b.n)).map(x=>({text:x.n+"번 "+x.name,value:x.id})),"학생 선택");render();});
 univ.addEventListener("change",()=>{fill(type,catalog.filter(x=>x.university===univ.value).map(x=>({text:x.typeId,value:x.typeId})),"환산 유형 선택");render();});
 person.addEventListener("change",render);type.addEventListener("change",render);
 new MutationObserver(()=>{if(!view.classList.contains("hidden")&&window.getCurrentUser?.()){if(!ready&&!working)load();}else if(!window.getCurrentUser?.())reset();}).observe(view,{attributes:true,attributeFilter:["class"]});
 window.addEventListener("teacher-auth-ready",()=>{if(!view.classList.contains("hidden"))load();});
 // Clear student scores when existing teacher-authenticated content is hidden on logout.
 const gate=document.getElementById("susiResultContent");
 new MutationObserver(()=>{if(gate.classList.contains("hidden"))reset();}).observe(gate,{attributes:true,attributeFilter:["class"]});
}