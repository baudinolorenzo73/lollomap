# LolloMap Pro 4.1.0

Pacchetto unico da pubblicare nel repository **lollomap**. URL previsto:

https://baudinolorenzo73.github.io/lollomap/index.html

## Che cosa cambia

- un solo archivio dati `lollomap_pro`;
- un solo registratore GPS, quello del Navigatore;
- un solo service worker e una sola app installabile;
- tracce fermate archiviate automaticamente nel Catalogo;
- backup completo LolloMap Pro e configurazione cifrata separata;
- cartella di sincronizzazione Drive `LolloMap Pro`.

Al primo avvio vengono rimossi punti, tracce e mappe offline di prova delle vecchie versioni. Se disponibili, vengono conservati preferenze, ID client Google e chiavi API. La vecchia cartella Drive non viene importata: la nuova versione ne crea una propria.

## Pubblicazione

In **Pubblica** seleziona questo ZIP e il repository `baudinolorenzo73/lollomap`. Mantieni i file già pubblicati, verifica che `index.html` sia alla radice e non usare la funzione che aggiunge una seconda PWA. Dopo la pubblicazione apri l'URL online, ricarica una volta, installa da Chrome e prova la riapertura in modalità aereo.

Pl@ntNet, AI, meteo, Drive e le altre fonti online richiedono rete. Mappe, Catalogo, bussola, azimut, stampa e rilievo 3D funzionano con i file locali; le carte offline vanno scaricate esplicitamente per la zona desiderata.
