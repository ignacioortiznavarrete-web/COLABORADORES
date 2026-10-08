Attribute VB_Name = "CierrePedidosME22N"
'==============================================================================
' Modulo VBA: CierrePedidosME22N
' Cierra OCs en ME22N marcando "Entrega final" (EKPO-ELIKZ) en TODAS las
' posiciones de cada pedido, sin importar cuantas posiciones tenga.
'
' Hoja activa:
'   Columna A : Numero de OC (desde la fila 2; la fila 1 es encabezado)
'   Columna B : Estado            (lo escribe la macro)
'   Columna C : Mensaje SAP       (lo escribe la macro)
'   Columna D : Posiciones        (lo escribe la macro: marcadas / total)
'
' Uso: importar este .bas en el Excel (Alt+F11 > Archivo > Importar archivo),
'      abrir SAP GUI con sesion iniciada, pararse en la hoja con las OC y
'      ejecutar la macro "CerrarPedidos". Probar primero con 1 OC.
'==============================================================================
Option Explicit

Private Const FILA_INICIO As Long = 2
Private Const COL_OC As Long = 1
Private Const COL_ESTADO As Long = 2
Private Const COL_MSG As Long = 3
Private Const COL_POS As Long = 4
Private Const GUARDAR As Boolean = True    ' False = marca pero NO guarda (solo prueba)

Private session As Object
Private ws As Worksheet

Public Sub CerrarPedidos()
    Dim SapGuiAuto As Object, sapApp As Object, connection As Object
    Dim fila As Long, total As Long, ok As Long, errores As Long
    Dim oc As String

    '--- Conexion a SAP -------------------------------------------------------
    On Error Resume Next
    Set SapGuiAuto = GetObject("SAPGUI")
    If Err.Number <> 0 Then
        MsgBox "No se encontro SAP GUI abierto.", vbCritical
        Exit Sub
    End If
    Set sapApp = SapGuiAuto.GetScriptingEngine
    Set connection = sapApp.Children(0)
    Set session = connection.Children(0)
    If Err.Number <> 0 Then
        MsgBox "No hay una sesion de SAP activa (o scripting deshabilitado).", vbCritical
        Exit Sub
    End If
    On Error GoTo 0
    session.findById("wnd[0]").maximize

    '--- Hoja con las OC ------------------------------------------------------
    Set ws = ActiveSheet

    fila = FILA_INICIO
    Do While Trim(CStr(ws.Cells(fila, COL_OC).Value)) <> ""
        total = total + 1
        fila = fila + 1
    Loop

    If total = 0 Then
        MsgBox "No hay OC en la columna A desde la fila " & FILA_INICIO, vbExclamation
        Exit Sub
    End If

    If MsgBox("Se cerraran " & total & " OC en SAP (" & IIf(GUARDAR, "GUARDANDO", "SIN GUARDAR - prueba") & ")." & vbCrLf & _
              "Continuar?", vbYesNo + vbQuestion, "Cierre de pedidos") <> vbYes Then
        Exit Sub
    End If

    ws.Cells(1, COL_ESTADO).Value = "Estado"
    ws.Cells(1, COL_MSG).Value = "Mensaje SAP"
    ws.Cells(1, COL_POS).Value = "Posiciones"

    fila = FILA_INICIO
    Do While Trim(CStr(ws.Cells(fila, COL_OC).Value)) <> ""
        oc = Trim(CStr(ws.Cells(fila, COL_OC).Value))
        ws.Cells(fila, COL_ESTADO).Value = "Procesando..."
        Application.StatusBar = "Cerrando OC " & oc & " (" & (fila - FILA_INICIO + 1) & " de " & total & ")"
        DoEvents
        If CerrarOC(oc, fila) Then
            ok = ok + 1
        Else
            errores = errores + 1
        End If
        fila = fila + 1
    Loop

    Application.StatusBar = False
    MsgBox "Proceso terminado." & vbCrLf & "OK: " & ok & vbCrLf & "Con error/revisar: " & errores, vbInformation
End Sub

'==============================================================================
' Cierra todas las posiciones de una OC. Devuelve True si quedo OK.
'==============================================================================
Private Function CerrarOC(ByVal oc As String, ByVal fila As Long) As Boolean
    Dim combo As Object, chk As Object
    Dim claves() As String, i As Long, n As Long, marcadas As Long
    Dim sinCheck As String, msg As String, tipo As String

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
    Next i

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
    Next i

    ' Guardar
    If GUARDAR Then
        session.findById("wnd[0]/tbar[0]/btn[11]").press
        msg = CerrarPopups()
        tipo = session.findById("wnd[0]/sbar").MessageType
        msg = Trim(msg & " " & LeerBarra())
    Else
        tipo = "S": msg = "Modo prueba: no se guardo"
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
        Escribir fila, IIf(sinCheck = "", "OK", "REVISAR"), msg, marcadas & " / " & n
        CerrarOC = True
    Else
        Escribir fila, "REVISAR", msg, marcadas & " / " & n
    End If
End Function

'--- Busca un control por nombre dentro de la pantalla (independiente de la ruta)
Private Function Buscar(ByVal nombre As String, ByVal tipo As String) As Object
    Dim o As Object
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
Private Sub SeleccionarPestanaEntrega()
    Dim tb As Object
    Set tb = Buscar("TABIDT6", "GuiTab")
    If Not tb Is Nothing Then
        On Error Resume Next
        tb.Select
        On Error GoTo 0
    End If
End Sub

'--- Cierra popups (confirmaciones de grabado, avisos) y devuelve su texto
Private Function CerrarPopups() As String
    Dim intentos As Long, txt As String
    Do While session.Children.Count > 1 And intentos < 5
        On Error Resume Next
        txt = txt & "[" & session.ActiveWindow.Text & "] "
        session.ActiveWindow.sendVKey 0          ' Enter = boton por defecto (Si)
        On Error GoTo 0
        intentos = intentos + 1
    Loop
    CerrarPopups = txt
End Function

Private Function LeerBarra() As String
    LeerBarra = session.findById("wnd[0]/sbar").Text
End Function

Private Sub Escribir(ByVal fila As Long, ByVal estado As String, ByVal msg As String, ByVal pos As String)
    ws.Cells(fila, COL_ESTADO).Value = estado
    ws.Cells(fila, COL_MSG).Value = msg
    ws.Cells(fila, COL_POS).Value = pos
End Sub
