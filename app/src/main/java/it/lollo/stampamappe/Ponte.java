package it.lollo.stampamappe;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Ponte tra la pagina e Android: in JavaScript è l'oggetto «AndroidApp».
 * Tutti i metodi sono chiamati da un thread della WebView: quello che tocca
 * l'interfaccia passa da runOnUiThread.
 */
public class Ponte {

    final MainActivity a;
    final Map<String, OutputStream> flussi = new HashMap<>();
    final Map<String, String> nomi = new HashMap<>();
    int contatore = 0;

    Ponte(MainActivity a) { this.a = a; }

    @JavascriptInterface
    public String versione() {
        try {
            PackageInfo p = a.getPackageManager().getPackageInfo(a.getPackageName(), 0);
            return p.versionName;
        } catch (Exception e) { return "?"; }
    }

    /* ---------- GPS ---------- */
    @JavascriptInterface public void avviaGPS() { a.runOnUiThread(a::avviaGPS); }
    @JavascriptInterface public void fermaGPS() { a.runOnUiThread(a::fermaGPS); }
    @JavascriptInterface public boolean gpsAttivo() { return ServizioGPS.attivo; }
    @JavascriptInterface public String posizioniDopo(String ultimo) {
        long n = 0;
        try { n = Long.parseLong(ultimo); } catch (Exception ignorata) { }
        return ServizioGPS.dopo(n);
    }

    /* ---------- Voce, vibrazione, schermo ---------- */
    @JavascriptInterface
    public void parla(String testo) {
        if (a.voceOk) a.voce.speak(testo, TextToSpeech.QUEUE_FLUSH, null, "stampamappe");
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public void vibra(String schema) {
        Vibrator v = (Vibrator) a.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null) return;
        String[] parti = schema.split(",");
        long[] p = new long[parti.length + 1];   // il primo valore è l'attesa iniziale
        for (int i = 0; i < parti.length; i++) {
            try { p[i + 1] = Long.parseLong(parti[i].trim()); } catch (Exception e) { p[i + 1] = 100; }
        }
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(p, -1));
        else v.vibrate(p, -1);
    }

    @JavascriptInterface
    public void schermoAcceso(boolean acceso) {
        a.runOnUiThread(() -> {
            if (acceso) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    /* ---------- Condividi, copia, batteria ---------- */
    @JavascriptInterface
    public void condividi(String testo) {
        a.runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, testo);
            a.startActivity(Intent.createChooser(i, "Condividi"));
        });
    }

    @JavascriptInterface
    public void copia(String testo) {
        a.runOnUiThread(() -> {
            ClipboardManager cm = (ClipboardManager) a.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("LolloMap Pro", testo));
            Toast.makeText(a, "Copiato", Toast.LENGTH_SHORT).show();
        });
    }

    /** Chiede di non limitare la batteria (utile sui telefoni Xiaomi, Huawei, Samsung). */
    @JavascriptInterface
    public void batteria() {
        a.runOnUiThread(() -> {
            try {
                a.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + a.getPackageName())));
            } catch (Exception e) {
                a.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        });
    }

    /* ---------- File: la pagina li manda a pezzi in base64 ---------- */
    @JavascriptInterface
    public String fileInizia(String nome, String tipo, String scopo) {
        try {
            String id = "f" + (++contatore);
            OutputStream out;
            if ("stampa".equals(scopo)) {
                out = new FileOutputStream(new File(a.getCacheDir(), id + ".pdf"));
                nomi.put(id, new File(a.getCacheDir(), id + ".pdf").getAbsolutePath());
            } else if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, tipo == null || tipo.isEmpty() ? "application/octet-stream" : tipo);
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/LolloMap Pro");
                ContentResolver cr = a.getContentResolver();
                Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (u == null) return "";
                out = cr.openOutputStream(u);
                nomi.put(id, "Download/LolloMap Pro/" + nome);
            } else {
                File cartella = a.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                File f = new File(cartella, nome);
                out = new FileOutputStream(f);
                nomi.put(id, f.getAbsolutePath());
            }
            if (out == null) return "";
            flussi.put(id, out);
            return id;
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public boolean fileAggiungi(String id, String base64) {
        OutputStream out = flussi.get(id);
        if (out == null) return false;
        try {
            out.write(Base64.decode(base64, Base64.DEFAULT));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Chiude il file. Per la stampa apre la finestra di stampa di Android con il formato giusto. */
    @JavascriptInterface
    public String fileFine(String id, String scopo, String titolo, double larghezzaMm, double altezzaMm) {
        OutputStream out = flussi.remove(id);
        String dove = nomi.remove(id);
        if (out == null) return "";
        try { out.close(); } catch (Exception e) { return ""; }
        if ("stampa".equals(scopo)) {
            final File f = new File(dove);
            a.runOnUiThread(() -> a.stampaPdf(f, titolo, larghezzaMm, altezzaMm));
        } else {
            a.runOnUiThread(() -> Toast.makeText(a, "Salvato in " + dove, Toast.LENGTH_LONG).show());
        }
        return dove;
    }
}
