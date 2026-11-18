# 用 HttpClient 上传 Release 附件（PS 5.1 的 Invoke-WebRequest -InFile 大文件会 NRE）
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Net.Http

$owner = 'wobaiwoziji'
$repo = 'pgr-panel'
$tag = 'v0.3.0'

$cred = ("url=https://github.com/$owner/$repo" | git credential fill) 2>$null
$token = ($cred | Select-String -Pattern '^password=' | ForEach-Object { $_.Line.Substring(9) })
if (-not $token) { Write-Error 'no credential'; exit 1 }

$H = @{ Authorization = "token $token"; 'User-Agent' = 'pgr-panel-publisher'; Accept = 'application/vnd.github+json' }
$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $H
Write-Output "release id=$($rel.id)"

$existing = @()
try { $existing = (Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$($rel.id)/assets" -Headers $H).name } catch { }

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromMinutes(60)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('token', $token)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('pgr-panel-publisher')
$client.DefaultRequestHeaders.Accept.ParseAdd('application/vnd.github+json')

foreach ($f in @('D:\ui\release\PGR Panel Setup 0.3.0.exe', 'D:\ui\release\PGR Panel 0.3.0.exe')) {
    if (-not (Test-Path $f)) { Write-Output "missing: $f"; continue }
    $name = Split-Path $f -Leaf
    if ($existing -contains $name) { Write-Output "skip existing: $name"; continue }

    $uri = "https://uploads.github.com/repos/$owner/$repo/releases/$($rel.id)/assets?name=$([uri]::EscapeDataString($name))"
    $len = (Get-Item $f).Length
    Write-Output ("uploading {0} ({1} MB) ..." -f $name, [math]::Round($len / 1MB, 1))

    $fs = [System.IO.File]::OpenRead($f)
    try {
        $content = New-Object System.Net.Http.StreamContent($fs)
        $content.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('application/octet-stream')
        $content.Headers.ContentLength = $len
        $resp = $client.PostAsync($uri, $content).GetAwaiter().GetResult()
        $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        Write-Output ("  -> {0}" -f [int]$resp.StatusCode)
        if (-not $resp.IsSuccessStatusCode) {
            Write-Output $body
        } else {
            $j = $body | ConvertFrom-Json
            Write-Output ("  size={0} state={1}" -f $j.size, $j.state)
        }
    } finally {
        $fs.Dispose()
    }
}

$client.Dispose()
Write-Output 'ALL DONE'
