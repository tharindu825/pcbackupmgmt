<#
.SYNOPSIS
  WSB_Reporter.ps1 - Automated Backup Logger for Windows Server Backup
  
.DESCRIPTION
  This script checks the status of Windows Server Backup and automatically
  reports successful backups to the PC Backup Management System.
  Intended to be run daily via Windows Task Scheduler on servers running WSB.

.SETUP
  1. Change $ServerIP to the IP of your Ubuntu Docker server.
  2. Open Task Scheduler > Create Task.
  3. Action: Start a program -> powershell.exe
  4. Arguments: -ExecutionPolicy Bypass -File "C:\Path\To\WSB_Reporter.ps1"
  5. Trigger: Daily.
#>

$ServerIP = "192.168.1.8"
$ServerPort = "8787"

# Automatically uses the Windows computer name to match exactly with the PC Name in the dashboard
$PCName = $env:COMPUTERNAME

try {
    # Since PowerShell modules and Event Viewer are corrupted/missing in this environment,
    # we completely bypass completely everything and ask the native command-line tool.
    Write-Host "Querying wbadmin.exe directly for recent Windows Server Backups..."
    
    $wbOut = wbadmin get versions
    
    # We look for the "Backup time: 3/21/2026 9:00 PM" line in the console output
    $backupLine = $wbOut | Select-String "Backup time:" | Select-Object -Last 1
    
    if ($backupLine) {
        $dateStr = $backupLine.ToString().Replace("Backup time:","").Trim()
        
        # PowerShell magically casts standard date strings to local datetime objects!
        $lastSuccess = [datetime]$dateStr
        
        # Check if we had a successful backup in the last 48 hours
        if ($lastSuccess -ge (Get-Date).AddHours(-48)) {
            
            $backupDate = $lastSuccess.ToString("yyyy-MM-dd")
            
            $payload = @{
                pcName = $PCName
                backupDate = $backupDate
                backupType = "Full"
                method = "Windows Server Backup"
                size = "Unknown"
                notes = "Automated wbadmin check. Last success: $($lastSuccess.ToString('yyyy-MM-dd HH:mm:ss'))"
            }
            
            $json = $payload | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "http://${ServerIP}:${ServerPort}/api/auto-log" -Method Post -Body $json -ContentType "application/json"
            
            Write-Host "Success: Sent backup log for $PCName. Server responded:"
            $response | Out-Default
        } else {
            Write-Host "Warning: Found a successful backup, but it's older than 48 hours! ($lastSuccess)"
        }
    } else {
        Write-Host "Warning: Couldn't find any recent successful backups via wbadmin."
    }
} catch {
    Write-Host "Error: Failed to query wbadmin or contact the API."
    Write-Host $_.Exception.Message
}
