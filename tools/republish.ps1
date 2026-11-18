# 删除旧附件并上传新包（用 HttpClient 传二进制）
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Net.Http

$owner = 'wobaiwoziji'; $repo = 'pgr-panel'; $tag = 'v0.3.0'
$cred = ("url=https://github.com/$owner/$repo" | git credential fill) 2>$null
$token = ($cred | Select-String -Pattern '^password=' | ForEach-Object { $_.Line.Substring(9) })
if (-not $token) { Write-Error 'no credential'; exit 1 }

$H = @{ Authorization = "token $token"; 'User-Agent' = 'pgr-panel-publisher'; Accept = 'application/vnd.github+json' }
$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $H

# 1. 删除已有附件
$assets = @()
try { $assets = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$($rel.id)/assets" -Headers $H } catch { }
foreach ($a in $assets) {
    Invoke-RestMethod -Method Delete -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($a.id)" -Headers $H | Out-Null
    Write-Output "deleted: $($a.name)"
}

# 2. 上传新包
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromMinutes(60)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('token', $token)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('pgr-panel-publisher')
$client.DefaultRequestHeaders.Accept.ParseAdd('application/vnd.github+json')

foreach ($f in @('D:\ui\release\PGR Panel Setup 0.3.0.exe', 'D:\ui\release\PGR Panel 0.3.0.exe')) {
    if (-not (Test-Path $f)) { Write-Output "missing: $f"; continue }
    $name = Split-Path $f -Leaf
    $len = (Get-Item $f).Length
    $uri = "https://uploads.github.com/repos/$owner/$repo/releases/$($rel.id)/assets?name=$([uri]::EscapeDataString($name))"
    Write-Output ("uploading {0} ({1} MB) ..." -f $name, [math]::Round($len / 1MB, 1))
    $fs = [System.IO.File]::OpenRead($f)
    try {
        $content = New-Object System.Net.Http.StreamContent($fs)
        $content.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('application/octet-stream')
        $content.Headers.ContentLength = $len
        $resp = $client.PostAsync($uri, $content).GetAwaiter().GetResult()
        Write-Output ("  -> {0}" -f [int]$resp.StatusCode)
    } finally { $fs.Dispose() }
}
$client.Dispose()
Write-Output 'DONE'
