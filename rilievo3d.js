/* Vista obliqua su griglia altimetrica Terrarium. Rendering Canvas locale,
   nessuna API TopoExport e nessuna georeferenziazione della prospettiva. */
(() => {
  'use strict';
  const n = 40;
  let modello = null, pagina = null;
  const modal = document.createElement('div');
  modal.id = 'vista3d'; modal.hidden = true;
  modal.innerHTML = `<div class="t3-box"><div class="riga"><b>🏔️ LolloMap · rilievo 3D</b><button id="t3-chiudi" class="sec">✕ Chiudi</button></div>
    <div class="t3-controlli">
      <label>Rotazione <input id="t3-rot" type="range" min="0" max="360" value="0"></label>
      <label>Inclinazione <input id="t3-tilt" type="range" min="20" max="80" value="48"></label>
      <label>Rilievo ×<span id="t3-ex-val">1.5</span> <input id="t3-ex" type="range" min="0.5" max="4" step="0.1" value="1.5"></label>
    </div><canvas id="t3-canvas" width="1600" height="1100" aria-label="Vista obliqua del terreno"></canvas>
    <div class="riga"><button id="t3-pdf">📄 PDF 3D A4</button><button id="t3-stampa">🖨️ Stampa vista 3D</button><button id="t3-jpg">🖼️ JPG 3D</button></div>
    <div class="info">Vista illustrativa, quote Terrarium: non georiferita, senza scala uniforme. Per una carta in scala usa il PDF 2D. Le zone nascoste dai rilievi non sono visibili.</div></div>`;
  document.body.appendChild(modal);
  const style = document.createElement('style');
  style.textContent = '#vista3d[hidden]{display:none} #vista3d{position:fixed;inset:0;z-index:2050;background:rgba(10,14,12,.94);overflow:auto;padding:12px} .t3-box{max-width:1150px;margin:auto;background:var(--foglio);color:var(--ink);padding:12px;border-radius:12px} .t3-controlli{display:flex;flex-wrap:wrap;gap:16px} .t3-controlli label{flex:1;min-width:180px} #t3-canvas{display:block;width:100%;height:auto;background:white;margin:10px 0} @media print{#vista3d{display:none!important}}';
  document.head.appendChild(style);
  $('#t3-chiudi').onclick = () => { modal.hidden = true; };
  for (const id of ['rot','tilt','ex']) $('#t3-'+id).oninput = () => { $('#t3-ex-val').textContent = $('#t3-ex').value; disegna(); };

  async function quote(job) {
    // Limite esplicito al numero di tessere DEM: nessun download di intere regioni.
    let z = 14, range;
    do {
      const res = RES0 / 2 ** z;
      range = {x0:Math.floor((job.x0+ORIG)/res/256), x1:Math.floor((job.x1+ORIG)/res/256), y0:Math.floor((ORIG-job.y1)/res/256), y1:Math.floor((ORIG-job.y0)/res/256), res};
      if ((range.x1-range.x0+1)*(range.y1-range.y0+1) <= 16 || z <= 2) break;
      z--;
    } while (true);
    const tiles = new Map();
    for(let y=range.y0;y<=range.y1;y++) for(let x=range.x0;x<=range.x1;x++) {
      $('#av-txt').textContent = 'Quote 3D: tessera ' + (tiles.size+1);
      const url = URL_DEM.replace('{z}',z).replace('{x}',x).replace('{y}',y);
      const r = await caricaImmagine(url,true);
      if(!r || !r.cors) throw Error('Quote del terreno non disponibili. Connettiti o scarica prima la zona con le quote per le pendenze.');
      const cv=document.createElement('canvas');cv.width=cv.height=256;
      const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(r.img,0,0,256,256);
      tiles.set(x+','+y,quoteDaImmagine(c.getImageData(0,0,256,256).data,256));
    }
    const values=[];
    for(let j=0;j<=n;j++) for(let i=0;i<=n;i++) {
      const mx=job.x0+(job.x1-job.x0)*i/n, my=job.y1-(job.y1-job.y0)*j/n;
      const px=(mx+ORIG)/range.res,py=(ORIG-my)/range.res;
      const tx=Math.floor(px/256),ty=Math.floor(py/256), tile=tiles.get(tx+','+ty);
      const h=tile && tile[Math.min(255,Math.max(0,Math.floor(py-ty*256)))*256+Math.min(255,Math.max(0,Math.floor(px-tx*256)))];
      if(!Number.isFinite(h))throw Error('Quote mancanti nel riquadro: scegli una zona diversa.');
      values.push(h);
    }
    return {values,z};
  }
  $('#t3-crea').onclick = async () => {
    const job=lavoro(); if(!job.valido)return aggiornaRiquadro();
    mostraAvanz('Preparo il rilievo 3D…'); $('#t3-crea').disabled=true;
    try {
      const height=await quote(job);
      // Rendering limitato a circa 1800 px: riduce la memoria sui telefoni.
      const factor=Math.min(1,1800/Math.max(job.pageW,job.pageH));
      const k=job.k*factor;
      const small={...job,k,dpi:job.dpi*factor,pageW:Math.round(job.pageW*factor),pageH:Math.round(job.pageH*factor),mpp:job.mpp/factor,
        fpx:{x:job.fpx.x*factor,y:job.fpx.y*factor,w:job.fpx.w*factor,h:job.fpx.h*factor}};
      const map=await renderPagina(small,null);
      if(map.bloccate.length)throw Error('La sorgente non permette l’esportazione del 3D. Scegli una base che consenta il download.');
      if(map.errori)throw Error('La mappa contiene immagini mancanti. Riprova o scegli una base disponibile prima di generare il 3D.');
      const texture = await immagineDaBlob(await aBlob(map.cv,'image/jpeg',0.94));
      if (!texture) throw Error('Impossibile preparare la texture 3D.');
      const fonti = stratiAttivi().map(s=>s.attr);
      if (window.fonteVettoriLocali) { const fonte=window.fonteVettoriLocali(); if(fonte)fonti.push(fonte); }
      modello={job,small,texture:texture.img,height,title:S.titolo.trim()||'LolloMap',fonti};
      pagina=null;disegna();modal.hidden=false;
      $('#t3-info').textContent='Vista pronta. Quote Terrarium zoom '+height.z+'; cambia orientamento e salva PDF/JPG o stampa.';
    } catch(e) { $('#t3-info').textContent='3D non generato: '+e.message; }
    finally {nascondiAvanz();$('#t3-crea').disabled=false;}
  };
  function triangolo(ctx,src,dst,img) {
    const [s0,s1,s2]=src,[p0,p1,p2]=dst;
    const ux=s1[0]-s0[0],uy=s1[1]-s0[1],vx=s2[0]-s0[0],vy=s2[1]-s0[1],det=ux*vy-uy*vx;
    if(Math.abs(det)<1e-8)return;
    const dx=p1.x-p0.x,dy=p1.y-p0.y,ex=p2.x-p0.x,ey=p2.y-p0.y;
    const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,c=(ex*ux-dx*vx)/det,d=(ey*ux-dy*vx)/det;
    ctx.save();ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,p0.x-a*s0[0]-c*s0[1],p0.y-b*s0[0]-d*s0[1]);ctx.drawImage(img,0,0);ctx.restore();
  }
  function disegna() {
    if(!modello)return;
    const cv=$('#t3-canvas'),ctx=cv.getContext('2d'),{job,small,texture,height}=modello;
    const angle=+$('#t3-rot').value*Math.PI/180,tilt=+$('#t3-tilt').value*Math.PI/180,ex=+$('#t3-ex').value;
    const w=(job.x1-job.x0)*Math.cos(m2ll((job.x0+job.x1)/2,(job.y0+job.y1)/2)[0]*D2R),h=w*(job.y1-job.y0)/(job.x1-job.x0),floor=Math.min(...height.values);
    const points=height.values.map((z,id)=>{
      const x=(id%(n+1)/n-0.5)*w,y=(Math.floor(id/(n+1))/n-0.5)*h,rx=x*Math.cos(angle)-y*Math.sin(angle),ry=x*Math.sin(angle)+y*Math.cos(angle),zz=(z-floor)*ex;
      return {x:rx,y:ry*Math.sin(tilt)-zz*Math.cos(tilt),depth:-ry*Math.cos(tilt)+zz*Math.sin(tilt)};
    });
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
    const scale=Math.min(1480/Math.max(1,maxx-minx),820/Math.max(1,maxy-miny));
    points.forEach(p=>{p.x=800+(p.x-(minx+maxx)/2)*scale;p.y=510+(p.y-(miny+maxy)/2)*scale;});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,1600,1100);
    const tris=[];
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;
      tris.push([a,b,d],[a,d,c]);
    }
    tris.sort((a,b)=>a.reduce((s,i)=>s+points[i].depth,0)-b.reduce((s,i)=>s+points[i].depth,0));
    for(const ids of tris){const src=ids.map(id=>[small.fpx.x+id%(n+1)/n*small.fpx.w,small.fpx.y+Math.floor(id/(n+1))/n*small.fpx.h]);triangolo(ctx,src,ids.map(id=>points[id]),texture);}
    ctx.fillStyle='#20372b';ctx.font='bold 30px sans-serif';ctx.fillText(modello.title.slice(0,90),50,48,1500);
    ctx.font='20px sans-serif';ctx.fillText('Vista 3D illustrativa · rilievo ×'+ex+' · nord ruotato di '+$('#t3-rot').value+'° · quote Terrarium',50,985,1500);
    ctx.fillText('Senza scala uniforme e senza georeferenziazione · LolloMap by Lollo 2026',50,1015,1500);
    const lines=[...new Set(modello.fonti)].join(' · ');
    ctx.font='16px sans-serif';ctx.fillText(lines,50,1045,1500);
    pagina=cv;
  }
  async function pdf() {
    if(!pagina)return null;
    const sheet=document.createElement('canvas');sheet.width=1600;sheet.height=Math.round(1600*210/297);
    const ctx=sheet.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.drawImage(pagina,0,(sheet.height-pagina.height)/2);
    const jpg=new Uint8Array(await (await aBlob(sheet,'image/jpeg',0.94)).arrayBuffer());
    const job={...modello.job,W:297,H:210};
    return creaPDF([{jpg,iw:sheet.width,ih:sheet.height,L:job}],false);
  }
  $('#t3-jpg').onclick=async()=>{try{if(pagina)await scarica(await aBlob(pagina,'image/jpeg',0.94),'lollomap-vista-3d.jpg');}catch(e){alertino(e.message);}};
  $('#t3-pdf').onclick=async()=>{try{const blob=await pdf();if(blob)await scarica(new Blob([blob],{type:'application/pdf'}),'lollomap-vista-3d.pdf');}catch(e){alertino(e.message);}};
  $('#t3-stampa').onclick=async()=>{
    if(!pagina)return;
    try{
      if(APP){await salvaNativo(await pdf(),'lollomap-vista-3d.pdf','stampa','LolloMap vista 3D',297,210);return;}
      const box=$('#stampa'),old=[...box.childNodes],css=$('#stile-pagina').textContent;
      const copy=document.createElement('canvas');copy.width=1600;copy.height=Math.round(1600*210/297);const ctx=copy.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,copy.width,copy.height);ctx.drawImage(pagina,0,(copy.height-pagina.height)/2);
      box.replaceChildren(copy);$('#stile-pagina').textContent='@page{size:297mm 210mm;margin:0} #stampa canvas{width:297mm;height:210mm}';
      const restore=()=>{box.replaceChildren(...old);$('#stile-pagina').textContent=css;};
      window.addEventListener('afterprint',restore,{once:true});window.print();
    }catch(e){alertino(e.message);}
  };
})();
