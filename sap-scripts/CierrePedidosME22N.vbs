'==============================================================================
' CierrePedidosME22N.vbs
' Cierra OCs en ME22N marcando "Entrega final" (EKPO-ELIKZ) en TODAS las
' posiciones de cada pedido, sin importar cuantas posiciones tenga.
'
' Excel de entrada (primera hoja):
'   Columna A : Numero de OC (desde la fila 2; la fila 1 es encabezado)
'   Columna B : Estado            (lo escribe el script)
'   Columna C : Mensaje SAP       (lo escribe el script)
'   Columna D : Posiciones        (lo escribe el script: marcadas / total)
'
' Uso: abrir SAP GUI con sesion iniciada, doble clic a este archivo y
'      elegir el Excel. Probar primero con 1 OC.
'==============================================================================
Option Explicit

Const FILA_INICIO = 2
Const COL_OC      = 1
Const COL_ESTADO  = 2
Const COL_MSG     = 3
Const COL_POS     = 4
Const GUARDAR     = True    ' False = marca pero NO guarda (solo prueba)

Dim SapGuiAuto, application, connection, session
Dim xl, wb, ws, ruta, fila, oc, total, ok, errores

'--- Conexion a SAP -----------------------------------------------------------
On Error Resume Next
Set SapGuiAuto = GetObject("SAPGUI")
If Err.Number <> 0 Then
    MsgBox "No se encontro SAP GUI abierto.", vbCritical
    WScript.Quit
End If
Set application = SapGuiAuto.GetScriptingEngine
Set connection  = application.Children(0)
Set session     = connection.Children(0)
If Err.Number <> 0 Then
    MsgBox "No hay una sesion de SAP activa.", vbCritical
    WScript.Quit
End If
On Error GoTo 0
session.findById("wnd[0]").maximize

'--- Excel --------------------------------------------------------------------
Set xl = CreateObject("Excel.Application")
xl.Visible = True
ruta = xl.GetOpenFilename("Excel (*.xlsx;*.xlsm;*.xls),*.xlsx;*.xlsm;*.xls", , "Seleccione el Excel con las OC")
If ruta = False Then
    xl.Quit
    WScript.Quit
End If
Set wb = xl.Workbooks.Open(ruta)
Set ws = wb.Worksheets(1)

total = 0
fila = FILA_INICIO
Do While Trim(CStr(ws.Cells(fila, COL_OC).Value)) <> ""
    total = total + 1
    fila = fila + 1
Loop

If total = 0 Then
    MsgBox "No hay OC en la columna A desde la fila " & FILA_INICIO, vbExclamation
    WScript.Quit
End If

If MsgBox("Se cerraran " & total & " OC en SAP (" & IIf(GUARDAR, "GUARDANDO", "SIN GUARDAR - prueba") & ")." & vbCrLf & _
          "Continuar?", vbYesNo + vbQuestion, "Cierre de pedidos") <> vbYes Then
    WScript.Quit
End If

ws.Cells(1, COL_ESTADO).Value = "Estado"
ws.Cells(1, COL_MSG).Value    = "Mensaje SAP"
ws.Cells(1, COL_POS).Value    = "Posiciones"

ok = 0 : errores = 0
fila = FILA_INICIO
Do While Trim(CStr(ws.Cells(fila, COL_OC).Value)) <> ""
    oc = Trim(CStr(ws.Cells(fila, COL_OC).Value))
    ws.Cells(fila, COL_ESTADO).Value = "Procesando..."
    If CerrarOC(oc, fila) Then
        ok = ok + 1
    Else
        errores = errores + 1
    End If
    wb.Save
    fila = fila + 1
Loop

MsgBox "Proceso terminado." & vbCrLf & "OK: " & ok & vbCrLf & "Con error/revisar: " & errores, vbInformation

'==============================================================================
' Cierra todas las posiciones de una OC. Devuelve True si quedo OK.
'==============================================================================
Function CerrarOC(oc, fila)
    Dim combo, claves(), i, n, chk, marcadas, sinCheck, msg, tipo

    CerrarOC = False

    ' Abrir ME22N y cargar la OC con "Otro pedido"
    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME22N"
    session.findById("wnd[0]").sendVKey 0
    CerrarPopups
    session.findById("wnd[0]/tbar[1]/btn[17]").press
    session.findById("wnd[1]/usr/subSUB0:SAPLMEGUI:0003/ctxtMEPO_SELECT-EBELN").Text = oc
    session.findById("wnd[1]").sendVKey 0

    ' Si la OC no existe / esta bloqueada, SAP deja el popup abierto o da error
    If session.Children.Count > 1 Then
        msg = LeerBarra()
        On Error Resume Next
        session.findById("wnd[1]/tbar[0]/btn[12]").press   ' Cancelar el popup
        session.findById("wnd[1]").Close
        On Error GoTo 0
        Escribir fila, "ERROR", "No se pudo abrir la OC. " & msg, ""
        Exit Function
    End If
    tipo = session.findById("wnd[0]/sbar").MessageType
    If tipo = "E" Or tipo = "A" Then
        Escribir fila, "ERROR", LeerBarra(), ""
        Exit Function
    End If

    ' Combo de posiciones del detalle (contiene TODAS las posiciones de la OC)
    Set combo = Buscar("DYN_6000-LIST", "GuiComboBox")
    If combo Is Nothing Then
        Escribir fila, "ERROR", "No se encontro el detalle de posicion (expanda 'Detalle de posicion' en ME22N una vez y reintente)", ""
        Exit Function
    End If

    ' Guardar las claves primero: el objeto combo se invalida tras cada ida al servidor
    n = combo.Entries.Count
    ReDim claves(n - 1)
    For i = 0 To n - 1
        claves(i) = combo.Entries.Item(i).Key
    Next

    marcadas = 0 : sinCheck = ""
    For i = 0 To n - 1
        Set combo = Buscar("DYN_6000-LIST", "GuiComboBox")
        If combo Is Nothing Then Exit For
        If combo.Key <> claves(i) Then combo.Key = claves(i)   ' ir a la posicion i

        SeleccionarPestanaEntrega
        Set chk = Buscar("MEPO1313-ELIKZ", "GuiCheckBox")
        If chk Is Nothing Then
            sinCheck = sinCheck & " " & (i + 1)
        ElseIf Not chk.Changeable Then
            sinCheck = sinCheck & " " & (i + 1)               ' p.ej. posicion borrada
        Else
            If Not chk.Selected Then chk.Selected = True
            marcadas = marcadas + 1
        End If
    Next

    ' Guardar
    If GUARDAR Then
        session.findById("wnd[0]/tbar[0]/btn[11]").press
        msg = CerrarPopups()
        tipo = session.findById("wnd[0]/sbar").MessageType
        msg = Trim(msg & " " & LeerBarra())
    Else
        tipo = "S" : msg = "Modo prueba: no se guardo"
        session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME22N"
        session.findById("wnd[0]").sendVKey 0
        If session.Children.Count > 1 Then
            On Error Resume Next
            session.findById("wnd[1]/usr/btnSPOP-OPTION2").press   ' "No" grabar
            On Error GoTo 0
        End If
    End If

    If sinCheck <> "" Then msg = msg & " | Sin marcar (no editable): pos." & sinCheck

    If tipo = "S" Or tipo = "" Then
        If sinCheck = "" Then
            Escribir fila, "OK", msg, marcadas & " / " & n
        Else
            Escribir fila, "REVISAR", msg, marcadas & " / " & n
        End If
        CerrarOC = True
    Else
        Escribir fila, "REVISAR", msg, marcadas & " / " & n
    End If
End Function

'--- Busca un control por nombre dentro de la pantalla (independiente de la ruta)
Function Buscar(nombre, tipo)
    Dim o
    Set Buscar = Nothing
    On Error Resume Next
    Set o = session.findById("wnd[0]/usr").FindByName(nombre, tipo)
    If Err.Number = 0 Then
        If Not o Is Nothing Then Set Buscar = o
    End If
    Err.Clear
    On Error GoTo 0
End Function

'--- Activa la pestana "Entrega" (TABIDT6) del detalle de posicion
Sub SeleccionarPestanaEntrega()
    Dim tab
    Set tab = Buscar("TABIDT6", "GuiTab")
    If Not tab Is Nothing Then
        On Error Resume Next
        tab.Select
        On Error GoTo 0
    End If
End Sub

'--- Cierra popups (confirmaciones de grabado, avisos) y devuelve su texto
Function CerrarPopups()
    Dim intentos, txt
    txt = ""
    intentos = 0
    Do While session.Children.Count > 1 And intentos < 5
        On Error Resume Next
        txt = txt & "[" & session.ActiveWindow.Text & "] "
        session.ActiveWindow.sendVKey 0          ' Enter = boton por defecto (Si)
        On Error GoTo 0
        intentos = intentos + 1
    Loop
    CerrarPopups = txt
End Function

Function LeerBarra()
    LeerBarra = session.findById("wnd[0]/sbar").Text
End Function

Sub Escribir(fila, estado, msg, pos)
    ws.Cells(fila, COL_ESTADO).Value = estado
    ws.Cells(fila, COL_MSG).Value    = msg
    ws.Cells(fila, COL_POS).Value    = pos
End Sub

Function IIf(c, a, b)
    If c Then IIf = a Else IIf = b
End Function
