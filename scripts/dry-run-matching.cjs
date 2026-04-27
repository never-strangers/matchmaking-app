// Dry-run matching — READ-ONLY, no writes.
// Ignores checked_in (event hasn't started); uses paid attendees with answers.
"use strict";
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://jlcqtfxqaxbvnbnvsptb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3F0ZnhxYXhidm5ibnZzcHRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzUzMDcxNywiZXhwIjoyMDc5MTA2NzE3fQ.gTI3fUIGlUTxIkXzw-cjpi673rI0nurgULw5rIM07OM"
);
const EVENT_ID = process.argv[2] || "c308828d-eff0-4c5c-8feb-7da779a72f3d";

async function fetchAll(fn) {
  const PAGE = 1000; let offset = 0; const all = [];
  while (true) {
    const { data, error } = await fn(offset, PAGE);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}
function pairKey(a, b) { return [a,b].sort().join("_"); }
function score(aA, aB, qs) {
  let tw = 0, ts = 0;
  for (const q of qs) {
    const a = aA[q.id], b = aB[q.id];
    if (!a || !b) continue;
    const d = Math.abs(a - b);
    if (q.isDealbreaker && d >= 2) return null;
    ts += (q.weight||1) * (1 - d/3); tw += q.weight||1;
  }
  return tw === 0 ? 0 : Math.round((ts/tw)*100);
}
function parseAt(v) {
  if (!v) return new Set();
  if (v==="both") return new Set(["men","women"]);
  return new Set(v.split(",").map(s=>s.trim().toLowerCase()));
}
function canDate(u1,u2) {
  const g1=u1.gender, g2=u2.gender;
  if (!g1||!g2) return false;
  const l1=g1==="male"?"men":g1==="female"?"women":null;
  const l2=g2==="male"?"men":g2==="female"?"women":null;
  if (!l1||!l2) return false;
  const a1=parseAt(u1.attracted_to), a2=parseAt(u2.attracted_to);
  return (a1.size>0?a1.has(l2):g1!==g2) && (a2.size>0?a2.has(l1):g1!==g2);
}
function buildPairs(users, qs, mode="friends") {
  const pairs = [];
  for (let i=0;i<users.length;i++) for (let j=i+1;j<users.length;j++) {
    const u1=users[i], u2=users[j];
    if (mode==="dating" && !canDate(u1,u2)) continue;
    const s = score(u1.answers, u2.answers, qs);
    if (s===null) continue;
    const [a,b]=[u1.id,u2.id].sort();
    pairs.push({a,b,s});
  }
  pairs.sort((x,y)=>y.s-x.s||x.a.localeCompare(y.a));
  return pairs;
}
function pick(pairs, excl) {
  const chosen=[], used=new Set();
  for (const p of pairs) {
    const k=pairKey(p.a,p.b);
    if (excl.has(k)||used.has(p.a)||used.has(p.b)) continue;
    chosen.push(p); used.add(p.a); used.add(p.b); excl.add(k);
  }
  return chosen;
}

async function main() {
  console.log(`\n=== DRY-RUN MATCHING (paid attendees, pre-event preview) ===`);
  console.log(`Event: ${EVENT_ID}\n`);

  const {data:event} = await sb.from("events")
    .select("id,title,payment_required,category").eq("id",EVENT_ID).maybeSingle();
  if (!event) { console.error("Event not found"); process.exit(1); }
  const isDating = event.category==="dating";
  const payReq = event.payment_required !== false;
  console.log(`"${event.title}" | category=${event.category} | payment_required=${payReq}`);

  // Load paid attendees (no checked_in filter — pre-event preview)
  let q = sb.from("event_attendees").select("profile_id,payment_status").eq("event_id",EVENT_ID);
  if (payReq) q = q.eq("payment_status","paid");
  const {data:atRows} = await q;
  const attendeeIds = [...new Set((atRows||[]).map(a=>a.profile_id))];
  console.log(`Paid attendees: ${attendeeIds.length}`);

  const gById=new Map(), atById=new Map(), nById=new Map();
  if (attendeeIds.length) {
    const {data:profiles} = await sb.from("profiles")
      .select("id,display_name,name,gender,attracted_to").in("id",attendeeIds);
    (profiles||[]).forEach(p=>{
      gById.set(p.id,(p.gender||"?").toLowerCase());
      atById.set(p.id,p.attracted_to||"");
      nById.set(p.id,p.display_name||p.name||p.id.slice(0,8));
    });
  }

  const {data:eqRows} = await sb.from("event_questions")
    .select("id,prompt,weight").eq("event_id",EVENT_ID).order("sort_order",{ascending:true});
  const qs = (eqRows||[]).map(q=>({id:String(q.id),text:q.prompt,weight:Number(q.weight??1),isDealbreaker:false}));
  console.log(`Questions configured: ${qs.length}`);
  if (!qs.length) { console.error("No questions — cannot match."); process.exit(1); }

  const answerRows = await fetchAll((o,l)=>
    sb.from("answers").select("profile_id,event_question_id,question_id,answer")
      .eq("event_id",EVENT_ID).range(o,o+l-1)
  );
  console.log(`Answer rows: ${answerRows.length}`);

  const abp = new Map();
  for (const row of answerRows) {
    const pid = String(row.profile_id);
    if (!attendeeIds.includes(pid)) continue;
    const qid = String(row.event_question_id??row.question_id);
    const v = row.answer;
    const n = typeof v==="number"?v:typeof v?.value==="number"?v.value:null;
    if (!(n>=1&&n<=4)) continue;
    if (!abp.has(pid)) abp.set(pid,{});
    abp.get(pid)[qid]=n;
  }

  const withA = attendeeIds.filter(id=>abp.has(id));
  const noA   = attendeeIds.filter(id=>!abp.has(id));
  console.log(`\nWith answers:    ${withA.length}`);
  if (noA.length) {
    console.log(`Without answers: ${noA.length}`);
    noA.forEach(id=>console.log(`  - ${nById.get(id)||id} (${gById.get(id)})`));
  }

  if (isDating) {
    const m=withA.filter(id=>gById.get(id)==="male");
    const f=withA.filter(id=>gById.get(id)==="female");
    const o=withA.filter(id=>!["male","female"].includes(gById.get(id)));
    console.log(`\nGender: ${m.length} male, ${f.length} female${o.length?`, ${o.length} other/unknown`:""}`);
    console.log(`Male names:   ${m.map(id=>nById.get(id)).join(", ")}`);
    console.log(`Female names: ${f.map(id=>nById.get(id)).join(", ")}`);
  }

  const users = withA.map(id=>({id,name:nById.get(id)||id,gender:gById.get(id),attracted_to:atById.get(id),answers:abp.get(id)}));
  const globalEx = new Set();

  for (let round=1;round<=3;round++) {
    console.log(`\n${"─".repeat(65)}\nROUND ${round}\n${"─".repeat(65)}`);
    let pairs, matchTypes={};
    if (isDating) {
      const excl=new Set(globalEx);
      const datePairs=pick(buildPairs(users,qs,"dating"),excl);
      const mp1=new Set();
      datePairs.forEach(p=>{matchTypes[pairKey(p.a,p.b)]="date";mp1.add(p.a);mp1.add(p.b);});
      const unm=users.filter(u=>!mp1.has(u.id));
      const friendPairs=unm.length>=2?pick(buildPairs(unm,qs,"friends"),excl):[];
      friendPairs.forEach(p=>{matchTypes[pairKey(p.a,p.b)]="friend";});
      pairs=[...datePairs,...friendPairs];
    } else {
      const excl=new Set(globalEx);
      pairs=pick(buildPairs(users,qs,"friends"),excl);
    }
    pairs.forEach(p=>globalEx.add(pairKey(p.a,p.b)));

    if (!pairs.length) { console.log("  (no pairs possible)"); continue; }

    const ms=new Set(pairs.flatMap(p=>[p.a,p.b]));
    pairs.forEach((p,i)=>{
      const na=nById.get(p.a)||p.a.slice(0,8), nb=nById.get(p.b)||p.b.slice(0,8);
      const ga=gById.get(p.a)||"?", gb=gById.get(p.b)||"?";
      const t=isDating?` [${matchTypes[pairKey(p.a,p.b)]||"date"}]`:"";
      console.log(`  ${i+1}. ${na} (${ga}) ↔ ${nb} (${gb})  score: ${p.s}${t}`);
    });

    const unm=withA.filter(id=>!ms.has(id));
    if (unm.length) {
      console.log(`\n  Unmatched (${unm.length}):`);
      unm.forEach(id=>console.log(`    - ${nById.get(id)||id.slice(0,8)} (${gById.get(id)||"?"})`));
    }
  }

  console.log(`\n${"═".repeat(65)}\nDRY RUN COMPLETE — nothing written to DB.\n${"═".repeat(65)}\n`);
}
main().catch(e=>{console.error(e);process.exit(1);});
