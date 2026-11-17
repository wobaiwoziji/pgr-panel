Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$w = 440
$h = 690
$m = 24
$x = $b.X + $b.Width - $w - $m
$y = $b.Y + $m

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size $w, $h))
$out = Join-Path $PSScriptRoot "..\out\window.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "$out  ($($b.Width)x$($b.Height))"
