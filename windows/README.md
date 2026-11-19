# KNOuX Build for Windows

The Windows client opens `https://knoux.store/build` in a dedicated Microsoft Edge WebView2 window. It uses the live site's existing interfaces and retains its own per-user web profile. The site needs a network connection. The renderer receives no native host objects or desktop message handlers. User-initiated external HTTPS links open in the default browser.

Build on Windows with the .NET 10 SDK, NSIS 3, and the repository's Node.js dependencies and Playwright Chromium installed. The build derives its product version from the root `package.json` and its multi-resolution icon from `src/app/icon.svg`.

```powershell
node_modules/.bin/playwright.cmd install chromium
./windows/Build-Installer.ps1
```

The build writes an unpacked executable, x64 NSIS setup, and SHA-256 and signing status manifest under the selected output directory. Set `-DotNet` or `-MakeNsis` to the respective executable path to use portable build tools. These commands produce unsigned test artifacts.

Setup requires the Evergreen WebView2 Runtime, installs under the current user's local application directory, and registers the app in Windows Installed apps and the Start menu. Install a newer version through the same setup flow. Close KNOuX Build before upgrading or uninstalling. Uninstall removes the installed executables and shortcut and preserves the separate local WebView2 profile under `%LOCALAPPDATA%\KNOuX\BuildData`.
