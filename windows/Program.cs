using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new BuildWindow());
    }
}

internal sealed class BuildWindow : Form
{
    private static readonly Uri BuildHome = new("https://knoux.store/build");
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill, Visible = false };
    private readonly Label status = new() { AutoSize = true, ForeColor = Color.White };
    private readonly Button retry = new() { Text = "Retry", AutoSize = true, Enabled = false };
    private readonly FlowLayoutPanel recovery = new()
    {
        Dock = DockStyle.Fill,
        FlowDirection = FlowDirection.TopDown,
        BackColor = Color.FromArgb(15, 15, 29),
        Padding = new Padding(32),
    };

    public BuildWindow()
    {
        Text = "KNOuX Build";
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath!);
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1280, 820);
        MinimumSize = new Size(440, 560);
        recovery.Controls.Add(status);
        recovery.Controls.Add(retry);
        Controls.Add(browser);
        Controls.Add(recovery);

        status.Text = "Opening KNOuX Build…";
        retry.Click += (_, _) => browser.CoreWebView2?.Navigate(BuildHome.AbsoluteUri);
        Shown += async (_, _) => await OpenBuildAsync();
    }

    private async Task OpenBuildAsync()
    {
        try
        {
            var userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "KNOuX", "BuildData", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            if (IsDisposed) return;

            await browser.EnsureCoreWebView2Async(environment);
            if (IsDisposed) return;

            var core = browser.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsWebMessageEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsStatusBarEnabled = true;
            core.PermissionRequested += (_, request) => request.State = CoreWebView2PermissionState.Deny;
            core.NavigationStarting += (_, navigation) =>
            {
                if (TryGetHttpsUri(navigation.Uri, out var target) && IsBuildOrigin(target)) return;

                navigation.Cancel = true;
                if (navigation.IsUserInitiated && target is not null) OpenInBrowser(target);
            };
            core.NewWindowRequested += (_, request) =>
            {
                request.Handled = true;
                if (request.IsUserInitiated && TryGetHttpsUri(request.Uri, out var target)) OpenInBrowser(target);
            };
            core.LaunchingExternalUriScheme += (_, request) => request.Cancel = true;
            core.NavigationCompleted += (_, navigation) =>
            {
                if (navigation.WebErrorStatus == CoreWebView2WebErrorStatus.OperationCanceled) return;

                browser.Visible = navigation.IsSuccess;
                recovery.Visible = !navigation.IsSuccess;
                retry.Enabled = true;
                status.Text = "KNOuX Build could not load. Check your connection and try again.";
            };
            core.Navigate(BuildHome.AbsoluteUri);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            status.Text = "Install Microsoft Edge WebView2 Runtime and reopen KNOuX Build.";
        }
        catch (Exception) when (IsDisposed)
        {
            // The window closed during asynchronous WebView2 initialization.
        }
        catch (Exception exception) when (exception is InvalidOperationException or UnauthorizedAccessException
            or IOException or System.Runtime.InteropServices.COMException)
        {
            status.Text = "The KNOuX Build browser could not start. Close this window and try again.";
        }
    }

    private static bool TryGetHttpsUri(string input, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out Uri? uri)
    {
        if (Uri.TryCreate(input, UriKind.Absolute, out uri) && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Length > 0 && uri.UserInfo.Length == 0) return true;

        uri = null;
        return false;
    }

    private static bool IsBuildOrigin(Uri target) => target.Host == BuildHome.Host && target.Port == BuildHome.Port;

    private void OpenInBrowser(Uri target)
    {
        try
        {
            Process.Start(new ProcessStartInfo(target.AbsoluteUri) { UseShellExecute = true });
        }
        catch (System.ComponentModel.Win32Exception)
        {
            MessageBox.Show(this, "Windows could not open the link in your default browser.", Text);
        }
    }
}
