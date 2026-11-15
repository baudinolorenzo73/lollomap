'use strict';
var PRO_PENDING=null,PRO_READY=false,PRO_RECORD_STATE={active:false,paused:false,points:0},PRO_DELETED={};
function proMigrateSettings(){
 var raw=localStorage.getItem('lollomap-pro.settings-migrate');if(!raw)return Promise.resolve();
 try{var value=JSON.parse(raw);return DB.put('kv',{id:'settings',v:value}).then(function(){localStorage.removeItem('lollomap-pro.settings-migrate')})}catch(e){localStorage.removeItem('lollomap-pro.settings-migrate');return Promise.resolve()}
}
function proSend(data){if(window.parent!==window)window.parent.postMessage(Object.assign({app:'lollomap-pro'},data),location.origin)}
function proReceive(d){
 if(d.type==='theme'||d.type==='open'){SET.theme=d.sun?'light':'dark';applyTheme()}
 if(d.type==='record-state'){
   var on=!!d.active,pause=!!d.paused,b=$('#bRec'),chip=$('#chipRec');
   PRO_RECORD_STATE={active:on,paused:pause,points:d.points||0};
   if(b){b.classList.toggle('recon',on);b.innerHTML=ICO(on?'stop':'rec');b.title=on?'Metti in pausa il registratore unico':'Avvia il registratore unico'}
   if(chip){chip.style.display=(on||pause)?'':'none';chip.innerHTML=(on?'<span class="rec">●</span> ':'⏸ ')+(d.points||0)+' punti · registratore della mappa'}
   var stop=$('#pro-campo-stop');if(stop)stop.hidden=!(on||pause);
 }
 if(d.type==='archive-track'&&d.track&&Array.isArray(d.track.pts)){
   if(PRO_DELETED[d.track.id])return;
   DB.put('tracks',d.track).then(function(){if(PRO_DELETED[d.track.id])return DB.del('tracks',d.track.id);markChange()}).then(function(){return loadTracks()}).then(function(){if(!PRO_DELETED[d.track.id])proSend({type:'archive-ok',id:d.track.id})}).catch(function(e){proSend({type:'archive-error',id:d.track.id,message:e.message})});
 }
 if(d.type==='delete-track'&&d.id){PRO_DELETED[d.id]=1;DB.del('tracks',d.id).then(loadTracks)}
 if(d.type==='open'){
   if(['cat','luo','usc','alt'].indexOf(d.page)>=0)go(d.page);
   if(Array.isArray(d.center)&&d.center.length===2&&d.center.every(Number.isFinite))map.setView(d.center,15);
   if(d.zone){ZONA.open();var e=$('#zoneCenter');if(e)e.value='map'}
 }
}
window.addEventListener('message',function(e){if(e.origin!==location.origin||e.source!==window.parent||e.data?.app!=='lollomap-pro')return;if(PRO_READY)proReceive(e.data);else PRO_PENDING=e.data});
window.addEventListener('campo-ready',function(){
 PRO_READY=true;
 if(window.parent===window)return;
 document.body.classList.add('pro-embedded');SET.theme='dark';applyTheme();
 var bar=document.createElement('div');bar.className='pro-campo-tools';bar.innerHTML='<button id="pro-campo-map" class="btn">🗺 Punti e tracce sulla mappa principale</button><button id="pro-campo-stop" class="btn r" hidden>⏹ Ferma e salva traccia</button>';
 $('#catCount').parentNode.appendChild(bar);$('#pro-campo-map').onclick=function(){proSend({type:'gpx',text:toGPX(POINTS.filter(passFilter),TRACKS.filter(function(t){return PC.showT(t)}))})};$('#pro-campo-stop').onclick=function(){proSend({type:'record-stop'})};
 go('cat');if(PRO_PENDING)proReceive(PRO_PENDING);proSend({type:'ready'});proSend({type:'record-query'});
});
document.addEventListener('click',function(e){var b=e.target.closest('[data-pro-az]');if(!b)return;var p=byId(POINTS,b.getAttribute('data-pro-az'));if(p)proSend({type:'destination',point:[p.lat,p.lon]})});
