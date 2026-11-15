# Specifica Android 4.3.0

## Obiettivo

Produrre un progetto Android compilabile che incorpori LolloMap Pro 4.3.0, funzioni offline dopo l’installazione e mantenga online soltanto i servizi esterni.

## Requisiti verificabili

- Il progetto genera un APK debug con Gradle e Java 17.
- La pagina iniziale è caricata dagli asset interni via HTTPS locale.
- GPS e bussola nativi alimentano navigazione, bussola a tutto schermo e azimut.
- Esportazioni e backup vengono salvati nella cartella Download del telefono.
- Microfono, fotocamera e posizione vengono richiesti solo quando usati.
- Il pacchetto rimane `it.lollo.stampamappe`.
- Nessuna chiave API, password o chiave di firma è inclusa nel progetto.

## Interfaccia 4.3 ispirata alla struttura di OsmAnd

- Su telefono la mappa occupa l'intero schermo; nome e profilo sono nel menu laterale.
- Il menu principale scorre da sinistra e ordina le funzioni per attività, senza usare marchi o risorse grafiche di terzi.
- Due riquadri opachi mostrano quota e stato/distanza della registrazione; i controlli mappa sono flottanti sui bordi.
- Il pannello completo scorre da sinistra e conserva tutte le funzioni avanzate precedenti.
- Giorno e notte hanno contrasto completo, includono i controlli Leaflet e vengono ricordati.
- I dati salvati e lo schema dell’archivio 4.1 non vengono azzerati dall’aggiornamento grafico.
- In modalità Navigatore i sei dati sono compatti, opachi e scorrono orizzontalmente due alla volta.
