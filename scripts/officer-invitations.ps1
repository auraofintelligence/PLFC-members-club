[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$NodePath,
  [Parameter(Mandatory)][string]$WranglerPath,
  [ValidateSet('secretary','assistantsecretary','president','vicepresident','treasurer')][string]$Officer
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$repo = Split-Path -Parent $PSScriptRoot
$folder = Join-Path $repo '.local\officer-invitations'
$handler = Join-Path $PSScriptRoot 'owner-handoff.ps1'
$powershell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$argumentsPrefix = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $handler + '" -Open -SealedLink '
$linkPrefix = 'https://plfc-clubhouse.auraofintelligence.workers.dev/#activate='
$utf8 = [Text.Encoding]::UTF8
# The existing click handler accepts any club invitation. The server enforces its username and role.
$entropy = $utf8.GetBytes('PLFC clubhouse first owner v1')
$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser
$source = 'plfc-officer-invitation-handoff'
$database = '5fbb019c-8268-4c1f-98f7-06d7858b7599'
$account = '8ec4bbe64bddc4086162119149e37ef8'
$officers = @(
  @{ Title = 'Secretary'; Login = 'secretary'; Role = 'committee' }
  @{ Title = 'Assistant Secretary'; Login = 'assistantsecretary'; Role = 'committee' }
  @{ Title = 'President'; Login = 'president'; Role = 'committee' }
  @{ Title = 'Vice President'; Login = 'vicepresident'; Role = 'committee' }
  @{ Title = 'Treasurer'; Login = 'treasurer'; Role = 'treasurer' }
)
if ($Officer) { $officers = @($officers | Where-Object { $_.Login -eq $Officer }) }

function Get-Digest([string]$value) {
  $alg = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($alg.ComputeHash([Text.Encoding]::ASCII.GetBytes($value))).Replace('-','').ToLowerInvariant() }
  finally { $alg.Dispose() }
}
function Read-SavedInvite($officer) {
  if (![IO.File]::Exists($officer.Path)) { return $null }
  $shortcut = $shell.CreateShortcut($officer.Path)
  if ($shortcut.TargetPath -ine $powershell -or !$shortcut.Arguments.StartsWith($argumentsPrefix,[StringComparison]::Ordinal) -or $shortcut.Description -cne $officer.Description) {
    throw ('Unexpected shortcut for ' + $officer.Title + '. It has been left intact.')
  }
  $ciphertext = [Convert]::FromBase64String($shortcut.Arguments.Substring($argumentsPrefix.Length))
  $bytes = [Security.Cryptography.ProtectedData]::Unprotect($ciphertext,$entropy,$scope)
  try {
    $link = $utf8.GetString($bytes)
    if (!$link.StartsWith($linkPrefix,[StringComparison]::Ordinal) -or $link.Substring($linkPrefix.Length) -cnotmatch '^[0-9a-f]{64}$') { throw 'Invalid Windows invitation.' }
    return Get-Digest $link.Substring($linkPrefix.Length)
  } finally { [Array]::Clear($bytes,0,$bytes.Length) }
}
function New-SavedInvite($officer) {
  $random = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($random)
    $token = [BitConverter]::ToString($random).Replace('-','').ToLowerInvariant()
    $bytes = $utf8.GetBytes($linkPrefix + $token)
    try { $sealed = [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,$scope)) }
    finally { [Array]::Clear($bytes,0,$bytes.Length) }
    $stage = Join-Path $folder ([guid]::NewGuid().ToString('N') + '.lnk')
    $shortcut = $shell.CreateShortcut($stage)
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = $argumentsPrefix + $sealed
    $shortcut.Description = $officer.Description
    $shortcut.WorkingDirectory = $repo
    $shortcut.WindowStyle = 7
    $shortcut.Save()
    # No overwrite. Another operator's file or an already-issued link stays intact.
    [IO.File]::Move($stage,$officer.Path)
    $saved = Read-SavedInvite $officer
    if ($saved -cne (Get-Digest $token)) { throw 'Windows invitation check failed.' }
    return $saved
  } finally { $rng.Dispose(); [Array]::Clear($random,0,$random.Length) }
}

function Invoke-ClubQuery([string]$sql,[object[]]$parameters) {
  $body = @{sql=$sql;params=$parameters} | ConvertTo-Json -Depth 4 -Compress
  $result = Invoke-RestMethod -Method Post -Uri $api -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 35
  if (!$result.success -or !$result.result[0].success) {throw 'Cloudflare could not verify the officer invitation operation.'}
  return $result.result[0].results
}

$config = Get-Content -Raw -LiteralPath (Join-Path $repo 'wrangler.jsonc') | ConvertFrom-Json
$binding = @($config.d1_databases | Where-Object { $_.binding -eq 'DB' -and $_.database_name -eq 'plfc-clubhouse' })
if ($config.name -ne 'plfc-clubhouse' -or $binding.Count -ne 1 -or $binding[0].database_id -ne $database) {throw 'Unexpected Cloudflare environment.'}
$auth = & $NodePath $WranglerPath auth token --json 2>$null | Out-String | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or !$auth.token) {throw 'Sign in to the club Cloudflare account first.'}
$headers = @{Authorization='Bearer '+$auth.token}
$api = "https://api.cloudflare.com/client/v4/accounts/$account/d1/database/$database/query"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$shell = New-Object -ComObject WScript.Shell
$mutex = New-Object Threading.Mutex($false,'Local\PLFC-Officer-Invitations')
$locked = $false
try {
  $locked = $mutex.WaitOne(30000)
  if (!$locked) {throw 'Officer invitations are already being prepared.'}
  foreach ($o in $officers) {
    $o.Path = Join-Path $folder ($o.Title + '.lnk')
    $o.Description = 'Private PLFC ' + $o.Title + ' setup. Use the username ' + $o.Login + '.'
    $o.Saved = Read-SavedInvite $o
    $accounts = @(Invoke-ClubQuery 'SELECT role FROM club_accounts WHERE login=?' @($o.Login))
    if ($accounts.Count) {
      $o.Claimed = $false
      if ($o.Saved -and $accounts[0].role -ceq $o.Role) {
        $ours = @(Invoke-ClubQuery 'SELECT 1 FROM club_invites WHERE login=? AND digest=? AND role=? AND created_by=? AND used_by IS NOT NULL AND reset_id IS NULL' @($o.Login,$o.Saved,$o.Role,$source))
        $o.Claimed = ($ours.Count -eq 1)
      }
      if (!$o.Claimed) {throw ('The username '+$o.Login+' already belongs to another account. No existing account was changed.')}
      continue
    }
    $active = @(Invoke-ClubQuery 'SELECT digest,role,created_by,reset_id FROM club_invites WHERE login=? AND expires>unixepoch() AND used_by IS NULL' @($o.Login))
    if ($active.Count -and ($active.Count -ne 1 -or $active[0].digest -cne $o.Saved -or $active[0].role -cne $o.Role -or $active[0].created_by -cne $source -or $null -ne $active[0].reset_id)) {
      throw ('The username '+$o.Login+' already has another invitation. Its invitation was left intact.')
    }
    if (!$active.Count -and $o.Saved) {
      $prior = @(Invoke-ClubQuery 'SELECT 1 FROM club_invites WHERE digest=?' @($o.Saved))
      if ($prior.Count) {throw ('The saved '+$o.Title+' invitation has expired or was already used. No replacement was issued.')}
    }
  }
  $null = [IO.Directory]::CreateDirectory($folder)
  foreach ($o in $officers) {
    if ($o.Claimed) {Write-Output ($o.Title+' was already activated. The existing account was preserved.');continue}
    if (!$o.Saved) {$o.Saved = New-SavedInvite $o}
    $null = Invoke-ClubQuery @"
INSERT INTO club_invites(digest,login,role,created_by,expires)
SELECT ?,?,?,?,unixepoch()+259200
WHERE NOT EXISTS(SELECT 1 FROM club_accounts WHERE login=?)
AND NOT EXISTS(SELECT 1 FROM club_invites WHERE login=? AND used_by IS NULL AND expires>unixepoch())
AND NOT EXISTS(SELECT 1 FROM club_invites WHERE digest=?)
"@ @($o.Saved,$o.Login,$o.Role,$source,$o.Login,$o.Login,$o.Saved)
    $verified = @(Invoke-ClubQuery @"
SELECT expires FROM club_invites WHERE digest=? AND login=? AND role=? AND created_by=?
AND used_by IS NULL AND reset_id IS NULL AND expires>unixepoch()
AND (SELECT count(*) FROM club_invites WHERE login=? AND used_by IS NULL AND expires>unixepoch())=1
"@ @($o.Saved,$o.Login,$o.Role,$source,$o.Login))
    if ($verified.Count -ne 1) {throw ('No matching single-use invitation could be verified for '+$o.Login+'.')}
    $auditId = Get-Digest ('plfc-officer-issued/' + $o.Saved)
    $null = Invoke-ClubQuery @"
INSERT OR IGNORE INTO audit_log(id,actor_id,actor_role,action,entity_id,occurred_at)
SELECT ?,?,'cloudflare_operator','officer_invitation_issued',login,strftime('%Y-%m-%dT%H:%M:%fZ',expires-259200,'unixepoch')
FROM club_invites WHERE digest=? AND login=? AND created_by=?
"@ @($auditId,$source,$o.Saved,$o.Login,$source)
    $expiry = [DateTimeOffset]::FromUnixTimeSeconds([long]$verified[0].expires).ToOffset([TimeSpan]::FromHours(10))
    Write-Output ($o.Title+' | '+$o.Login+' | '+$o.Role+' | verified unused until '+$expiry.ToString('yyyy-MM-dd HH:mm')+' Brisbane | '+$o.Path)
  }
} finally {
  if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()
}
