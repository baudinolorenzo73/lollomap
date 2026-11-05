const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;
for(const m of read('index.html').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/src=/.test(m[1])&&m[2].trim()){new vm.Script(m[2]);count++}
for(const p of ['pro.js','pwa.js','rilievo3d.js','vettori.js','sw.js'])new vm.Script(read(p));
let ctx=vm.createContext({Math,Number});vm.runInContext(read('pro.js').split('const proEl=')[0]+';this.b=proBearing;this.v=proValid',ctx);
for(const[p,want]of [[[1,0],0],[[0,1],90],[[-1,0],180],[[0,-1],270]])assert(Math.abs(ctx.b([0,0],p)-want)<1e-8);
assert(ctx.b([0,179],[0,-179])===90);assert(ctx.v([45,7]));assert(!ctx.v([91,7]));assert(!ctx.v([45,181]));
const a=JSON.parse(read('sw.js').match(/const FILE = (\[[\s\S]*?\]);/)[1]);assert(a.includes('pro.js'));assert(a.includes('campo/index.html'));assert(a.includes('campo/js/29-pro-bridge.js'));for(const p of a)assert(fs.existsSync(path.join(root,p)),p);
const main=read('index.html'),base=read('campo/js/01-base.js'),bridge=read('campo/js/29-pro-bridge.js'),pro=read('pro.js'),boot=read('campo/js/13-avvio.js');
assert(main.includes("const CHIAVE = 'stampaMappe.v1'"));assert(base.includes("name:'lollomap_pro'"));assert(base.includes('indexedDB.open(DB.name,1)'));
assert(pro.includes("PRO_SCHEMA='4.1.0'"));assert(pro.includes("['atlante_lago_piccolo','lollomap_pro']"));assert(pro.includes("type:'archive-track'"));
assert(pro.includes('e.source!==proEl(\'pro-frame\').contentWindow'));assert(bridge.includes('e.source!==window.parent'));assert(read('campo/js/03-gps-tracce.js').includes("type:'record-toggle'"));assert(boot.includes('window.parent===window&&isWeb()'));
assert(!read('campo/index.html').includes('rel="manifest"'));assert(read('versione.js').includes("'4.1.0'"));assert(JSON.parse(read('manifest.webmanifest')).start_url==='./index.html');
console.log('OK:',count,'script inline; script esterni; azimut cardinali e antimeridiano; coordinate; '+a.length+' file offline; archivio lollomap_pro; registratore unico; reset legacy; un solo service worker; controlli origine/finestra ponte.');
