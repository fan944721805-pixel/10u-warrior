param([string]$ProxyUrl)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProxyUrl -and -not $env:HTTPS_PROXY) {
    $settings = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
    if ($settings.ProxyEnable -eq 1 -and $settings.ProxyServer -match '^[\w.\-]+:\d+$') {
        $ProxyUrl = 'http://' + $settings.ProxyServer
    }
}
if ($ProxyUrl) {
    $env:HTTPS_PROXY = $ProxyUrl
    $env:HTTP_PROXY = $ProxyUrl
}
if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) {
    $env:NODE_USE_ENV_PROXY = '1'
    $env:NO_PROXY = (@($env:NO_PROXY, 'localhost', '127.0.0.1', '::1') | Where-Object { $_ }) -join ','
}
Set-Location -LiteralPath $projectRoot
& node server.js
