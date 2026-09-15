using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;

internal static class Program
{
    private const string AbleUrl = "https://able-alpha.vercel.app/";

    [STAThread]
    private static void Main()
    {
        string browser = FindBrowser();
        if (!string.IsNullOrEmpty(browser))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = browser,
                Arguments = "--app=\"" + AbleUrl + "\" --start-maximized",
                UseShellExecute = true,
            });
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = AbleUrl,
            UseShellExecute = true,
        });
    }

    private static string FindBrowser()
    {
        string[] executableNames = { "msedge.exe", "chrome.exe" };
        foreach (string executableName in executableNames)
        {
            string registered = ReadAppPath(executableName);
            if (!string.IsNullOrEmpty(registered) && File.Exists(registered))
            {
                return registered;
            }
        }

        string[] candidates =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe"),
        };

        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return string.Empty;
    }

    private static string ReadAppPath(string executableName)
    {
        const string appPaths = @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\";
        using (RegistryKey key = Registry.LocalMachine.OpenSubKey(appPaths + executableName))
        {
            return key == null ? string.Empty : Convert.ToString(key.GetValue(string.Empty));
        }
    }
}
