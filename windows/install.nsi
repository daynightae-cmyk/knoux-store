Unicode True
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor zlib

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"
!include "WordFunc.nsh"

!define PRODUCT "KNOuX Build"
!define ARP_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\KnouxBuild"
!define WEBVIEW_KEY "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "${PRODUCT} ${PRODUCT_VERSION}"
OutFile "${INSTALLER}"
InstallDir "$LOCALAPPDATA\Programs\KNOuX Build"
VIProductVersion "${PRODUCT_VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "${PRODUCT}"
VIAddVersionKey /LANG=1033 "CompanyName" "KNOuX"
VIAddVersionKey /LANG=1033 "LegalCopyright" "KNOuX"
VIAddVersionKey /LANG=1033 "FileDescription" "KNOuX Build Setup"
VIAddVersionKey /LANG=1033 "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=1033 "ProductVersion" "${PRODUCT_VERSION}"

!define MUI_ICON "${PRODUCT_ICON}"
!define MUI_UNICON "${PRODUCT_ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\KnouxBuild.exe"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  SetShellVarContext current
  ${IfNot} ${AtLeastWin10}
  ${OrIfNot} ${IsNativeAMD64}
    MessageBox MB_ICONSTOP "This build requires Windows 10 or later on an x64 PC." /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  ; Never let a caller redirect this installer to a different directory with /D=.
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\KNOuX Build"
  SetRegView 32
  ReadRegStr $0 HKLM "${WEBVIEW_KEY}" "pv"
  ReadRegStr $1 HKCU "${WEBVIEW_KEY}" "pv"
  ${If} $0 == "0.0.0.0"
    StrCpy $0 ""
  ${EndIf}
  ${If} $1 == "0.0.0.0"
    StrCpy $1 ""
  ${EndIf}
  ${If} $0 == ""
  ${AndIf} $1 == ""
    MessageBox MB_ICONSTOP "Install Microsoft Edge WebView2 Runtime, then run setup again.$\r$\nhttps://developer.microsoft.com/microsoft-edge/webview2/" /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  ReadRegStr $0 HKCU "${ARP_KEY}" "DisplayVersion"
  ${If} $0 != ""
    ${VersionCompare} "$0" "${PRODUCT_VERSION}" $1
    ${If} $1 == 1
      MessageBox MB_ICONSTOP "A newer version of KNOuX Build is already installed." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  ClearErrors
  File /oname=KnouxBuild.setup.tmp "${APP_EXE}"
  IfErrors install_failed
  ; Replace the executable atomically. Fail without replacing a running copy.
  System::Call 'kernel32::MoveFileExW(w "$INSTDIR\KnouxBuild.setup.tmp", w "$INSTDIR\KnouxBuild.exe", i 9) i .r0'
  StrCmp $0 0 install_failed
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\KNOuX Build.lnk" "$INSTDIR\KnouxBuild.exe"
  WriteRegStr HKCU "${ARP_KEY}" "DisplayName" "${PRODUCT}"
  WriteRegStr HKCU "${ARP_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${ARP_KEY}" "Publisher" "KNOuX"
  WriteRegStr HKCU "${ARP_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${ARP_KEY}" "DisplayIcon" "$INSTDIR\KnouxBuild.exe"
  WriteRegStr HKCU "${ARP_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegDWORD HKCU "${ARP_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${ARP_KEY}" "NoModify" 1
  Goto install_done
install_failed:
  Delete "$INSTDIR\KnouxBuild.setup.tmp"
  MessageBox MB_ICONSTOP "Setup could not replace the application. Close KNOuX Build and run setup again." /SD IDOK
  SetErrorLevel 1
  Abort
install_done:
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  SetRegView 32
  ClearErrors
  Delete "$INSTDIR\KnouxBuild.exe"
  ${If} ${Errors}
    MessageBox MB_ICONSTOP "Close KNOuX Build and run uninstall again." /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  Delete "$SMPROGRAMS\KNOuX Build.lnk"
  DeleteRegKey HKCU "${ARP_KEY}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
