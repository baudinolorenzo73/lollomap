# Verifica del pacchetto Android 4.3.0

Data: 14 novembre 2026

## Superato

- Sintassi JavaScript di `pro.js` e del modulo esportazioni Campo.
- Verifica automatica PWA: 67 risorse offline, un solo service worker, archivio unificato `lollomap_pro`, registratore unico, reset dei dati di prova e controlli del ponte fra le due interfacce.
- Versione Android `4.3.0` con `versionCode 430`.
- Presenza di Gradle wrapper, script Windows e workflow GitHub Actions.
- Corretto il riconoscimento di Java 17 quando `java -version` scrive su stderr in Windows PowerShell.
- Interfaccia mobile mappa-prima: HUD a due riquadri, menu e pannello laterali, controlli flottanti.
- Tema giorno/notte persistente con colori coerenti per pannello, finestre e controlli Leaflet.
- Navigatore mappa-prima: indicatori superiori opachi, scorrimento orizzontale e pulsanti inferiori alti 44 px.
- Schema dati mantenuto alla versione 4.1 per evitare qualsiasi nuova pulizia dell’archivio.
- Manifest con posizione, servizio GPS, notifiche, microfono e fotocamera.
- Collegamento di bussola, posizione, tasto Indietro ed esportazioni al contenitore Android.
- Controllo dell’archivio ZIP e assenza di APK, keystore, password o chiavi private incluse.

## Da provare sul telefono

- Prima compilazione completa: non eseguita in questo ambiente perché il download di Gradle è bloccato dalla rete disponibile.
- Precisione di bussola e azimut sul modello di telefono reale.
- Registrazione audio e acquisizione foto.
- Accesso Google Drive nella WebView; Google può limitare l’autenticazione OAuth incorporata.
- Aggiornamento sopra una vecchia installazione, che richiede la stessa chiave di firma.
- Controllo finale delle proporzioni del menu laterale e dei pulsanti flottanti sullo Xiaomi 13T Pro.
