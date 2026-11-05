# Atlante di campo 5.5 — revisione

## Risultato
La preparazione guidata è disponibile in Luogo e Altro: GPS, centro mappa o luogo attivo; raggio 1/3/5 km; carta e zoom scelti; stima prima del consenso al download. Salva i file app, registra il servizio offline, scarica carta, archivio e capitolo; verifica le tessere e distingue completamento da risultato parziale. I servizi possono limitare o non coprire l'area. Le immagini remote e i collegamenti esterni non sono garantiti offline.

Il nome della zona viene cercato con Nominatim; se non disponibile vengono usate le coordinate e alcune informazioni descrittive possono mancare. Il raggio definisce un quadrato circoscritto per mappe e archivio; le singole fonti hanno limiti propri. Non è garantita la completezza di tutte le informazioni presenti sul territorio.

## Correzioni
- Le nuove installazioni non importano automaticamente le schede e la biblioteca di Avigliana. Le installazioni esistenti conservano dati e luogo attivo; il Lago Piccolo rimane selezionabile.
- Mappe e archivio usano la stessa area, senza il precedente limite cartografico di 1,2 km.
- Backup completo: capitoli e archivi inclusi; tessere facoltative, massimo 150 MB di dati cartografici per limitare la memoria necessaria alla creazione dello ZIP. File app e credenziali restano separati.
- Il promemoria del backup si aggiorna soltanto dopo una conferma del salvataggio/condivisione; annullare mantiene le modifiche da salvare.
- Allegati mancanti recuperati anche se il punto esiste già. Tracce e liste con data di modifica più recente vengono unite.
- Importazione di tracce KML LineString e GeoJSON LineString/MultiLineString. Il formato GPX resta quello preferibile per conservare i tempi dei singoli punti.
- Un allegato mancante interrompe l'esportazione, anziché produrre un backup incompleto senza avviso. Il fallimento del foglio Excel viene segnalato.
- Separazione cache immagini/mappe; migrazione delle immagini precedentemente mescolate.
- Blocco dei download rilasciato anche dopo errori di memoria. Durante la preparazione non si cambia luogo; l'interruzione delle fonti avviene tra richieste.
- Natura 2000 di Avigliana compare tra gli approfondimenti del luogo pertinente.

## Funzioni mantenute e lavoro ulteriore
GPSLogger, strumenti da campo, percorsi, botanica, provider AI, esportazioni e scorciatoie sono mantenuti. La Super ricerca è il riconoscimento principale; il riconoscimento solo Pl@ntNet è nelle opzioni delle piante. Diario e riepiloghi hanno accesso principale in Uscita; la Macchina del tempo è raccolta in Mappe storiche. La preparazione della zona riunisce l'avvio dei download; archivio e capitolo conservano query distinte per ottenere dati diversi. Non è stata realizzata una deduplicazione completa delle richieste. La sincronizzazione Drive conserva il suo perimetro precedente: le mappe e gli archivi aggiunti al backup ZIP non vengono automaticamente sincronizzati su Drive.

## Verifica
Eseguire `node tools/verify55.cjs`: sintassi dei moduli, aree coerenti, nuovo luogo e conservazione vecchio luogo, classificazione immagini/tessere, merge aggiornamenti, recupero allegati, tracce GeoJSON, backup annullato/confermato, esportazione/ripristino archivi e rilascio del blocco dopo errore. Controllare il pacchetto con lo script Pubblica.

Da provare su dispositivo: resa dei nuovi comandi, GPS, salvataggi Android/iPhone, download reali, interruzione e apertura in modalità aereo. Non è disponibile un browser eseguibile in questo ambiente. La sintassi e le simulazioni non certificano il comportamento del dispositivo o dei servizi esterni.
