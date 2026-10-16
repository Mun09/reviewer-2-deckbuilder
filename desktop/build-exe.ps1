$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $projectRoot "public\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

# 1. Copy generated Logo & Icon from artifacts if available
$artifactLogo = "C:\Users\jaeye\.gemini\antigravity\brain\a00e0092-e0d0-4726-851b-2c775a7b7d3e\logo_reviewer2_1792126884313.png"
$artifactIcon = "C:\Users\jaeye\.gemini\antigravity\brain\a00e0092-e0d0-4726-851b-2c775a7b7d3e\icon_reviewer2_1792126907288.png"

$targetLogo = Join-Path $assetsDir "logo_reviewer2.png"
$targetIcon = Join-Path $assetsDir "icon_reviewer2.png"
$targetIco  = Join-Path $PSScriptRoot "reviewer2.ico"

if (Test-Path $artifactLogo) {
    Copy-Item $artifactLogo $targetLogo -Force
}
if (Test-Path $artifactIcon) {
    Copy-Item $artifactIcon $targetIcon -Force
}

# 2. Convert icon_reviewer2.png into a valid 256x256 Windows .ico file in desktop/ (outside public/ so Vite watcher isn't disturbed)
Add-Type -AssemblyName System.Drawing
$srcBmp = [System.Drawing.Bitmap]::FromFile($targetIcon)
$resizedBmp = New-Object System.Drawing.Bitmap($srcBmp, 256, 256)
$pngMs = New-Object System.IO.MemoryStream
$resizedBmp.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngMs.ToArray()
$pngMs.Dispose()
$resizedBmp.Dispose()
$srcBmp.Dispose()

$icoFs = [System.IO.File]::Open($targetIco, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($icoFs)
$bw.Write([UInt16]0)   # Reserved
$bw.Write([UInt16]1)   # Type: 1 = ICO
$bw.Write([UInt16]1)   # Count: 1 image
$bw.Write([Byte]0)     # Width: 256
$bw.Write([Byte]0)     # Height: 256
$bw.Write([Byte]0)     # ColorCount
$bw.Write([Byte]0)     # Reserved
$bw.Write([UInt16]1)   # Planes
$bw.Write([UInt16]32)  # BitCount
$bw.Write([UInt32]$pngBytes.Length)
$bw.Write([UInt32]22)
$bw.Write($pngBytes)
$bw.Flush()
$bw.Close()
$icoFs.Dispose()

# 3. Build web assets into dist/
Push-Location $projectRoot
npm run build
Pop-Location

# 4. Pack dist/ into desktop/dist.zip so it can be embedded inside Reviewer2.exe
Add-Type -AssemblyName System.IO.Compression.FileSystem
$distDir = Join-Path $projectRoot "dist"
$zipPath = Join-Path $PSScriptRoot "dist.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($distDir, $zipPath)
Write-Host "Packed dist/ into $zipPath"

# 5. Terminate any running Reviewer2.exe before overwriting
Get-Process -Name "Reviewer2" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 6. Compile single-file Reviewer2.exe with embedded dist.zip and custom icon
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$exeOut = Join-Path $projectRoot "Reviewer2.exe"
$csSource = Join-Path $PSScriptRoot "Reviewer2Launcher.cs"

& $csc /target:winexe /out:$exeOut /win32icon:$targetIco /optimize+ `
  /reference:System.Windows.Forms.dll `
  /reference:System.Drawing.dll `
  /reference:System.IO.Compression.dll `
  /resource:"$zipPath,dist.zip" `
  $csSource

if ($LASTEXITCODE -ne 0) {
    throw "csc.exe compilation failed with exit code $LASTEXITCODE"
}

Write-Host "Successfully built self-contained executable: $exeOut"
