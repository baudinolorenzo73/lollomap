/* LolloMap Pro: shell comune, passaggio dati e bussola offline. */
'use strict';
const PRO={target:null,origin:null,heading:null,lastHeading:0,posTime:0,watch:null,source:'',locked:null,mode:'true',wake:null,ready:false,outbox:[]};
const wrap360=n=>((n%360)+360)%360;
function proBearing(a,b){const r=Math.PI/180,p=a[0]*r,q=b[0]*r,d=(b[1]-a[1])*r;return wrap360(Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d))/r)}
function proValid(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180}
const proEl=id=>document.getElementById(id);
const PRO_SCHEMA='4.1.0',PRO_RESET='lollomap-pro.data-reset-'+PRO_SCHEMA,PRO_OUTBOX='lollomap-pro.outbox';
PRO.version=PRO_SCHEMA;
function proLegacySettings(){return new Promise(resolve=>{if(!('indexedDB'in window))return resolve(null);let q;try{q=indexedDB.open('atlante_lago_piccolo')}catch(e){return resolve(null)}q.onerror=()=>resolve(null);q.onupgradeneeded=()=>{};q.onsuccess=()=>{const d=q.result;if(!d.objectStoreNames.contains('kv')){d.close();return resolve(null)}try{const tx=d.transaction('kv','readonly'),g=tx.objectStore('kv').get('settings');g.onsuccess=()=>{d.close();resolve(g.result&&g.result.v||null)};g.onerror=()=>{d.close();resolve(null)}}catch(e){d.close();resolve(null)}}})}
const proResetPromise=(async()=>{
 if(localStorage.getItem(PRO_RESET))return false;
 const settings=await proLegacySettings();if(settings)localStorage.setItem('lollomap-pro.settings-migrate',JSON.stringify(settings));
 ['stampaMappe.v1.traccia','stampaMappe.v1.punti','stampaMappe.v1.percorso','stampaMappe.v1.reg',PRO_OUTBOX].forEach(k=>localStorage.removeItem(k));
 if('indexedDB'in window)await Promise.all(['atlante_lago_piccolo','lollomap_pro'].map(n=>new Promise(resolve=>{try{const q=indexedDB.deleteDatabase(n);q.onsuccess=q.onerror=q.onblocked=()=>resolve()}catch(e){resolve()}})));
 if('caches'in window){const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('atl-')||/^lollomap-(?!4\.1\.0)/.test(n)||n==='lollomap-zone'||n==='lollomap-viste').map(n=>caches.delete(n)))}
 if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.filter(r=>new URL(r.scope).pathname.includes('/campo/')).map(r=>r.unregister()))}
 localStorage.setItem(PRO_RESET,new Date().toISOString());return true
})();
proResetPromise.then(done=>{if(done){localStorage.setItem('lollomap-pro.reset-notice','1');location.reload();return}if(localStorage.getItem('lollomap-pro.reset-notice')){localStorage.removeItem('lollomap-pro.reset-notice');setTimeout(()=>alertino('Archivio LolloMap Pro unificato: dati e mappe di prova rimossi; configurazione conservata.','ok'),900)}});
const tools=document.createElement('div');tools.id='pro-tools';tools.innerHTML='<button id="pro-field-btn">◈ Campo</button><button id="pro-zone-btn">↓ Zona offline</button><button id="pro-compass-btn">🧭 Bussola</button><button id="pro-sun-btn">☀ Sole</button>';
document.querySelector('#app header').appendChild(tools);
document.querySelector('#app header h1').textContent='LOLLOMAP PRO';document.title='LolloMap Pro';
document.body.insertAdjacentHTML('beforeend',`<section class="pro-view" id="pro-field" hidden aria-label="Strumenti da campo"><div class="pro-bar"><strong>LOLLOMAP PRO / CAMPO</strong><button data-field="cat">Catalogo</button><button data-field="luo">Luogo</button><button data-field="usc">Uscita</button><button data-field="alt">Servizi e backup</button><button id="pro-field-close">✕ Mappa</button></div><iframe id="pro-frame" title="Catalogo e strumenti da campo" allow="geolocation; camera; microphone; accelerometer; gyroscope; magnetometer; fullscreen"></iframe></section>
<section class="pro-view" id="pro-compass" hidden aria-label="Bussola e azimut"><div class="pro-bar"><strong>LOLLOMAP / COMPASS</strong><button id="pro-compass-close">✕ Chiudi</button></div><svg id="pro-dial" viewBox="0 0 400 400" role="img" aria-label="Rosa dei venti"><circle cx="200" cy="200" r="188" fill="none" stroke="var(--pro-cyan)" stroke-width="1"/><g id="pro-rose"></g><g id="pro-arrow"><path d="M200 45 L215 112 L200 100 L185 112Z" fill="var(--pro-pink)"/></g><path d="M200 7 L190 27 L210 27Z" fill="var(--pro-text)"/><circle cx="200" cy="200" r="5" fill="var(--pro-cyan)"/></svg><div id="pro-reading">—</div><p id="pro-status">Attiva i sensori per leggere la direzione.</p><div class="pro-controls"><button id="pro-sensors">Attiva sensori e GPS</button><button id="pro-lock">Blocca lettura</button><select id="pro-north" aria-label="Riferimento nord"><option value="true">Nord geografico</option><option value="mag">Nord magnetico</option></select><button id="pro-fs">⛶ Schermo intero</button></div><div class="pro-controls"><input id="pro-from" placeholder="Partenza: GPS oppure lat, lon" aria-label="Coordinate partenza"><input id="pro-to" placeholder="Destinazione: lat, lon" aria-label="Coordinate destinazione"><button id="pro-calc">Calcola azimut</button><button id="pro-map-target">Usa centro mappa</button><button id="pro-clear">Azzera destinazione</button></div><p id="pro-target-info">Sulla mappa tieni premuto o fai clic destro per scegliere una destinazione.</p><p class="pro-tip">La freccia indica la linea d’aria. La lettura dipende dal sensore: tieni il telefono orizzontale e lontano da metallo e magneti. Il calcolo delle coordinate funziona offline anche senza bussola.</p></section>`);
let fieldPending=null;
function proPost(m){proEl('pro-frame').contentWindow?.postMessage({app:'lollomap-pro',...m},location.origin)}
async function proEnsureField(){await proResetPromise;if(!proEl('pro-frame').getAttribute('src'))proEl('pro-frame').src='campo/index.html'}
async function proField(page='cat',zone=false){proEl('pro-field').hidden=false;fieldPending={type:'open',page,zone,center:[mappa.getCenter().lat,mappa.getCenter().lng],sun:document.body.classList.contains('pro-sun')};await proEnsureField();if(PRO.ready)proPost(fieldPending)}
proEl('pro-frame').addEventListener('load',()=>{if(fieldPending)proPost(fieldPending)});
proEl('pro-field-btn').onclick=()=>proField();proEl('pro-zone-btn').onclick=()=>proField('alt',true);
document.querySelectorAll('[data-field]').forEach(b=>b.onclick=()=>proField(b.dataset.field));
proEl('pro-field-close').onclick=()=>{proEl('pro-field').hidden=true;mappa.invalidateSize()};
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==proEl('pro-frame').contentWindow||e.data?.app!=='lollomap-pro')return;const d=e.data;
 if(d.type==='ready'){PRO.ready=true;if(fieldPending)proPost(fieldPending);PRO.broadcastRecording();PRO.outbox.forEach(proPost)}
 if(d.type==='record-query')PRO.broadcastRecording();
 if(d.type==='record-toggle'){if(!nav.attivo)await entraNavigatore();tastoRegistra();PRO.broadcastRecording()}
 if(d.type==='record-stop'){proEl('pro-field').hidden=true;tastoStop()}
 if(d.type==='archive-ok'){PRO.outbox=PRO.outbox.filter(x=>x.track?.id!==d.id);localStorage.setItem(PRO_OUTBOX,JSON.stringify(PRO.outbox))}
 if(d.type==='archive-error')alertino('Archivio traccia non riuscito: '+d.message);
 if(d.type==='zone-base'&&proValid(d.center)){const id={topo:'otm',sat:'esri-img'}[d.base];if(id){S.base=id;salva();riempiBasi();aggiornaStrati()}mappa.setView(d.center,15)}
 if(d.type==='destination'&&proValid(d.point)){PRO.target=d.point;proEl('pro-to').value=d.point.join(', ');proEl('pro-field').hidden=true;proOpenCompass()}
 if(d.type==='gpx'&&typeof d.text==='string'&&d.text.length<20000000&&confirm('Caricare questi punti e tracce nella mappa? La traccia attualmente visualizzata verrà sostituita.')){await caricaGPXTesto('campo.gpx',d.text);proEl('pro-field').hidden=true}
});
for(let deg=0;deg<360;deg+=5){const big=deg%30===0,rad=deg*Math.PI/180,x=Math.sin(rad),y=-Math.cos(rad);proEl('pro-rose').insertAdjacentHTML('beforeend',`<line x1="${200+x*(big?160:173)}" y1="${200+y*(big?160:173)}" x2="${200+x*181}" y2="${200+y*181}" stroke="var(--pro-cyan)" stroke-width="${big?2:1}"/>`);if(big)proEl('pro-rose').insertAdjacentHTML('beforeend',`<text x="${200+x*140}" y="${206+y*140}" text-anchor="middle" fill="${deg===0?'var(--pro-pink)':'var(--pro-text)'}" font-size="18">${({0:'N',90:'E',180:'S',270:'O'})[deg]||deg}</text>`)}
function proCoords(text){const a=text.trim().split(/[,;\s]+/).filter(Boolean).map(Number);return proValid(a)?a:null}
function proDecl(){const p=proCoords(proEl('pro-from').value)||PRO.origin||[mappa.getCenter().lat,mappa.getCenter().lng];return WMM.declinazione(p[0],p[1],0,annoDecimale(new Date()))}
function proPaint(){
 const fresh=PRO.heading!==null&&Date.now()-PRO.lastHeading<4000;
 const h=PRO.locked!==null?PRO.locked:fresh?wrap360(PRO.heading+(PRO.mode==='true'?proDecl():0)):null;
 proEl('pro-reading').textContent=h===null?'—':Math.round(h)+'° · '+cardinale(h);
 proEl('pro-status').textContent=(PRO.locked!==null?'LETTURA BLOCCATA':fresh?PRO.source:'Direzione non disponibile: attiva i sensori')+' · '+(PRO.mode==='true'?'Nord geografico':'Nord magnetico');
 proEl('pro-rose').setAttribute('transform',`rotate(${h===null?0:-h} 200 200)`);
 if(!PRO.target)return;
 const a=proCoords(proEl('pro-from').value)||PRO.origin;
 if(!a){proEl('pro-target-info').textContent='Per calcolare l’azimut attiva il GPS o inserisci la partenza.';return}
 const distance=distanza(a,PRO.target);
 if(distance<.5){proEl('pro-target-info').textContent='Partenza e destinazione coincidono: azimut non definito.';return}
 const geo=proBearing(a,PRO.target),az=wrap360(geo-(PRO.mode==='mag'?proDecl():0)),rev=proBearing(PRO.target,a),delta=h===null?null:((az-h+540)%360)-180;
 proEl('pro-arrow').setAttribute('transform',`rotate(${h===null?az:az-h} 200 200)`);
 proEl('pro-target-info').textContent=`Azimut ${az.toFixed(1)}° · ${metri(distance)} · ritorno geografico ${rev.toFixed(1)}°`+(delta===null?'':` · ruota ${Math.abs(delta).toFixed(0)}° a ${delta>=0?'destra':'sinistra'}`)+(PRO.posTime&&Date.now()-PRO.posTime>30000?' · posizione GPS precedente: verifica':'');
}
function proOrientation(e){let h=null;if(Number.isFinite(e.webkitCompassHeading)&&e.webkitCompassHeading>=0){h=e.webkitCompassHeading;PRO.source='Bussola iPhone'}else if(e.absolute&&Number.isFinite(e.alpha)){h=360-e.alpha;PRO.source='Bussola assoluta'}if(h===null)return;h=wrap360(h+((screen.orientation?.angle)||0));PRO.heading=PRO.heading===null?h:wrap360(PRO.heading+(((h-PRO.heading+540)%360)-180)*.25);PRO.lastHeading=Date.now();proPaint()}
async function proSensors(){
 try{if(typeof DeviceOrientationEvent?.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw Error('Permesso sensori negato')}window.addEventListener('deviceorientationabsolute',proOrientation);window.addEventListener('deviceorientation',proOrientation)}catch(e){proEl('pro-status').textContent=e.message}
 if(navigator.geolocation&&PRO.watch===null)PRO.watch=navigator.geolocation.watchPosition(p=>{PRO.origin=[p.coords.latitude,p.coords.longitude];PRO.posTime=Date.now();proPaint()},e=>{proEl('pro-status').textContent='GPS: '+e.message},{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
 try{PRO.wake=await navigator.wakeLock?.request('screen')}catch(e){}
}
function proOpenCompass(){proEl('pro-compass').hidden=false;proPaint()}
function proCloseCompass(){proEl('pro-compass').hidden=true;window.removeEventListener('deviceorientationabsolute',proOrientation);window.removeEventListener('deviceorientation',proOrientation);if(PRO.watch!==null)navigator.geolocation.clearWatch(PRO.watch);PRO.watch=null;PRO.wake?.release();PRO.wake=null;if(document.fullscreenElement===proEl('pro-compass'))document.exitFullscreen?.()}
proEl('pro-compass-btn').onclick=proOpenCompass;proEl('pro-compass-close').onclick=proCloseCompass;proEl('pro-sensors').onclick=proSensors;
proEl('pro-lock').onclick=()=>{PRO.locked=PRO.locked===null&&PRO.heading!==null?wrap360(PRO.heading+(PRO.mode==='true'?proDecl():0)):null;proPaint()};
proEl('pro-north').onchange=e=>{PRO.mode=e.target.value;PRO.locked=null;proPaint()};
proEl('pro-fs').onclick=()=>{proEl('pro-compass').requestFullscreen?.().catch(()=>{})};
proEl('pro-calc').onclick=()=>{const p=proCoords(proEl('pro-to').value),a=proEl('pro-from').value.trim();if(!p||(a&&!proCoords(a)))return alert('Coordinate richieste: latitudine, longitudine, con punto decimale.');PRO.target=p;proPaint()};
proEl('pro-map-target').onclick=()=>{const c=mappa.getCenter();PRO.target=[c.lat,c.lng];proEl('pro-to').value=PRO.target.join(', ');proPaint()};
proEl('pro-clear').onclick=()=>{PRO.target=null;proEl('pro-to').value='';proEl('pro-target-info').textContent='Destinazione cancellata';proEl('pro-arrow').setAttribute('transform','rotate(0 200 200)')};
proEl('pro-sun-btn').onclick=()=>{document.body.classList.toggle('pro-sun');if(!proEl('pro-field').hidden)proPost({type:'theme',sun:document.body.classList.contains('pro-sun')})};
mappa.on('contextmenu',e=>{const b=document.createElement('button');b.textContent='🧭 Azimut verso questo punto';b.onclick=()=>{PRO.target=[e.latlng.lat,e.latlng.lng];proEl('pro-to').value=PRO.target.join(', ');mappa.closePopup();proOpenCompass()};L.popup().setLatLng(e.latlng).setContent(b).openOn(mappa)});
setInterval(()=>{if(!proEl('pro-compass').hidden)proPaint()},1000);
PRO.snapshot=function(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(CHIAVE))out[k]=localStorage.getItem(k)}return out};
PRO.isRecording=()=>nav.reg.stato==='attiva';
PRO.recordState=()=>({type:'record-state',active:nav.reg.stato==='attiva',paused:nav.reg.stato==='pausa',points:nav.reg.punti.length});
PRO.broadcastRecording=()=>{if(PRO.ready)proPost(PRO.recordState())};
PRO.archiveRecording=function(r){
 if(!r||!r.punti||r.punti.length<2)return;
 if(!r.id)r.id='pro-'+(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36));
 const start=r.inizio||r.punti[0][3]||Date.now(),track={id:r.id,name:'Traccia '+new Date(start).toLocaleString('it-IT'),start,end:Date.now(),dur:r.ms||0,pts:r.punti.map(p=>[p[0],p[1],p[2]??null,p[3]||start,null]),brk:[],src:'lollomap-pro',u:new Date().toISOString()};
 PRO.outbox=PRO.outbox.filter(x=>x.track?.id!==track.id);PRO.outbox.push({type:'archive-track',track});localStorage.setItem(PRO_OUTBOX,JSON.stringify(PRO.outbox));proEnsureField().then(()=>{if(PRO.ready)proPost(PRO.outbox[PRO.outbox.length-1])});
};
PRO.deleteRecording=id=>{PRO.outbox=PRO.outbox.filter(x=>x.track?.id!==id);localStorage.setItem(PRO_OUTBOX,JSON.stringify(PRO.outbox));if(PRO.ready)proPost({type:'delete-track',id})};
PRO.restore=function(data){if(!data||typeof data!=='object'||!confirm('Ripristinare anche le impostazioni, i punti e la traccia della mappa principale dal backup? Le chiavi presenti saranno sostituite.'))return;for(const[k,v]of Object.entries(data))if(k.startsWith(CHIAVE)&&typeof v==='string')localStorage.setItem(k,v);alert('Dati della mappa ripristinati. Dopo aver chiuso Campo, ricarica LolloMap Pro.');};
// Il vecchio pulsante backup ora porta al backup unificato della sezione Campo.
creaBackup=function(){proField('alt')};
window.PRO=PRO;window.proBearing=proBearing;window.proValid=proValid;
proResetPromise.then(()=>{try{PRO.outbox=JSON.parse(localStorage.getItem(PRO_OUTBOX)||'[]').filter(x=>x&&x.type==='archive-track'&&x.track)}catch(e){PRO.outbox=[]}});
