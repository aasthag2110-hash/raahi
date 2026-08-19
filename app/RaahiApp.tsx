"use client";
import { useEffect, useMemo, useState } from "react";

type Hazard="BRIDGE_DAMAGED"|"TRAIL_BLOCKED"|"WATER_SOURCE_DRY"|"SHELTER_UNAVAILABLE";
type Report={id:string;hazard:Hazard;note:string;status:"PENDING"|"SYNCED"};
const labels:Record<Hazard,string>={BRIDGE_DAMAGED:"Bridge damaged",TRAIL_BLOCKED:"Trail blocked",WATER_SOURCE_DRY:"Water source dry",SHELTER_UNAVAILABLE:"Shelter unavailable"};
const key="raahi_reports";

export default function RaahiApp(){
 const [view,setView]=useState<"journey"|"report"|"evidence">("journey");
 const [online,setOnline]=useState(true),[pace,setPace]=useState(71),[daylight,setDaylight]=useState(58),[battery,setBattery]=useState(16);
 const [hazard,setHazard]=useState<Hazard>("BRIDGE_DAMAGED"),[note,setNote]=useState(""),[reports,setReports]=useState<Report[]>([]),[toast,setToast]=useState("");
 useEffect(()=>{try{setReports(JSON.parse(localStorage.getItem(key)||"[]"))}catch{} if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined)},[]);
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(reports))},[reports]);
 const pending=reports.filter(r=>r.status==="PENDING").length, corroborating=2+reports.filter(r=>r.status==="SYNCED").length;
 const flags=useMemo(()=>[
  daylight<90&&daylight+" min daylight buffer before shelter",
  pace<75&&pace+"% of planned pace",
  battery<20&&battery+"% battery remaining",
  corroborating>=2&&corroborating+" corroborating bridge reports"
 ].filter(Boolean) as string[],[daylight,pace,battery,corroborating]);
 function save(){setReports(v=>[...v,{id:crypto.randomUUID(),hazard,note:note||labels[hazard],status:"PENDING"}]);setNote("");setToast("Saved offline. It will sync when you reconnect.")}
 function sync(){if(!online){setToast("You are offline. The report remains on this device.");return}setReports(v=>v.map(r=>({...r,status:"SYNCED"})));setToast("Reports synchronized without duplicates.")}
 return <main className="app-shell">
  <header className="topbar"><div className="brand-mark">R</div><div><p className="eyebrow">RAAHI</p><p className="subtle">Triund journey pack · downloaded 07:10</p></div><button className={online?"online-pill":"offline-pill"} onClick={()=>setOnline(v=>!v)}>● {online?"Online":"Offline"}</button></header>
  <nav className="tabs">{(["journey","report","evidence"] as const).map(v=><button key={v} className={view===v?"active":""} onClick={()=>setView(v)}>{v==="journey"?"My journey":v==="report"?"Report a change":"Trust receipt"}</button>)}</nav>
  {view==="journey"&&<section className="hero-grid">
   <article className="map-card"><div className="map-heading"><div><p className="eyebrow">TODAY · 7.8 KM</p><h1>Conditions changed ahead.</h1></div><span className="weather">12°C · Rain</span></div><div className="terrain"><span className="contour contour-one"/><span className="contour contour-two"/><span className="route route-safe"/><span className="route route-risk"/><span className="point point-start">You</span><span className="point point-shelter">Shelter</span><span className="hazard">!</span></div><div className="legend"><span><i className="safe-dot"/>Recently verified</span><span><i className="risk-dot"/>Disruption reported</span></div></article>
   <aside className="decision-card"><p className="eyebrow amber">DECISION CHECKPOINT · {flags.length} FLAGS</p><h2>Your original plan needs another look.</h2><p className="decision-copy">Exasol-driven rules saved in your offline pack detected changed assumptions.</p><ul className="signal-list">{flags.map((f,i)=><li key={f}><strong>{i+1}</strong><span>{f}</span></li>)}</ul><button onClick={()=>setView("evidence")}>Review the evidence</button><p className="disclaimer">Decision support only. Follow official guidance and local conditions.</p></aside>
   <article className="controls-card"><label>Pace <strong>{pace}%</strong><input type="range" min="40" max="110" value={pace} onChange={e=>setPace(+e.target.value)}/></label><label>Daylight <strong>{daylight} min</strong><input type="range" min="20" max="180" value={daylight} onChange={e=>setDaylight(+e.target.value)}/></label><label>Battery <strong>{battery}%</strong><input type="range" min="5" max="100" value={battery} onChange={e=>setBattery(+e.target.value)}/></label></article>
  </section>}
  {view==="report"&&<section className="panel-grid"><article className="form-card"><p className="eyebrow amber">COMMUNITY BREADCRUMB</p><h1>What changed?</h1><p>Reports remain on this device offline and synchronize using a unique ID.</p><div className="hazard-options">{(Object.keys(labels) as Hazard[]).map(h=><button key={h} className={hazard===h?"selected":""} onClick={()=>setHazard(h)}>{labels[h]}</button>)}</div><label className="field-label">Add an observation<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="The bridge after Forest Bend is partially damaged."/></label><button className="primary" onClick={save}>Save report offline</button></article><aside className="queue-card"><p className="eyebrow">SYNC QUEUE</p><strong className="queue-number">{pending}</strong><p>reports waiting on this device</p><button disabled={!pending} onClick={sync}>Synchronize now</button><ul>{reports.slice().reverse().map(r=><li key={r.id}><span>{labels[r.hazard]}</span><em className={r.status.toLowerCase()}>{r.status}</em></li>)}</ul></aside></section>}
  {view==="evidence"&&<section className="panel-grid"><article className="form-card"><p className="eyebrow amber">TRUST RECEIPT · FOREST BEND</p><h1>Evidence is clearer. The news is not better.</h1><div className="score-row"><div><strong>{Math.min(96,45+corroborating*13)}%</strong><span>Evidence confidence</span></div><div><strong>{Math.min(100,corroborating*40)}</strong><span>Hazard points</span></div><div><strong>{corroborating}</strong><span>Matching reports</span></div></div><p className="explanation">Independent GPS-confirmed observations agree that the bridge is damaged. Agreement increases confidence in the information while worsening the segment condition.</p></article><aside className="queue-card"><p className="eyebrow">SEGMENT CONDITION</p><div className="condition">Significant disruption</div><ul><li><span>Source</span><em>GPS-confirmed</em></li><li><span>Information age</span><em>2 hours</em></li><li><span>Fallback</span><em>Forest shelter</em></li></ul></aside></section>}
  {toast&&<button className="toast" onClick={()=>setToast("")}>{toast}<span>×</span></button>}
 </main>
}
