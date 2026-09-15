# Able native launchers

Able's AI, authentication and chat history run on the hosted service. The native
packages therefore open that service in a browser-owned app surface rather than
embedding Google sign-in in a WebView, which Google blocks.

- **Windows:** a small Inno Setup installer adds a branded Able launcher. It opens
  the service in Edge or Chrome app mode so the user's normal browser session is
  available.
- **Android:** a signed Trusted Web Activity uses Chrome without browser chrome.
  `public/.well-known/assetlinks.json` binds the production origin to the APK's
  signing certificate.
- **macOS:** a disk image contains an Able launcher that uses Chrome or Edge app
  mode and falls back to the default browser. The public build is ad-hoc signed;
  production notarization requires an Apple Developer certificate.

Pushing a `v*` tag runs `.github/workflows/native-release.yml` and publishes the
three stable filenames on the matching GitHub release. The Android private key
and public certificate are held in repository Actions secrets.
