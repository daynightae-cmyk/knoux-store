param(
    [string]$DotNet = 'dotnet',
    [string]$MakeNsis = 'makensis',
    [string]$OutputDirectory = (Join-Path $env:TEMP 'KnouxBuild-windows-artifacts')
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -Raw -LiteralPath (Join-Path $repo 'package.json') | ConvertFrom-Json).version
if ($version -notmatch '^(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})$' -or
    ($version.Split('.') | Where-Object { [int]$_ -gt 65535 })) {
    throw 'The root package version must contain three numeric Windows version components.'
}

$sdk = & $DotNet --version
if ($LASTEXITCODE -ne 0 -or $sdk -notlike '10.*') { throw 'Install the .NET 10 SDK.' }
$nsis = & $MakeNsis /VERSION
if ($LASTEXITCODE -ne 0 -or $nsis -notlike 'v3.*') { throw 'Install NSIS 3.' }

$sha = git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Unable to resolve the checkout commit for the build manifest.' }
$sourceChanges = @(git -C $repo status --short --untracked-files=all -- windows package.json src/app/icon.svg)
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the desktop source status.' }
$sourceHashes = [ordered]@{}
foreach ($source in @('package.json', 'src/app/icon.svg', 'windows/Program.cs', 'windows/KnouxBuild.Desktop.csproj',
        'windows/NuGet.Config', 'windows/Build-Installer.ps1', 'windows/render-icon.mjs', 'windows/install.nsi')) {
    $sourceHashes[$source] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $repo $source)).Hash
}

$outputRoot = (New-Item -Path $OutputDirectory -ItemType Directory -Force).FullName
$build = (New-Item -Path (Join-Path $outputRoot "$version-win-x64-$([guid]::NewGuid())") -ItemType Directory).FullName
$icon = Join-Path $build 'KnouxBuild.ico'
& node (Join-Path $PSScriptRoot 'render-icon.mjs') $icon
if ($LASTEXITCODE -ne 0) { throw 'Failed to render the canonical product icon. Ensure Playwright Chromium is installed.' }

$app = Join-Path $build 'app'
& $DotNet publish (Join-Path $PSScriptRoot 'KnouxBuild.Desktop.csproj') `
    --configuration Release --runtime win-x64 --self-contained true --output $app `
    '-p:PublishSingleFile=true' '-p:IncludeNativeLibrariesForSelfExtract=true' '-p:DebugType=none' `
    "-p:Version=$version" "-p:KnouxIcon=$icon"
if ($LASTEXITCODE -ne 0) { throw 'The Windows application build failed.' }

$appExe = Join-Path $app 'KnouxBuild.exe'
$installer = Join-Path $build "KNOuX-Build-$version-win-x64-Setup.exe"
& $MakeNsis /V3 "/DAPP_EXE=$appExe" "/DPRODUCT_VERSION=$version" "/DPRODUCT_ICON=$icon" "/DINSTALLER=$installer" `
    (Join-Path $PSScriptRoot 'install.nsi')
if ($LASTEXITCODE -ne 0) { throw 'NSIS could not compile the setup executable.' }

foreach ($source in $sourceHashes.Keys) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $repo $source)).Hash -ne $sourceHashes[$source]) {
        throw "The source changed during packaging: $source"
    }
}
$manifest = [ordered]@{
    version = $version
    architecture = 'win-x64'
    sourceCommit = $sha
    sourceChanges = $sourceChanges
    sourceHashes = $sourceHashes
    builtAtUtc = [DateTime]::UtcNow.ToString('o')
    dotnetSdk = $sdk
    nsis = $nsis
    files = @(($appExe, $installer) | ForEach-Object {
        $file = Get-Item -LiteralPath $_
        [ordered]@{
            path = $file.FullName
            bytes = $file.Length
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
            signatureStatus = (Get-AuthenticodeSignature -LiteralPath $file.FullName).Status.ToString()
        }
    })
}
$manifestPath = Join-Path $build 'build-manifest.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output $manifestPath
