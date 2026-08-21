"use client";
import { useEffect, useMemo, useState } from "react";

type Hazard="BRIDGE_DAMAGED"|"TRAIL_BLOCKED"|"WATER_SOURCE_DRY"|"SHELTER_UNAVAILABLE";
type Report={id:string;hazard:Hazard;note:string;status:"PENDING"|"SYNCED"};
type Friend={id:string;name:string;distance:number|null;lastSeen:string;status:"NEARBY"|"SEPARATED"|"UNKNOWN"};
type Coordinate=[number,number];
type MapPoint={id:string;type:"TRAILHEAD"|"WATER"|"SHELTER"|"DISRUPTION"|"CROSSING"|"LANDMARK"|"DESTINATION";name:string;coordinate:Coordinate;source:string;status:string};
type MapRoute={id:string;name:string;relationId:number;classification:"PREFERRED_DEMO_BASELINE"|"MAPPED_ALTERNATIVE";recommendation:string;sourceUrl:string;geometry:{type:"LineString";coordinates:Coordinate[]}};
type JourneyPack={schemaVersion:number;packId:string;trailId:string;name:string;distanceKm:number;generatedAt:string;expiresAfterHours:number;routeStatus:string;routeNotice:string;attribution:string;routes:MapRoute[];points:MapPoint[];checkpoints:{id:string;name:string;coordinate:Coordinate}[]};
type UserLocation={coordinate:Coordinate;accuracy:number};
type TrekOption={id:string;name:string;area:string;region:string;duration:string;difficulty:"Easy–moderate"|"Moderate"|"Moderate–difficult"|"Difficult";relationId?:number;packFile?:string;status:"READY"|"PLANNED";note:string};
type SignedInUser={displayName:string;email:string};

const labels:Record<Hazard,string>={BRIDGE_DAMAGED:"Bridge damaged",TRAIL_BLOCKED:"Trail blocked",WATER_SOURCE_DRY:"Water source dry",SHELTER_UNAVAILABLE:"Shelter unavailable"};
const pointLabels:Record<MapPoint["type"],string>={TRAILHEAD:"Start",WATER:"Water",SHELTER:"Shelter",DISRUPTION:"Disruption",CROSSING:"Crossing",LANDMARK:"Landmark",DESTINATION:"Destination"};
const key="raahi_reports";
const packKey=(trailId:string)=>trailId==="TRIUND"?"triund-current":`${trailId.toLowerCase()}-current`;
const trekOptions:TrekOption[]=[
 {id:"TRIUND",name:"Triund Trek",area:"McLeod Ganj · Dharamshala",region:"Himachal Pradesh",duration:"1–2 days",difficulty:"Easy–moderate",relationId:15522720,packFile:"/triund-pack.json",status:"READY",note:"Full Raahi demo with Exasol evidence and an offline route pack."},
 {id:"HAMPTA",name:"Hampta Pass",area:"Manali · Chatru",region:"Himachal Pradesh",duration:"4–5 days",difficulty:"Moderate",relationId:11230779,packFile:"/hampta-pack.json",status:"READY",note:"Downloadable OSM route baseline with mapped crossings and pass; field verification remains required."},
 {id:"KEDARKANTHA",name:"Kedarkantha",area:"Sankri · Govind Wildlife Sanctuary",region:"Uttarakhand",duration:"4–6 days",difficulty:"Moderate",status:"PLANNED",note:"Popular summit itinerary; winter conditions require current local guidance."},
 {id:"VALLEY_FLOWERS",name:"Valley of Flowers",area:"Govindghat · Ghangaria",region:"Uttarakhand",duration:"4–6 days",difficulty:"Moderate",status:"PLANNED",note:"Seasonal national-park trek; access and opening status must be confirmed."},
 {id:"SANDAKPHU",name:"Sandakphu–Phalut",area:"Manebhanjan · Singalila Ridge",region:"West Bengal",duration:"5–7 days",difficulty:"Moderate",status:"PLANNED",note:"Long ridge route; offline pack will include route alternatives and settlements."},
 {id:"TAWANG",name:"Tawang–Mago",area:"Tawang · Mago Valley",region:"Arunachal Pradesh",duration:"5–7 days",difficulty:"Moderate–difficult",status:"PLANNED",note:"Remote route where permits and verified local logistics are essential."},
 {id:"GOECHALA",name:"Goechala",area:"Yuksom · Kanchenjunga landscape",region:"Sikkim",duration:"8–11 days",difficulty:"Difficult",status:"PLANNED",note:"Multi-day high-altitude route; pack needs permit and seasonal-access checks."},
 {id:"KUMARA_PARVATHA",name:"Kumara Parvatha",area:"Kukke Subramanya · Pushpagiri",region:"Karnataka",duration:"2 days",difficulty:"Moderate–difficult",status:"PLANNED",note:"Western Ghats trek; entry rules and water availability need recent verification."}
];
const defaultFriends:Friend[]=[
 {id:"M01",name:"Aarav",distance:18,lastSeen:"Just now",status:"NEARBY"},
 {id:"M02",name:"Meera",distance:42,lastSeen:"1 min ago",status:"NEARBY"},
 {id:"M03",name:"Kabir",distance:null,lastSeen:"8 min ago · Forest Bend",status:"SEPARATED"}
];

function openOfflineDb(){
 return new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open("raahi-offline",1);
  request.onupgradeneeded=()=>request.result.createObjectStore("journey-packs");
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}

async function readPack(trailId:string){
 const db=await openOfflineDb();
 return new Promise<JourneyPack|null>((resolve,reject)=>{
  const transaction=db.transaction("journey-packs");
  const request=transaction.objectStore("journey-packs").get(packKey(trailId));
  request.onsuccess=()=>{const pack=request.result as JourneyPack|undefined;resolve(pack?.schemaVersion===2&&pack.trailId===trailId?pack:null)};
  request.onerror=()=>reject(request.error);
  transaction.oncomplete=()=>db.close();
 });
}

async function storePack(pack:JourneyPack){
 const db=await openOfflineDb();
 return new Promise<void>((resolve,reject)=>{
  const transaction=db.transaction("journey-packs","readwrite");
  transaction.objectStore("journey-packs").put(pack,packKey(pack.trailId));
  transaction.oncomplete=()=>{db.close();resolve()};
  transaction.onerror=()=>reject(transaction.error);
 });
}

function haversine(a:Coordinate,b:Coordinate){
 const toRad=(value:number)=>value*Math.PI/180;
 const dLat=toRad(b[1]-a[1]),dLon=toRad(b[0]-a[0]);
 const lat1=toRad(a[1]),lat2=toRad(b[1]);
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

function OfflineRouteMap({pack,selectedRouteId,onRouteChange,location,onLocate}:{pack:JourneyPack;selectedRouteId:string;onRouteChange:(id:string)=>void;location:UserLocation|null;onLocate:()=>void}){
 const selectedRoute=pack.routes.find(route=>route.id===selectedRouteId)??pack.routes[0];
 const all=[...pack.routes.flatMap(route=>route.geometry.coordinates),...pack.points.map(point=>point.coordinate)];
 const lons=all.map(point=>point[0]),lats=all.map(point=>point[1]);
 const minLon=Math.min(...lons),maxLon=Math.max(...lons),minLat=Math.min(...lats),maxLat=Math.max(...lats);
 const padX=(maxLon-minLon)*.08,padY=(maxLat-minLat)*.08;
 const project=([lon,lat]:Coordinate):[number,number]=>[
  40+920*(lon-(minLon-padX))/((maxLon+padX)-(minLon-padX)),
  480-440*(lat-(minLat-padY))/((maxLat+padY)-(minLat-padY))
 ];
 const userProjected=location?project(location.coordinate):null;
 const inBounds=location&&location.coordinate[0]>=minLon-padX&&location.coordinate[0]<=maxLon+padX&&location.coordinate[1]>=minLat-padY&&location.coordinate[1]<=maxLat+padY;
 const distanceFromRoute=location?Math.min(...selectedRoute.geometry.coordinates.filter((_,index)=>index%8===0).map(point=>haversine(location.coordinate,point))):null;
 return <div className="offline-map-wrap">
  <div className="route-picker" aria-label="Mapped route alternatives">{pack.routes.map(route=><button key={route.id} className={route.id===selectedRoute.id?"selected":""} onClick={()=>onRouteChange(route.id)}><span>{route.classification==="PREFERRED_DEMO_BASELINE"?"Preferred demo route":"Mapped alternative"}</span><strong>{route.name}</strong></button>)}</div>
  <svg className="offline-map" viewBox="0 0 1000 520" role="img" aria-label={`Downloaded ${pack.name} route with traceable mapped points`}>
   <defs><linearGradient id="terrain-fill" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#bfd9c8"/><stop offset="1" stopColor="#779f88"/></linearGradient></defs>
   <rect width="1000" height="520" fill="url(#terrain-fill)"/>
   {[90,160,235,315,400].map((y,index)=><path key={y} className="map-contour" d={`M-30 ${y} C 170 ${y-65+index*7}, 290 ${y+55}, 490 ${y-5} S 800 ${y-60}, 1040 ${y+15}`}/>) }
   {pack.routes.map(route=>{const points=route.geometry.coordinates.map(point=>project(point).join(",")).join(" ");return <polyline key={route.id} className={route.id===selectedRoute.id?"route-line route-selected":"route-line route-alternative"} points={points}/>})}
   {selectedRoute.id==="GALU_TRIUND"&&pack.checkpoints.slice(1,-1).map((checkpoint,index)=>{const [x,y]=project(checkpoint.coordinate);return <g key={checkpoint.id} className="checkpoint"><circle cx={x} cy={y} r="5"/><text x={x+9} y={y-8}>{index+1}</text></g>})}
   {pack.points.map(point=>{const [x,y]=project(point.coordinate);return <g key={point.id} className={`map-pin pin-${point.type.toLowerCase()}`} transform={`translate(${x} ${y})`}><title>{point.name} · {pointLabels[point.type]} · {point.status.replaceAll("_"," ").toLowerCase()}</title><circle r={point.type==="DISRUPTION"?15:11}/><text className="pin-symbol" textAnchor="middle" y="4">{point.type==="DISRUPTION"?"!":point.type==="WATER"?"W":point.type==="SHELTER"?"S":point.type==="CROSSING"?"B":point.type==="LANDMARK"?"▲":"●"}</text><text className="pin-label" x="18" y="4">{point.name}</text></g>})}
   {userProjected&&inBounds&&<g className="user-pin" transform={`translate(${userProjected[0]} ${userProjected[1]})`}><circle className="user-pulse" r="18"/><circle r="8"/><text x="13" y="4">You</text></g>}
  </svg>
  <div className="map-status"><span className="offline-ready">✓ Available offline</span><button onClick={onLocate}>◎ {location?"Update position":"Locate me"}</button></div>
  {location&&<p className={inBounds?"location-note":"location-note location-warning"}>{inBounds?`GPS accuracy ±${Math.round(location.accuracy)} m · approximately ${Math.round(distanceFromRoute??0)} m from the route baseline`:`Your position is outside this downloaded route area · GPS accuracy ±${Math.round(location.accuracy)} m`}</p>}
  <div className="route-note"><strong>{selectedRoute.name}</strong><span>{selectedRoute.recommendation}</span><a href={selectedRoute.sourceUrl} target="_blank" rel="noreferrer">View mapped relation</a></div>
 </div>
}

export default function RaahiApp({user}:{user:SignedInUser|null}){
 const [view,setView]=useState<"journey"|"party"|"report"|"evidence">("journey");
 const [sessionStarted,setSessionStarted]=useState(Boolean(user)),[journeyStarted,setJourneyStarted]=useState(false);
 const [online,setOnline]=useState(true),[pace,setPace]=useState(71),[daylight,setDaylight]=useState(58),[battery,setBattery]=useState(16);
 const [hazard,setHazard]=useState<Hazard>("BRIDGE_DAMAGED"),[note,setNote]=useState(""),[reports,setReports]=useState<Report[]>([]),[toast,setToast]=useState("");
 const [friends,setFriends]=useState<Friend[]>(defaultFriends),[scanning,setScanning]=useState(false),[regroup,setRegroup]=useState("Forest Bend shelter");
 const [pack,setPack]=useState<JourneyPack|null>(null),[packLoading,setPackLoading]=useState(false),[selectedRouteId,setSelectedRouteId]=useState("GALU_TRIUND"),[location,setLocation]=useState<UserLocation|null>(null),[selectedTrekId,setSelectedTrekId]=useState("TRIUND");
 useEffect(()=>{try{setReports(JSON.parse(localStorage.getItem(key)||"[]"))}catch{} readPack("TRIUND").then(setPack).catch(()=>undefined);if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined)},[]);
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(reports))},[reports]);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);setOnline(navigator.onLine);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
 const pending=reports.filter(r=>r.status==="PENDING").length,corroborating=2+reports.filter(r=>r.status==="SYNCED").length;
 const selectedTrek=trekOptions.find(trek=>trek.id===selectedTrekId)??trekOptions[0];
 const displayPack=pack?.schemaVersion===2&&pack.trailId===selectedTrek.id?pack:null;
 const flags=useMemo(()=>[
  daylight<90&&daylight+" min daylight buffer before shelter",
  pace<75&&pace+"% of planned pace",
  battery<20&&battery+"% battery remaining",
  corroborating>=2&&corroborating+" corroborating bridge reports"
 ].filter(Boolean) as string[],[daylight,pace,battery,corroborating]);
 async function downloadPack(){
  if(!online){setToast(displayPack?`The downloaded ${selectedTrek.name} map is ready to use offline.`:`Connect once to download the ${selectedTrek.name} journey map.`);return}
  if(!selectedTrek.packFile){setToast(`${selectedTrek.name} is available for planning, but its verified offline pack is not ready yet.`);return}
  setPackLoading(true);
  try{const response=await fetch(selectedTrek.packFile,{cache:"no-store"});if(!response.ok)throw new Error();const next=await response.json() as JourneyPack;if(next.trailId!==selectedTrek.id)throw new Error();await storePack(next);setPack(next);setSelectedRouteId(next.routes[0]?.id??"");setToast(`${selectedTrek.name} route, checkpoints and traceable mapped points are now available offline.`)}
  catch{setToast("The journey map could not be downloaded. Please try again while connected.")}
  finally{setPackLoading(false)}
 }
 function locate(){
  if(!navigator.geolocation){setToast("Location is not supported on this device.");return}
  navigator.geolocation.getCurrentPosition(position=>setLocation({coordinate:[position.coords.longitude,position.coords.latitude],accuracy:position.coords.accuracy}),()=>setToast("Location permission is needed to show your position on the offline map."),{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
 }
 function save(){setReports(v=>[...v,{id:crypto.randomUUID(),hazard,note:note||labels[hazard],status:"PENDING"}]);setNote("");setToast("Saved offline. It will sync when you reconnect.")}
 function sync(){if(!online){setToast("You are offline. The report remains on this device.");return}setReports(v=>v.map(r=>({...r,status:"SYNCED"})));setToast("Reports synchronized without duplicates.")}
 function scanParty(){setScanning(true);setTimeout(()=>{setFriends(v=>v.map(f=>f.id==="M03"?{...f,distance:86,lastSeen:"Just spotted · south-east",status:"NEARBY"}:f));setScanning(false);setToast("Kabir was spotted through the offline party beacon.")},900)}
 async function chooseTrek(trek:TrekOption){setSelectedTrekId(trek.id);setLocation(null);const saved=await readPack(trek.id).catch(()=>null);setPack(saved);if(saved)setSelectedRouteId(saved.routes[0]?.id??"");setToast(saved?`${trek.name} selected. Its saved map is ready offline.`:trek.status==="READY"?`${trek.name} selected. Download its map once to use it offline.`:`${trek.name} selected for planning. Its verified offline pack is coming next.`)}
 if(!sessionStarted)return <main className="onboarding-shell"><section className="login-card"><div className="login-brand"><img src="/raahi-logo.png" alt="Raahi"/><div><p className="eyebrow">RAAHI</p><small>Offline mountain decision support</small></div></div><div className="login-copy"><p className="eyebrow amber">PLAN BEFORE THE SIGNAL ENDS</p><h1>Choose your trek. Carry the route offline.</h1><p>Open the demo, select where you are going, then download the mapped route and traceable checkpoints to this device.</p></div><button className="signin-primary" onClick={()=>setSessionStarted(true)}>Enter Raahi demo</button><p className="auth-note">Demo access does not create an account. Production authentication will be added before storing personal journeys.</p></section><aside className="login-steps" aria-label="How Raahi works"><div><strong>01</strong><span>Enter</span><small>Open your journey workspace</small></div><div><strong>02</strong><span>Choose a trek</span><small>Triund or Hampta Pass are ready</small></div><div><strong>03</strong><span>Download the map</span><small>Use the route without network</small></div></aside></main>;
 if(!journeyStarted)return <main className="onboarding-shell choose-shell"><section className="choose-panel"><header className="choose-header"><div className="login-brand"><img src="/raahi-logo.png" alt="Raahi"/><div><p className="eyebrow">RAAHI</p><small>{user?`Signed in as ${user.displayName}`:"Local demo"}</small></div></div>{user?<a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>:<button onClick={()=>setSessionStarted(false)}>Exit demo</button>}</header><div className="choose-title"><p className="eyebrow amber">STEP 2 OF 3</p><h1>Which trek are you planning?</h1><p>Select a trek with an available offline pack to continue to its map.</p></div><div className="onboarding-treks">{trekOptions.map(trek=>{const selected=trek.id===selectedTrekId;return <button key={trek.id} className={`${selected?"selected ":""}${trek.status==="PLANNED"?"planned":""}`} onClick={()=>trek.status==="READY"&&chooseTrek(trek)} disabled={trek.status==="PLANNED"} aria-pressed={selected}><span className="trek-choice-check">{selected?"✓":""}</span><div><small>{trek.region}</small><strong>{trek.name}</strong><p>{trek.area}</p><em>{trek.duration} · {trek.difficulty}</em></div><b>{trek.status==="READY"?"Offline map ready":"Coming soon"}</b></button>})}</div><footer className="choose-footer"><div><small>SELECTED TREK</small><strong>{selectedTrek.name}</strong><span>{selectedTrek.status==="READY"?"Route pack available":"Pack is still being verified"}</span></div><button disabled={selectedTrek.status!=="READY"} onClick={()=>setJourneyStarted(true)}>Continue to {selectedTrek.name} map →</button></footer></section></main>;
 return <main className="app-shell">
  <header className="topbar"><img className="brand-logo" src="/raahi-logo.png" alt="Raahi"/><div><p className="eyebrow">RAAHI</p><p className="subtle">{selectedTrek.name} · {displayPack?"journey map saved on this device":"offline map ready to download"}</p></div><button className="change-trek" onClick={()=>setJourneyStarted(false)}>Change trek</button><button className={online?"online-pill":"offline-pill"} onClick={()=>setOnline(v=>!v)}>● {online?"Online":"Offline"}</button></header>
  <div className="workspace-layout"><nav className="side-nav" aria-label="Main navigation"><div><p className="eyebrow">JOURNEY MENU</p><small>Keep the essentials close.</small></div>{(["journey","party","report","evidence"] as const).map((v,index)=><button key={v} className={view===v?"active":""} onClick={()=>setView(v)}><span>{String(index+1).padStart(2,"0")}</span><strong>{v==="journey"?"My journey":v==="party"?"Trail party":v==="report"?"Report a change":"Trust receipt"}</strong></button>)}<p className="side-note">Decision support only.<br/>Follow official guidance.</p></nav><div className="workspace-content">
  {view==="journey"&&<section className="hero-grid">
   <article className="map-card"><div className="map-heading"><div><p className="eyebrow">{selectedTrek.name.toUpperCase()} · {displayPack?`${displayPack.distanceKm} KM MAPPED`:selectedTrek.duration.toUpperCase()}</p><h1>{displayPack?`Explore the downloaded ${selectedTrek.name} baseline.`:`Download the ${selectedTrek.name} route pack.`}</h1></div><span className="weather">Conditions unverified</span></div>{displayPack?<OfflineRouteMap pack={displayPack} selectedRouteId={selectedRouteId} onRouteChange={setSelectedRouteId} location={location} onLocate={locate}/>:<div className="download-map"><div className="download-map-copy"><span className="download-icon">↓</span><p className="eyebrow">OFFLINE JOURNEY MAP</p><h2>Save {selectedTrek.name} before you leave.</h2><p>{selectedTrek.id==="HAMPTA"?"Download the traceable OSM hiking relation, six route checkpoints, two mapped bridge crossings and Hamta Pass. Shelters and water points are omitted until they can be verified.":"Save the mapped Triund approaches, five checkpoints, traceable shelter and water features, and the current demonstration disruption."}</p><button onClick={downloadPack} disabled={packLoading||!selectedTrek.packFile}>{packLoading?"Preparing journey map…":selectedTrek.packFile?`Download ${selectedTrek.name} map`:"Verified pack not ready"}</button><small>OpenStreetMap baseline · route and field features remain unverified until confirmed locally</small></div></div>}<div className="legend"><span><i className="safe-dot"/>Selected route</span><span><i className="alternate-dot"/>Mapped alternative</span><span><i className="risk-dot"/>Important mapped point</span>{displayPack&&<button className="refresh-pack" onClick={downloadPack} disabled={packLoading}>{packLoading?"Updating…":"Update map"}</button>}</div>{displayPack&&<div className="pack-receipt"><span><strong>{displayPack.routes.length}</strong> mapped routes</span><span><strong>{displayPack.checkpoints.length}</strong> checkpoints</span><span><strong>{displayPack.points.length}</strong> traceable points</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{displayPack.attribution}</a><p>{displayPack.routeNotice}</p></div>}</article>
   <aside className="decision-card"><p className="eyebrow amber">{selectedTrek.id==="TRIUND"?`DECISION CHECKPOINT · ${flags.length} FLAGS`:"HAMPTA EVIDENCE STATUS"}</p><h2>{selectedTrek.id==="TRIUND"?"Your original plan needs another look.":"Route downloaded. Conditions still need verification."}</h2><p className="decision-copy">{selectedTrek.id==="TRIUND"?"Exasol-driven rules saved in your offline pack detected changed assumptions.":"The Hampta pack currently contains mapped geometry only. Raahi has not verified current weather, crossings, shelters, water, permits or trail access."}</p>{selectedTrek.id==="TRIUND"?<><ul className="signal-list">{flags.map((f,i)=><li key={f}><strong>{i+1}</strong><span>{f}</span></li>)}</ul><button onClick={()=>setView("evidence")}>Review the evidence</button></>:<ul className="signal-list"><li><strong>1</strong><span>Check the Himachal trekking portal and current permit requirements</span></li><li><strong>2</strong><span>Confirm the route with a qualified local guide and recent GPX</span></li><li><strong>3</strong><span>Verify camps, water and both mapped crossings before departure</span></li></ul>}<p className="disclaimer">Decision support only. Follow official guidance and local conditions.</p></aside>
   <article className="controls-card"><label>Pace <strong>{pace}%</strong><input type="range" min="40" max="110" value={pace} onChange={e=>setPace(+e.target.value)}/></label><label>Daylight <strong>{daylight} min</strong><input type="range" min="20" max="180" value={daylight} onChange={e=>setDaylight(+e.target.value)}/></label><label>Battery <strong>{battery}%</strong><input type="range" min="5" max="100" value={battery} onChange={e=>setBattery(+e.target.value)}/></label></article>
   <section className="trek-catalog" aria-labelledby="trek-catalog-title"><div className="catalog-heading"><div><p className="eyebrow amber">CHOOSE YOUR TREK</p><h2 id="trek-catalog-title">Where are you heading?</h2></div><p>Triund and Hampta Pass now have downloadable offline baselines. Other destinations remain in planning until their routes and field points are verified.</p></div><div className="selected-trek"><span>YOUR SELECTED TREK</span><div><strong>{selectedTrek.name}</strong><small>{selectedTrek.region} · {selectedTrek.duration} · {selectedTrek.difficulty}</small></div><em>{selectedTrek.status==="READY"?"Offline map ready":"Planning mode"}</em></div><div className="trek-options">{trekOptions.map((trek,index)=>{const selected=trek.id===selectedTrekId;return <article key={trek.id} className={`trek-option${trek.status==="READY"?" ready":""}${selected?" selected":""}`}><div className="trek-card-top"><div className="trek-number">{String(index+1).padStart(2,"0")}</div><span className={trek.status==="READY"?"trek-status ready":"trek-status"}>{trek.status==="READY"?"Offline pack ready":"Pack planned"}</span></div><div><h3>{trek.name}</h3><p>{trek.area}</p><div className="trek-meta"><span>{trek.region}</span><span>{trek.duration}</span><span>{trek.difficulty}</span></div><small>{trek.note}</small></div><div className="trek-actions"><button onClick={()=>chooseTrek(trek)} aria-pressed={selected}>{selected?"Selected":"Choose trek"}</button>{trek.relationId&&<a href={`https://www.openstreetmap.org/relation/${trek.relationId}`} target="_blank" rel="noreferrer">Map source ↗</a>}</div></article>})}</div><p className="catalog-note">An offline baseline is not proof that a route is open or suitable. Before departure, use recent GPX traces and confirm routes, shelters, water points, crossings and access restrictions with authorities or a qualified local guide.</p></section>
  </section>}
  {view==="party"&&<section className="panel-grid party-layout"><article className="form-card"><p className="eyebrow amber">OFFLINE TRAIL PARTY</p><h1>Keep your group within reach.</h1><p>Raahi exchanges short-lived proximity beacons between paired phones. No internet or live location upload is required.</p><div className="party-radar" aria-label="Offline friend proximity view"><span className="radar-ring ring-one"/><span className="radar-ring ring-two"/><span className="radar-you">You</span>{friends.map((f,i)=><span key={f.id} className={"radar-friend friend-"+i}>{f.name[0]}</span>)}</div><button className="primary" onClick={scanParty} disabled={scanning}>{scanning?"Listening for nearby beacons…":"Spot nearby friends"}</button><p className="prototype-note">Prototype simulation. Production tracking requires a native BLE implementation and foreground/background permission.</p></article><aside className="queue-card"><p className="eyebrow">YOUR GROUP · 4</p><ul className="friend-list">{friends.map(f=><li key={f.id}><span><strong>{f.name}</strong><small>{f.lastSeen}</small></span><em className={f.status.toLowerCase()}>{f.distance===null?"Out of range":f.distance+" m"}</em></li>)}</ul><label className="field-label">Regroup point<select value={regroup} onChange={e=>setRegroup(e.target.value)}><option>Forest Bend shelter</option><option>Magic View checkpoint</option><option>Gallu trailhead</option></select></label><div className="regroup-card"><span>Agreed regroup point</span><strong>{regroup}</strong><small>Saved in every member’s offline journey pack</small></div></aside></section>}
  {view==="report"&&<section className="panel-grid"><article className="form-card"><p className="eyebrow amber">COMMUNITY BREADCRUMB</p><h1>What changed?</h1><p>Reports remain on this device offline and synchronize using a unique ID.</p><div className="hazard-options">{(Object.keys(labels) as Hazard[]).map(h=><button key={h} className={hazard===h?"selected":""} onClick={()=>setHazard(h)}>{labels[h]}</button>)}</div><label className="field-label">Add an observation<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="The bridge after Forest Bend is partially damaged."/></label><button className="primary" onClick={save}>Save report offline</button></article><aside className="queue-card"><p className="eyebrow">SYNC QUEUE</p><strong className="queue-number">{pending}</strong><p>reports waiting on this device</p><button disabled={!pending} onClick={sync}>Synchronize now</button><ul>{reports.slice().reverse().map(r=><li key={r.id}><span>{labels[r.hazard]}</span><em className={r.status.toLowerCase()}>{r.status}</em></li>)}</ul></aside></section>}
  {view==="evidence"&&<section className="panel-grid"><article className="form-card"><p className="eyebrow amber">TRUST RECEIPT · FOREST BEND</p><h1>Evidence is clearer. The news is not better.</h1><div className="score-row"><div><strong>{Math.min(96,45+corroborating*13)}%</strong><span>Evidence confidence</span></div><div><strong>{Math.min(100,corroborating*40)}</strong><span>Hazard points</span></div><div><strong>{corroborating}</strong><span>Matching reports</span></div></div><p className="explanation">Independent GPS-confirmed observations agree that the bridge is damaged. Agreement increases confidence in the information while worsening the segment condition.</p></article><aside className="queue-card"><p className="eyebrow">SEGMENT CONDITION</p><div className="condition">Significant disruption</div><ul><li><span>Source</span><em>GPS-confirmed</em></li><li><span>Information age</span><em>2 hours</em></li><li><span>Fallback</span><em>Forest shelter</em></li></ul></aside></section>}
  </div></div>
  {toast&&<button className="toast" onClick={()=>setToast("")}>{toast}<span>×</span></button>}
 </main>
}
