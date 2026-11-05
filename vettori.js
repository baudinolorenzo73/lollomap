/* Livelli locali 2D e anteprima, senza servizi o dipendenze aggiuntive. */
(() => {
  'use strict';
  const key = CHIAVE + '.vettori';
  let dati = null, layer = null;
  const info = (s) => { $('#vet-info').textContent = s; };
  function valida(obj) {
    let count = 0;
    function coords(c, depth) {
      if (depth === 0) {
        if (!Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 85.051129) throw Error('Coordinate non valide: serve WGS84 longitudine/latitudine, entro i limiti Web Mercator.');
        if (++count > 50000) throw Error('Troppi vertici: massimo 50.000.');
      } else {
        if (!Array.isArray(c) || !c.length) throw Error('Geometria vuota o non valida.');
        c.forEach((p) => coords(p, depth - 1));
      }
    }
    function visit(g, depth = 0) {
      if (depth > 12 || !g || typeof g !== 'object') throw Error('GeoJSON non valido.');
      if (g.type === 'FeatureCollection') {
        if (!Array.isArray(g.features) || !g.features.length) throw Error('Nessuna feature.');
        g.features.forEach((f) => { if (f.type !== 'Feature') throw Error('Feature non valida.'); visit(f, depth + 1); });
      } else if (g.type === 'Feature') { if (g.geometry !== null) visit(g.geometry, depth + 1); }
      else if (g.type === 'GeometryCollection') {
        if (!Array.isArray(g.geometries)) throw Error('Geometrie non valide.');
        g.geometries.forEach((v) => visit(v, depth + 1));
      } else {
        const depths = {Point: 0, MultiPoint: 1, LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3};
        if (!Object.hasOwn(depths, g.type)) throw Error('Tipo GeoJSON non supportato.');
        coords(g.coordinates, depths[g.type]);
      }
      if (g.crs && !/CRS84|4326/.test(JSON.stringify(g.crs))) throw Error('Riproietta il file in WGS84 EPSG:4326.');
    }
    visit(obj);
    if (!count) throw Error('Nessuna geometria da mostrare.');
    return count;
  }
  function aggiorna() {
    if (layer) { mappa.removeLayer(layer); layer = null; }
    if (!dati) { info('Nessun livello importato.'); return; }
    if (dati.on) {
      layer = L.geoJSON(dati.geo, {
        style: () => ({color: dati.colore, weight: 2, fillOpacity: 0.16}),
        pointToLayer: (_, ll) => L.circleMarker(ll, {radius: 4, color: dati.colore, fillOpacity: 0.7})
      }).addTo(mappa);
    }
    info(dati.nome + ' · ' + dati.count + ' vertici · ' + (dati.on ? 'visibile e incluso nei nuovi fogli' : 'nascosto') + '. Rigenera l’anteprima dopo ogni modifica.');
  }
  function salva() {
    try { localStorage.setItem(key, JSON.stringify(dati)); aggiorna(); }
    catch (_) { aggiorna(); info('Livello utilizzabile in questa sessione, ma spazio locale insufficiente per salvarlo.'); }
  }
  $('#vet-file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (f.size > 2 * 1024 * 1024) throw Error('File troppo grande: massimo 2 MB.');
      const geo = JSON.parse(await f.text()), count = valida(geo);
      // Costruzione di prova prima di sostituire il livello precedente.
      L.geoJSON(geo);
      dati = {geo, count, nome: f.name, fonte: $('#vet-fonte').value.trim(), colore: $('#vet-colore').value, on: $('#vet-on').checked};
      salva(); $('#vet-zona').click();
    } catch (err) { info('Importazione non riuscita: ' + err.message); }
    finally { e.target.value = ''; }
  };
  for (const id of ['fonte', 'colore', 'on']) $('#vet-' + id).onchange = () => {
    if (!dati) return;
    dati.fonte = $('#vet-fonte').value.trim(); dati.colore = $('#vet-colore').value; dati.on = $('#vet-on').checked; salva();
  };
  $('#vet-zona').onclick = () => {
    if (!dati) return info('Importa prima un livello GeoJSON.');
    const bounds = (layer || L.geoJSON(dati.geo)).getBounds();
    if (bounds.isValid()) mappa.fitBounds(bounds, {padding: [24, 24], maxZoom: 16});
  };
  $('#vet-togli').onclick = () => { dati = null; localStorage.removeItem(key); aggiorna(); };
  try {
    dati = JSON.parse(localStorage.getItem(key) || 'null');
    if (dati) {
      dati.count = valida(dati.geo);
      if (!/^#[0-9a-f]{6}$/i.test(dati.colore)) dati.colore = '#b3261e';
      dati.fonte = String(dati.fonte || '').slice(0, 200);
      $('#vet-fonte').value = dati.fonte; $('#vet-colore').value = dati.colore; $('#vet-on').checked = !!dati.on; aggiorna();
    }
  } catch (_) { dati = null; info('Livello salvato non leggibile: importa nuovamente il file.'); }

  window.fonteVettoriLocali = () => dati && dati.on ? (dati.fonte || 'Livello GeoJSON importato (fonte/licenza non specificate)') : '';
  window.disegnaVettoriLocali = (ctx, job, fonti) => {
    if (!dati || !dati.on) return;
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = dati.colore; ctx.lineWidth = Math.max(1, 0.45 * job.k);
    const xy = (p) => {
      const m = L.CRS.EPSG3857.project(L.latLng(p[1], p[0]));
      return [job.fpx.x + (m.x - job.x0) / job.mpp, job.fpx.y + (job.y1 - m.y) / job.mpp];
    };
    const line = (points, close) => { points.forEach((p, i) => { const [x,y] = xy(p); if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y); }); if (close) ctx.closePath(); };
    function draw(g) {
      if (!g) return;
      const c = g.coordinates;
      switch (g.type) {
        case 'FeatureCollection': g.features.forEach(draw); break;
        case 'Feature': draw(g.geometry); break;
        case 'GeometryCollection': g.geometries.forEach(draw); break;
        case 'MultiPoint': c.forEach((p) => draw({type:'Point', coordinates:p})); break;
        case 'Point': { const [x,y] = xy(c); ctx.beginPath(); ctx.arc(x,y,Math.max(2,0.9*job.k),0,Math.PI*2); ctx.fill(); break; }
        case 'MultiLineString': c.forEach((p) => draw({type:'LineString',coordinates:p})); break;
        case 'LineString': ctx.beginPath(); line(c,false); ctx.stroke(); break;
        case 'MultiPolygon': c.forEach((p) => draw({type:'Polygon',coordinates:p})); break;
        case 'Polygon': ctx.beginPath(); c.forEach((p) => line(p,true)); ctx.globalAlpha=0.16; ctx.fill('evenodd'); ctx.globalAlpha=1; ctx.stroke(); break;
      }
    }
    draw(dati.geo); ctx.restore();
    fonti.push(dati.fonte || 'Livello GeoJSON importato (fonte/licenza non specificate)');
  };

  const style = document.createElement('style');
  style.textContent = '#anteprima.ingrandita .tela{display:block;overflow:auto;min-height:180px} #anteprima.ingrandita canvas{max-width:none;max-height:none} #anteprima.ingrandita img{max-width:none!important;max-height:none!important}';
  document.head.appendChild(style);
  $('#x-zoom').onclick = () => {
    const on = $('#anteprima').classList.toggle('ingrandita');
    if (RISULTATO && !RISULTATO.atlante) {
      const cv = $('#ant-tela canvas'), src = RISULTATO.cv;
      if (cv && src) {
        const ratio = on ? 1 : Math.min(1, 1400 / Math.max(src.width, src.height));
        cv.width = Math.round(src.width * ratio); cv.height = Math.round(src.height * ratio);
        cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      }
    }
    $('#x-zoom').textContent = on ? '↙ Adatta allo schermo' : '🔍 Ingrandisci a video';
  };
})();
