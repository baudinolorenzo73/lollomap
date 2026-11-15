const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),web=path.join(root,'app/src/main/assets/www');
const read=p=>fs.readFileSync(path.join(web,p),'utf8');
let inline=0;
for(const m of read('index.html').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/src=/.test(m[1])&&m[2].trim()){new vm.Script(m[2]);inline++}
}
for(const p of ['pro.js','pwa.js','rilievo3d.js','vettori.js','sw.js'])new vm.Script(read(p));
const files=JSON.parse(read('sw.js').match(/const FILE = (\[[\s\S]*?\]);/)[1]);
for(const p of files)assert(fs.existsSync(path.join(web,p)),'Risorsa offline mancante: '+p);
const pro=read('pro.js'),css=read('pro.css'),gradle=fs.readFileSync(path.join(root,'app/build.gradle'),'utf8');
assert(read('versione.js').includes("'4.3.0'"));
assert(pro.includes("PRO_VERSION='4.3.0'"));
assert(pro.includes("PRO_DATA_SCHEMA='4.1.0'"),'Lo schema dati non deve cambiare per un aggiornamento grafico');
assert(pro.includes("PRO_THEME='lollomap-pro.theme'"));
assert(pro.includes("localStorage.setItem(PRO_THEME"));
assert(pro.includes("pro-panel-open"));
assert(pro.includes("pro-menu-btn"));
assert(pro.includes('pro-drawer-list'));
assert(pro.includes('pro-hud-alt-value'));
assert(pro.includes('pro-map-fabs'));
assert(pro.includes('proOpenDetails'));
assert(css.includes('@media(max-width:899px)'));
assert(css.includes('transform:translateX(calc(-100% - 18px))'));
assert(css.includes('grid-template-columns:1fr 1fr'));
assert(css.includes('body.pro-sun'));
assert(css.includes('body:not(.pro-sun) #mappa .leaflet-tile-pane'));
assert(css.includes('body.nav #app header{display:none!important}'));
assert(css.includes('scroll-snap-type:x mandatory'));
assert(css.includes('html body.nav .nav-btns button'));
assert(css.includes('min-height:44px;height:44px'));
assert(css.includes('background:#09131f'));
assert(gradle.includes("versionName '4.3.0'"));
assert(gradle.includes('versionCode 430'));
assert(!fs.existsSync(path.join(root,'keystore.properties')));
console.log(`OK: Android 4.3.0; ${inline} script inline; ${files.length} risorse offline; layout mappa-prima con menu laterale e HUD; dati 4.1 preservati.`);
