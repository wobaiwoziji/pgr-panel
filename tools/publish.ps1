# 用本机已存的 GitHub 凭据补齐仓库描述 / Topics，并创建 Release 上传 exe
# 不落盘、不打印 token
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$owner = 'wobaiwoziji'
$repo = 'pgr-panel'
$tag = 'v0.3.0'

# ── 取凭据 ─────────────────────────────
$cred = ("url=https://github.com/$owner/$repo" | git credential fill) 2>$null
$token = ($cred | Select-String -Pattern '^password=' | ForEach-Object { $_.Line.Substring(9) })
if (-not $token) { Write-Error '没有取到 GitHub 凭据，请先在 Git 里登录'; exit 1 }

$H = @{
    Authorization          = "token $token"
    'User-Agent'           = 'pgr-panel-publisher'
    Accept                 = 'application/vnd.github+json'
}

# ── 1. 仓库描述 + Topics ────────────────
$desc = '仿《战双帕弥什》主界面右侧菜单的桌面悬浮窗。Electron + React，点右下角的投影球展开全息面板：18 个可自定义按钮、滚轮翻页、实时歌曲信息。非官方同人作品，素材仅供学习。'
$topics = @('electron', 'react', 'desktop-widget', 'game-ui', 'hologram', 'pgr', 'punishing-gray-raven', 'sci-fi-ui', 'vite')
$body = @{ description = $desc; topics = $topics } | ConvertTo-Json

$r = Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/$owner/$repo" -Headers $H -Body $body -ContentType 'application/json'
Write-Output "仓库描述已更新: $($r.full_name)"

# ── 2. Release ─────────────────────────
$notes = @"
首个公开版本。

- 桌面悬浮面板：点投影球展开，Esc 收起
- 18 个可配置按钮（``config.json`` 里改图标、文字、打开目标）
- 滚轮翻页 + 自绘滚动条
- 读取系统「正在播放」：封面旋转，显示歌名与歌手
- 设置面板：粒子数量、网格强度、动画开关、开发交流群
- Setup 为安装版，另一个为便携版

非官方同人作品，与库洛游戏无关，素材版权归库洛所有，仅供学习研究。
"@

$existing = $null
try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $H
} catch { }

if ($existing) {
    Write-Output "Release $tag 已存在，跳过创建"
    $release = $existing
} else {
    $payload = @{ tag_name = $tag; name = "PGR Panel $tag"; body = $notes; draft = $false; prerelease = $false } | ConvertTo-Json
    $release = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$owner/$repo/releases" -Headers $H -Body $payload -ContentType 'application/json'
    Write-Output "Release 已创建: $($release.html_url)"
}

# ── 3. 上传附件 ────────────────────────
$uploadBase = ($release.upload_url -replace '\{.*\}$', '')
$has = @()
try { $has = (Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$($release.id)/assets" -Headers $H).name } catch { }

$files = @(
    'D:\ui\release\PGR Panel Setup 0.3.0.exe',
    'D:\ui\release\PGR Panel 0.3.0.exe'
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Output "跳过（文件不存在）: $f"; continue }
    $name = Split-Path $f -Leaf
    if ($has -contains $name) { Write-Output "已存在，跳过: $name"; continue }
    $uri = "$uploadBase?name=$([uri]::EscapeDataString($name))"
    $size = [math]::Round((Get-Item $f).Length / 1MB, 1)
    Write-Output "上传中: $name ($size MB) ..."
    Invoke-RestMethod -Method Post -Uri $uri -Headers $H -ContentType 'application/octet-stream' -InFile $f | Out-Null
    Write-Output "完成: $name"
}

Write-Output "ALL DONE: $($release.html_url)"
