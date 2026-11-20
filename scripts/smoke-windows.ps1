$ErrorActionPreference = 'Stop'
$app = $null
$installDir = Join-Path $env:RUNNER_TEMP "PrismaLink-install-$env:GITHUB_RUN_ID"

function Fail-NativeCheck([string]$message) {
    Write-Output "::error::$message"
    throw $message
}

try {
    $installer = Get-ChildItem target/release/bundle/nsis/*.exe | Select-Object -First 1
    if (!$installer) { Fail-NativeCheck 'Windows installer artifact is missing.' }
    $install = Start-Process $installer.FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
    if ($install.ExitCode -ne 0) { Fail-NativeCheck "NSIS installation failed with exit code $($install.ExitCode)." }
    $exe = Join-Path $installDir 'prismalink.exe'
    if (!(Test-Path $exe)) { Fail-NativeCheck 'NSIS did not install prismalink.exe at the requested installation directory.' }
    Write-Output '::notice::Windows installer completed; checking the native WebView.'

    # Windows PowerShell 5.1 resolves the Windows desktop UI Automation assemblies.
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    $app = Start-Process $exe -PassThru
    $condition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ProcessIdProperty, [int]$app.Id
    )
    $deadline = (Get-Date).AddSeconds(45)
    $rendered = $false
    while ((Get-Date) -lt $deadline) {
        $app.Refresh()
        if ($app.HasExited) { Fail-NativeCheck "Application exited before rendering, with exit code $($app.ExitCode)." }
        $window = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
            [System.Windows.Automation.TreeScope]::Children, $condition
        )
        if ($window) {
            try {
                $elements = $window.FindAll(
                    [System.Windows.Automation.TreeScope]::Descendants,
                    [System.Windows.Automation.Condition]::TrueCondition
                )
                $names = $elements | ForEach-Object { $_.Current.Name }
                if (($names -join ' ') -match [regex]::Escape('Make yourself at home.')) {
                    $rendered = $true
                    break
                }
            } catch [System.Windows.Automation.ElementNotAvailableException] {
                # WebView accessibility can replace its subtree during first render.
            }
        }
        Start-Sleep -Milliseconds 500
    }
    if (!$rendered) { Fail-NativeCheck 'The Windows native accessibility tree did not expose the vault setup screen within 45 seconds.' }
    Write-Output '::notice::Windows native WebView rendered the vault setup screen.'
} catch {
    Write-Output "::error::Windows native verification failed: $($_.Exception.Message)"
    throw
} finally {
    if ($app) {
        $app.Refresh()
        if (!$app.HasExited) { Stop-Process -Id $app.Id -Force }
    }
    $uninstaller = Join-Path $installDir 'uninstall.exe'
    if (Test-Path $uninstaller) {
        $uninstall = Start-Process $uninstaller -ArgumentList '/S' -Wait -PassThru
        if ($uninstall.ExitCode -ne 0) { Fail-NativeCheck "NSIS uninstall failed with exit code $($uninstall.ExitCode)." }
        Write-Output '::notice::Windows uninstaller completed.'
    } elseif (Test-Path (Join-Path $installDir 'prismalink.exe')) {
        Fail-NativeCheck 'The installed application has no expected uninstaller.'
    }
}
