package it.lollo.stampamappe;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.GnssStatus;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Servizio GPS in primo piano (notifica fissa): continua a ricevere le posizioni
 * anche a schermo spento. Ogni posizione va subito alla pagina e resta in una coda
 * numerata, così la pagina recupera quelle perse quando torna attiva.
 * Usa il GPS del telefono (LocationManager): funziona anche senza i servizi Google.
 */
public class ServizioGPS extends Service implements LocationListener {

    static final String CANALE = "navigatore";
    static final String AZIONE_FERMA = "it.lollo.stampamappe.FERMA";
    static final int MAX_CODA = 30000;

    static final class Fix {
        final long seq; final String json;
        Fix(long seq, String json) { this.seq = seq; this.json = json; }
    }

    static final ArrayList<Fix> coda = new ArrayList<>();
    static long seq = 0;
    static volatile boolean attivo = false;

    LocationManager lm;
    GnssStatus.Callback gnss;
    volatile int satUsati = -1, satTotali = -1;
    long ultimoGps = 0;
    PowerManager.WakeLock blocco;

    @Override
    public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent i, int flag, int id) {
        if (i != null && AZIONE_FERMA.equals(i.getAction())) {
            MainActivity a = MainActivity.attiva;
            if (a != null) a.js("window.gpsFermatoNativo && window.gpsFermatoNativo()");
            stopSelf();
            return START_NOT_STICKY;
        }
        primoPiano();
        if (lm == null) avviaLocalizzazione();
        attivo = true;
        return START_STICKY;
    }

    void primoPiano() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            nm.createNotificationChannel(new NotificationChannel(CANALE, "Navigatore", NotificationManager.IMPORTANCE_LOW));
        }
        Intent apri = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent piApri = PendingIntent.getActivity(this, 0, apri, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent ferma = new Intent(this, ServizioGPS.class).setAction(AZIONE_FERMA);
        PendingIntent piFerma = PendingIntent.getService(this, 1, ferma, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder nb = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CANALE) : new Notification.Builder(this);
        nb.setContentTitle("LolloMap Pro · navigatore attivo")
                .setContentText("GPS in uso, anche a schermo spento")
                .setSmallIcon(R.drawable.ic_notifica)
                .setContentIntent(piApri)
                .setOngoing(true)
                .addAction(new Notification.Action.Builder(null, "Ferma il GPS", piFerma).build());
        Notification n = nb.build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(1, n);
    }

    void avviaLocalizzazione() {
        lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (lm == null) { stopSelf(); return; }
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0f, this, Looper.getMainLooper());
        } catch (SecurityException | IllegalArgumentException e) {
            stopSelf();
            return;
        }
        try {   // la rete dà una posizione approssimata finché il GPS non aggancia i satelliti
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000, 0f, this, Looper.getMainLooper());
            }
        } catch (SecurityException | IllegalArgumentException ignorata) { }
        try {
            gnss = new GnssStatus.Callback() {
                @Override
                public void onSatelliteStatusChanged(GnssStatus s) {
                    int usati = 0;
                    for (int k = 0; k < s.getSatelliteCount(); k++) if (s.usedInFix(k)) usati++;
                    satUsati = usati;
                    satTotali = s.getSatelliteCount();
                }
            };
            lm.registerGnssStatusCallback(gnss, new Handler(Looper.getMainLooper()));
        } catch (SecurityException ignorata) { }
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            blocco = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LolloMapPro:gps");
            blocco.acquire(12 * 3600 * 1000L);   // al massimo 12 ore
        }
    }

    @Override
    public void onLocationChanged(Location l) {
        boolean gps = LocationManager.GPS_PROVIDER.equals(l.getProvider());
        long ora = System.currentTimeMillis();
        if (gps) ultimoGps = ora;
        else if (ora - ultimoGps < 15000) return;   // c'è il GPS: la posizione di rete non serve
        boolean msl = false;
        String alt = "null";
        if (Build.VERSION.SDK_INT >= 34 && l.hasMslAltitude()) {
            alt = String.format(Locale.US, "%.1f", l.getMslAltitudeMeters()); msl = true;
        } else if (l.hasAltitude()) {
            alt = String.format(Locale.US, "%.1f", l.getAltitude());   // sull'ellissoide: la pagina corregge col geoide
        }
        long n;
        String json;
        synchronized (coda) {
            n = ++seq;
            json = String.format(Locale.US,
                    "{\"seq\":%d,\"lat\":%.7f,\"lon\":%.7f,\"acc\":%.1f,\"alt\":%s,\"msl\":%b,\"vel\":%s,\"dir\":%s,\"t\":%d,\"sat\":%d,\"satTot\":%d,\"fonte\":\"%s\"}",
                    n, l.getLatitude(), l.getLongitude(), l.hasAccuracy() ? l.getAccuracy() : 50f, alt, msl,
                    l.hasSpeed() ? String.format(Locale.US, "%.2f", l.getSpeed()) : "null",
                    l.hasBearing() ? String.format(Locale.US, "%.1f", l.getBearing()) : "null",
                    l.getTime(), satUsati, satTotali, gps ? "gps" : "rete");
            coda.add(new Fix(n, json));
            if (coda.size() > MAX_CODA) coda.remove(0);
        }
        MainActivity.consegna(json);
    }

    /** Le posizioni arrivate dopo il numero indicato (per recuperare quelle perse). */
    static String dopo(long ultimo) {
        StringBuilder b = new StringBuilder("[");
        synchronized (coda) {
            boolean primo = true;
            for (Fix f : coda) {
                if (f.seq <= ultimo) continue;
                if (!primo) b.append(',');
                b.append(f.json);
                primo = false;
            }
        }
        return b.append(']').toString();
    }

    // richiesti dalle versioni di Android precedenti alla 11
    @Override public void onStatusChanged(String p, int s, Bundle b) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override
    public void onDestroy() {
        attivo = false;
        if (lm != null) {
            lm.removeUpdates(this);
            if (gnss != null) lm.unregisterGnssStatusCallback(gnss);
        }
        if (blocco != null && blocco.isHeld()) blocco.release();
        super.onDestroy();
    }
}
