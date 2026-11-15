# Piano tecnico 4.1

- Mantenere la shell cartografica esistente per non rischiare regressioni su stampa, 3D, mappe e navigazione.
- Rendere `lollomap_pro` l'archivio persistente comune del modulo Catalogo/Campo.
- All'avvio iniziale leggere soltanto `kv/settings` dal vecchio database, quindi cancellare database, cache e dati geografici legacy. Trasferire le impostazioni al nuovo database alla prima apertura del modulo Campo.
- Inoltrare i comandi di registrazione Campo al Navigatore tramite il ponte same-origin già verificato.
- Convertire la registrazione del Navigatore nel formato traccia comune e accodarla finché il database non conferma il salvataggio.
- Rinominare backup e cartella Drive in LolloMap Pro. Non importare automaticamente la vecchia cartella Drive.
- Disabilitare manifest e registrazione service worker secondari nel modulo incorporato; il service worker radice precache tutti i file.
- Incrementare versione e cache a 4.1.0, eseguire verifiche statiche, test applicativi esistenti e controllo ZIP.

## Ripristino

La 4.0.0 resta recuperabile dal precedente ZIP. La 4.1.0 è intenzionalmente incompatibile con i dati di prova legacy; la configurazione cifrata `.atlcfg` resta importabile.
