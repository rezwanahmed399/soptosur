# Soptosur Chat History Auto-Sync Script
# এই script স্বয়ংক্রিয়ভাবে chat history GitHub এ save করে

$transcriptSrc = "C:\Users\RIZWAN AHMED\.gemini\antigravity-ide\brain\1f08915a-432e-4e5a-b68f-4f017d69313a\.system_generated\logs\transcript.jsonl"
$transcriptFullSrc = "C:\Users\RIZWAN AHMED\.gemini\antigravity-ide\brain\1f08915a-432e-4e5a-b68f-4f017d69313a\.system_generated\logs\transcript_full.jsonl"
$repoPath = "C:\Users\RIZWAN AHMED\.gemini\antigravity-ide\scratch\niharika-club"
$historyDir = "$repoPath\chat-history"

# chat-history folder না থাকলে তৈরি করো
if (-not (Test-Path $historyDir)) {
    New-Item -ItemType Directory -Path $historyDir | Out-Null
}

# Transcript copy করো
if (Test-Path $transcriptSrc) {
    Copy-Item -Path $transcriptSrc -Destination "$historyDir\transcript.jsonl" -Force
}
if (Test-Path $transcriptFullSrc) {
    Copy-Item -Path $transcriptFullSrc -Destination "$historyDir\transcript_full.jsonl" -Force
}

# Timestamp লিখে রাখো
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"Last synced: $timestamp" | Set-Content "$historyDir\last_sync.txt"

# Git push
Set-Location $repoPath
git add chat-history/
git commit -m "Chat history sync - $timestamp" 2>&1
git push 2>&1

Write-Host "Chat history synced at $timestamp"
