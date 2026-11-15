# LolloMap Pro 4.1 — unificazione dati e registrazione

## Estensione 4.3.1 — dock compatto e traccia dal vivo

- La navigazione lascia la mappa come elemento principale e usa un dock inferiore flottante con cinque comandi essenziali.
- Distanza, tempo e numero di punti GPS restano sempre visibili; velocità, quota, salita, precisione, tramonto e satelliti sono espandibili.
- Durante la registrazione il percorso acquisito compare subito sulla mappa e resta visibile durante la pausa e dopo la riapertura.
- Colore e spessore della linea sono modificabili, salvati sul dispositivo e applicati immediatamente.
- Tema notte e tema giorno mantengono controlli opachi, leggibili e ad alto contrasto.

## Estensione 4.3.2 — sistema flottante unificato

- Lo stile del dock GPS viene applicato a mappa principale, HUD, controlli mappa, menu, pannello strumenti, finestre a tutto schermo, modali e modulo Campo.
- Le superfici restano opache e compatte, con bordi ciano sottili e gruppi di comandi separati dalla mappa.
- Il tema giorno conserva la stessa struttura usando superfici bianche, testo scuro e bordi petrolio.
- Nessun comando o dato viene eliminato; cambia soltanto la presentazione.

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
