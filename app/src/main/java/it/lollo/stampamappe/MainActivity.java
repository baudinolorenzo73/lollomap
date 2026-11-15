package it.lollo.stampamappe;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.speech.tts.TextToSpeech;
import android.view.Surface;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Locale;

/**
 * LolloMap Pro — by Lollo ®2026
 * L'app web gira in una WebView servita da un indirizzo https interno (WebViewAssetLoader):
 * così funzionano localStorage, fetch e le tessere delle mappe come nel browser.
 * Il GPS arriva dal ServizioGPS (in primo piano, anche a schermo spento).
 */
public class MainActivity extends Activity implements SensorEventListener {

    static final String HOST = "appassets.androidplatform.net";
    static final String INDIRIZZO = "https://" + HOST + "/assets/www/index.html";
    static final int REQ_POSIZIONE = 1, REQ_FILE = 2, REQ_NOTIFICHE = 3, REQ_MEDIA = 4;

    /** Riferimento usato dal servizio GPS per consegnare le posizioni alla pagina. */
    static MainActivity attiva;

    WebView web;
    TextToSpeech voce;
    boolean voceOk, paginaPronta, gpsRichiesto;
    String gpxInAttesa;
    ValueCallback<Uri[]> sceltaFile;
    GeolocationPermissions.Callback geoCallback;
    String geoOrigine;
    PermissionRequest richiestaMedia;
    SensorManager sensori;
    Sensor rotazione;
    long ultimaBussola;

    @Override
    protected void onCreate(Bundle stato) {
        super.onCreate(stato);
        attiva = this;
        web = new WebView(this);
        // Android 15 disegna l'app sotto le barre di sistema: il contenitore lascia lo spazio giusto
        FrameLayout contenitore = new FrameLayout(this);
        contenitore.setBackgroundColor(0xFF2F5D3A);
        contenitore.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        contenitore.setOnApplyWindowInsetsListener((v, ins) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets b = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(b.left, b.top, b.right, b.bottom);
            } else {
                v.setPadding(ins.getSystemWindowInsetLeft(), ins.getSystemWindowInsetTop(), ins.getSystemWindowInsetRight(), ins.getSystemWindowInsetBottom());
            }
            return ins;
        });
        setContentView(contenitore);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " LolloMapProApp");

        final WebViewAssetLoader caricatore = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                WebResourceResponse risp = caricatore.shouldInterceptRequest(r.getUrl());
                // la libreria SQLite (per i file di OsmAnd) è WebAssembly: va servita con il suo tipo
                String via = r.getUrl().getPath();
                if (risp != null && via != null && via.endsWith(".wasm")) risp.setMimeType("application/wasm");
                return risp;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                apriEsterno(u);   // tel:, sms:, WhatsApp, Google Maps, OpenStreetMap…
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                paginaPronta = true;
                if (gpxInAttesa != null) { js(gpxInAttesa); gpxInAttesa = null; }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origine, GeolocationPermissions.Callback cb) {
                if (haPosizione()) cb.invoke(origine, true, false);
                else { geoCallback = cb; geoOrigine = origine; chiediPosizione(); }
            }

            @Override
            public void onPermissionRequest(PermissionRequest richiesta) {
                runOnUiThread(() -> gestisciPermessiMedia(richiesta));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest richiesta) {
                if (richiestaMedia == richiesta) richiestaMedia = null;
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (sceltaFile != null) sceltaFile.onReceiveValue(null);
                sceltaFile = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");   // i file .gpx non hanno un tipo riconosciuto da tutti i telefoni
                try {
                    startActivityForResult(Intent.createChooser(i, "Scegli il file"), REQ_FILE);
                } catch (Exception e) {
                    sceltaFile = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Ponte(this), "AndroidApp");

        voce = new TextToSpeech(this, st -> {
            if (st == TextToSpeech.SUCCESS) { voce.setLanguage(Locale.ITALIAN); voceOk = true; }
        });
        sensori = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sensori != null) rotazione = sensori.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        web.loadUrl(INDIRIZZO);
        gestisciIntento(getIntent());
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        gestisciIntento(i);
    }

    /** Un file di traccia (GPX, KML, KMZ, GeoJSON, CSV, NMEA, TCX) aperto con «Apri con» o
     *  ricevuto con «Condividi»: passa alla pagina in base64, così anche i KMZ (ZIP) arrivano interi. */
    void gestisciIntento(Intent i) {
        if (i == null) return;
        Uri u = null;
        if (Intent.ACTION_VIEW.equals(i.getAction())) u = i.getData();
        else if (Intent.ACTION_SEND.equals(i.getAction())) u = i.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null) return;
        try (InputStream in = getContentResolver().openInputStream(u)) {
            if (in == null) return;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int k;
            while ((k = in.read(buf)) > 0) {
                out.write(buf, 0, k);
                if (out.size() > 20_000_000) throw new Exception("file troppo grande (più di 20 MB)");
            }
            String b64 = android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP);
            String codice = "window.apriFileNativo && window.apriFileNativo(" + JSONObject.quote(nomeFile(u)) + ",'" + b64 + "')";
            if (paginaPronta) js(codice); else gpxInAttesa = codice;
        } catch (Exception e) {
            Toast.makeText(this, "Non riesco ad aprire il file: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    String nomeFile(Uri u) {
        try (Cursor c = getContentResolver().query(u, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int col = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (col >= 0) return c.getString(col);
            }
        } catch (Exception ignorata) { }
        String p = u.getLastPathSegment();
        return p != null ? p : "traccia.gpx";
    }

    /** Esegue codice JavaScript nella pagina (sempre sul thread dell'interfaccia). */
    void js(String codice) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(codice, null); });
    }

    /** Chiamato dal servizio GPS per ogni nuova posizione. */
    static void consegna(String json) {
        MainActivity a = attiva;
        if (a != null) a.js("window.posizioneNativa && window.posizioneNativa(" + json + ")");
    }

    boolean haPosizione() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    void chiediPosizione() {
        requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_POSIZIONE);
    }

    /** Concede alla pagina solo microfono e videocamera, dopo il permesso Android esplicito. */
    void gestisciPermessiMedia(PermissionRequest richiesta) {
        if (richiesta.getOrigin() == null || !HOST.equals(richiesta.getOrigin().getHost())) {
            richiesta.deny();
            return;
        }
        ArrayList<String> mancanti = new ArrayList<>();
        for (String risorsa : richiesta.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(risorsa)) {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                    mancanti.add(Manifest.permission.RECORD_AUDIO);
            } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(risorsa)) {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                    mancanti.add(Manifest.permission.CAMERA);
            } else {
                richiesta.deny();
                return;
            }
        }
        if (mancanti.isEmpty()) richiesta.grant(richiesta.getResources());
        else {
            richiestaMedia = richiesta;
            requestPermissions(mancanti.toArray(new String[0]), REQ_MEDIA);
        }
    }

    void avviaGPS() {
        gpsRichiesto = true;
        if (!haPosizione()) { chiediPosizione(); return; }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIFICHE);
        }
        Intent i = new Intent(this, ServizioGPS.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
        } catch (Exception e) {
            Toast.makeText(this, "Non riesco ad avviare il GPS: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
        avviaBussola();
    }

    void fermaGPS() {
        gpsRichiesto = false;
        stopService(new Intent(this, ServizioGPS.class));
        fermaBussola();
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] permessi, int[] esiti) {
        super.onRequestPermissionsResult(req, permessi, esiti);
        if (req == REQ_POSIZIONE) {
            boolean ok = haPosizione();
            if (geoCallback != null) { geoCallback.invoke(geoOrigine, ok, false); geoCallback = null; }
            if (ok && gpsRichiesto) avviaGPS();
            if (!ok) js("window.erroreNativo && window.erroreNativo('Permesso di posizione negato: abilitalo nelle impostazioni dell\\'app.')");
            return;
        }
        if (req == REQ_MEDIA && richiestaMedia != null) {
            PermissionRequest richiesta = richiestaMedia;
            richiestaMedia = null;
            boolean ok = true;
            for (int esito : esiti) if (esito != PackageManager.PERMISSION_GRANTED) ok = false;
            if (ok) richiesta.grant(richiesta.getResources()); else richiesta.deny();
        }
    }

    @Override
    protected void onActivityResult(int req, int esito, Intent dati) {
        super.onActivityResult(req, esito, dati);
        if (req == REQ_FILE && sceltaFile != null) {
            sceltaFile.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(esito, dati));
            sceltaFile = null;
        }
    }

    /* ---------- Bussola: sensore di rotazione, nord magnetico (la pagina aggiunge la declinazione) ---------- */
    void avviaBussola() {
        if (sensori != null && rotazione != null) sensori.registerListener(this, rotazione, SensorManager.SENSOR_DELAY_UI);
    }

    void fermaBussola() {
        if (sensori != null) sensori.unregisterListener(this);
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        long ora = System.currentTimeMillis();
        if (ora - ultimaBussola < 200) return;
        ultimaBussola = ora;
        float[] r = new float[9], rr = new float[9], o = new float[3];
        SensorManager.getRotationMatrixFromVector(r, e.values);
        int ax = SensorManager.AXIS_X, ay = SensorManager.AXIS_Y;
        switch (getWindowManager().getDefaultDisplay().getRotation()) {
            case Surface.ROTATION_90: ax = SensorManager.AXIS_Y; ay = SensorManager.AXIS_MINUS_X; break;
            case Surface.ROTATION_180: ax = SensorManager.AXIS_MINUS_X; ay = SensorManager.AXIS_MINUS_Y; break;
            case Surface.ROTATION_270: ax = SensorManager.AXIS_MINUS_Y; ay = SensorManager.AXIS_X; break;
            default: break;
        }
        SensorManager.remapCoordinateSystem(r, ax, ay, rr);
        SensorManager.getOrientation(rr, o);
        double az = (Math.toDegrees(o[0]) + 360) % 360;
        String valore = String.format(Locale.US, "%.1f", az);
        js("window.bussolaNativa && window.bussolaNativa(" + valore + ");"
                + "window.bussolaProNativa && window.bussolaProNativa(" + valore + ")");
    }

    @Override
    public void onAccuracyChanged(Sensor s, int precisione) { }

    /* ---------- Stampa del PDF in scala ---------- */
    void stampaPdf(final File f, final String titolo, double wmm, double hmm) {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        if (pm == null) return;
        PrintAttributes attr = new PrintAttributes.Builder()
                .setMediaSize(formato(wmm, hmm))
                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                .build();
        pm.print(titolo, new PrintDocumentAdapter() {
            @Override
            public void onLayout(PrintAttributes vecchi, PrintAttributes nuovi, CancellationSignal annulla, LayoutResultCallback cb, Bundle extra) {
                if (annulla.isCanceled()) { cb.onLayoutCancelled(); return; }
                cb.onLayoutFinished(new PrintDocumentInfo.Builder(titolo + ".pdf")
                        .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(), true);
            }

            @Override
            public void onWrite(PageRange[] pagine, ParcelFileDescriptor dest, CancellationSignal annulla, WriteResultCallback cb) {
                try (InputStream in = new FileInputStream(f); OutputStream out = new FileOutputStream(dest.getFileDescriptor())) {
                    byte[] buf = new byte[65536];
                    int k;
                    while ((k = in.read(buf)) > 0) out.write(buf, 0, k);
                    cb.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                } catch (Exception ex) {
                    cb.onWriteFailed(ex.getMessage());
                }
            }
        }, attr);
    }

    /** Formato carta: i formati ISO noti, altrimenti uno su misura (in millesimi di pollice). */
    static PrintAttributes.MediaSize formato(double wmm, double hmm) {
        double corto = Math.min(wmm, hmm), lungo = Math.max(wmm, hmm);
        PrintAttributes.MediaSize m = null;
        if (vicino(corto, 148) && vicino(lungo, 210)) m = PrintAttributes.MediaSize.ISO_A5;
        else if (vicino(corto, 210) && vicino(lungo, 297)) m = PrintAttributes.MediaSize.ISO_A4;
        else if (vicino(corto, 297) && vicino(lungo, 420)) m = PrintAttributes.MediaSize.ISO_A3;
        else if (vicino(corto, 420) && vicino(lungo, 594)) m = PrintAttributes.MediaSize.ISO_A2;
        else if (vicino(corto, 594) && vicino(lungo, 841)) m = PrintAttributes.MediaSize.ISO_A1;
        else if (vicino(corto, 841) && vicino(lungo, 1189)) m = PrintAttributes.MediaSize.ISO_A0;
        if (m == null) {
            m = new PrintAttributes.MediaSize("SM_" + Math.round(wmm) + "x" + Math.round(hmm),
                    Math.round(wmm) + " × " + Math.round(hmm) + " mm",
                    (int) Math.round(corto / 25.4 * 1000), (int) Math.round(lungo / 25.4 * 1000));
        }
        return wmm > hmm ? m.asLandscape() : m.asPortrait();
    }

    static boolean vicino(double a, double b) { return Math.abs(a - b) < 2; }

    void apriEsterno(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, "Nessuna app per aprire: " + u, Toast.LENGTH_LONG).show();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // la pagina chiude prima finestre e anteprime; se non c'è niente da chiudere l'app va in secondo piano
        web.evaluateJavascript("window.indietroAndroid ? window.indietroAndroid() : false", v -> {
            if (!"true".equals(v)) moveTaskToBack(true);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        attiva = this;
        if (gpsRichiesto) avviaBussola();
        js("window.ripresaNativa && window.ripresaNativa()");
    }

    @Override
    protected void onPause() {
        super.onPause();
        fermaBussola();   // la bussola consuma: a schermo spento non serve
    }

    @Override
    protected void onDestroy() {
        if (attiva == this) attiva = null;
        if (voce != null) voce.shutdown();
        super.onDestroy();
    }
}
