using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Reviewer2Desktop
{
    static class Program
    {
        private static readonly Dictionary<string, byte[]> _memoryFiles =
            new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);

        private static string _fallbackDistRoot = null;
        private static volatile bool _running = true;
        private static long _lastActivityTicks = DateTime.UtcNow.Ticks;

        // Small heartbeat script injected into index.html so the server knows the window is still open
        private const string HeartbeatScript = @"
<script>
(function(){
  setInterval(function(){ fetch('/__heartbeat', {cache:'no-store'}).catch(function(){}); }, 2000);
  window.addEventListener('pagehide', function(){ navigator.sendBeacon('/__shutdown'); });
})();
</script>
</body>";

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                LoadEmbeddedZipAssets();
                LocateFallbackDistRoot();

                if (_memoryFiles.Count == 0 && _fallbackDistRoot == null)
                {
                    MessageBox.Show(
                        "Failed to load game resources.",
                        "REVIEWER 2 Launch Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
                listener.Start();
                int port = ((IPEndPoint)listener.LocalEndpoint).Port;
                string appUrl = string.Format("http://127.0.0.1:{0}/", port);

                Thread serverThread = new Thread(() => ServeLoop(listener));
                serverThread.IsBackground = true;
                serverThread.Start();

                string tempProfileDir = null;
                Process appProcess = LaunchStandaloneWindow(appUrl, out tempProfileDir);

                // Wait for the game window to close
                if (appProcess != null)
                {
                    try
                    {
                        appProcess.WaitForExit();
                    }
                    catch { }
                }

                // If the browser process handed off to an existing broker process (ExitCode 21),
                // keep the embedded server alive as long as the game tab is sending heartbeats!
                while (_running)
                {
                    Thread.Sleep(1000);
                    double idleSeconds = TimeSpan.FromTicks(DateTime.UtcNow.Ticks - Interlocked.Read(ref _lastActivityTicks)).TotalSeconds;
                    if (idleSeconds > 6.0)
                    {
                        break;
                    }
                }

                _running = false;
                try { listener.Stop(); } catch { }

                if (!string.IsNullOrEmpty(tempProfileDir) && Directory.Exists(tempProfileDir))
                {
                    try { Directory.Delete(tempProfileDir, true); } catch { }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "An error occurred during execution:\n" + ex.Message,
                    "REVIEWER 2",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static void LoadEmbeddedZipAssets()
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream zipStream = asm.GetManifestResourceStream("dist.zip"))
            {
                if (zipStream == null) return;
                using (ZipArchive archive = new ZipArchive(zipStream, ZipArchiveMode.Read))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        if (string.IsNullOrEmpty(entry.Name)) continue;
                        string normalizedKey = "/" + entry.FullName.Replace('\\', '/').TrimStart('/');
                        using (Stream entryStream = entry.Open())
                        using (MemoryStream ms = new MemoryStream())
                        {
                            entryStream.CopyTo(ms);
                            byte[] bytes = ms.ToArray();

                            if (normalizedKey.Equals("/index.html", StringComparison.OrdinalIgnoreCase))
                            {
                                string html = Encoding.UTF8.GetString(bytes);
                                if (html.IndexOf("</body>", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    html = html.Replace("</body>", HeartbeatScript);
                                    bytes = Encoding.UTF8.GetBytes(html);
                                }
                            }

                            _memoryFiles[normalizedKey] = bytes;
                        }
                    }
                }
            }
        }

        private static void LocateFallbackDistRoot()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string c1 = Path.Combine(exeDir, "dist");
            string c2 = Path.GetFullPath(Path.Combine(exeDir, "..", "dist"));
            if (Directory.Exists(c1) && File.Exists(Path.Combine(c1, "index.html")))
                _fallbackDistRoot = c1;
            else if (Directory.Exists(c2) && File.Exists(Path.Combine(c2, "index.html")))
                _fallbackDistRoot = c2;
        }

        private static Process LaunchStandaloneWindow(string url, out string tempProfileDir)
        {
            tempProfileDir = null;
            string[] browserCandidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            };

            string browserExe = null;
            foreach (string candidate in browserCandidates)
            {
                if (!string.IsNullOrEmpty(candidate) && File.Exists(candidate))
                {
                    browserExe = candidate;
                    break;
                }
            }

            Interlocked.Exchange(ref _lastActivityTicks, DateTime.UtcNow.Ticks);

            if (browserExe != null)
            {
                tempProfileDir = Path.Combine(
                    Path.GetTempPath(),
                    "Reviewer2App_" + Guid.NewGuid().ToString("N").Substring(0, 10)
                );
                Directory.CreateDirectory(tempProfileDir);

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browserExe,
                    Arguments = string.Format(
                        "--app=\"{0}\" --window-size=1480,920 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check --disable-features=Translate",
                        url,
                        tempProfileDir
                    ),
                    UseShellExecute = false
                };
                return Process.Start(psi);
            }

            Process.Start(url);
            return null;
        }

        private static void ServeLoop(TcpListener listener)
        {
            while (_running)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(_ => HandleClient(client));
                }
                catch
                {
                    if (!_running) break;
                }
            }
        }

        private static void HandleClient(TcpClient client)
        {
            using (client)
            {
                try
                {
                    client.ReceiveTimeout = 5000;
                    client.SendTimeout = 5000;

                    using (NetworkStream stream = client.GetStream())
                    {
                        // Read HTTP request headers completely to prevent TCP RST on socket close
                        string requestLine = ReadAsciiLine(stream);
                        if (string.IsNullOrEmpty(requestLine)) return;

                        int contentLength = 0;
                        while (true)
                        {
                            string headerLine = ReadAsciiLine(stream);
                            if (string.IsNullOrEmpty(headerLine)) break;
                            if (headerLine.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                            {
                                int.TryParse(headerLine.Substring(15).Trim(), out contentLength);
                            }
                        }

                        if (contentLength > 0 && contentLength < 65536)
                        {
                            byte[] discard = new byte[contentLength];
                            int readTotal = 0;
                            while (readTotal < contentLength)
                            {
                                int r = stream.Read(discard, readTotal, contentLength - readTotal);
                                if (r <= 0) break;
                                readTotal += r;
                            }
                        }

                        Interlocked.Exchange(ref _lastActivityTicks, DateTime.UtcNow.Ticks);

                        string[] parts = requestLine.Split(' ');
                        if (parts.Length < 2) return;

                        string rawPath = Uri.UnescapeDataString(parts[1].Split('?')[0]);

                        if (rawPath.Equals("/__heartbeat", StringComparison.OrdinalIgnoreCase))
                        {
                            WriteHttpResponse(stream, "200 OK", "text/plain", Encoding.ASCII.GetBytes("ok"));
                            GracefulShutdown(client);
                            return;
                        }

                        if (rawPath.Equals("/__shutdown", StringComparison.OrdinalIgnoreCase))
                        {
                            WriteHttpResponse(stream, "200 OK", "text/plain", Encoding.ASCII.GetBytes("bye"));
                            GracefulShutdown(client);
                            _running = false;
                            return;
                        }

                        if (rawPath == "/" || string.IsNullOrEmpty(rawPath))
                        {
                            rawPath = "/index.html";
                        }

                        byte[] body = null;
                        string mime = GetMimeType(Path.GetExtension(rawPath));

                        if (!_memoryFiles.TryGetValue(rawPath, out body))
                        {
                            if (_fallbackDistRoot != null)
                            {
                                string rel = rawPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                                string diskPath = Path.GetFullPath(Path.Combine(_fallbackDistRoot, rel));
                                if (diskPath.StartsWith(Path.GetFullPath(_fallbackDistRoot), StringComparison.OrdinalIgnoreCase) && File.Exists(diskPath))
                                {
                                    body = File.ReadAllBytes(diskPath);
                                    mime = GetMimeType(Path.GetExtension(diskPath));
                                }
                            }
                        }

                        if (body == null)
                        {
                            if (!_memoryFiles.TryGetValue("/index.html", out body) && _fallbackDistRoot != null)
                            {
                                body = File.ReadAllBytes(Path.Combine(_fallbackDistRoot, "index.html"));
                            }
                            mime = "text/html; charset=utf-8";
                        }

                        if (body != null)
                        {
                            WriteHttpResponse(stream, "200 OK", mime, body);
                        }
                        else
                        {
                            WriteHttpResponse(stream, "404 Not Found", "text/plain", Encoding.ASCII.GetBytes("Not Found"));
                        }

                        GracefulShutdown(client);
                    }
                }
                catch { }
            }
        }

        private static string ReadAsciiLine(NetworkStream stream)
        {
            StringBuilder sb = new StringBuilder(128);
            while (true)
            {
                int b = stream.ReadByte();
                if (b < 0) break;
                if (b == '\n') break;
                if (b != '\r') sb.Append((char)b);
                if (sb.Length > 8192) break;
            }
            return sb.ToString();
        }

        private static void WriteHttpResponse(NetworkStream stream, string status, string mime, byte[] body)
        {
            string header = string.Format(
                "HTTP/1.1 {0}\r\nContent-Type: {1}\r\nContent-Length: {2}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
                status,
                mime,
                body.Length
            );
            byte[] headerBytes = Encoding.ASCII.GetBytes(header);
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(body, 0, body.Length);
            stream.Flush();
        }

        private static void GracefulShutdown(TcpClient client)
        {
            try
            {
                client.Client.Shutdown(SocketShutdown.Both);
            }
            catch { }
        }

        private static string GetMimeType(string ext)
        {
            switch ((ext ?? "").ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js":
                case ".mjs": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".woff": return "font/woff";
                case ".woff2": return "font/woff2";
                default: return "application/octet-stream";
            }
        }
    }
}
