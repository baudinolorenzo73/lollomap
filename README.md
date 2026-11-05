# Lollomap (ex Stampa Mappe)

## Novità 3.2 — livelli GeoJSON e anteprima ingrandibile

### Rilievo 3D (prima versione da collaudare sul dispositivo)

Apri **Rilievo 3D, PDF e stampa** e genera la vista del riquadro. Il modello usa le quote Terrarium già impiegate nell'app, con una griglia di 40×40 celle; scarica al massimo 16 tessere altimetriche, soltanto dopo il comando esplicito. La mappa selezionata, le tracce e i livelli locali vengono disegnati sul terreno. Regola rotazione, inclinazione e amplificazione delle altezze, poi scegli PDF A4 orizzontale, JPG o stampa. Le quote mancanti o una base incompleta bloccano la generazione con un messaggio.

Il PDF 3D è un'immagine statica della vista scelta: non contiene un modello 3D navigabile, non ha scala uniforme e non è georiferito. Il PDF 2D mantiene la georeferenziazione. Questa vista 3D non usa modelli TopoExport: l'integrazione diretta di GeoTIFF/glTF TopoExport richiede un ulteriore importatore e dati/accesso autorizzati.

Verifica tecnica effettuata con quote e mappa sintetiche: rendering della griglia con texture, variazione dell'orientamento e del rilievo, generazione e lettura dei PDF (3D senza georeferenziazione, 2D con georeferenziazione), importazione GeoJSON e rifiuto di coordinate non WGS84. Browser reale, servizi cartografici online, GPS, stampa fisica e APK non collaudati in questo ambiente.

- Apri **TopoExport e livelli GeoJSON** e importa un file WGS84 (longitudine, latitudine): massimo 2 MB e 50.000 vertici. Punti, linee, poligoni con fori e geometrie multiple sono supportati.
- Imposta colore e fonte/licenza: il livello è visibile sulla mappa e viene incluso nelle nuove anteprime, nei PDF, nelle immagini esportate e nella stampa, anche nell'atlante.
- Il file è conservato sul dispositivo e nel backup già esistente. Se manca spazio viene segnalato e resta utilizzabile nella sessione. Rimuovi cancella il solo livello importato.
- **Genera anteprima / PDF / stampa** prepara il foglio. **Ingrandisci a video** permette di esaminarlo scorrendo; **PDF georiferito** scarica il PDF, **Stampante / PDF di sistema** apre la stampa del browser (o il ponte Android già esistente).
- Per stampare in scala: formato carta corrispondente, scala 100%, margini nessuno, intestazioni/piè di pagina del browser disattivati. Le stampanti senza stampa al vivo possono tagliare i bordi.
- TopoExport si apre separatamente: questa versione non chiama la sua API, non acquisisce dati automaticamente e non importa modelli 3D, DXF, SVG o GeoTIFF. Il GeoJSON è un formato dell'API TopoExport; non è garantito che il piano gratuito del sito lo offra come download. Puoi importare anche GeoJSON da altre fonti o convertiti in QGIS.
- Le basi online richiedono la rete, salvo aree già scaricate. Il livello GeoJSON locale funziona offline. Rigenera il foglio dopo aver modificato livello, colore o fonte.

App web (PWA) per stampare mappe di **Piemonte e Valle d'Aosta** in scala, con reticolo e coordinate, freccia del nord, barra di scala e traccia GPX. by Lollo ®2026

## Mappe disponibili
- OpenTopoMap, OpenStreetMap, CyclOSM, Esri satellite ed Esri Topo
- Piemonte (Geoportale, MapProxy): carte BDTRE 1:10.000, 1:25.000, 1:50.000, sfondo BDTRE, CTR storica, ortofoto 2010, IGM 1955-69 (prov. Torino)
- Valle d'Aosta (SCT): CTR raster 2005, carta pittorica, ortofoto 2024, CTR numerica
- Livelli sovrapposti: sentieri Waymarked Trails, rilievo ombreggiato, curve di livello VdA, modello altimetrico VdA
- Qualsiasi altro WMS che supporti EPSG:3857 (pulsante «Aggiungi un servizio WMS»)

## Livelli tematici (v1.1)
- Geologia: carta geologica 1:250.000 e litologia 1:100.000 (Arpa Piemonte), fogli CARG 1:50.000, geositi, faglie, carta geologica continua e ghiacciai VdA
- Bosco e suolo: carta forestale 2025, uso del suolo 2021, carta dei suoli (Piemonte); copertura del suolo 2024 e capacità d'uso (VdA)
- Natura: aree protette e Natura 2000, habitat, rete ecologica, corridoi dei mammiferi, alberi monumentali
- Flora e fauna: avvistamenti GBIF (piante, funghi, uccelli, mammiferi, anfibi e rettili, insetti, farfalle)
- Rischi: frane SIFraP, catasto dissesti VdA
- Sentieri: rete sentieri regionale RPE, itinerari/ferrate/falesie, strutture alpine
- Legenda di ogni servizio (🔑) e legenda stampata sul foglio

## Punti utili (v1.1)
Fontane, sorgenti, parcheggi, uffici informazioni, bar, ristoranti, rifugi, alberghi, cime, panorami, picnic, WC, bus, chiese, DAE, farmacie, alimentari, paline dei sentieri: da OpenStreetMap, stampati con simboli e scaricabili in GPX, CSV, GeoJSON.

## Novità v1.2
- Schema dei tre nord (geografico, reticolo, magnetico) con declinazione magnetica WMM2025 per la data dell'uscita
- Coordinatometro UTM da ritagliare, nella scala della carta
- Tocco sulla mappa: coordinate WGS84/UTM e quota, con segni (crocino + nome) da stampare
- QR code sulla carta: link alla mappa, navigazione alla partenza, coordinate o testo libero
- Modelli di stampa pronti e personali
- Link da condividere con zona, scala, livelli, titolo e segni
- Alba e tramonto del giorno dell'uscita nella didascalia

## Novità v1.3
- Profilo altimetrico sotto la mappa: lunghezza, salita, discesa, quote minima e massima
- Tempo di percorrenza con il metodo CAI/DIN 33466 (tempo maggiore + metà del minore), andata e verso contrario, tre passi
- Quote dal GPX o dal modello del terreno (Open-Meteo, 90 m) quando mancano
- Chilometri segnati sulla traccia
- Atlante su più fogli lungo la traccia: sovrapposizione regolabile, orientamento migliore per foglio, quadro d'unione, riquadri dei fogli vicini, profilo con il tratto evidenziato; PDF unico georiferito (pagina per pagina), JPG in ZIP e stampa
- La traccia resta salvata sul dispositivo

## Novità v1.4
- Disegno di un percorso toccando la mappa: i tratti seguono i sentieri (BRouter su dati OpenStreetMap, profili: sentieri di montagna, escursionismo, il più corto)
- Punti trascinabili, tratti in linea retta fuori sentiero, annulla, anello, inverti, cancella
- Il percorso diventa la traccia: profilo, tempi CAI, chilometri, atlante e stampa funzionano subito
- Scarica GPX della traccia (caricata o disegnata) con quote, punti e segni
- Percorso e traccia restano salvati sul dispositivo

## Novità v1.5
- Carta delle pendenze calcolata nel browser dal modello del terreno Terrarium (AWS): classi 30–35°, 35–40°, 40–45°, oltre 45° e, a scelta, 25–30°
- Filtro per esposizione dei versanti (N, NE, E, SE, S, SO, O, NO), come nei bollettini valanghe
- Visibile sulla mappa, in stampa, nell'atlante, con legenda a colori
- Filtro dei pixel guasti del modello del terreno
- Indicativa (risoluzione circa 30 m): non sostituisce il bollettino valanghe né la valutazione sul posto

## Novità v2.0 — Navigatore
- Pulsante «🧭 Naviga»: mappa a schermo intero con la tua posizione, cerchio di precisione e direzione (bussola o rotta GPS), mappa che ti segue
- Posizioni ripulite con filtro di Kalman; scartate quelle troppo imprecise
- Registrazione della traccia: tempo, distanza, velocità, quota, salita; ripresa dopo la chiusura dell'app; GPX con orari; «usala come traccia» per stampa e atlante
- Guida lungo la traccia o il percorso disegnato: chilometri e salita rimasti, tempo CAI, ora di arrivo, profilo con la tua posizione
- Avvisi a voce e vibrazione: fuori percorso (con direzione per rientrare), verso opposto, punti in arrivo (200 m e 50 m), arrivo
- «Torna a…»: parcheggio salvato, partenza, inizio/fine traccia, segni, punto toccato; freccia, distanza e «portami lì sui sentieri»
- 🆘 Emergenza: coordinate grandi (WGS84, gradi-primi-secondi, UTM), quota, chiamata al 112, invio della posizione
- Lo schermo resta acceso durante la navigazione (il GPS del browser funziona solo con l'app aperta)

## Novità v2.1 — App Android
- Esiste anche come app Android (progetto «lollomap-android»): GPS del telefono in un servizio con notifica, attivo anche a schermo spento, con numero di satelliti
- Nell'app: voce di sistema, vibrazione, bussola del sensore con declinazione, file salvati in Download/Lollomap, stampa del PDF in scala con il formato giusto, apertura dei GPX dal file manager, tasto indietro
- Quota GPS corretta con il geoide (−48 m in Piemonte e Valle d'Aosta); bussola corretta con la declinazione magnetica

## Piano delle prossime versioni
- v2.2: mappe salvate per l'uso offline (come TrekMe), importazione KML/KMZ/CSV/NMEA/GeoJSON, foto e note sui punti, punti di avviso a distanza
- in seguito: stampa ruotata sul nord reticolo; mappa KMZ per GPS Garmin

## Esportazioni
- Stampa diretta (anche «Salva come PDF»)
- PDF georiferito (ISO 32000, leggibile da Avenza Maps, QGIS/GDAL)
- JPG del foglio intero
- GeoTIFF della sola mappa (EPSG:3857)
- JPG + world file (.jgw + .prj) in ZIP

Per stampare in scala esatta: Margini «nessuno», Scala «100%».

## Novità v3.0 — il nuovo nome è Lollomap
- **Mappe offline**: le tessere che guardi restano salvate per 7 giorni; le carte regionali (Piemonte, Valle d'Aosta, Arpa, CSI) e le quote per le pendenze si scaricano per zona (riquadro di stampa, traccia + 1 km, vista) con il dettaglio scelto. Senza rete la mappa e anche la stampa dei servizi WMS si ricompongono dalle tessere salvate. OpenStreetMap, OpenTopoMap, Esri e GBIF non permettono lo scarico massivo: per loro vale solo la cache delle viste.
- **Importazione**: oltre al GPX, anche KML, KMZ, GeoJSON, CSV (colonne lat/lon, con «nome» diventano punti), NMEA (registratori GPS) e TCX (Garmin).
- **Meteo della zona**: 4 giorni, 4 modelli a confronto (ICON-2I, ICON, ECMWF, Météo-France) con accordo tra i modelli e zero termico; la previsione del giorno dell'uscita si può stampare sul foglio. Resta salvata e si legge senza rete.
- **Navigatore**: avviso a voce vicino ai punti (punti utili, segni, punti della traccia) e «rientro prima del buio» (arrivo previsto o tempo per tornare, confrontato con il tramonto e un margine).
- **Backup** su file di impostazioni, modelli, traccia, punti, segni, registrazione e zone: per cambiare telefono o passare dalla vecchia Stampa Mappe.
- Idee e codice ripresi dai progetti di Lorenzo «Atlante di campo», «Traccia GPS» e «Meteo Alpi».

## Novità v3.1 — mappe per OsmAnd
- **📲 OsmAnd** nell'elenco delle zone offline: ogni carta della zona diventa un file `.sqlitedb` (formato tessere di OsmAnd, già pieno, solo offline). Sul telefono si apre con OsmAnd e si sceglie in Configura mappa → Sorgente mappa, oppure come mappa sovrapposta o sottostante.
- **GPX dei punti utili con icone e colori di OsmAnd** (estensioni `osmand:icon`, `osmand:color`, `osmand:background` e un gruppo per categoria).
- Libreria SQLite: sql.js 1.10.3 (MIT) nella cartella `lib/`; nel file HTML singolo si carica dalla rete solo quando serve.
