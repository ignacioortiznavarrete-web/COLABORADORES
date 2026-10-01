' =====================================================================
'  MACRO VBA - PEDIDOS ABIERTOS (ME31K) Y PEDIDOS (ME21N) - v15
'  v15: validez de cabecera (In.per.validez / Fin per.validez) verificada
'  v14: tolerancia de exceso (Tol.exc.sum.) 99,9 y texto de posicion
'       (Calidad) en TODAS las posiciones, con verificacion y reintento
'  Graba automaticamente el contrato y captura el numero solo
'  Las posiciones se escriben DIRECTO en la tabla (sin Ctrl+V)
' ---------------------------------------------------------------------
'  INSTALACION:
'   1. Alt+F11 > borrar el modulo anterior > Insertar > Modulo
'   2. Pegar este codigo completo y guardar como .xlsm
'   3. Ejecutar: Alt+F8 > "Principal"
' =====================================================================

Option Explicit

' ============================ CONSTANTES =============================
Const HOJA As String = "Hoja1"

Const CLASE_CONTRATO As String = "WK"
Const ORG_COMPRAS As String = "TCMA"
Const GRUPO_COMPRAS As String = "628"
Const CENTRO As String = "TCP1"
Const ALMACEN As String = "PAN1"
Const GRUPO_ARTICULO As String = "X1000"
Const TIPO_PEDIDO As String = "NB"
Const TOL_EXCESO As String = "99,9"    ' Tol.exc.sum. de cada posicion (pestana Entrega)
Const PREFIJO_TEXTO As String = ""     ' Antepone algo al texto de posicion (ej: "Calidad ")
Const NODO_TEXTO_POS As String = "F01" ' Nodo "Texto de posicion" en la pestana Textos
Const GUARDAR_AUTO As Boolean = True   ' True = graba solo y captura el nro
                                       ' False = tu revisas y grabas manual
Const INTERVALO_POS As Long = 10       ' Numeracion de posiciones del contrato (10,20,30...)
Const MENU_AGREEMENT As String = "005056919D5C1FD1A1C23CF8DF8390EDNEW:AGREEMENT_QUERY"

' Columnas de la planilla
Const C_MAT = 1: Const C_PRE = 2: Const C_CAN = 3: Const C_UMP = 4
Const C_PRV = 5: Const C_VAL = 6: Const C_MON = 7: Const C_PED = 8
Const C_CAL = 9                    ' Columna I: Calidad (texto de posicion)
Const C_OC = 10                    ' Columna J: Numero de oc

' ========================== VARIABLES GLOBALES =======================
Dim session As Object
Dim ws As Worksheet
Dim fIni As Date, fFin As Date
Dim d1 As String, d2 As String
Dim mapCampos(0 To 80) As String   ' relacion columna->campo de la grilla ME21N

' ============================== MAIN =================================
Sub Principal()
    Dim opcion As String
    opcion = InputBox("Que deseas ejecutar?" & vbCrLf & vbCrLf & _
                      "1 = Crear PEDIDOS ABIERTOS (ME31K)" & vbCrLf & _
                      "2 = Crear PEDIDOS DE COMPRA (ME21N)" & vbCrLf & _
                      "3 = Ambos", "Pedidos SAP", "1")
    If opcion = "" Then Exit Sub

    Set ws = ThisWorkbook.Sheets(HOJA)

    fIni = DateSerial(Year(Date), Month(Date) + 1, 1)
    fFin = DateSerial(Year(Date), Month(Date) + 2, 0)
    d1 = FSap(fIni)
    d2 = FSap(fFin)

    If Not ConectarSAP Then Exit Sub

    Select Case opcion
        Case "1": ProcesarBloques "CONTRATO"
        Case "2": ProcesarBloques "PEDIDO"
        Case "3": ProcesarBloques "CONTRATO": ProcesarBloques "PEDIDO"
        Case Else: MsgBox "Opcion no valida.", vbExclamation: Exit Sub
    End Select

    ThisWorkbook.Save
    MsgBox "Proceso finalizado.", vbInformation
End Sub

' =====================================================================
'                            RUTINAS BASE
' =====================================================================
Function FSap(d As Date) As String
    FSap = Right("0" & Day(d), 2) & "." & Right("0" & Month(d), 2) & "." & Year(d)
End Function

Function FNum(v As Variant) As String
    FNum = Replace(CStr(v), ".", ",")
End Function

Function ConectarSAP() As Boolean
    Dim SapGuiAuto As Object, app As Object, conn As Object
    ConectarSAP = False
    On Error Resume Next
    Set SapGuiAuto = GetObject("SAPGUI")
    If SapGuiAuto Is Nothing Then
        MsgBox "SAP GUI no esta abierto.", vbCritical
        Exit Function
    End If
    Set app = SapGuiAuto.GetScriptingEngine
    Set conn = app.Children(0)
    Set session = conn.Children(0)
    On Error GoTo 0
    If session Is Nothing Then
        MsgBox "No hay sesion SAP activa o el scripting esta deshabilitado.", vbCritical
        Exit Function
    End If
    ConectarSAP = True
End Function

Sub WaitSeconds(segundos As Double)
    Dim t As Double
    t = Timer + segundos
    Do While Timer < t
        DoEvents
    Loop
End Sub

' Espera a que SAP termine de procesar (max 30 s) y deja un respiro
Sub EsperarSAP()
    Dim t As Double
    t = Timer + 30
    On Error Resume Next
    Do While session.Busy And Timer < t
        DoEvents
    Loop
    On Error GoTo 0
    WaitSeconds 0.3
End Sub

Sub SetText(id As String, valor As String)
    On Error Resume Next
    session.findById(id).Text = valor
    On Error GoTo 0
End Sub

Sub TrySelect(id As String)
    On Error Resume Next
    session.findById(id).Selected = True
    On Error GoTo 0
End Sub

' Busca la tabla de posiciones de ME31K probando los nombres conocidos
Function GetTablaME31K() As Object
    Dim nombres As Variant, i As Long, t As Object
    nombres = Array("wnd[0]/usr/tblSAPMM06ETC_0220", _
                    "wnd[0]/usr/tblSAPMM06ETC_0120", _
                    "wnd[0]/usr/tblSAPMM06ETC_0201", _
                    "wnd[0]/usr/tblSAPMM06ETCTRL_0220")
    For i = 0 To UBound(nombres)
        On Error Resume Next
        Set t = Nothing
        Set t = session.findById(CStr(nombres(i)))
        On Error GoTo 0
        If Not t Is Nothing Then
            Set GetTablaME31K = t
            Exit Function
        End If
    Next i
    Set GetTablaME31K = Nothing
End Function

' Indice de columna de una tabla SAP por nombre de campo (-1 si no esta)
' Lee el nombre desde las celdas de la primera fila (compatible con
' todas las versiones de SAP GUI)
Function ColTbl(tbl As Object, nombre As String) As Long
    Dim c As Long, nm As String
    ColTbl = -1
    For c = 0 To 80
        nm = ""
        On Error Resume Next
        nm = tbl.GetCell(0, c).Name
        On Error GoTo 0
        If nm = "" Then Exit For          ' no hay mas columnas
        If InStr(nm, nombre) > 0 Then
            ColTbl = c
            Exit Function
        End If
    Next c
End Function

' ---------------------------------------------------------------------
' Recorre la planilla y procesa cada bloque (sin limite de bloques)
' ---------------------------------------------------------------------
Sub ProcesarBloques(modo As String)
    Dim fila As Long, ultFila As Long, iniBloque As Long, finBloque As Long
    ultFila = ws.Cells(ws.Rows.Count, C_MAT).End(xlUp).Row
    fila = 1
    Do While fila <= ultFila
        If UCase(Trim(CStr(ws.Cells(fila, C_MAT).Value))) = "MATERIAL" Then
            iniBloque = fila + 1
            finBloque = iniBloque
            Do While Trim(CStr(ws.Cells(finBloque, C_MAT).Value)) <> "" _
                     And UCase(Trim(CStr(ws.Cells(finBloque, C_MAT).Value))) <> "MATERIAL"
                finBloque = finBloque + 1
            Loop
            finBloque = finBloque - 1

            If modo = "CONTRATO" Then
                CrearContrato iniBloque, finBloque
            Else
                CrearPedido iniBloque, finBloque
            End If
            fila = finBloque + 1
        Else
            fila = fila + 1
        End If
    Loop
End Sub

' ---------------------------------------------------------------------
' FASE 1: PEDIDO ABIERTO (ME31K) - escritura directa en la tabla
' ---------------------------------------------------------------------
Sub CrearContrato(f1 As Long, f2 As Long)
    Dim proveedor As String, moneda As String, valTotal As String
    Dim i As Long, nro As String

    proveedor = Trim(CStr(ws.Cells(f1, C_PRV).Value))
    valTotal = FNum(ws.Cells(f1, C_VAL).Value)
    moneda = Trim(CStr(ws.Cells(f1, C_MON).Value))

    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME31K"
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 0.7

    ' ---- Pantalla inicial ----
    SetText "wnd[0]/usr/ctxtEKKO-LIFNR", proveedor
    SetText "wnd[0]/usr/ctxtRM06E-EVART", CLASE_CONTRATO
    SetText "wnd[0]/usr/ctxtEKKO-EKORG", ORG_COMPRAS
    SetText "wnd[0]/usr/ctxtRM06E-EKORG", ORG_COMPRAS
    SetText "wnd[0]/usr/ctxtEKKO-EKGRP", GRUPO_COMPRAS
    SetText "wnd[0]/usr/ctxtRM06E-EKGRP", GRUPO_COMPRAS
    SetText "wnd[0]/usr/ctxtRM06E-WERKS", CENTRO
    SetText "wnd[0]/usr/ctxtRM06E-LGORT", ALMACEN
    SetText "wnd[0]/usr/ctxtRM06E-MATKL", GRUPO_ARTICULO
    SetText "wnd[0]/usr/ctxtEKPO-WERKS", CENTRO
    SetText "wnd[0]/usr/ctxtEKPO-LGORT", ALMACEN
    SetText "wnd[0]/usr/ctxtEKPO-MATKL", GRUPO_ARTICULO

    SetText "wnd[0]/usr/txtEKKO-KTWRT", valTotal
    SetText "wnd[0]/usr/txtRM06E-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtEKKO-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtRM06E-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtEKKO-WAERS", moneda
    SetText "wnd[0]/usr/ctxtRM06E-WAERS", moneda
    TrySelect "wnd[0]/usr/chkRM06E-KTWRT"
    TrySelect "wnd[0]/usr/chkEKKO-KTWRT"
    TrySelect "wnd[0]/usr/chkRM06E-XOBLR"
    TrySelect "wnd[0]/usr/chkRM06E-XOBL"
    TrySelect "wnd[0]/usr/chkRM06E-XOBLK"

    ' Fecha de contrato: 1er dia mes siguiente (cambiar d1 por d2 si va el ultimo)
    SetText "wnd[0]/usr/ctxtRM06E-VEDAT", d1
    SetText "wnd[0]/usr/ctxtRM06E-KDATB", d1
    SetText "wnd[0]/usr/ctxtRM06E-KDATE", d2
    SetText "wnd[0]/usr/ctxtEKKO-KDATB", d1
    SetText "wnd[0]/usr/ctxtEKKO-KDATE", d2
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1

    ' ---- Pantalla cabecera: repetir fechas/valor (como tu script) ----
    SetText "wnd[0]/usr/ctxtRM06E-KDATB", d1
    SetText "wnd[0]/usr/ctxtRM06E-KDATE", d2
    SetText "wnd[0]/usr/ctxtEKKO-KDATB", d1
    SetText "wnd[0]/usr/ctxtEKKO-KDATE", d2
    SetText "wnd[0]/usr/txtEKKO-KTWRT", valTotal
    SetText "wnd[0]/usr/txtRM06E-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtEKKO-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtRM06E-KTWRT", valTotal
    SetText "wnd[0]/usr/ctxtEKKO-WAERS", moneda
    SetText "wnd[0]/usr/ctxtRM06E-WAERS", moneda
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1

    ' ---- Posiciones: escritura DIRECTA en la tabla ----
    Dim tbl As Object, colMat As Long, colCtd As Long, colUm As Long, colPrc As Long
    Dim filasVis As Long, pos As Long, filaTbl As Long

    Set tbl = GetTablaME31K()
    If tbl Is Nothing Then
        ' quizas la tabla aparece tras otro Enter
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 1
        Set tbl = GetTablaME31K()
    End If
    If tbl Is Nothing Then
        MsgBox "No encontre la tabla de posiciones de ME31K en pantalla." & vbCrLf & _
               "Revisa en que pantalla quedo SAP y avisame.", vbCritical
        Exit Sub
    End If

    colMat = ColTbl(tbl, "EKPO-EMATN")
    If colMat = -1 Then colMat = ColTbl(tbl, "EKPO-MATNR")
    colCtd = ColTbl(tbl, "EKPO-KTMNG")     ' Ctd.prevista
    If colCtd = -1 Then colCtd = ColTbl(tbl, "EKPO-MENGE")
    colUm = ColTbl(tbl, "EKPO-MEINS")      ' UMP (opcional)
    colPrc = ColTbl(tbl, "EKPO-NETPR")     ' Prc.neto

    filasVis = tbl.VisibleRowCount
    pos = 0
    For i = f1 To f2
        filaTbl = pos - tbl.VerticalScrollbar.Position
        If filaTbl >= filasVis Then
            ' pasar pagina: confirmar lo escrito y bajar el scroll
            session.findById("wnd[0]").sendVKey 0
            WaitSeconds 0.5
            Set tbl = GetTablaME31K()
            tbl.VerticalScrollbar.Position = pos
            WaitSeconds 0.3
            Set tbl = GetTablaME31K()
            filaTbl = pos - tbl.VerticalScrollbar.Position
        End If
        tbl.GetCell(filaTbl, colMat).Text = Trim(CStr(ws.Cells(i, C_MAT).Value))
        If colCtd >= 0 Then tbl.GetCell(filaTbl, colCtd).Text = FNum(ws.Cells(i, C_CAN).Value)
        If colUm >= 0 Then tbl.GetCell(filaTbl, colUm).Text = Trim(CStr(ws.Cells(i, C_UMP).Value))
        If colPrc >= 0 Then tbl.GetCell(filaTbl, colPrc).Text = FNum(ws.Cells(i, C_PRE).Value)
        pos = pos + 1
    Next i

    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 0.5

    ' ---- Grabar (automatico o manual segun GUARDAR_AUTO) ----
    If GUARDAR_AUTO Then
        GrabarYCapturar f1, proveedor, moneda
    Else
        MsgBox "Bloque del proveedor " & proveedor & " (" & moneda & ") cargado con " & (f2 - f1 + 1) & " posiciones." & vbCrLf & vbCrLf & _
               "1. Revisa en SAP: materiales, cantidades, UMP y precios." & vbCrLf & _
               "2. Si esta correcto, GRABA en SAP (Ctrl+S) y espera el mensaje con el numero." & vbCrLf & _
               "3. Recien entonces presiona Aceptar aqui.", _
               vbInformation, "Revision manual - Pedido Abierto"

        nro = ExtraerNumero(session.findById("wnd[0]/sbar").Text)
        If nro <> "" Then
            ws.Cells(f1, C_PED).Value = nro
            ThisWorkbook.Save
        Else
            nro = InputBox("No pude capturar el numero automaticamente." & vbCrLf & _
                           "Mensaje SAP: " & session.findById("wnd[0]/sbar").Text & vbCrLf & vbCrLf & _
                           "Escribe el numero del contrato manualmente (o deja vacio para omitir):", _
                           "Numero de Pedido Abierto")
            If Trim(nro) <> "" Then
                ws.Cells(f1, C_PED).Value = Trim(nro)
                ThisWorkbook.Save
            End If
        End If
    End If
End Sub

' ---------------------------------------------------------------------
' Graba el contrato (Ctrl+S), confirma popups/avisos y captura el nro
' ---------------------------------------------------------------------
Sub GrabarYCapturar(f1 As Long, proveedor As String, moneda As String)
    Dim nro As String, intento As Long, w1 As Object, sbarTxt As String

    session.findById("wnd[0]/tbar[0]/btn[11]").press   ' Grabar
    WaitSeconds 1

    ' Confirmar popups (advertencias, mensajes, "grabar de todos modos")
    For intento = 1 To 6
        Set w1 = Nothing
        On Error Resume Next
        Set w1 = session.findById("wnd[1]")
        On Error GoTo 0
        If w1 Is Nothing Then Exit For
        On Error Resume Next
        session.findById("wnd[1]/usr/btnSPOP-OPTION1").press      ' Si / Grabar
        Set w1 = Nothing
        Set w1 = session.findById("wnd[1]")
        If Not w1 Is Nothing Then session.findById("wnd[1]/tbar[0]/btn[0]").press  ' Enter/Continuar
        On Error GoTo 0
        WaitSeconds 0.5
    Next intento

    ' Advertencias en la barra de estado: pasar con Enter hasta obtener el nro
    For intento = 1 To 6
        sbarTxt = session.findById("wnd[0]/sbar").Text
        nro = ExtraerNumero(sbarTxt)
        If nro <> "" Then Exit For
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 0.7
    Next intento

    If nro <> "" Then
        ws.Cells(f1, C_PED).Value = nro
        ThisWorkbook.Save
    Else
        nro = InputBox("No pude capturar el numero del contrato del proveedor " & proveedor & " (" & moneda & ")." & vbCrLf & _
                       "Mensaje SAP: " & sbarTxt & vbCrLf & vbCrLf & _
                       "Revisa en SAP que se haya grabado. Escribe el numero aqui (o deja vacio para omitir):", _
                       "Numero de Pedido Abierto")
        If Trim(nro) <> "" Then
            ws.Cells(f1, C_PED).Value = Trim(nro)
            ThisWorkbook.Save
        End If
    End If
End Sub

' ---------------------------------------------------------------------
' FASE 2: PEDIDO DE COMPRA (ME21N) - replica del flujo grabado:
' copia el pedido abierto desde el Resumen de documentos, completa
' cantidades, fecha entrega, validez, tolerancia 99,9 y texto Calidad
' ---------------------------------------------------------------------
' Busca un control probando los numeros de dynpro de SAPLMEGUI (00xx)
Function FindIdVar(template As String) As Object
    Dim nums As Variant, i As Long, o As Object
    nums = Array("0010", "0013", "0014", "0015", "0016", "0017", "0019")
    For i = 0 To UBound(nums)
        On Error Resume Next
        Set o = Nothing
        Set o = session.findById(Replace(template, "{N}", CStr(nums(i))))
        On Error GoTo 0
        If Not o Is Nothing Then
            Set FindIdVar = o
            Exit Function
        End If
    Next i
    Set FindIdVar = Nothing
End Function

Sub PressVar(template As String)
    Dim o As Object
    Set o = FindIdVar(template)
    If Not o Is Nothing Then
        On Error Resume Next
        o.press
        On Error GoTo 0
    End If
End Sub

Sub CrearPedido(f1 As Long, f2 As Long)
    Dim calidad As String, contrato As String, proveedor As String, moneda As String
    Dim i As Long, n As Long, o As Object, nItems As Long

    proveedor = Trim(CStr(ws.Cells(f1, C_PRV).Value))
    calidad = Trim(CStr(ws.Cells(f1, C_CAL).Value))
    contrato = Trim(CStr(ws.Cells(f1, C_PED).Value))
    moneda = Trim(CStr(ws.Cells(f1, C_MON).Value))
    nItems = f2 - f1 + 1

    If contrato = "" Then
        MsgBox "El bloque de la fila " & f1 & " no tiene numero de Pedido Abierto. Se omite.", vbExclamation
        Exit Sub
    End If

    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME21N"
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1.5

    ' Expandir el resumen de posiciones si esta cerrado (como en tu grabacion)
    PressVar "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB1:SAPLMEVIEWS:4002/btnDYN_4000-BUTTON"
    WaitSeconds 0.8

    ' ---- Llenar TODA la grilla antes del primer Enter (tu metodo) ----
    ' Columnas segun tu grabacion: EMATN=4, MENGE=6, MEINS=7, NETPR=10,
    ' WAERS=11, KONNR=27, KTPNR=28. Si la variante cambia, se detectan solas.
    Dim tbl As Object, filasVis As Long, scrollPos As Long, filaVis As Long
    Set tbl = FindIdVar("wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211")
    If tbl Is Nothing Then
        MsgBox "No encontre la grilla de posiciones de ME21N.", vbExclamation
        Exit Sub
    End If
    filasVis = tbl.VisibleRowCount
    scrollPos = 0

    Dim cEMATN As Long, cMENGE As Long, cMEINS As Long, cNETPR As Long
    Dim cWAERS As Long, cKONNR As Long, cKTPNR As Long, cEEIND As Long
    cEMATN = DescubrirCol("ctxtMEPO1211-EMATN", 4)
    cMENGE = DescubrirCol("txtMEPO1211-MENGE", 6)
    cMEINS = DescubrirCol("ctxtMEPO1211-MEINS", 7)
    cNETPR = DescubrirCol("txtMEPO1211-NETPR", 10)
    cWAERS = DescubrirCol("txtMEPO1211-WAERS", 11)
    cKONNR = DescubrirCol("ctxtMEPO1211-KONNR", 27)
    cKTPNR = DescubrirCol("txtMEPO1211-KTPNR", 28)
    cEEIND = DescubrirCol("ctxtMEPO1211-EEIND", 9)

    If cKONNR = -1 Then
        MsgBox "No pude ubicar la columna Contrato marco (Convenio) en la grilla." & vbCrLf & _
               "Verifica que la variante 'Convenio' este activa en Parametrizaciones de tabla.", vbCritical
        Exit Sub
    End If

    For i = f1 To f2
        n = i - f1                      ' indice de posicion (0,1,2...)
        filaVis = n - scrollPos
        If filaVis >= filasVis Then     ' pasar pagina si se acaban las filas visibles
            tbl.VerticalScrollbar.Position = n
            WaitSeconds 0.4
            Set tbl = FindIdVar("wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211")
            scrollPos = tbl.VerticalScrollbar.Position
            filaVis = n - scrollPos
        End If
        EscribirCelda cEMATN, filaVis, Trim(CStr(ws.Cells(i, C_MAT).Value)), "ctxt"
        EscribirCelda cMENGE, filaVis, FNum(ws.Cells(i, C_CAN).Value), "txt"
        EscribirCelda cMEINS, filaVis, Trim(CStr(ws.Cells(i, C_UMP).Value)), "ctxt"
        EscribirCelda cNETPR, filaVis, FNum(ws.Cells(i, C_PRE).Value), "txt"
        EscribirCelda cWAERS, filaVis, moneda, "txt"
        EscribirCelda cKONNR, filaVis, contrato, "ctxt"
        EscribirCelda cKTPNR, filaVis, CStr((n + 1) * INTERVALO_POS), "txt"
        If cEEIND >= 0 Then EscribirCelda cEEIND, filaVis, d2, "ctxt"   ' fecha entrega
    Next i

    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1.5
    ConfirmarPopups

    ' ---- Cabecera > Datos adicionales: In.per.validez / Fin per.validez ----
    Dim fallas As String
    If Not CompletarValidez() Then
        fallas = "Cabecera: In.per.validez " & d1 & " / Fin per.validez " & d2 & " no quedaron grabadas" & vbCrLf
    End If

    ' ---- Detalle por posicion: tolerancia 99,9 + texto de posicion ----
    ' Texto de cada posicion: columna I de esa fila; si esta vacia se usa
    ' la Calidad del bloque (primera fila), como viene en la planilla.
    Dim textos() As String
    ReDim textos(1 To nItems)
    For n = 1 To nItems
        textos(n) = Trim(CStr(ws.Cells(f1 + n - 1, C_CAL).Value))
        If textos(n) = "" Then textos(n) = calidad
        If textos(n) <> "" Then textos(n) = PREFIJO_TEXTO & textos(n)
    Next n

    fallas = fallas & CompletarPosiciones(nItems, textos)

    ' Volver a revisar la validez de cabecera antes de grabar (si se perdio, se reescribe)
    If InStr(fallas, "Cabecera:") = 0 Then
        If Not CompletarValidez() Then
            fallas = "Cabecera: In.per.validez " & d1 & " / Fin per.validez " & d2 & " no quedaron grabadas" & vbCrLf & fallas
        End If
    End If

    ' ---- Grabar ----
    If fallas <> "" Then
        If MsgBox("Pedido del proveedor " & proveedor & " (contrato " & contrato & "):" & vbCrLf & _
                  "no pude completar lo siguiente:" & vbCrLf & vbCrLf & fallas & vbCrLf & _
                  "Corrigelo a mano en SAP y presiona Aceptar para continuar," & vbCrLf & _
                  "o Cancelar para NO grabar este pedido.", _
                  vbExclamation + vbOKCancel, "Validez / Tolerancia / Texto de posicion") = vbCancel Then
            Exit Sub
        End If
    End If

    If GUARDAR_AUTO Then
        GrabarPedidoYCapturar f1, proveedor
    Else
        MsgBox "Pedido del proveedor " & proveedor & " listo. Revisa y GRABA (Ctrl+S), luego Aceptar.", _
               vbInformation, "Revision manual - Pedido"
    End If
End Sub

' Escribe en una celda de la grilla de ME21N por ID directo (como tu grabacion)
Sub EscribirCelda(col As Long, fila As Long, valor As String, tipo As String)
    If col < 0 Then Exit Sub
    Dim o As Object, campo As String
    campo = CampoDeCol(col)
    If campo = "" Then Exit Sub
    Set o = FindIdVar("wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/" & tipo & campo & "[" & col & "," & fila & "]")
    If Not o Is Nothing Then
        On Error Resume Next
        o.Text = valor
        On Error GoTo 0
    End If
End Sub

Function CampoDeCol(col As Long) As String
    CampoDeCol = mapCampos(col)
End Function

' Ubica la columna de un campo: prueba primero el indice de tu grabacion
' y si no coincide, escanea las columnas 0 a 60
Function DescubrirCol(campoConTipo As String, idxSugerido As Long) As Long
    Dim c As Long, o As Object, campo As String, tipo As String
    ' separar tipo (ctxt/txt) y nombre de campo
    If Left(campoConTipo, 4) = "ctxt" Then
        tipo = "ctxt": campo = Mid(campoConTipo, 5)
    Else
        tipo = "txt": campo = Mid(campoConTipo, 4)
    End If

    ' 1) probar el indice sugerido (el de tu grabacion)
    Set o = FindIdVar("wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/" & tipo & campo & "[" & idxSugerido & ",0]")
    If Not o Is Nothing Then
        mapCampos(idxSugerido) = campo
        DescubrirCol = idxSugerido
        Exit Function
    End If

    ' 2) escanear
    For c = 0 To 60
        Set o = FindIdVar("wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/" & tipo & campo & "[" & c & ",0]")
        If Not o Is Nothing Then
            mapCampos(c) = campo
            DescubrirCol = c
            Exit Function
        End If
    Next c
    DescubrirCol = -1
End Function

' =====================================================================
'   DETALLE DE POSICION (ME21N): tolerancia + texto, posicion por posicion
' ---------------------------------------------------------------------
'  Los controles se buscan por NOMBRE (FindByName), no por ID fijo, asi
'  no importa el numero de dynpro ni si SAP redibuja la pantalla.
'  Se hacen pasadas sobre todas las posiciones: en cada una se LEE lo que
'  quedo en SAP y solo se escribe lo que falta. Termina cuando una pasada
'  completa encuentra todo correcto. Devuelve la lista de lo que fallo.
' =====================================================================
Function CompletarPosiciones(nItems As Long, textos() As String) As String
    Const MAX_PASADAS As Long = 4          ' la ultima solo verifica
    Dim pasada As Long, n As Long, escribir As Boolean, fallas As String

    If Not AbrirDetallePosicion() Then
        CompletarPosiciones = "No pude abrir el detalle de posicion (Pos. 1 a " & nItems & ")." & vbCrLf
        Exit Function
    End If

    For pasada = 1 To MAX_PASADAS
        escribir = (pasada < MAX_PASADAS)
        fallas = ""
        For n = 1 To nItems
            If Not IrAPosicion(n) Then
                fallas = fallas & "Pos. " & n & ": no pude seleccionarla" & vbCrLf
            Else
                If Not ToleranciaOK(escribir) Then _
                    fallas = fallas & "Pos. " & n & ": Tol.exc.sum. distinta de " & TOL_EXCESO & vbCrLf
                If textos(n) <> "" Then
                    If Not TextoPosicionOK(textos(n), escribir) Then _
                        fallas = fallas & "Pos. " & n & ": texto de posicion distinto de '" & textos(n) & "'" & vbCrLf
                End If
            End If
        Next n
        If fallas = "" Then Exit For
    Next pasada

    ' dejar SAP en la posicion 1
    IrAPosicion 1
    CompletarPosiciones = fallas
End Function

' =====================================================================
'   CABECERA (ME21N): In.per.validez (KDATB) y Fin per.validez (KDATE)
' ---------------------------------------------------------------------
'  Misma idea que las posiciones: abrir la cabecera SOLO si esta cerrada,
'  buscar los campos por nombre, escribir, confirmar con Enter y releer.
' =====================================================================
Function CompletarValidez() As Boolean
    Dim pasada As Long
    For pasada = 1 To 3
        If ValidezCabeceraOK(pasada < 3) Then
            CompletarValidez = True
            Exit Function
        End If
    Next pasada
    CompletarValidez = False
End Function

Function DetalleCabecera() As Object
    Set DetalleCabecera = BuscarCtrl("HEADER_DETAIL", "GuiTabStrip")
End Function

' Abre la cabecera SOLO si esta cerrada (el boton abre/cierra)
Function AbrirCabecera() As Boolean
    Dim intento As Long
    For intento = 1 To 2
        If Not DetalleCabecera() Is Nothing Then
            AbrirCabecera = True
            Exit Function
        End If
        PressVar "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB1:SAPLMEVIEWS:1100/subSUB1:SAPLMEVIEWS:4000/btnDYN_4000-BUTTON"
        EsperarSAP
    Next intento
    AbrirCabecera = Not DetalleCabecera() Is Nothing
End Function

' Deja en pantalla la pestana de cabecera que contiene el campo de validez.
' Prueba primero "Datos adicionales" (TABHDT7, tu grabacion) y si no esta
' ahi, recorre todas las pestanas de la cabecera.
Function PestanaValidez() As Object
    Dim det As Object, pest As Object, i As Long, nTabs As Long, nombre As String

    Set det = DetalleCabecera()
    If det Is Nothing Then Exit Function

    ' 1) la pestana ya visible o TABHDT7
    If Not BuscarCtrl("MEPO1229-KDATB", "GuiCTextField", det) Is Nothing Then
        Set PestanaValidez = det
        Exit Function
    End If
    Set pest = BuscarCtrl("TABHDT7", "GuiTab", det)
    If Not pest Is Nothing Then
        On Error Resume Next
        pest.Select
        On Error GoTo 0
        EsperarSAP
        Set det = DetalleCabecera()
        If Not det Is Nothing Then
            If Not BuscarCtrl("MEPO1229-KDATB", "GuiCTextField", det) Is Nothing Then
                Set PestanaValidez = det
                Exit Function
            End If
        End If
    End If

    ' 2) recorrer todas las pestanas
    Set det = DetalleCabecera()
    If det Is Nothing Then Exit Function
    On Error Resume Next
    nTabs = det.Children.Count
    On Error GoTo 0
    For i = 0 To nTabs - 1
        Set det = DetalleCabecera()
        If det Is Nothing Then Exit Function
        nombre = ""
        On Error Resume Next
        nombre = det.Children.Item(i).Name
        det.Children.Item(i).Select
        On Error GoTo 0
        EsperarSAP
        Set det = DetalleCabecera()
        If Not det Is Nothing Then
            If Not BuscarCtrl("MEPO1229-KDATB", "GuiCTextField", det) Is Nothing Then
                Set PestanaValidez = det
                Exit Function
            End If
        End If
    Next i
End Function

' True si KDATB = d1 y KDATE = d2. Si no y escribir=True, las escribe,
' confirma con Enter y devuelve False para que la siguiente pasada relea.
Function ValidezCabeceraOK(escribir As Boolean) As Boolean
    Dim det As Object, oIni As Object, oFin As Object
    ValidezCabeceraOK = False
    If Not AbrirCabecera() Then Exit Function
    Set det = PestanaValidez()
    If det Is Nothing Then Exit Function

    Set oIni = BuscarCtrl("MEPO1229-KDATB", "GuiCTextField", det)
    Set oFin = BuscarCtrl("MEPO1229-KDATE", "GuiCTextField", det)
    If oIni Is Nothing Or oFin Is Nothing Then Exit Function

    If Trim(oIni.Text) = d1 And Trim(oFin.Text) = d2 Then
        ValidezCabeceraOK = True
        Exit Function
    End If
    If escribir Then
        On Error Resume Next
        oIni.Text = d1
        oFin.Text = d2
        oFin.SetFocus
        session.findById("wnd[0]").sendVKey 0
        On Error GoTo 0
        EsperarSAP
        ConfirmarPopups
    End If
End Function

' Busca un control por nombre dentro de un contenedor (o en toda la pantalla)
Function BuscarCtrl(nombre As String, tipo As String, Optional dentroDe As Object = Nothing) As Object
    Dim o As Object
    On Error Resume Next
    If dentroDe Is Nothing Then
        Set o = session.findById("wnd[0]/usr").FindByName(nombre, tipo)
    Else
        Set o = dentroDe.FindByName(nombre, tipo)
    End If
    On Error GoTo 0
    Set BuscarCtrl = o
End Function

' Pestanas del detalle de posicion (Entrega, Textos, ...)
Function DetallePosicion() As Object
    Set DetallePosicion = BuscarCtrl("ITEM_DETAIL", "GuiTabStrip")
End Function

' Abre el detalle de posicion SOLO si esta cerrado. El boton es tipo
' interruptor (abre/cierra), por eso no se presiona a ciegas.
Function AbrirDetallePosicion() As Boolean
    Dim intento As Long
    For intento = 1 To 2
        If Not DetallePosicion() Is Nothing Then
            AbrirDetallePosicion = True
            Exit Function
        End If
        PressVar "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB1:SAPLMEVIEWS:4002/btnDYN_4000-BUTTON"
        EsperarSAP
    Next intento
    AbrirDetallePosicion = Not DetallePosicion() Is Nothing
End Function

' Selecciona la posicion numPos (1,2,3...) en el combo del detalle y
' verifica que quedo seleccionada
Function IrAPosicion(numPos As Long) As Boolean
    Dim cmb As Object, clave As String, intento As Long
    IrAPosicion = False
    For intento = 1 To 2
        Set cmb = BuscarCtrl("DYN_6000-LIST", "GuiComboBox")
        If cmb Is Nothing Then
            If Not AbrirDetallePosicion() Then Exit Function
            Set cmb = BuscarCtrl("DYN_6000-LIST", "GuiComboBox")
            If cmb Is Nothing Then Exit Function
        End If
        clave = ""
        On Error Resume Next
        If numPos <= cmb.Entries.Count Then clave = cmb.Entries.Item(numPos - 1).Key
        On Error GoTo 0
        If clave = "" Then Exit Function          ' la posicion no existe

        On Error Resume Next
        If cmb.Key <> clave Then
            cmb.Key = clave
            EsperarSAP
            ConfirmarPopups
        End If
        Set cmb = BuscarCtrl("DYN_6000-LIST", "GuiComboBox")
        If Not cmb Is Nothing Then IrAPosicion = (cmb.Key = clave)
        On Error GoTo 0
        If IrAPosicion Then Exit Function
    Next intento
End Function

' Selecciona una pestana del detalle de posicion (TABIDT6=Entrega, TABIDT14=Textos)
Function SelecPestana(nombrePestana As String) As Object
    Dim det As Object, pest As Object
    Set det = DetallePosicion()
    If det Is Nothing Then Exit Function
    Set pest = BuscarCtrl(nombrePestana, "GuiTab", det)
    If pest Is Nothing Then Exit Function
    On Error Resume Next
    If Not pest.Selected Then
        pest.Select
        EsperarSAP
    End If
    On Error GoTo 0
    ' devolver la pestana ya redibujada
    Set det = DetallePosicion()
    If Not det Is Nothing Then Set SelecPestana = BuscarCtrl(nombrePestana, "GuiTab", det)
End Function

Function ToleranciaEsCorrecta(valor As String) As Boolean
    ToleranciaEsCorrecta = (Replace(Trim(valor), ".", ",") = TOL_EXCESO)
End Function

' Pestana Entrega > Tol.exc.sum. (MEPO1313-UEBTO) de la posicion actual.
' Devuelve True si ya tiene TOL_EXCESO; si no, la escribe (si escribir=True)
' y devuelve False para que la siguiente pasada la verifique.
Function ToleranciaOK(escribir As Boolean) As Boolean
    Dim pest As Object, o As Object
    ToleranciaOK = False
    Set pest = SelecPestana("TABIDT6")
    If pest Is Nothing Then Exit Function
    Set o = BuscarCtrl("MEPO1313-UEBTO", "GuiTextField", pest)
    If o Is Nothing Then Exit Function

    If ToleranciaEsCorrecta(o.Text) Then
        ToleranciaOK = True
        Exit Function
    End If
    If escribir Then
        On Error Resume Next
        o.SetFocus
        o.Text = TOL_EXCESO
        o.caretPosition = Len(TOL_EXCESO)
        On Error GoTo 0
    End If
End Function

' Pestana Textos > nodo "Texto de posicion" de la posicion actual.
' Misma logica que ToleranciaOK.
Function TextoPosicionOK(valor As String, escribir As Boolean) As Boolean
    Dim pest As Object, cc As Object, arbol As Object, ed As Object, leido As String
    TextoPosicionOK = False
    Set pest = SelecPestana("TABIDT14")
    If pest Is Nothing Then Exit Function

    ' seleccionar el nodo "Texto de posicion" en el arbol de textos
    Set cc = BuscarCtrl("TEXT_TYPES_0200", "GuiCustomControl", pest)
    If Not cc Is Nothing Then
        On Error Resume Next
        Set arbol = cc.findById("shell")
        If Not arbol Is Nothing Then
            If arbol.selectedNode <> NODO_TEXTO_POS Then
                arbol.selectedNode = NODO_TEXTO_POS
                EsperarSAP
            End If
        End If
        On Error GoTo 0
        Set pest = SelecPestana("TABIDT14")      ' re-leer tras el redibujo
        If pest Is Nothing Then Exit Function
    End If

    ' editor de texto
    Set cc = BuscarCtrl("TEXT_EDITOR_0201", "GuiCustomControl", pest)
    If cc Is Nothing Then Exit Function
    On Error Resume Next
    Set ed = cc.findById("shellcont/shell")
    On Error GoTo 0
    If ed Is Nothing Then Exit Function

    leido = ""
    On Error Resume Next
    leido = ed.Text
    On Error GoTo 0
    If Trim(Replace(Replace(leido, vbCr, ""), vbLf, "")) = valor Then
        TextoPosicionOK = True
        Exit Function
    End If
    If escribir Then
        On Error Resume Next
        ed.SetFocus
        ed.Text = valor & vbCr
        ed.setSelectionIndexes 1, 1
        On Error GoTo 0
    End If
End Function

' Confirma ventanas emergentes informativas si aparecen
Sub ConfirmarPopups()
    Dim intento As Long, w1 As Object
    For intento = 1 To 4
        Set w1 = Nothing
        On Error Resume Next
        Set w1 = session.findById("wnd[1]")
        On Error GoTo 0
        If w1 Is Nothing Then Exit For
        On Error Resume Next
        session.findById("wnd[1]/tbar[0]/btn[0]").press
        On Error GoTo 0
        WaitSeconds 0.4
    Next intento
End Sub

' Graba el pedido, confirma popups y muestra/almacena el numero
Sub GrabarPedidoYCapturar(f1 As Long, proveedor As String)
    Dim nro As String, intento As Long, w1 As Object, sbarTxt As String

    session.findById("wnd[0]/tbar[0]/btn[11]").press
    WaitSeconds 1.5

    For intento = 1 To 6
        Set w1 = Nothing
        On Error Resume Next
        Set w1 = session.findById("wnd[1]")
        On Error GoTo 0
        If w1 Is Nothing Then Exit For
        On Error Resume Next
        session.findById("wnd[1]/usr/btnSPOP-OPTION1").press
        Set w1 = Nothing
        Set w1 = session.findById("wnd[1]")
        If Not w1 Is Nothing Then session.findById("wnd[1]/tbar[0]/btn[0]").press
        On Error GoTo 0
        WaitSeconds 0.5
    Next intento

    For intento = 1 To 6
        sbarTxt = session.findById("wnd[0]/sbar").Text
        nro = ExtraerNumero(sbarTxt)
        If nro <> "" Then Exit For
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 0.7
    Next intento

    If nro <> "" Then
        ws.Cells(f1, C_OC).Value = nro         ' columna J: numero del pedido creado
        ThisWorkbook.Save
    Else
        MsgBox "No pude confirmar el numero del pedido del proveedor " & proveedor & "." & vbCrLf & _
               "Mensaje SAP: " & sbarTxt & vbCrLf & "Revisa en SAP si quedo grabado.", vbExclamation
    End If
End Sub

Function ExtraerNumero(txt As String) As String
    Dim re As Object, m As Object
    Set re = CreateObject("VBScript.RegExp")
    re.Pattern = "\d{7,}"
    re.Global = False
    If re.Test(txt) Then
        Set m = re.Execute(txt)
        ExtraerNumero = m(0).Value
    Else
        ExtraerNumero = ""
    End If
End Function
