#Requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$frontendRoot = Join-Path $sourceRoot 'frontend'
& npm.cmd --prefix $frontendRoot run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
$releaseRoot = Join-Path $sourceRoot 'releases'
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$stage = Join-Path $releaseRoot ('windows-vps-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    $backendTarget = Join-Path $stage 'backend'
    $frontendTarget = Join-Path $stage 'frontend'
    $deployTarget = Join-Path $stage 'deploy\windows'
    foreach ($path in @($backendTarget, $frontendTarget, $deployTarget)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
    foreach ($name in @('src', 'scripts', 'database', 'data', 'package.json', 'package-lock.json', '.env.example', 'README.md')) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot "backend\$name") -Destination $backendTarget -Recurse
    }
    Get-ChildItem -LiteralPath (Join-Path $frontendRoot 'dist') -Force | Copy-Item -Destination $frontendTarget -Recurse
    foreach ($name in @('README.md', 'Prepare-Config.ps1', 'production.env.example', 'web.config.template', 'TouchlineApi.xml.template')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $deployTarget
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'README.md') -Destination (Join-Path $stage 'START-HERE.md')
    $utf8 = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $frontendTarget 'config.js'), "globalThis.TOUCHLINE_CONFIG = { apiUrl: '/api' };`n", $utf8)
    $manifest = Get-ChildItem -LiteralPath $stage -File -Recurse -Force | ForEach-Object {
        $relative = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
        if ($_.Name -eq '.env' -or $relative -match '(^|/)(node_modules|backups|\.git|\.qa)(/|$)') {
            throw "Private content cannot be packaged: $relative"
        }
        $stream = [IO.File]::OpenRead($_.FullName)
        $algorithm = [Security.Cryptography.SHA256]::Create()
        try {
            [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() + '  ' + $relative
        } finally { $stream.Dispose(); $algorithm.Dispose() }
    }
    [IO.File]::WriteAllLines((Join-Path $stage 'SHA256SUMS.txt'), [string[]]$manifest, $utf8)
    $archivePath = Join-Path $releaseRoot 'touchline-windows-vps.zip'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
    [IO.Compression.ZipFile]::CreateFromDirectory($stage, $archivePath)
    Write-Output "Ready: $archivePath"
} finally {
    # Remove only this invocation's newly created staging directory within releases.
    $checkedStage = (Resolve-Path -LiteralPath $stage).Path
    if ((Split-Path -Parent $checkedStage) -ne (Resolve-Path -LiteralPath $releaseRoot).Path -or
        (Split-Path -Leaf $checkedStage) -notmatch '^windows-vps-[a-f0-9]{32}$') {
        throw 'Staging path verification failed; cleanup was skipped.'
    }
    Remove-Item -LiteralPath $checkedStage -Recurse -Force
}
