param([int]$From = 1)
$path = Join-Path (Get-Location) 'qa/dev/traycer-integration-qa.mjs'
$lines = [IO.File]::ReadAllLines($path)
$depth = 0
$out = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
  $open = ([regex]::Matches($lines[$i], '\{')).Count
  $close = ([regex]::Matches($lines[$i], '\}')).Count
  $depth += $open - $close
  if ($i + 1 -ge $From) {
    $snip = $lines[$i]
    if ($snip.Length -gt 55) { $snip = $snip.Substring(0, 55) }
    $out.Add("$($i+1)|d=$depth|$snip")
  }
}
$out.Add("TOTAL=$($lines.Count) FINAL_DEPTH=$depth")
[IO.File]::WriteAllLines((Join-Path $env:TEMP 'depth.txt'), $out)
Write-Output 'written'
