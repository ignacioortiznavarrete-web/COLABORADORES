Option Explicit

'==============================================================================
'  ZCMMD001 - Diagnostico de pantalla (SAP GUI Scripting)
'------------------------------------------------------------------------------
'  Deja SAP abierto en la pantalla que quieras revisar (por ejemplo la de las
'  3 opciones del check list) y ejecuta este archivo con doble clic.
'
'  Genera un TXT en el Escritorio con:
'     - sistema, mandante, usuario, transaccion, programa y dynpro
'     - TODOS los campos de la pantalla con su ID exacto
'     - la lista de OPCIONES (radio buttons) en orden de pantalla
'     - los botones de la barra de aplicacion (para saber cual es Grabar)
'     - las columnas de la grilla de trozos
'
'  Con ese TXT completas ID_OPCION_1 e ID_OPCION_2 en ZCMMD001_Recepciones.vbs.
'==============================================================================

Const ID_GRID = "wnd[0]/usr/cntlBCALV_GRID_DEMO_0100_CONT1/shellcont/shell"

Dim SapGuiAuto, SapApp, SapConn, SapSession
Dim fso, sal, ruta, i, nRadios

Set SapGuiAuto = Nothing
Set SapApp = Nothing
Set SapSession = Nothing
nRadios = 0

On Error Resume Next
Set SapGuiAuto = GetObject("SAPGUI")
If Err.Number <> 0 Or SapGuiAuto Is Nothing Then
   MsgBox "No pude tomar la sesion de SAP. Abre SAP y vuelve a ejecutar.", vbCritical, "Diagnostico"
   WScript.Quit
End If
Set SapApp = SapGuiAuto.GetScriptingEngine
Set SapConn = SapApp.Children(0)
Set SapSession = SapConn.Children(0)
If Err.Number <> 0 Or SapSession Is Nothing Then
   MsgBox "No hay una sesion SAP abierta o el scripting esta desactivado.", vbCritical, "Diagnostico"
   WScript.Quit
End If
Err.Clear
On Error GoTo 0

Set fso = CreateObject("Scripting.FileSystemObject")
ruta = CreateObject("WScript.Shell").SpecialFolders("Desktop") & "\ZCMMD001_diagnostico.txt"
Set sal = fso.CreateTextFile(ruta, True)

Esc "=============================================================="
Esc " DIAGNOSTICO ZCMMD001 - " & Now
Esc "=============================================================="
Esc "Sistema    : " & Info("SystemName")
Esc "Mandante   : " & Info("Client")
Esc "Usuario    : " & Info("User")
Esc "Transaccion: " & Info("Transaction")
Esc "Programa   : " & Info("Program")
Esc "Dynpro     : " & Info("ScreenNumber")
Esc "Ventanas   : " & SapSession.Children.Count
Esc ""

'--------------------------- OPCIONES (RADIO BUTTONS) -------------------------
Esc "=============================================================="
Esc " OPCIONES (RADIO BUTTONS) - en el orden en que se ven"
Esc " Copia estos IDs en ID_OPCION_1 / ID_OPCION_2 / ID_OPCION_3"
Esc "=============================================================="
Recorrer "wnd[0]/usr", 0, True
If nRadios = 0 Then Esc "  (no hay radio buttons en esta pantalla)"
Esc ""

'------------------------------ TODOS LOS CAMPOS ------------------------------
Esc "=============================================================="
Esc " TODOS LOS CAMPOS DE LA PANTALLA"
Esc "=============================================================="
Recorrer "wnd[0]/usr", 0, False
Esc ""

'--------------------------- BARRAS DE BOTONES --------------------------------
Esc "=============================================================="
Esc " BOTONES DE LA BARRA ESTANDAR  (wnd[0]/tbar[0])"
Esc "=============================================================="
Botones "wnd[0]/tbar[0]"
Esc ""
Esc "=============================================================="
Esc " BOTONES DE LA BARRA DE APLICACION  (wnd[0]/tbar[1])"
Esc " Aqui salen los botones de Grabar: revisa BTN_GRABAR_1 y BTN_GRABAR_2"
Esc "=============================================================="
Botones "wnd[0]/tbar[1]"
Esc ""

'------------------------------- GRILLA ---------------------------------------
Esc "=============================================================="
Esc " GRILLA DE TROZOS"
Esc "=============================================================="
Grilla
Esc ""

'------------------------------- VENTANAS -------------------------------------
If SapSession.Children.Count > 1 Then
   Esc "=============================================================="
   Esc " VENTANAS EMERGENTES ABIERTAS"
   Esc "=============================================================="
   For i = 1 To SapSession.Children.Count - 1
      Esc "  wnd[" & i & "]  " & Texto("wnd[" & i & "]")
   Next
End If

sal.Close
MsgBox "Listo. El detalle quedo en:" & vbCrLf & vbCrLf & ruta, vbInformation, "Diagnostico ZCMMD001"
On Error Resume Next
CreateObject("WScript.Shell").Run "notepad.exe """ & ruta & """", 1, False


'==============================================================================
Sub Esc(t)
   sal.WriteLine t
End Sub


Function Info(prop)
   Info = "?"
   On Error Resume Next
   Select Case prop
      Case "SystemName"   : Info = SapSession.Info.SystemName
      Case "Client"       : Info = SapSession.Info.Client
      Case "User"         : Info = SapSession.Info.User
      Case "Transaction"  : Info = SapSession.Info.Transaction
      Case "Program"      : Info = SapSession.Info.Program
      Case "ScreenNumber" : Info = SapSession.Info.ScreenNumber
   End Select
   Err.Clear
End Function


Function Texto(id)
   Texto = ""
   On Error Resume Next
   Texto = SapSession.findById(id).Text
   Err.Clear
End Function


' Recorre la pantalla. soloRadios = True imprime unicamente los radio buttons.
Sub Recorrer(id, nivel, soloRadios)
   Dim cont, i, hijo, tipo, sangria
   If nivel > 8 Then Exit Sub
   Set cont = Nothing
   On Error Resume Next
   Set cont = SapSession.findById(id)
   Err.Clear
   On Error GoTo 0
   If cont Is Nothing Then Exit Sub

   sangria = String(nivel * 2, " ")
   On Error Resume Next
   For i = 0 To cont.Children.Count - 1
      Set hijo = Nothing
      Set hijo = cont.Children(i)
      Err.Clear
      If Not (hijo Is Nothing) Then
         tipo = ""
         tipo = hijo.Type
         Err.Clear
         If soloRadios Then
            If tipo = "GuiRadioButton" Then
               nRadios = nRadios + 1
               Esc "  OPCION " & nRadios & ":"
               Esc "     ID    : " & hijo.Id
               Esc "     Texto : " & hijo.Text
               Esc "     Marcada: " & hijo.Selected
               Esc ""
            End If
         Else
            Esc sangria & tipo & "  |  " & hijo.Id
            If Len(Trim(hijo.Text & "")) > 0 Then Esc sangria & "      texto: " & hijo.Text
         End If
         If tipo <> "GuiShell" And tipo <> "GuiCustomControl" And tipo <> "GuiGridView" Then
            If hijo.ContainerType Then Recorrer hijo.Id, nivel + 1, soloRadios
            Err.Clear
         End If
      End If
   Next
   Err.Clear
End Sub


Sub Botones(id)
   Dim cont, i, hijo
   Set cont = Nothing
   On Error Resume Next
   Set cont = SapSession.findById(id)
   Err.Clear
   If cont Is Nothing Then
      Esc "  (no existe " & id & ")"
      Exit Sub
   End If
   For i = 0 To cont.Children.Count - 1
      Set hijo = Nothing
      Set hijo = cont.Children(i)
      Err.Clear
      If Not (hijo Is Nothing) Then
         Esc "  " & hijo.Id
         Esc "      texto: " & hijo.Text & "   |   ayuda: " & hijo.Tooltip
         Err.Clear
      End If
   Next
   Err.Clear
End Sub


Sub Grilla()
   Dim grid, cols, i, nom, titulo, fila, valor
   Set grid = Nothing
   On Error Resume Next
   Set grid = SapSession.findById(ID_GRID)
   Err.Clear
   If grid Is Nothing Then
      Esc "  No encontre la grilla en " & ID_GRID
      Esc "  (revisa la seccion TODOS LOS CAMPOS: busca un ID que termine en /shell)"
      Exit Sub
   End If
   Esc "  ID          : " & ID_GRID
   Esc "  Filas       : " & grid.rowCount
   Esc "  Filas a la vista: " & grid.visibleRowCount
   Esc "  Columnas    : " & grid.columnCount
   Esc ""
   Esc "  COLUMNAS (nombre tecnico -> titulo -> valor de la fila 0)"
   Set cols = Nothing
   Set cols = grid.columnOrder
   Err.Clear
   If cols Is Nothing Then Exit Sub
   For i = 0 To cols.Count - 1
      nom = ""
      nom = cols.elementAt(i)
      If Err.Number <> 0 Then
         Err.Clear
         nom = cols(i)
         Err.Clear
      End If
      titulo = ""
      titulo = grid.getDisplayedColumnTitle(nom)
      Err.Clear
      valor = ""
      If grid.rowCount > 0 Then valor = grid.getCellValue(0, nom)
      Err.Clear
      Esc "     " & nom & "   ->   " & titulo & "   ->   [" & valor & "]"
   Next
   Err.Clear
End Sub
