#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{612D020C-4238-4698-9E59-546AF8D34CE8}
AppName=Able
AppPublisher=Able
AppPublisherURL=https://able-alpha.vercel.app
AppSupportURL=https://able-alpha.vercel.app/contact
AppUpdatesURL=https://able-alpha.vercel.app/download
AppVersion={#AppVersion}
ArchitecturesAllowed=x64compatible
Compression=lzma2/max
DefaultDirName={localappdata}\Programs\Able
DisableProgramGroupPage=yes
OutputBaseFilename=Able-Setup
OutputDir=..\..\dist\windows
PrivilegesRequired=lowest
SetupIconFile=build\Able.ico
SolidCompression=yes
UninstallDisplayIcon={app}\Able.exe
WizardStyle=modern

[Files]
Source: "build\Able.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Able.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\Able"; Filename: "{app}\Able.exe"; IconFilename: "{app}\Able.ico"
Name: "{autoprograms}\Able"; Filename: "{app}\Able.exe"; IconFilename: "{app}\Able.ico"

[Run]
Filename: "{app}\Able.exe"; Description: "Open Able"; Flags: nowait postinstall skipifsilent
