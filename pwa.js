/* pwa.js — installazione e aggiornamento integrati nel menu. by Lollo ®2026 */
(function () {
  'use strict';
  var VERSIONE = self.VERSIONE || '?';
  var richiesta = null;
  var registrazione = null;
  var workerAttesa = null;
  var ricaricato = false;

  function standalone() {
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function status() {
    return { install: !!richiesta, update: !!workerAttesa, standalone: standalone(), version: VERSIONE };
  }
  function comunica() {
    document.dispatchEvent(new CustomEvent('lollomap:pwa-status', { detail: status() }));
  }
  function attendi(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function impostaVersione() {
    document.querySelectorAll('.num-versione').forEach(function (e) { e.textContent = VERSIONE; });
  }
  function preparaAggiornamento(sw) {
    if (!sw) return;
    workerAttesa = sw;
    comunica();
  }
  async function azione() {
    if (workerAttesa) {
      workerAttesa.postMessage({ tipo: 'attiva' });
      return;
    }
    if (richiesta) {
      richiesta.prompt();
      await richiesta.userChoice;
      richiesta = null;
      comunica();
      return;
    }
    if (registrazione) {
      try { await registrazione.update(); } catch (e) {}
      await attendi(1200);
      if (registrazione.waiting) {
        preparaAggiornamento(registrazione.waiting);
        registrazione.waiting.postMessage({ tipo: 'attiva' });
        return;
      }
    }
    if (standalone()) {
      alert('LolloMap Pro è installata e usa la versione v' + VERSIONE + '. Non risultano aggiornamenti pronti.');
    } else {
      alert('Per installare LolloMap Pro apri il menu ⋮ di Chrome e scegli “Installa app” oppure “Aggiungi a schermata Home”.');
    }
  }

  window.LolloPWA = { action: azione, status: status };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    richiesta = e;
    comunica();
  });
  window.addEventListener('appinstalled', function () {
    richiesta = null;
    comunica();
  });
  document.addEventListener('DOMContentLoaded', function () {
    impostaVersione();
    comunica();
  });

  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (ricaricato) return;
    ricaricato = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    registrazione = reg;
    if (reg.waiting && navigator.serviceWorker.controller) preparaAggiornamento(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var nuovo = reg.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', function () {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) preparaAggiornamento(nuovo);
      });
    });
    reg.update().catch(function () {});
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') reg.update().catch(function () {});
    });
    comunica();
  }).catch(function () { comunica(); });
})();
