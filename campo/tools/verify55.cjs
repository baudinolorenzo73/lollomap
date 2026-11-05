const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').join(__dirname,'..');
const src=p=>fs.readFileSync(root+'/'+p,'utf8');
const context=(extra={})=>vm.createContext(Object.assign({console,Promise,Blob,Response,Request,URL,TextEncoder,TextDecoder,Uint8Array,Math,Date,setTimeout,clearTimeout,document:{addEventListener(){}},window:{},alert(){},toast(){},confirm:()=>true,uid:()=>Math.random().toString(36),stamp:()=>'',fmtDate:x=>x,fmtSize:String,refreshPage(){},saveSet:async()=>{},updBackupDot(){},BRAND:'test',VERSION:'5.5',SET:{changes:4,lastBackup:0},POINTS:[],TRACKS:[],CHECK:{},FON:{lib:[],dia:[],cl:[],load:async()=>{},regLayers(){},saveLib:async()=>{},saveDia:async()=>{},saveCl:async()=>{}},PC:{list:[],save:async()=>{}},PL:{list:[],save:async()=>{},apply:async()=>{}},REC:{on:false},TILE_CACHE:'atl-tiles',CAP:{init:async()=>{}},tsOf:o=>o.updated||o.u||o.added||o.when||'',reportHTML:()=>'',toGPX:()=>'',toKML:()=>'',toGeoJSON:()=>'',toCSV:()=>'',XLSX:{points:async()=>new Blob(['xlsx'])}},extra));
async function run(){
 for(const f of fs.readdirSync(root+'/js').filter(f=>f.endsWith('.js')))new vm.Script(src('js/'+f));new vm.Script(src('sw.js'));
 const c=context();vm.runInContext(src('js/28-zona.js'),c);
 assert(c.ZONA.isTile('https://tile.openstreetmap.org/12/1/2.png'));assert(c.ZONA.isTile('https://server.arcgisonline.com/x/tile/12/1/2'));assert(!c.ZONA.isTile('https://upload.wikimedia.org/photo.jpg'));
 let merged=[{id:'a',updated:'2026-01-01',v:1}];c.ZONA.merge(merged,[{id:'a',updated:'2026-02-01',v:2},{id:'b'}]);assert.equal(merged[0].v,2);assert.equal(merged.length,2);
 const places=context();vm.runInContext(src('js/15-luoghi.js').split('/* =================== CASELLA')[0],places);let bb=places.PL.boxes({lat:45,lon:7,r:3});assert.deepEqual(bb.pack,bb.tiles);places.PL.load(null);assert.equal(places.PL.cur,'zona');places.PL.load({v:{list:[],cur:'lago'}});assert.equal(places.PL.cur,'lago');
 let store={points:{},media:{},kv:{},tracks:{}};
 c.DB={get:async(s,id)=>store[s][id],put:async(s,o)=>{store[s][o.id]=o},all:async s=>Object.values(store[s])};
 vm.runInContext(src('js/06-esporta.js').split("$('#fImp').onchange")[0],c);
 ['reportHTML','toGPX','toKML','toGeoJSON','toCSV'].forEach(k=>c[k]=()=> 'test');
 c.POINTS=[{id:'p',updated:'2026-02-01',media:[{id:'m'}]}];
 let res=await c.importData({app:'lollomap-pro',points:[{id:'p',updated:'2026-02-01',media:[{id:'m',file:'pic',mime:'image/png'}]}]},{pic:new Uint8Array([1,2])});assert.equal(res.nm,1);assert(store.media.m);
 c.POINTS=[];c.PC.newId=()=>null;c.markChange=()=>{};c.loadTracks=()=>Promise.resolve();
 res=await c.importFile({name:'traccia.geojson',text:async()=>JSON.stringify({features:[{type:'Feature',properties:{nome:'Anello'},geometry:{type:'LineString',coordinates:[[7,45,100],[7.01,45.01,120]]}}]})});assert.equal(res.nt,1);assert.equal(Object.values(store.tracks)[0].name,'Anello');
 c.alert=msg=>{throw Error(msg)};c.POINTS=[];c.shareOrDownload=async()=>false;await c.exportZip();assert.equal(c.SET.changes,4);assert.equal(c.SET.lastBackup,0);
 c.shareOrDownload=async()=>true;c.confirm=()=>false;await c.exportZip();assert.equal(c.SET.changes,4);
 c.confirm=()=>true;await c.exportZip();assert.equal(c.SET.changes,0);assert(c.SET.lastBackup>0);
 store.kv['capitolo:p']={id:'capitolo:p',v:{when:'2026-02-01',intro:{text:'test'}}};let off=await c.ZONA.backup([]);assert.equal(off.records.length,1);store.kv={};await c.ZONA.restore(off,{});assert.equal(store.kv['capitolo:p'].v.intro.text,'test');
 // Se il database rifiuta il salvataggio, il blocco del capitolo viene rilasciato.
 vm.runInContext(src('js/18-capitoli.js').slice(0,src('js/18-capitoli.js').indexOf('CAP.ask=')),c);
 c.CAP.steps=[['intro','test',async(p,ch)=>{ch.intro={text:'ok'}}]];c.inst={busy:false};c.DB.get=async()=>null;c.DB.put=async()=>{throw Error('quota')};
 await assert.rejects(c.CAP.download({id:'p',name:'Test'},()=>{}));assert.equal(c.CAP.busy,false);
 console.log('OK: sintassi, aree coerenti, luogo iniziale/migrazione, cache immagini, merge, recupero allegati, backup annullato/confermato, archivi offline, rilascio blocco dopo errore.');
}
run().catch(e=>{console.error(e);process.exit(1)});
