# 读取 Windows「正在播放」(SMTC)，输出 JSON 给 Electron
# 支持 Spotify / 网易云 / QQ音乐 / 系统播放器等所有走 SMTC 的播放器
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, $type) {
    if ($null -eq $op) { return $null }
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    $task.Wait(3000) | Out-Null
    return $task.Result
}

function Emit($obj) {
    $obj | ConvertTo-Json -Compress -Depth 4
    exit 0
}

try {
    $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
    $mgr = Await ($mgrType::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $s = $mgr.GetCurrentSession()
    if ($null -eq $s) { Emit @{ ok = $false; reason = 'no-session' } }

    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $playback = $s.GetPlaybackInfo()
    $playing = ($playback.PlaybackStatus -eq 4)  # 4 = Playing

    $cover = ''
    try {
        $thumb = $props.Thumbnail
        if ($null -ne $thumb) {
            $stream = Await ($thumb.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
            if ($null -ne $stream) {
                $size = [int]$stream.Size
                if ($size -gt 0 -and $size -lt 4000000) {
                    $reader = [Windows.Storage.Streams.DataReader]::new($stream)
                    Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
                    $bytes = New-Object byte[] $size
                    $reader.ReadBytes($bytes)
                    $reader.Dispose()
                    $cover = 'data:image/png;base64,' + [Convert]::ToBase64String($bytes)
                }
                $stream.Dispose()
            }
        }
    } catch { }

    Emit @{
        ok      = $true
        title   = [string]$props.Title
        artist  = [string]$props.Artist
        album   = [string]$props.AlbumTitle
        playing = $playing
        cover   = $cover
    }
} catch {
    Emit @{ ok = $false; reason = "$($_.Exception.Message)" }
}
