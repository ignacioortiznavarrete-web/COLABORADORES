Option Explicit
Dim SapGuiAuto, application, connection, session, hoy, inicio, fin, d1, d2, items
Set SapGuiAuto = GetObject("SAPGUI")
Set application = SapGuiAuto.GetScriptingEngine
Set connection = application.Children(0)
Set session = connection.Children(0)
hoy = Date
inicio = DateSerial(Year(hoy), Month(hoy)+1, 1)
fin = DateSerial(Year(hoy), Month(hoy)+2, 0)
d1 = Right("0" & Day(inicio),2) & "." & Right("0" & Month(inicio),2) & "." & Year(inicio)
d2 = Right("0" & Day(fin),2) & "." & Right("0" & Month(fin),2) & "." & Year(fin)
session.findById("wnd[0]").maximize
session.findById("wnd[0]/tbar[0]/okcd").text = "/nME31K"
session.findById("wnd[0]").sendVKey 0
WaitSeconds 0.7
SetText "wnd[0]/usr/ctxtEKKO-LIFNR", "6000093261"
SetText "wnd[0]/usr/ctxtRM06E-EVART", "WK"
SetText "wnd[0]/usr/ctxtEKKO-EKORG", "TCMA"
SetText "wnd[0]/usr/ctxtRM06E-EKORG", "TCMA"
SetText "wnd[0]/usr/ctxtEKKO-EKGRP", "628"
SetText "wnd[0]/usr/ctxtRM06E-EKGRP", "628"
SetText "wnd[0]/usr/ctxtRM06E-WERKS", "TCP1"
SetText "wnd[0]/usr/ctxtRM06E-LGORT", "PAN1"
SetText "wnd[0]/usr/ctxtRM06E-MATKL", "X1000"
SetText "wnd[0]/usr/ctxtEKPO-WERKS", "TCP1"
SetText "wnd[0]/usr/ctxtEKPO-LGORT", "PAN1"
SetText "wnd[0]/usr/ctxtEKPO-MATKL", "X1000"

SetText "wnd[0]/usr/txtEKKO-KTWRT", "-2146,19"
SetText "wnd[0]/usr/txtRM06E-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtEKKO-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtRM06E-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtEKKO-WAERS", "CLP"
SetText "wnd[0]/usr/ctxtRM06E-WAERS", "CLP"
TrySelect "wnd[0]/usr/chkRM06E-KTWRT"
TrySelect "wnd[0]/usr/chkEKKO-KTWRT"
TrySelect "wnd[0]/usr/chkRM06E-XOBLR"
TrySelect "wnd[0]/usr/chkRM06E-XOBL"
TrySelect "wnd[0]/usr/chkRM06E-XOBLK"
SetText "wnd[0]/usr/ctxtRM06E-VEDAT", d2
SetText "wnd[0]/usr/ctxtRM06E-KDATB", d1
SetText "wnd[0]/usr/ctxtRM06E-KDATE", d2
SetText "wnd[0]/usr/ctxtEKKO-KDATB", d1
SetText "wnd[0]/usr/ctxtEKKO-KDATE", d2
session.findById("wnd[0]").sendVKey 0
Call ClosePopups()
WaitSeconds 1
SetText "wnd[0]/usr/ctxtRM06E-KDATB", d1
SetText "wnd[0]/usr/ctxtRM06E-KDATE", d2
SetText "wnd[0]/usr/ctxtEKKO-KDATB", d1
SetText "wnd[0]/usr/ctxtEKKO-KDATE", d2

SetText "wnd[0]/usr/txtEKKO-KTWRT", "-2146,19"
SetText "wnd[0]/usr/txtRM06E-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtEKKO-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtRM06E-KTWRT", "-2146,19"
SetText "wnd[0]/usr/ctxtEKKO-WAERS", "CLP"
SetText "wnd[0]/usr/ctxtRM06E-WAERS", "CLP"
TrySelect "wnd[0]/usr/chkRM06E-KTWRT"
TrySelect "wnd[0]/usr/chkEKKO-KTWRT"
TrySelect "wnd[0]/usr/chkRM06E-XOBLR"
TrySelect "wnd[0]/usr/chkRM06E-XOBL"
TrySelect "wnd[0]/usr/chkRM06E-XOBLK"

' Posiciones: material, cantidad, unidad, precio
items = Array( _
Array("TROZO16", "29", "M3", "-2,438"), _
Array("TROZO18", "60", "M3", "-2,436"), _
Array("TROZO20", "70", "M3", "-1,934"), _
Array("TROZO22", "96", "M3", "-1,431"), _
Array("TROZO24", "116", "M3", "-1,43"), _
Array("TROZO26", "149", "M3", "-1,429"), _
Array("TROZO28", "177", "M3", "-1,429"), _
Array("TROZO30", "150", "M3", "-1,429"), _
Array("TROZO32", "147", "M3", "-1,428"), _
Array("TROZO34", "118", "M3", "-1,427"), _
Array("TROZO36", "98", "M3", "-1,427"), _
Array("TROZO38", "86", "M3", "-1,427"), _
Array("TROZO40", "48", "M3", "-1,426"), _
Array("TROZO42", "39", "M3", "-1,425"), _
Array("TROZO44", "32", "M3", "-1,425") _
)

session.findById("wnd[0]").sendVKey 0
Call ClosePopups()
Call WaitSeconds(1)
Call FillItems(items)
session.findById("wnd[0]").sendVKey 0
Call ClosePopups()
MsgBox "Pedido cargado con encabezado, fechas, TCMA/628, TCP1/PAN1, X1000, Val.prev, moneda y " & (UBound(items)+1) & " posiciones escritas directamente en la tabla (sin portapapeles)." & vbCrLf & "Revise material, cantidad, UMP y precio. Si esta correcto, presione GUARDAR manualmente en SAP.", 64, "Revision manual"

' ================= FUNCIONES =================

' Escribe cada posicion directamente en su celda de la tabla de posiciones,
' fila por fila, desplazando la tabla con el scrollbar. Asi cada valor queda
' exactamente en la fila que corresponde y nada depende del foco ni del
' portapapeles.
Sub FillItems(arr)
Dim tbl, i, r, firstRow, vis, colMat, colQty, colUnit, colPrice
Set tbl = GetItemsTable()
If tbl Is Nothing Then
    MsgBox "No se encontro la tabla de posiciones de ME31K. No se cargo ninguna posicion. Verifique la pantalla y vuelva a ejecutar.", 48, "Error"
    WScript.Quit 1
End If
Call MapColumns(tbl, colMat, colQty, colUnit, colPrice)
If colMat < 0 Then
    MsgBox "No se encontro la columna de material en la tabla de posiciones. No se cargo ninguna posicion.", 48, "Error"
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
    SetCell tbl, r, colMat, arr(i)(0)
    If colQty >= 0 Then SetCell tbl, r, colQty, arr(i)(1)
    If colUnit >= 0 Then SetCell tbl, r, colUnit, arr(i)(2)
    If colPrice >= 0 Then SetCell tbl, r, colPrice, arr(i)(3)
Next
End Sub

Function GetItemsTable()
On Error Resume Next
Dim ids, i, o
Set GetItemsTable = Nothing
ids = Array( _
"wnd[0]/usr/tblSAPMM06ETC_0220", _
"wnd[0]/usr/tblSAPMM06ETC_0120", _
"wnd[0]/usr/tblSAPMM06ETC_0201" _
)
For i = 0 To UBound(ids)
    Err.Clear
    Set o = session.findById(ids(i))
    If Err.Number = 0 Then
        Set GetItemsTable = o
        Exit For
    End If
Next
On Error GoTo 0
End Function

' Ubica las columnas por el nombre tecnico del campo de cada celda,
' de modo que el script funcione aunque cambie el orden de columnas.
Sub MapColumns(tbl, colMat, colQty, colUnit, colPrice)
On Error Resume Next
Dim c, nm, total
colMat = -1
colQty = -1
colUnit = -1
colPrice = -1
total = tbl.Columns.Count
For c = 0 To total - 1
    nm = ""
    Err.Clear
    nm = UCase(tbl.GetCell(0, c).Name)
    If Err.Number = 0 And nm <> "" Then
        If colMat < 0 And (InStr(nm, "EMATN") > 0 Or InStr(nm, "MATNR") > 0) Then colMat = c
        If colQty < 0 And (InStr(nm, "KTMNG") > 0 Or InStr(nm, "MENGE") > 0) Then colQty = c
        If colUnit < 0 And (InStr(nm, "MEINS") > 0 Or InStr(nm, "BPRME") > 0) Then colUnit = c
        If colPrice < 0 And InStr(nm, "NETPR") > 0 Then colPrice = c
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

Sub TrySelect(id)
On Error Resume Next
session.findById(id).selected = True
On Error GoTo 0
End Sub

Sub SetText(id, value)
On Error Resume Next
session.findById(id).text = value
On Error GoTo 0
End Sub

Sub WaitSeconds(segundos)
Dim t
 t = Timer + segundos
 Do While Timer < t
 Loop
End Sub
