# Auto-fit all text boxes in new slides to prevent text overflow/overlap
param()

$file = "D:\aiapp\aiot\docs\smart-ag-report.pptx"
$newSlidePositions = @(13, 20, 21, 22, 29, 32)

$ppt = New-Object -ComObject PowerPoint.Application

try {
    $pres = $ppt.Presentations.Open($file)
    Write-Host "Opened:" $pres.Slides.Count "slides"

    foreach ($pos in $newSlidePositions) {
        if ($pos -gt $pres.Slides.Count) { continue }
        $slide = $pres.Slides.Item($pos)
        Write-Host "Slide $pos :" $slide.Shapes.Count "shapes"

        foreach ($shape in $slide.Shapes) {
            # Only process text boxes (type 17 = msoTextBox, type 14 = msoPlaceholder)
            if (-not $shape.HasTextFrame) { continue }
            if (-not $shape.TextFrame.HasText) { continue }

            try {
                # Set WordWrap and AutoSize to fit text
                $shape.TextFrame.WordWrap = $true
                $shape.TextFrame.AutoSize = 0  # ppAutoSizeNone first to reset
                $shape.TextFrame.AutoSize = 1  # ppAutoSizeShapeToFitText

                # Log the text preview
                $txt = $shape.TextFrame.TextRange.Text
                if ($txt.Length -gt 0) {
                    Write-Host "  Auto-fit: '$($txt.Substring(0, [Math]::Min(50, $txt.Length))...' ($($txt.Length) chars)" -ForegroundColor Gray
                }
            }
            catch {
                # Some shapes can't be auto-sized, that's OK
            }
        }
    }

    $pres.Save()
    Write-Host ""
    Write-Host "Done! Text boxes auto-fitted and saved." -ForegroundColor Green

} finally {
    if ($pres) { $pres.Close() }
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
