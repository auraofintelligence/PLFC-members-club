[CmdletBinding(DefaultParameterSetName='Provision')]
param(
  [Parameter(Mandatory, ParameterSetName='Provision')][switch]$Provision,
  [Parameter(Mandatory, ParameterSetName='Provision')][string]$NodePath,
  [Parameter(Mandatory, ParameterSetName='Provision')][string]$WranglerPath,
  [Parameter(Mandatory, ParameterSetName='Open')][switch]$Open,
  [Parameter(Mandatory, ParameterSetName='Open')][string]$SealedLink,
  [Parameter(Mandatory, ParameterSetName='Test')][switch]$Test
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$site = 'https://plfc-clubhouse.auraofintelligence.workers.dev'
$prefix = $site + '/#activate='
$account = '8ec4bbe64bddc4086162119149e37ef8'
$database = '5fbb019c-8268-4c1f-98f7-06d7858b7599'
$utf8 = [Text.Encoding]::UTF8
$ascii = [Text.Encoding]::ASCII
$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser
$entropy = $utf8.GetBytes('PLFC clubhouse first owner v1')
$repo = Split-Path -Parent $PSScriptRoot
$folder = Join-Path $repo '.local'
$file = Join-Path $folder 'Set up your PLFC Webmaster account.lnk'
$powershell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'

function New-RandomHex([int]$length) {
  $bytes = New-Object byte[] $length
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes); return [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant() }
  finally { $rng.Dispose(); [Array]::Clear($bytes, 0, $bytes.Length) }
}
function Get-InviteDigest([string]$link) {
  if (!$link.StartsWith($prefix, [StringComparison]::Ordinal) -or $link.Substring($prefix.Length) -cnotmatch '^[0-9a-f]{64}$') {
    throw 'The local invitation is invalid.'
  }
  $hash = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($hash.ComputeHash($ascii.GetBytes($link.Substring($prefix.Length)))).Replace('-','').ToLowerInvariant() }
  finally { $hash.Dispose() }
}
function Protect-Link([string]$link) {
  return [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($utf8.GetBytes($link), $entropy, $scope))
}
function Unprotect-Link([string]$sealed) {
  $bytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($sealed), $entropy, $scope)
  try {
    $result = $utf8.GetString($bytes)
    $null = Get-InviteDigest $result
    return $result
  } finally { [Array]::Clear($bytes, 0, $bytes.Length) }
}

function Open-LocalRedirect([string]$destination, [switch]$SelfTest) {
  # Only a random loopback URL reaches the browser command line. The capability is
  # delivered in a no-store redirect fragment, which the browser does not send to an HTTP server.
  $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
  $path = '/' + (New-RandomHex 24)
  try {
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $localUrl = 'http://127.0.0.1:' + $port + $path
    if ($SelfTest) {
      $probe = [Net.HttpWebRequest]::Create($localUrl)
      $probe.AllowAutoRedirect = $false
      $probe.Proxy = $null
      $asyncProbe = $probe.BeginGetResponse($null, $null)
    } else { Start-Process -FilePath $localUrl }
    $deadline = [DateTime]::UtcNow.AddSeconds(75)
    while ([DateTime]::UtcNow -lt $deadline) {
      if (!$listener.Pending()) { Start-Sleep -Milliseconds 100; continue }
      $client = $listener.AcceptTcpClient()
      try {
        $client.ReceiveTimeout = 2500
        $stream = $client.GetStream()
        $reader = New-Object IO.StreamReader($stream, $ascii)
        $request = $reader.ReadLine()
        $valid = $request -ceq ('GET ' + $path + ' HTTP/1.1') -or $request -ceq ('GET ' + $path + ' HTTP/1.0')
        $hostMatches = $false
        for ($i = 0; $i -lt 64; $i++) {
          $line = $reader.ReadLine()
          if (!$line) { break }
          if ($line -ieq ('Host: 127.0.0.1:' + $port)) { $hostMatches = $true }
        }
        if ($valid -and $hostMatches) {
          $responseText = "HTTP/1.1 303 See Other`r`nLocation: $destination`r`nCache-Control: no-store`r`nReferrer-Policy: no-referrer`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
        } else { $responseText = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n" }
        $payload = $ascii.GetBytes($responseText)
        $stream.Write($payload, 0, $payload.Length)
        $stream.Flush()
      } catch [IO.IOException] { continue }
      finally { $client.Close() }
      if ($valid -and $hostMatches) {
        if ($SelfTest) {
          $result = $probe.EndGetResponse($asyncProbe)
          try {
            if ($result.StatusCode.value__ -ne 303 -or $result.Headers['Location'] -cne $destination) { throw 'The local redirect check failed.' }
          } finally { $result.Close() }
        }
        return
      }
    }
    throw 'The browser did not open the local invitation in time.'
  } finally { $listener.Stop() }
}

if ($Open) {
  try { Open-LocalRedirect (Unprotect-Link $SealedLink) }
  catch {
    Add-Type -AssemblyName System.Windows.Forms
    $null = [Windows.Forms.MessageBox]::Show('Open this shortcut from its original Windows account. If it has expired, use a fresh club invitation.', 'PLFC Webmaster setup')
    exit 1
  }
  exit
}
if ($Test) {
  $dummy = $prefix + (New-RandomHex 32)
  if ((Unprotect-Link (Protect-Link $dummy)) -cne $dummy) { throw 'Windows account protection failed its local check.' }
  Open-LocalRedirect $dummy -SelfTest
  Write-Output 'Windows account encryption and the private browser redirect passed their local checks.'
  exit
}

$cfg = Get-Content -Raw -LiteralPath (Join-Path $repo 'wrangler.jsonc') | ConvertFrom-Json
$binding = @($cfg.d1_databases | Where-Object { $_.binding -eq 'DB' -and $_.database_name -eq 'plfc-clubhouse' })
if ($cfg.name -ne 'plfc-clubhouse' -or $binding.Count -ne 1 -or $binding[0].database_id -ne $database) { throw 'Unexpected Cloudflare project or database.' }
$auth = & $NodePath $WranglerPath auth token --json 2>$null | Out-String | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or !$auth.token) { throw 'The signed-in Cloudflare credential is unavailable.' }
$headers = @{ Authorization = 'Bearer ' + $auth.token }
$api = "https://api.cloudflare.com/client/v4/accounts/$account/d1/database/$database/query"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Invoke-Database([string]$sql, [object[]]$values = @()) {
  $body = @{sql=$sql; params=$values} | ConvertTo-Json -Depth 4 -Compress
  $reply = Invoke-RestMethod -Method Post -Uri $api -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 35
  if (!$reply.success -or !$reply.result[0].success) { throw 'Cloudflare did not confirm the invitation operation.' }
  return $reply.result[0].results
}

function Get-SavedDigest {
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { return $null }
  $linkFile = $shell.CreateShortcut($file)
  $expected = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $PSCommandPath + '" -Open -SealedLink '
  if ($linkFile.TargetPath -ine $powershell -or !$linkFile.Arguments.StartsWith($expected, [StringComparison]::Ordinal)) {
    throw 'The existing shortcut has a different target. It was left intact.'
  }
  return Get-InviteDigest (Unprotect-Link ($linkFile.Arguments.Substring($expected.Length)))
}

$mutex = New-Object Threading.Mutex($false, 'Local\PLFC-First-Owner-Provisioning')
$locked = $false
try {
  $locked = $mutex.WaitOne(30000)
  if (!$locked) { throw 'Another Webmaster setup is in progress.' }
  $shell = New-Object -ComObject WScript.Shell
  $admins = @(Invoke-Database "SELECT COUNT(*) AS count FROM club_accounts WHERE role='administrator'")
  if ([int]$admins[0].count -gt 0) { throw 'A Webmaster account already exists.' }
  $active = @(Invoke-Database "SELECT digest FROM club_invites WHERE role='administrator' AND used_by IS NULL AND expires>unixepoch()")
  $saved = Get-SavedDigest
  if ($active.Count -and ($active.Count -ne 1 -or $active[0].digest -cne $saved)) {
    throw 'A current Webmaster invitation already exists. Use its private shortcut.'
  }
  if (!$active.Count) {
    $null = [IO.Directory]::CreateDirectory($folder)
    $candidate = $prefix + (New-RandomHex 32)
    $sealed = Protect-Link $candidate
    $saved = Get-InviteDigest $candidate
    $stage = Join-Path $folder ([Guid]::NewGuid().ToString('N') + '.lnk')
    $linkFile = $shell.CreateShortcut($stage)
    $linkFile.TargetPath = $powershell
    $linkFile.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $PSCommandPath + '" -Open -SealedLink ' + $sealed
    $linkFile.WorkingDirectory = $repo
    $linkFile.Description = 'Choose your Webmaster username and password for the Point Lookout Fishing Club.'
    $linkFile.WindowStyle = 7
    $linkFile.Save()
    if ([IO.File]::Exists($file)) { [IO.File]::Replace($stage, $file, $null) } else { [IO.File]::Move($stage, $file) }
    if ((Get-SavedDigest) -cne $saved) { throw 'The Windows shortcut did not verify. No invitation was issued.' }
    $null = Invoke-Database @"
INSERT INTO club_invites (digest, login, role, created_by, expires, used_by, reset_id)
SELECT ?, NULL, 'administrator', 'initial-owner-provisioning', unixepoch()+259200, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM club_accounts WHERE role='administrator')
AND NOT EXISTS (SELECT 1 FROM club_invites WHERE role='administrator' AND used_by IS NULL AND expires>unixepoch())
"@ @($saved)
  }
  $verified = @(Invoke-Database "SELECT role,expires FROM club_invites WHERE digest=? AND login IS NULL AND role='administrator' AND used_by IS NULL AND expires>unixepoch() AND created_by='initial-owner-provisioning'" @($saved))
  if ($verified.Count -ne 1) { throw 'An active invitation matching the protected local shortcut could not be verified.' }
  $live = @(Invoke-Database "SELECT COUNT(*) AS count FROM club_invites WHERE role='administrator' AND used_by IS NULL AND expires>unixepoch()")
  if ([int]$live[0].count -ne 1) { throw 'The active Webmaster invitation count is unexpected.' }
  $expiresUtc = [DateTimeOffset]::FromUnixTimeSeconds([long]$verified[0].expires).UtcDateTime
  Write-Output ('Verified one unused Webmaster invitation. Expires ' + $expiresUtc.ToString("yyyy-MM-dd HH:mm 'UTC'") + '.')
  Write-Output ('Protected shortcut: ' + $file)
} finally {
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
