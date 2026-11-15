# LolloMap Pro 4.3.0 per Android

Progetto Android Studio pronto per creare l’APK di LolloMap Pro. La PWA completa è incorporata nell’app e parte anche senza collegamento a Internet. Le interrogazioni esterne, come Pl@ntNet, Google Drive e le mappe non ancora scaricate, richiedono rete.

## Metodo più semplice su Windows

1. Estrai tutto lo ZIP in una cartella.
2. Fai doppio clic su `COMPILA_ANDROID.bat`.
3. Scegli `1` per creare un APK di prova.
4. Alla fine trovi `LolloMap-Pro-v4.3.0-prova.apk` nella cartella del progetto.

Lo script cerca Java 17 e Android SDK. Se non li trova, li scarica e configura automaticamente. La prima compilazione richiede Internet e può occupare alcuni minuti.

Per installare direttamente sul telefono, attiva **Debug USB**, collegalo al PC e scegli `2`.

## Android Studio

Apri questa cartella come progetto e attendi la sincronizzazione Gradle. Poi usa **Build > Build APK(s)**. Il pacchetto Android resta `it.lollo.stampamappe`, così può aggiornare la vecchia app se viene firmato con la medesima chiave.

## Compilazione da GitHub

Il file `.github/workflows/apk.yml` compila automaticamente l’APK di prova a ogni caricamento sul ramo `main` o `master`. Su GitHub: **Actions > Compila APK > Artifacts > LolloMap-Pro-v4.3.0-APK**.

## APK firmato

Nel menu dello script scegli `3`. La prima volta viene creata o richiesta una chiave. Conserva il file della chiave e la password: senza la stessa chiave non è possibile installare un aggiornamento sopra la versione precedente.

## Funzioni native incluse

- GPS in primo piano e in background, anche a schermo spento;
- bussola nativa per la schermata a tutto schermo e calcolo azimut;
- accesso autorizzato a posizione, microfono e fotocamera;
- apertura di GPX, KML, KMZ, GeoJSON, CSV, NMEA e TCX;
- salvataggio esportazioni in `Download/LolloMap Pro`;
- stampa PDF tramite la finestra di stampa Android;
- sintesi vocale, vibrazione e gestione batteria.

## Nota Google Drive

L’autenticazione Google dentro una WebView può essere rifiutata dalle regole OAuth del progetto Google. Il resto dell’app funziona comunque; se l’accesso Drive viene bloccato, usare la PWA installata da Chrome oppure prevedere in seguito l’accesso Google nativo.
