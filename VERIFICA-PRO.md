# Verifica LolloMap Pro 4.1.0

## Estensione 4.3.1

- Verificato: sintassi di `pro.js` e di tutti gli script incorporati in `index.html`.
- Verificato: linea di registrazione creata e ripristinata con le preferenze `navTracciaCol` e `navTracciaSp`.
- Verificato: controlli per colore, spessore, dati espandibili e menu secondario.
- Verificato: manifest, service worker e percorsi relativi compatibili con GitHub Pages.
- Da verificare sul telefono: GPS reale e resa grafica completa; il browser grafico non è avviabile nell'ambiente di prova.

## Estensione 4.3.2

- Verificato: token e componenti condivisi per tema scuro e chiaro.
- Verificato: mappa, menu, pannello, viste a tutto schermo, modali e Campo ricevono lo stesso stile flottante.
- Verificato: nessun identificatore o gestore JavaScript è stato rimosso.
- Da verificare sul telefono: resa visiva reale, tastiera, rotazione e ingrandimento caratteri.

## Automatico

- sintassi degli script radice e dei moduli Campo;
- calcolo azimut cardinale e attraversamento dell'antimeridiano;
- intervalli validi delle coordinate;
- presenza di tutti i file precache;
- database unico `lollomap_pro`;
- registratore unico e accodamento della traccia all'archivio;
- reset una tantum degli archivi di prova e migrazione delle sole impostazioni;
- unico service worker attivo nell'app integrata;
- validazione origine e finestra del ponte;
- integrità e struttura dello ZIP per Pubblica/GitHub Pages.

## Da provare sul telefono

Installazione e primo reset, permessi GPS, avvio/pausa/stop da entrambe le interfacce, presenza della traccia nel Catalogo, bussola e azimut, riapertura senza rete, download della zona e accesso Google Drive. L'APK Android non è stato ricompilato.
