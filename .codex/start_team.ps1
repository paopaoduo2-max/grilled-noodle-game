$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Project: $projectRoot"
Write-Host "Starting Codex multi-agent session..."
Write-Host ""
Write-Host "After Codex opens, paste prompt from:"
Write-Host ".codex\\today_parallel_prompt.txt"
Write-Host ""

codex --enable multi_agent

