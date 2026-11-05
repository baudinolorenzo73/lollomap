/* Preparazione esplicita della zona corrente; nessun download automatico. */
'use strict';
var ZONA={busy:false};
ZONA.merge=function(local,remote){
  var pos={};local.forEach(function(x,i){pos[x.id]=i});
  (remote||[]).forEach(function(x){if(!x||!x.id)return;var i=pos[x.id];if(i===undefined){pos[x.id]=local.length;local.push(x)}else if(tsOf(x)>tsOf(local[i]))local[i]=x});
};
ZONA.isTile=function(url){try{var u=new URL(url);return /^https?:$/.test(u.protocol)&&(/\/(?:tile\/\d+\/\d+\/\d+|\d+\/\d+\/\d+\.png)$/.test(u.pathname)||/getmap/i.test(u.searchParams.get('request')||u.searchParams.get('REQUEST')||''))}catch(e){return false}};
ZONA.backup=async function(files){
  var records=(await DB.all('kv')).filter(function(r){return /^(zonepack(?::|$)|capitolo:)/.test(r.id)}),tiles=[];
  if(window.caches){var ca=await caches.open(TILE_CACHE),keys=await ca.keys();keys=keys.filter(function(k){return ZONA.isTile(k.url)});
    if(keys.length&&confirm('Includere anche le '+keys.length+' tessere delle mappe nel backup?\n\nLo ZIP può diventare grande. Annulla per esportare dati e informazioni senza mappe.')){
      var size=0;
      for(var i=0;i<keys.length;i++){var r=await ca.match(keys[i]);if(!usableTile(r))continue;var b=await r.blob();size+=b.size;if(size>150*1024*1024)throw new Error('Mappe oltre 150 MB: ripeti il backup senza includerle.');var name='offline/tile-'+i+'.bin';files.push({name:name,data:new Uint8Array(await b.arrayBuffer())});tiles.push({url:keys[i].url,file:name,mime:b.type});}
    }
  }
  return {records:records,tiles:tiles};
};
ZONA.restore=async function(off,files){
  for(var r of off.records||[]){if(!r||!/^(zonepack(?::|$)|capitolo:)/.test(r.id)||!r.v)continue;var old=await DB.get('kv',r.id);if(!old||String(r.v.when||'')>String(old.v.when||''))await DB.put('kv',r);}
  if(window.caches){var ca=await caches.open(TILE_CACHE);for(var t of off.tiles||[]){if(!ZONA.isTile(t.url)||!files[t.file]||!/^image\//.test(t.mime||''))continue;var old=await ca.match(t.url);if(!usableTile(old))await ca.put(t.url,new Response(files[t.file],{headers:{'Content-Type':t.mime}}));}}
  await CAP.init();
};
ZONA.open=function(){
  if(inst.busy||NEAR.busy||CAP.busy||ZONA.busy)return toast('Attendi il completamento dell’operazione in corso');
  var choices=BASES.filter(function(b){return b.id!=='osm'&&b.id!=='sat'}).sort(function(a,b){return (a.id==='topo'?-1:0)-(b.id==='topo'?-1:0)});
  openModal('Prepara questa zona offline','<p>Salva app, carta e informazioni disponibili. Mantieni aperta l’app durante la preparazione.</p><label class="l">Centro</label><select id="zoneCenter"><option value="gps">La mia posizione GPS</option><option value="map">Centro della mappa</option><option value="place">Luogo attivo</option></select><label class="l">Raggio</label><select id="zoneRadius">'+[1,3,5].map(function(r){return '<option value="'+r+'"'+(r===3?' selected':'')+'>'+r+' km</option>'}).join('')+'</select><label class="l">Carta</label><select id="zoneLayer">'+choices.map(function(b){return '<option value="'+b.id+'"'+(b.id===baseId?' selected':'')+'>'+esc(b.n)+'</option>'}).join('')+'</select><label class="l">Dettaglio</label><select id="zoneZoom"><option value="15">Leggero · zoom 15</option><option value="16" selected>Normale · zoom 16</option><option value="17">Dettagliato · zoom 17</option></select><p class="mut">Le carte regionali coprono il loro territorio. Fotografie remote e pagine esterne non sono garantite offline. Verrà mostrata la quantità prima di iniziare.</p><button class="btn f" id="zoneStart">📍 Prepara questa zona offline</button>',[]);
  $('#zoneStart').onclick=ZONA.start;
};
ZONA.start=async function(){
  if(ZONA.busy||inst.busy||NEAR.busy||CAP.busy)return;
  ZONA.busy=true;$('#zoneStart').disabled=true;
  try{
    if(navigator.onLine===false)throw new Error('Serve la rete per preparare una zona nuova. Le zone già scaricate restano disponibili.');
    var mode=$('#zoneCenter').value,r=+$('#zoneRadius').value,id=$('#zoneLayer').value,zoom=+$('#zoneZoom').value;
    var p,fix;
    if(mode==='gps'){toast('Rilevo la posizione GPS…',10000);fix=await getFix(5);if(fix.acc>200)throw new Error('Posizione troppo imprecisa. Riprova o scegli il centro della mappa.');p={lat:fix.lat,lon:fix.lon}}
    else if(mode==='map'){var c=map.getCenter();p={lat:c.lat,lon:c.lng}}
    else{p={lat:PL.active().lat,lon:PL.active().lon};if(PL.cur==='zona')throw new Error('Scegli GPS o centro della mappa per definire la zona.');}
    if(Math.abs(p.lat)>80)throw new Error('Le carte scelte non supportano questa latitudine.');
    p.name=mode==='place'?PL.name():'Zona '+p.lat.toFixed(3)+', '+p.lon.toFixed(3);p.r=r;
    if(mode!=='place')try{var loc=await fj('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+p.lat.toFixed(5)+'&lon='+p.lon.toFixed(5)+'&zoom=14&accept-language=it',6000);var address=loc.address||{};p.name=loc.name||address.village||address.town||address.city||address.municipality||p.name}catch(e){/* Coordinate sufficienti per mappe e archivio. */}
    var plan={place:'preview',name:p.name,bb:PL.boxes(p).tiles,ids:[id],zoom:zoom};plan.key=offlineSignature(plan);
    var count=offlineLayers(plan.ids,plan).reduce(function(n,l){return n+l.urls.length},0);
    if(!confirm(p.name+' · raggio '+r+' km\n'+count+' tessere · stima indicativa '+fmtSize(count*70000)+' (dimensione variabile), più informazioni e app.\n\nAvviare il download?'))return;
    var saved=PL.list.filter(function(x){return dist(x.lat,x.lon,p.lat,p.lon)<200&&x.r===r})[0]||PL.add(p);
    await PL.switchTo(saved.id,true);plan.place=saved.id;plan.key=offlineSignature(plan);setBase(id);if(typeof proSend==='function')proSend({type:'zone-base',base:id,center:[p.lat,p.lon]});
    closeModal();go('alt');ALT_OPEN.app=true;renderAlt();
    await runInstallTask('zone',async function(){
      await cacheShell();await registerSW();if(inst.abort.v)return;
      ilog('Scarico la carta di '+PL.name()+'…');await downloadMaps({plan:plan,confirmed:true});if(inst.abort.v)return;
      ilog('Scarico archivio e capitolo del luogo…');
      var info=await downloadPack({confirmed:true});if(inst.abort.v)return;
      var coverage=await verifyOfflineMaps(plan);
      var ch=await DB.get('kv',CAP.key(saved.id));
      var complete=coverage.missing===0&&info&&info.failed.length===0&&info.capReady&&ch&&ch.v&&!(ch.v.ko||[]).length;
      ilog(complete?'✓ Zona pronta. Prova l’apertura in modalità aereo.':'• Preparazione parziale: controlla mappe e fonti non raggiunte. I dati salvati restano disponibili.',complete?'ok':'ko');
      if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist();
    });
  }catch(e){alert('Preparazione zona: '+e.message)}finally{ZONA.busy=false;var b=$('#zoneStart');if(b)b.disabled=false}
};
document.addEventListener('click',function(e){if(e.target.closest('[data-prepare-zone]'))ZONA.open()});
