# LolloMap Pro 4.1 — unificazione dati e registrazione

Un solo pacchetto, una sola PWA, un solo service worker e un solo archivio operativo `lollomap_pro` per punti, media, tracce, diario, luoghi e impostazioni Campo. Il Navigatore della mappa è l'unico registratore GPS: i comandi della sezione Campo lo controllano e le tracce concluse vengono archiviate automaticamente.

## Requisiti

1. Conservare mappe, navigazione, pianificazione, stampa georiferita, vettori, rilievo 3D, catalogo naturalistico, strumenti Campo, bussola e azimut.
2. Eliminare al primo avvio i punti, le tracce, le mappe offline e gli archivi di prova delle versioni precedenti.
3. Conservare, quando leggibili, preferenze, ID client Google e chiavi API del vecchio archivio.
4. Usare il database `lollomap_pro`; nessuna importazione automatica dei dati legacy.
5. Usare soltanto il registratore del Navigatore. Una traccia fermata deve entrare nell'archivio comune senza esportazioni manuali.
6. Usare un solo service worker, quello alla radice. Il modulo Campo non deve registrarne uno proprio quando è incorporato.
7. Backup completo nel formato LolloMap Pro; configurazione sensibile esportabile separatamente con password.
8. Restare installabile da GitHub Pages e utilizzabile offline dopo il primo caricamento; i servizi remoti richiedono rete.

## Accettazione

- Il primo avvio 4.1 imposta il marcatore di reset e rimuove gli archivi di prova una sola volta.
- Il database aperto dal Catalogo si chiama `lollomap_pro`.
- I pulsanti registra di Mappa e Campo comandano lo stesso stato GPS.
- Stop archivia la traccia; Cancella la rimuove anche dall'archivio comune.
- Nessun manifest o service worker secondario viene attivato dal modulo Campo incorporato.
- Test sintattici, test azimut, controlli PWA e ZIP superano.
