!include "MUI2.nsh"

Name "GWMS Tally Connector"
OutFile "GWMS-Tally-Connector-Setup-v1.1.exe"
InstallDir "$LOCALAPPDATA\GWMS Tally Connector"
RequestExecutionLevel user
Unicode True
Icon "gwms.ico"
UninstallIcon "gwms.ico"

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Section "GWMS Tally Connector" SEC01
  SetOutPath "$INSTDIR"
  File "GWMS-Tally-Connector.exe"
  File "gwms.ico"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Run connector automatically whenever Windows starts.
  CreateShortCut "$SMSTARTUP\GWMS Tally Connector.lnk" "$INSTDIR\GWMS-Tally-Connector.exe" "" "$INSTDIR\gwms.ico" 0

  ; Desktop shortcut to the live GWMS website with GWMS icon.
  WriteINIStr "$DESKTOP\GWMS.url" "InternetShortcut" "URL" "https://gng.tinyshinygifts.com/"
  WriteINIStr "$DESKTOP\GWMS.url" "InternetShortcut" "IconFile" "$INSTDIR\gwms.ico"
  WriteINIStr "$DESKTOP\GWMS.url" "InternetShortcut" "IconIndex" "0"

  ; Start connector immediately after installation.
  Exec "$INSTDIR\GWMS-Tally-Connector.exe"
SectionEnd

Section "Uninstall"
  Delete "$SMSTARTUP\GWMS Tally Connector.lnk"
  Delete "$DESKTOP\GWMS.url"
  Delete "$INSTDIR\GWMS-Tally-Connector.exe"
  Delete "$INSTDIR\gwms.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
