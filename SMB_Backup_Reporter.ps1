<#
.SYNOPSIS
  SMB_Backup_Reporter.ps1 - Automated Backup Logger for Hasleo / SMB shares
  
.DESCRIPTION
  This script checks an SMB share or backup drive for recently modified files 
  to verify if Windows 10/11 PCs have successfully backed up (e.g., using Hasleo).
  It then reports successes to the PC Backup Management System API.
  Intended to be run daily via Task Scheduler on your Storage Server (192.168.1.116).

.SETUP
  1. Set $ServerIP to point to your Ubuntu Docker server.
  2. Configure $BackupSharePath to point to the root backup folder.
  3. Configure $PCFolders to map folder names to their matching "PC Name" on the dashboard.
#>

$ServerIP = "192.168.1.8"
$ServerPort = "8787"

# ── Configuration ────────────────────────────────────────────────────────
# The base path where the Windows 10/11 Hasleo backups are saved
$BackupSharePath = "D:\Shares\HasleoBackups" 

# Map the folder names in the share to the exact 'PC Name' as seen in your web dashboard
$PCFolders = @{
    "Desktop-Accounts" = "DESKTOP-ACCOUNTS-01"
    "Workstation-Design" = "WORKSTATION-DESIGN-01"
    "HR-Laptop" = "LAPTOP-HR-MANAGER"
}

# ──────────────────────────────────────────────────────────────────────────

Write-Host "Checking backups in $BackupSharePath..."

foreach ($folderName in $PCFolders.Keys) {
    $pcName = $PCFolders[$folderName]
    $folderPath = Join-Path $BackupSharePath $folderName
    
    if (Test-Path $folderPath) {
        # Find the most recently modified file in the PC's backup folder
        $latestFile = Get-ChildItem -Path $folderPath -File -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($latestFile) {
            $lastWrite = $latestFile.LastWriteTime
            
            # If the file was modified in the last 24 hours, the backup succeeded!
            if ($lastWrite -ge (Get-Date).AddHours(-48)) {
                
                # Format size as human readable MB/GB
                $sizeMb = [math]::Round($latestFile.Length / 1MB, 2)
                $sizeStr = if ($sizeMb -gt 1024) { "$([math]::Round($sizeMb / 1024, 2)) GB" } else { "$sizeMb MB" }

                $payload = @{
                    pcName = $pcName
                    backupDate = $lastWrite.ToString("yyyy-MM-dd")
                    backupType = "Incremental"
                    method = "Hasleo Free Backup (SMB)"
                    size = $sizeStr
                    notes = "Automated file check. Latest file: $($latestFile.Name)"
                }
                
                $json = $payload | ConvertTo-Json
                try {
                    $response = Invoke-RestMethod -Uri "http://$ServerIP:$ServerPort/api/auto-log" -Method Post -Body $json -ContentType "application/json"
                    Write-Host "[OK] $pcName logged successfully ($sizeStr)."
                } catch {
                    Write-Host "[ERROR] Failed to send log for $pcName API."
                }
            } else {
                Write-Host "[OVERDUE] $pcName hasn't backed up recently. Last file: $lastWrite"
            }
        } else {
            Write-Host "[EMPTY] No backup files found for $pcName in $folderPath"
        }
    } else {
        Write-Host "[MISSING] Backup folder not found: $folderPath"
    }
}

Write-Host "Done."
