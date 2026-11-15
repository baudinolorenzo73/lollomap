<#
  compila.ps1 — Compila l'app Android «LolloMap Pro» con tutto il necessario.
  by Lollo ®2026

  Cosa fa, nell'ordine:
   1. cerca Java 17+ (quello di Android Studio va benissimo); se non c'è lo scarica in .\strumenti\jdk
   2. cerca l'Android SDK (quello di Android Studio); se non c'è lo scarica in .\strumenti\android-sdk
   3. accetta le licenze e installa piattaforma 35, build-tools e platform-tools
   4. scrive local.properties con il percorso dell'SDK
   5. compila con Gradle (APK di prova oppure firmato con la tua chiave)
   6. copia l'APK nella cartella da cui hai avviato lo script (con il doppio clic: quella del progetto)
      e, se vuoi, lo installa sul telefono collegato via USB

  Uso: doppio clic su compila.bat, oppure da PowerShell:
     .\compila.ps1                 menu
     .\compila.ps1 -Modo prova     APK di prova
     .\compila.ps1 -Modo firmato   APK firmato con la tua chiave
     .\compila.ps1 -Modo installa  APK di prova e installazione sul telefono
#>
param(
    [ValidateSet('', 'prova', 'firmato', 'installa', 'pulisci')]
    [string]$Modo = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'          # i download sono molto più veloci senza barra
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$Progetto = Split-Path -Parent $MyInvocation.MyCommand.Path
$Esecuzione = (Get-Location).Path      # cartella da cui è stato avviato lo script: qui finisce l'APK
# «Esegui come amministratore» parte da C:\Windows\System32: in quel caso uso la cartella del progetto
if ($env:windir -and $Esecuzione.StartsWith($env:windir, [StringComparison]::OrdinalIgnoreCase)) { $Esecuzione = $Progetto }
$Strumenti = Join-Path $Progetto 'strumenti'
# la chiave resta quella di Stampa Mappe: l'app è la stessa (it.lollo.stampamappe) e così si aggiorna senza disinstallarla
$CartellaFirma = Join-Path $env:USERPROFILE '.stampa-mappe-firma'   # fuori dal progetto: non si pubblica per sbaglio
$URL_JDK = 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse'
$URL_SDK_TOOLS = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$PACCHETTI_SDK = @('platform-tools', 'platforms;android-35', 'build-tools;35.0.0')

function Titolo($t) { Write-Host ''; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK  $t" -ForegroundColor Green }
function Info($t) { Write-Host "  ..  $t" }
function Attenzione($t) { Write-Host "  !!  $t" -ForegroundColor Yellow }

function Scarica($url, $dest) {
    Info "Scarico $url"
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

# ---------- 1. Java ----------
function Trova-Java {
    $candidati = @()
    if ($env:JAVA_HOME) { $candidati += $env:JAVA_HOME }
    $candidati += @(
        (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr'),
        (Join-Path $env:ProgramFiles 'Android\Android Studio\jre'),
        (Join-Path $Strumenti 'jdk')
    )
    # Android Studio installato con JetBrains Toolbox
    $toolbox = Join-Path $env:LOCALAPPDATA 'JetBrains\Toolbox\apps'
    if (Test-Path $toolbox) {
        Get-ChildItem $toolbox -Recurse -Directory -Filter 'jbr' -ErrorAction SilentlyContinue | ForEach-Object { $candidati += $_.FullName }
    }
    foreach ($c in $candidati) {
        if ($c -and (Test-Path (Join-Path $c 'bin\java.exe'))) {
            # java -version scrive normalmente su stderr. Con ErrorActionPreference=Stop
            # Windows PowerShell lo scambiava per un errore e interrompeva lo script.
            $prima = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                $v = & (Join-Path $c 'bin\java.exe') -version 2>&1 | Out-String
            } finally {
                $ErrorActionPreference = $prima
            }
            if ($v -match 'version "(\d+)') {
                if ([int]$Matches[1] -ge 17) { return $c }
                Attenzione "Java in $c è la versione $($Matches[1]): serve la 17 o superiore, la salto."
            }
        }
    }
    return $null
}

function Prepara-Java {
    Titolo '1. Java'
    $jdk = Trova-Java
    if (-not $jdk) {
        Attenzione 'Java 17 non trovato: scarico Eclipse Temurin 17 (circa 190 MB) in .\strumenti\jdk'
        New-Item -ItemType Directory -Force -Path $Strumenti | Out-Null
        $zip = Join-Path $Strumenti 'jdk.zip'
        Scarica $URL_JDK $zip
        $tmp = Join-Path $Strumenti 'jdk-tmp'
        if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
        Expand-Archive $zip -DestinationPath $tmp
        $interno = Get-ChildItem $tmp -Directory | Select-Object -First 1     # lo zip contiene una cartella jdk-17.x
        Move-Item $interno.FullName (Join-Path $Strumenti 'jdk')
        Remove-Item $tmp -Recurse -Force; Remove-Item $zip -Force
        $jdk = Join-Path $Strumenti 'jdk'
    }
    $env:JAVA_HOME = $jdk
    $env:Path = (Join-Path $jdk 'bin') + ';' + $env:Path
    Ok "Java: $jdk"
    return $jdk
}

# ---------- 2-3. Android SDK ----------
function Trova-SDK {
    $candidati = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'), (Join-Path $Strumenti 'android-sdk'))
    $lp = Join-Path $Progetto 'local.properties'
    if (Test-Path $lp) {
        $riga = Select-String -Path $lp -Pattern '^sdk\.dir=(.*)$' | Select-Object -First 1
        if ($riga) { $candidati = @(($riga.Matches[0].Groups[1].Value -replace '\\\\', '\' -replace '\\:', ':')) + $candidati }
    }
    foreach ($c in $candidati) {
        if ($c -and (Test-Path (Join-Path $c 'platforms')) -or ($c -and (Test-Path (Join-Path $c 'cmdline-tools')))) { return $c }
    }
    return $null
}

# Avvia un file .bat passando la riga di argomenti così com'è (virgolette comprese).
# Con -RedirectStandardInput si possono dare risposte automatiche (licenze).
function Avvia-Bat($bat, $argomenti, $fileRisposte) {
    $opz = @{ FilePath = $bat; ArgumentList = $argomenti; NoNewWindow = $true; Wait = $true; PassThru = $true }
    if ($fileRisposte) { $opz.RedirectStandardInput = $fileRisposte }
    $p = Start-Process @opz
    return $p.ExitCode
}

function Trova-SdkManager($sdk) {
    $diretto = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (Test-Path $diretto) { return $diretto }
    $altro = Get-ChildItem (Join-Path $sdk 'cmdline-tools') -Recurse -Filter 'sdkmanager.bat' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($altro) { return $altro.FullName }
    return $null
}

function Installa-CmdlineTools($sdk) {
    Info 'Scarico gli strumenti a riga di comando dell''Android SDK (circa 150 MB)'
    New-Item -ItemType Directory -Force -Path (Join-Path $sdk 'cmdline-tools') | Out-Null
    $zip = Join-Path $sdk 'cmdline-tools.zip'
    Scarica $URL_SDK_TOOLS $zip
    $tmp = Join-Path $sdk 'cmdline-tools\tmp'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tmp
    $dest = Join-Path $sdk 'cmdline-tools\latest'
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Move-Item (Join-Path $tmp 'cmdline-tools') $dest      # struttura richiesta: cmdline-tools\latest\bin
    Remove-Item $tmp -Recurse -Force; Remove-Item $zip -Force
}

function Prepara-SDK {
    Titolo '2. Android SDK'
    $sdk = Trova-SDK
    if (-not $sdk) {
        $sdk = Join-Path $Strumenti 'android-sdk'
        Attenzione "Android SDK non trovato: lo preparo in $sdk"
        New-Item -ItemType Directory -Force -Path $sdk | Out-Null
    }
    $sdkm = Trova-SdkManager $sdk
    if (-not $sdkm) { Installa-CmdlineTools $sdk; $sdkm = Trova-SdkManager $sdk }
    $env:ANDROID_HOME = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
    Ok "SDK: $sdk"

    Titolo '3. Licenze e componenti SDK'
    Info 'Accetto le licenze dell''Android SDK (serve una volta sola)'
    $risposte = Join-Path $env:TEMP 'stampamappe-si.txt'
    Set-Content -Path $risposte -Value (@('y') * 40) -Encoding ASCII     # «y» a tutte le domande delle licenze
    Avvia-Bat $sdkm "--licenses `"--sdk_root=$sdk`"" $risposte | Out-Null
    $mancanti = $PACCHETTI_SDK | Where-Object {
        $cartella = Join-Path $sdk ($_ -replace ';', '\')
        -not (Test-Path $cartella)
    }
    if ($mancanti) {
        Info ("Installo: " + ($mancanti -join ', '))
        $lista = ($mancanti | ForEach-Object { '"' + $_ + '"' }) -join ' '    # tra virgolette: il «;» non deve spezzare i nomi
        $esito = Avvia-Bat $sdkm "`"--sdk_root=$sdk`" $lista" $null
        if ($esito -ne 0) { throw 'sdkmanager non è riuscito a installare i componenti (serve internet).' }
    }
    Ok 'Piattaforma Android 35, build-tools e platform-tools presenti'

    # local.properties: Gradle vuole il percorso con le barre «raddoppiate»
    $riga = 'sdk.dir=' + ($sdk -replace '\\', '\\' -replace ':', '\:')
    Set-Content -Path (Join-Path $Progetto 'local.properties') -Value $riga -Encoding ASCII
    Ok 'local.properties aggiornato'
    return $sdk
}

# ---------- firma ----------
function Leggi-Segreto($domanda) {
    $s = Read-Host -AsSecureString $domanda
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Prepara-Firma($jdk) {
    Titolo 'Firma di rilascio'
    $kp = Join-Path $Progetto 'keystore.properties'
    if (Test-Path $kp) { Ok 'keystore.properties trovato: uso la tua chiave'; return }
    Write-Host '  Per aggiornare l''app senza disinstallarla serve sempre la STESSA chiave.'
    Write-Host '  1) Creo una chiave nuova (consigliato se non ne hai una per questa app)'
    Write-Host '  2) Uso una chiave che ho già (file .jks o .keystore)'
    $s = Read-Host '  Scelta [1/2]'
    if ($s -eq '2') {
        $file = Read-Host '  Percorso completo del file della chiave'
        if (-not (Test-Path $file)) { throw "File non trovato: $file" }
        $alias = Read-Host '  Alias della chiave'
        $pwStore = Leggi-Segreto '  Password del file della chiave'
        $pwKey = Leggi-Segreto '  Password della chiave (Invio = uguale alla precedente)'
        if (-not $pwKey) { $pwKey = $pwStore }
    } else {
        New-Item -ItemType Directory -Force -Path $CartellaFirma | Out-Null
        $file = Join-Path $CartellaFirma 'stampa-mappe.jks'
        if (Test-Path $file) { throw "Esiste già ${file}: usa la scelta 2 con quel file." }
        $alias = 'stampamappe'
        do {
            $pwStore = Leggi-Segreto '  Scegli una password (almeno 6 caratteri)'
            $conferma = Leggi-Segreto '  Ripeti la password'
            if ($pwStore -ne $conferma -or $pwStore.Length -lt 6) { Attenzione 'Le password non coincidono o sono troppo corte, riprova.' }
        } while ($pwStore -ne $conferma -or $pwStore.Length -lt 6)
        $pwKey = $pwStore
        & (Join-Path $jdk 'bin\keytool.exe') -genkeypair -v -keystore $file -alias $alias -keyalg RSA -keysize 2048 -validity 10000 `
            -storepass $pwStore -keypass $pwKey -dname 'CN=Lorenzo, O=Lollo, C=IT' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'keytool non è riuscito a creare la chiave.' }
        Ok "Chiave creata: $file"
        Attenzione 'FAI SUBITO UNA COPIA DI QUESTO FILE E DELLA PASSWORD: senza, non potrai più aggiornare l''app.'
    }
    $testo = @(
        '# Firma di rilascio di LolloMap Pro (ex Stampa Mappe): NON pubblicare questo file',
        ('storeFile=' + ($file -replace '\\', '/')),
        "storePassword=$pwStore",
        "keyAlias=$alias",
        "keyPassword=$pwKey"
    )
    Set-Content -Path $kp -Value $testo -Encoding ASCII
    Ok 'keystore.properties creato (è escluso da GitHub tramite .gitignore)'
}

# ---------- compilazione ----------
function Versione {
    $g = Get-Content (Join-Path $Progetto 'app\build.gradle') -Raw
    if ($g -match "versionName\s+'([^']+)'") { return $Matches[1] }
    return 'x'
}

function Compila($tipo) {
    Titolo "4. Compilazione ($tipo)"
    Push-Location $Progetto
    try {
        $compito = if ($tipo -eq 'firmato') { 'assembleRelease' } else { 'assembleDebug' }
        Info "gradlew $compito (la prima volta scarica Gradle e le librerie: alcuni minuti)"
        # | Out-Host: le righe di Gradle vanno a schermo e NON finiscono nel valore restituito dalla funzione
        & (Join-Path $Progetto 'gradlew.bat') $compito --console=plain | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'Gradle ha dato errore: leggi le righe in rosso qui sopra.' }
    } finally { Pop-Location }
    $sotto = if ($tipo -eq 'firmato') { 'release' } else { 'debug' }
    $apk = Get-ChildItem (Join-Path $Progetto "app\build\outputs\apk\$sotto") -Filter '*.apk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $apk) { throw 'APK non trovato dopo la compilazione.' }
    $uscita = $Esecuzione
    $suffisso = if ($tipo -eq 'firmato') { '' } else { '-prova' }
    $dest = Join-Path $uscita ("LolloMap-Pro-v" + (Versione) + $suffisso + '.apk')
    Copy-Item $apk.FullName $dest -Force
    Ok "APK pronto: $dest"
    return $dest
}

function Installa($sdk, $apk) {
    Titolo '5. Installazione sul telefono'
    $adb = Join-Path $sdk 'platform-tools\adb.exe'
    if (-not (Test-Path $adb)) { Attenzione 'adb non trovato.'; return }
    $righe = & $adb devices | Select-String "`tdevice$"
    if (-not $righe) {
        Attenzione 'Nessun telefono collegato: attiva Opzioni sviluppatore > Debug USB, collega il cavo e accetta il messaggio sul telefono.'
        return
    }
    Info "Installo su $($righe.Count) dispositivo/i"
    & $adb install -r $apk
    if ($LASTEXITCODE -eq 0) {
        & $adb shell am start -n 'it.lollo.stampamappe/.MainActivity' | Out-Null
        Ok 'Installata e avviata sul telefono'
    } else {
        Attenzione 'Installazione non riuscita. Se l''app era firmata con un''altra chiave, disinstallala prima dal telefono.'
    }
}

# ---------- menu ----------
Write-Host ''
Write-Host '  LolloMap Pro per Android - compilazione   by Lollo (R)2026' -ForegroundColor Green
Write-Host "  Progetto: $Progetto"
if (-not $Modo) {
    Write-Host ''
    Write-Host '  1) APK di prova (debug)'
    Write-Host '  2) APK di prova + installazione sul telefono collegato via USB'
    Write-Host '  3) APK firmato con la tua chiave (rilascio)'
    Write-Host '  4) Pulisci la compilazione (se qualcosa si è inceppato)'
    $s = Read-Host '  Scelta [1-4]'
    $Modo = switch ($s) { '2' { 'installa' } '3' { 'firmato' } '4' { 'pulisci' } default { 'prova' } }
}

$codice = 0
try {
    $jdk = Prepara-Java
    $sdk = Prepara-SDK
    switch ($Modo) {
        'pulisci' { Push-Location $Progetto; & .\gradlew.bat clean --console=plain; Pop-Location; Ok 'Pulizia fatta' }
        'firmato' { Prepara-Firma $jdk; $apk = Compila 'firmato'; Start-Process explorer.exe "/select,`"$apk`"" }
        'installa' { $apk = Compila 'prova'; Installa $sdk $apk }
        default { $apk = Compila 'prova'; Start-Process explorer.exe "/select,`"$apk`"" }
    }
    Write-Host ''
    Ok 'Finito.'
} catch {
    $codice = 1
    Write-Host ''
    Write-Host "  ERRORE: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Suggerimenti: controlla la connessione a internet; riprova con la scelta 4 (pulisci) e poi 1;'
    Write-Host '  se l''errore resta, copia le righe in rosso e mandamele.'
}
Write-Host ''
Read-Host 'Premi Invio per chiudere' | Out-Null
exit $codice
