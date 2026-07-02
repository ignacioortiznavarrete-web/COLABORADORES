Option Explicit
Dim SapGuiAuto, application, connection, session, contrato, items
Set SapGuiAuto = GetObject("SAPGUI")
Set application = SapGuiAuto.GetScriptingEngine
Set connection = application.Children(0)
Set session = connection.Children(0)

' ============ PEDIR EL CONTRATO MARCO ============
contrato = Trim(InputBox("Pegue el numero del contrato marco (46xxxxxxxx) del proveedor:" & vbCrLf & vbCrLf & "JHON ENRIQUE ELGUETA GARCES", "Contrato marco para el pedido 48"))
If contrato = "" Then WScript.Quit
contrato = Replace(Replace(contrato, " ", ""), vbTab, "")
If Len(contrato) <> 10 Or Left(contrato, 2) <> "46" Or Not IsNumeric(contrato) Then
    If MsgBox("El numero ingresado (" & contrato & ") no parece un contrato 46xxxxxxxx de 10 digitos." & vbCrLf & "Continuar de todas formas?", vbYesNo + vbExclamation, "Verificar contrato") = vbNo Then WScript.Quit
End If

' Posiciones del pedido: posicion del contrato y cantidad
items = Array( _
Array("10", "17"), _
Array("20", "27"), _
Array("30", "51"), _
Array("40", "80"), _
Array("50", "91"), _
Array("60", "86"), _
Array("70", "63"), _
Array("80", "39"), _
Array("90", "34"), _
Array("100", "28"), _
Array("110", "24"), _
Array("120", "19"), _
Array("130", "18"), _
Array("140", "17"), _
Array("150", "16") _
)

session.findById("wnd[0]").maximize
session.findById("wnd[0]/tbar[0]/okcd").text = "/nME21N"
session.findById("wnd[0]").sendVKey 0
Call ClosePopups()
WaitSeconds 1

Call FillItems(items)
session.findById("wnd[0]").sendVKey 0
Call ClosePopups()
MsgBox "Pedido con referencia al contrato " & contrato & " cargado con " & (UBound(items)+1) & " posiciones (contrato+posicion+cantidad; material, precio y centro los trae SAP desde el contrato)." & vbCrLf & "Revise las posiciones y los mensajes de SAP. Si esta correcto, presione GUARDAR manualmente.", 64, "Revision manual"

' ================= FUNCIONES =================

' Escribe en cada fila de la tabla de posiciones de ME21N el numero de
' contrato marco, la posicion del contrato y la cantidad. SAP completa el
' resto de los datos desde el contrato.
Sub FillItems(arr)
Dim tbl, i, r, firstRow, vis, colKonnr, colKtpnr, colMenge
Set tbl = GetItemsTable()
If tbl Is Nothing Then
    MsgBox "No se encontro la tabla de posiciones de ME21N. No se cargo ninguna posicion. Abra ME21N con la vista de posiciones visible y vuelva a ejecutar.", 48, "Error"
    WScript.Quit 1
End If
Call MapColumns(tbl, colKonnr, colKtpnr, colMenge)
If colKonnr < 0 Or colMenge < 0 Then
    MsgBox "No se encontraron las columnas Acuerdo/Cantidad en la tabla de posiciones de ME21N. No se cargo ninguna posicion." & vbCrLf & "Agregue las columnas Acuerdo marco y Posicion de acuerdo a la variante de la tabla.", 48, "Error"
    WScript.Quit 1
End If
For i = 0 To UBound(arr)
    Set tbl = GetItemsTable()
    If tbl Is Nothing Then
        MsgBox "Se perdio la tabla de posiciones en la fila " & (i+1) & ". Revise lo cargado antes de guardar.", 48, "Error"
        Exit Sub
    End If
    vis = tbl.VisibleRowCount
    firstRow = tbl.VerticalScrollbar.Position
    If (i - firstRow) > (vis - 1) Or (i - firstRow) < 0 Then
        tbl.VerticalScrollbar.Position = i
        Call ClosePopups()
        Set tbl = GetItemsTable()
        firstRow = tbl.VerticalScrollbar.Position
    End If
    r = i - firstRow
    SetCell tbl, r, colKonnr, contrato
    If colKtpnr >= 0 Then SetCell tbl, r, colKtpnr, arr(i)(0)
    SetCell tbl, r, colMenge, arr(i)(1)
Next
End Sub

' Busca recursivamente la tabla de posiciones de ME21N (SAPLMEGUITC_1211),
' porque el numero de subpantalla cambia segun el estado de la transaccion.
Function GetItemsTable()
Set GetItemsTable = FindTableRec(session.findById("wnd[0]/usr"))
End Function

Function FindTableRec(node)
Dim i, child, found, cnt
Set FindTableRec = Nothing
On Error Resume Next
cnt = -1
cnt = node.Children.Count
On Error GoTo 0
If cnt < 1 Then Exit Function
For i = 0 To cnt - 1
    Set child = node.Children(i)
    If InStr(child.Id, "tblSAPLMEGUITC_1211") > 0 Then
        Set FindTableRec = child
        Exit Function
    End If
    Set found = FindTableRec(child)
    If Not found Is Nothing Then
        Set FindTableRec = found
        Exit Function
    End If
Next
End Function

' Ubica las columnas por el nombre tecnico del campo de cada celda
Sub MapColumns(tbl, colKonnr, colKtpnr, colMenge)
On Error Resume Next
Dim c, nm, total
colKonnr = -1
colKtpnr = -1
colMenge = -1
total = tbl.Columns.Count
For c = 0 To total - 1
    nm = ""
    Err.Clear
    nm = UCase(tbl.GetCell(0, c).Name)
    If Err.Number = 0 And nm <> "" Then
        If colKonnr < 0 And InStr(nm, "KONNR") > 0 Then colKonnr = c
        If colKtpnr < 0 And InStr(nm, "KTPNR") > 0 Then colKtpnr = c
        If colMenge < 0 And InStr(nm, "MENGE") > 0 Then colMenge = c
    End If
Next
On Error GoTo 0
End Sub

Sub SetCell(tbl, r, c, value)
On Error Resume Next
tbl.GetCell(r, c).Text = value
On Error GoTo 0
End Sub

' Cierra ventanas emergentes informativas (mensajes de SAP) con Enter
Sub ClosePopups()
On Error Resume Next
Dim n
For n = 1 To 3
    Err.Clear
    session.findById("wnd[1]").sendVKey 0
    If Err.Number <> 0 Then Exit For
    WaitSeconds 0.3
Next
On Error GoTo 0
End Sub

Sub WaitSeconds(segundos)
Dim t
 t = Timer + segundos
 Do While Timer < t
 Loop
End Sub
