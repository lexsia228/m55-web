param(
  [Parameter(Mandatory=$false)][string]$Root = ".",
  [Parameter(Mandatory=$false)][switch]$ListTargets,
  [Parameter(Mandatory=$false)][int]$ListLimit = 20
)

Set-StrictMode -Version 2
$ErrorActionPreference = "Stop"

function WriteUtf8NoBom([string]$Path, [string]$Text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

function RootFull([string]$p) { (Resolve-Path -LiteralPath $p).Path }

function IsExcluded([string]$rootFull, [string]$fullPath) {
  $rel = $fullPath.Substring($rootFull.Length).TrimStart('\','/')
  $relN = ($rel -replace '\\','/')

  if ($relN -match '(^|/)\.git(/|$)') { return $true }
  if ($relN -match '(^|/)node_modules(/|$)') { return $true }
  if ($relN -match '(^|/)\.next(/|$)') { return $true }
  if ($relN -match '(^|/)(dist|build|out|coverage)(/|$)') { return $true }
  if ($relN -match '(^|/)(android|ios)(/|$)') { return $true }
  if ($relN -match '(^|/)\.vercel(/|$)') { return $true }
  if ($relN -match '(^|/)\.turbo(/|$)') { return $true }

  if ($relN -match '^docs/archive/') { return $true }
  if ($relN -match '^docs/archive/zips/') { return $true }
  if ($relN -match '^docs/archive/patch_backups/') { return $true }

  # exclude audit artifacts
  if ($relN -match '(^|/)_audit_') { return $true }

  # exclude self
  if ($relN -eq 'scripts/ci/check-mojibake.ps1') { return $true }

  return $false
}

# text-only whitelist
$TextExts = @(
  ".ts",".tsx",".js",".jsx",".mjs",".cjs",
  ".css",".html",".htm",
  ".json",".md",".txt",
  ".yml",".yaml",
  ".ps1",".psm1",".psd1",
  ".svg",".xml",
  ".toml",".ini",".properties",".env",".editorconfig",".gitattributes",".gitignore",
  ".sql",".csv",".tsv"
)
$TextNames = @("Dockerfile","LICENSE","README","Makefile")

$rootFull = RootFull $Root
$all = Get-ChildItem -LiteralPath $rootFull -Recurse -File -Force -ErrorAction SilentlyContinue

$targets = @()
foreach ($f in $all) {
  if (IsExcluded $rootFull $f.FullName) { continue }

  $ext = $f.Extension.ToLowerInvariant()
  if ($TextExts -contains $ext) { $targets += $f; continue }

  if ([string]::IsNullOrEmpty($ext) -and ($TextNames -contains $f.Name)) {
    $targets += $f
    continue
  }
}

if ($ListTargets) {
  $targets | Select-Object -First $ListLimit -ExpandProperty FullName
  exit 0
}

$Utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)

$bad = @()
$nonUtf8 = 0
$moji = 0

foreach ($f in $targets) {
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)

  # NUL => treat as non-text
  if ($bytes -contains 0) {
    $nonUtf8++
    $bad += [PSCustomObject]@{ Path=$f.FullName; Reason="NONUTF8_NUL_BYTE"; Detail="" }
    continue
  }

  $text = $null
  try { $text = $Utf8Strict.GetString($bytes) }
  catch {
    $nonUtf8++
    $bad += [PSCustomObject]@{ Path=$f.FullName; Reason="NONUTF8_INVALID_UTF8"; Detail="" }
    continue
  }

  # mojibake signal: U+FFFD replacement char
  if ($text.IndexOf([char]0xFFFD) -ge 0) {
    $moji++
    $bad += [PSCustomObject]@{ Path=$f.FullName; Reason="MOJIBAKE_UFFFD"; Detail="UFFFD" }
  }
}

$summary = Join-Path $rootFull "_audit_mojibake_summary.txt"

if ($bad.Count -gt 0) {
  $lines = @()
  $lines += ("ROOT=" + $rootFull)
  $lines += ("SCANNED=" + $targets.Count)
  $lines += ("TOTAL_BAD=" + $bad.Count)
  $lines += ("NONUTF8=" + $nonUtf8)
  $lines += ("MOJIBAKE=" + $moji)
  $lines += ("UTC=" + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))
  $lines += ""
  $lines += "---- DETAILS ----"
  foreach ($b in $bad) { $lines += ("{0}`t{1}`t{2}" -f $b.Reason, $b.Path, $b.Detail) }
  WriteUtf8NoBom $summary ($lines -join "`r`n")
  Write-Host ("NG: mojibake detected. See: " + $summary)
  exit 1
}

$ok = @()
$ok += ("ROOT=" + $rootFull)
$ok += ("SCANNED=" + $targets.Count)
$ok += ("TOTAL_BAD=0")
$ok += ("UTC=" + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))
WriteUtf8NoBom $summary ($ok -join "`r`n")
Write-Host ("OK: mojibake not detected. scanned=" + $targets.Count)
exit 0