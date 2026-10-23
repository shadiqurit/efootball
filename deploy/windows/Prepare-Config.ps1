#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)][string]$Domain,
    [string]$AppRoot = (Join-Path $PSScriptRoot '..\..'),
    [string]$NodePath = 'C:\Program Files\nodejs\node.exe'
)
$ErrorActionPreference = 'Stop'
$Domain = $Domain.Trim().ToLowerInvariant()
if ([Uri]::CheckHostName($Domain) -ne [UriHostNameType]::Dns -or -not $Domain.Contains('.')) {
    throw 'Supply the real DNS hostname only, for example club.example.com (no scheme or path).'
}
$resolvedRoot = (Resolve-Path -LiteralPath $AppRoot).Path.TrimEnd('\')
if ($resolvedRoot -eq [IO.Path]::GetPathRoot($resolvedRoot).TrimEnd('\')) {
    throw 'Use a dedicated application directory, not a drive root.'
}
foreach ($relative in @('backend\package.json', 'frontend\index.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedRoot $relative) -PathType Leaf)) {
        throw "Missing $relative. Run this against the extracted VPS bundle, not the source checkout."
    }
}
if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { throw 'Install Node.js LTS or supply -NodePath.' }
if (-not $PSCmdlet.ShouldProcess($resolvedRoot, "Generate Windows VPS configuration for $Domain")) { return }
$utf8 = New-Object Text.UTF8Encoding($false)
foreach ($folder in @('service', 'logs', 'backend\backups')) {
    New-Item -ItemType Directory -Path (Join-Path $resolvedRoot $folder) -Force | Out-Null
}
$web = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'web.config.template')).Replace('__DOMAIN__', $Domain)
[IO.File]::WriteAllText((Join-Path $resolvedRoot 'frontend\web.config'), $web, $utf8)
[IO.File]::WriteAllText((Join-Path $resolvedRoot 'frontend\config.js'), "globalThis.TOUCHLINE_CONFIG = { apiUrl: '/api' };`n", $utf8)
$service = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'TouchlineApi.xml.template'))
$service = $service.Replace('__ROOT__', [Security.SecurityElement]::Escape($resolvedRoot)).Replace('__NODE__', [Security.SecurityElement]::Escape($NodePath))
[IO.File]::WriteAllText((Join-Path $resolvedRoot 'service\TouchlineApi.xml'), $service, $utf8)
$environmentPath = Join-Path $resolvedRoot 'backend\.env'
if (-not (Test-Path -LiteralPath $environmentPath)) {
    $environment = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'production.env.example')).Replace('__DOMAIN__', $Domain)
    [IO.File]::WriteAllText($environmentPath, $environment, $utf8)
} else {
    Write-Warning 'Existing backend\.env preserved. Confirm its production origin, loopback host, port and database settings.'
}
Write-Output 'Configuration generated. Set the private database password, initialize/migrate MySQL, then follow README.md for IIS, permissions and service installation.'
