Attribute VB_Name = "ZCMMD001"
Option Explicit

Private Const TX_INGRESO As String = "ZCMMD001"
Private Const HOJA_DATOS As String = "Hoja1"
Private Const FILA_INICIO As Long = 2
Private Const SEG_ESPERA As Long = 60
Private Const PANE_ANCHO As Long = 139
Private Const PANE_ALTO As Long = 37

Private Const ID_TIPO_RECEP As String = "wnd[0]/usr/txtTIPO_RECEP"
Private Const ID_GUIA As String = "wnd[0]/usr/txtXGUIA"
Private Const ID_OC As String = "wnd[0]/usr/ctxtEKKO-EBELN"
Private Const ID_FECHA As String = "wnd[0]/usr/ctxt*EKPO-AEDAT"
Private Const ID_PATENTE As String = "wnd[0]/usr/txtXPATEN"
Private Const ID_ROL As String = "wnd[0]/usr/txt*ZTMMMD001-ROL_PRE"
Private Const ID_GRID As String = "wnd[0]/usr/cntlBCALV_GRID_DEMO_0100_CONT1/shellcont/shell"
Private Const ID_SBAR As String = "wnd[0]/sbar"
Private Const ID_OKCD As String = "wnd[0]/tbar[0]/okcd"

Private Const BTN_GRABAR_1 As String = "wnd[0]/tbar[1]/btn[6]"
Private Const BTN_GRABAR_2 As String = "wnd[0]/tbar[1]/btn[7]"

Private Const RADIO_TIPO_1 As String = ""
Private Const RADIO_TIPO_2 As String = ""
Private Const RADIO_TIPO_3 As String = "wnd[0]/usr/radMCON"
Private Const TIPO_MATERIAL_DEFECTO As Long = 3

Private Const COL_TIPO_RECEP As String = "A"
Private Const COL_GUIA As String = "B"
Private Const COL_OC As String = "C"
Private Const COL_FECHA As String = "D"
Private Const COL_PATENTE As String = "E"
Private Const COL_ROL As String = "F"
Private Const COL_CALIDAD As String = "G"
Private Const COL_CATEGORIA As String = "H"
Private Const COL_LARGO As String = "I"
Private Const COL_DIAMETRO As String = "J"
Private Const COL_TROZO As String = "K"
Private Const COL_DOC As String = "L"
Private Const COL_TIPO_MATERIAL As String = "M"

Public Sub Cargar_Guias_SAP()

    Dim session As Object
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim ultimaFila As Long
    Dim fila As Long
    Dim filaInicio As Long
    Dim filaFin As Long
    Dim mensajeError As String
    Dim respuesta As VbMsgBoxResult
    Dim grabadas As Long
    Dim omitidas As Long
    Dim conError As Long
    Dim detalleConexion As String

    On Error GoTo ErrorGeneral

    Set wb = ActiveWorkbook

    On Error Resume Next
    Set ws = wb.Worksheets(HOJA_DATOS)
    On Error GoTo ErrorGeneral

    If ws Is Nothing Then
        MsgBox "No se encontró la hoja " & HOJA_DATOS & ".", vbCritical
        Exit Sub
    End If

    ultimaFila = UltimaFilaDatos(ws)

    If ultimaFila < FILA_INICIO Then
        MsgBox "No existen registros para procesar.", vbExclamation
        Exit Sub
    End If

    Set session = ConectarSAP(detalleConexion)

    If session Is Nothing Then
        MsgBox "No fue posible conectarse a SAP." & vbCrLf & vbCrLf & detalleConexion, _
               vbCritical, "Conexión SAP"
        Exit Sub
    End If

    If MsgBox("Sistema SAP: " & DatoSesion(session, "SystemName") & vbCrLf & _
              "Mandante: " & DatoSesion(session, "Client") & vbCrLf & _
              "Usuario: " & DatoSesion(session, "User") & vbCrLf & vbCrLf & _
              "¿Es el ambiente correcto?", _
              vbYesNo + vbQuestion, "Confirmar ambiente SAP") <> vbYes Then
        Exit Sub
    End If

    If Not AbrirTransaccion(session) Then
        MsgBox "No fue posible ingresar a " & TX_INGRESO & "." & vbCrLf & vbCrLf & _
               DescripcionPantalla(session), vbCritical
        Exit Sub
    End If

    Application.EnableEvents = False

    fila = FILA_INICIO

    Do While fila <= ultimaFila

        If Trim(CStr(ws.Cells(fila, COL_GUIA).Value)) <> "" Then

            filaInicio = fila
            filaFin = filaInicio

            Do While filaFin < ultimaFila

                If Trim(CStr(ws.Cells(filaFin + 1, COL_GUIA).Value)) <> "" Then
                    Exit Do
                End If

                If Application.WorksheetFunction.CountA( _
                    ws.Range(COL_CALIDAD & (filaFin + 1) & ":" & COL_TROZO & (filaFin + 1))) = 0 Then
                    Exit Do
                End If

                filaFin = filaFin + 1

            Loop

            If EsDocumentoGuardado(ws.Cells(filaInicio, COL_DOC).Value) Then

                omitidas = omitidas + 1

            Else

                mensajeError = ""

                If ProcesarGuiaSAP( _
                    session, _
                    ws, _
                    filaInicio, _
                    filaFin, _
                    mensajeError) Then

                    grabadas = grabadas + 1

                Else

                    conError = conError + 1

                    EscribirResultado ws, filaInicio, _
                        "ERROR - " & Replace(mensajeError, vbCrLf, " | ")

                    wb.Save

                    respuesta = MsgBox( _
                        "Error procesando guía " & _
                        CStr(ws.Cells(filaInicio, COL_GUIA).Value) & _
                        vbCrLf & vbCrLf & _
                        mensajeError & _
                        vbCrLf & vbCrLf & _
                        "¿Desea continuar con la siguiente guía?", _
                        vbYesNo + vbExclamation)

                    If respuesta = vbNo Then
                        GoTo Salida
                    End If

                    If Not AbrirTransaccion(session) Then
                        MsgBox "No fue posible volver a " & TX_INGRESO & "." & vbCrLf & vbCrLf & _
                               DescripcionPantalla(session), vbCritical
                        GoTo Salida
                    End If

                End If

            End If

            fila = filaFin + 1

        Else

            fila = fila + 1

        End If

    Loop

    MsgBox "Proceso terminado." & vbCrLf & vbCrLf & _
           "Guías grabadas: " & grabadas & vbCrLf & _
           "Guías ya cargadas antes: " & omitidas & vbCrLf & _
           "Guías con error: " & conError, vbInformation

Salida:

    Application.EnableEvents = True

    Exit Sub

ErrorGeneral:

    Application.EnableEvents = True

    MsgBox _
        "Error " & Err.Number & vbCrLf & _
        Err.Description, _
        vbCritical

End Sub

Public Sub Probar_SAP()

    Dim session As Object
    Dim lista As Collection
    Dim detalle As String
    Dim detalleConexion As String
    Dim i As Long

    Set session = ConectarSAP(detalleConexion)

    If session Is Nothing Then
        MsgBox "No se pudo conectar a SAP." & vbCrLf & vbCrLf & detalleConexion, _
               vbCritical, "Conexión SAP"
        Exit Sub
    End If

    detalle = _
        "Sistema: " & DatoSesion(session, "SystemName") & vbCrLf & _
        "Mandante: " & DatoSesion(session, "Client") & vbCrLf & _
        "Usuario: " & DatoSesion(session, "User") & vbCrLf & _
        "Transacción: " & DatoSesion(session, "Transaction") & vbCrLf & _
        "Programa: " & DatoSesion(session, "Program") & vbCrLf & _
        "Dynpro: " & DatoSesion(session, "ScreenNumber") & vbCrLf & vbCrLf

    detalle = detalle & "Campo Tipo Recepción: " & _
        IIf(ExisteControlSAP(session, ID_TIPO_RECEP), "SÍ está", "NO está") & vbCrLf

    detalle = detalle & "Grilla de trozos: " & _
        IIf(ExisteControlSAP(session, ID_GRID), "SÍ está", "NO está") & vbCrLf & vbCrLf

    Set lista = RadiosDePantalla(session)

    If lista.Count = 0 Then

        detalle = detalle & "No hay opciones (radio buttons) en esta pantalla."

    Else

        detalle = detalle & "OPCIONES DE LA PANTALLA (en orden):" & vbCrLf

        For i = 1 To lista.Count
            detalle = detalle & vbCrLf & _
                i & ") " & TextoControl(lista(i)) & vbCrLf & _
                "     " & IdControl(lista(i))
        Next i

        detalle = detalle & vbCrLf & vbCrLf & _
            "Copie esos ID en RADIO_TIPO_1 / RADIO_TIPO_2 / RADIO_TIPO_3."

    End If

    detalle = detalle & vbCrLf & vbCrLf & "BOTONES DE GRABAR:" & vbCrLf & _
        BTN_GRABAR_1 & "  ->  " & TooltipControl(session, BTN_GRABAR_1) & vbCrLf & _
        BTN_GRABAR_2 & "  ->  " & TooltipControl(session, BTN_GRABAR_2)

    MsgBox detalle, vbInformation, "Diagnóstico SAP"

End Sub

Private Function ConectarSAP(ByRef detalle As String) As Object

    Dim SapGuiAuto As Object
    Dim applicationSAP As Object
    Dim connection As Object
    Dim session As Object
    Dim elegida As Object
    Dim conexiones As Long
    Dim sesiones As Long
    Dim i As Long
    Dim j As Long
    Dim txActual As String

    Set ConectarSAP = Nothing
    Set elegida = Nothing
    detalle = ""

    Set SapGuiAuto = Nothing

    On Error Resume Next
    Set SapGuiAuto = GetObject("SAPGUI")

    If Err.Number <> 0 Or SapGuiAuto Is Nothing Then
        detalle = _
            "Paso 1: GetObject(""SAPGUI"") devolvió error " & Err.Number & _
            " - " & Err.Description & vbCrLf & vbCrLf & _
            "Revise en este orden:" & vbCrLf & _
            "1) Que SAP Logon esté abierto y con la sesión iniciada." & vbCrLf & _
            "2) Que Excel y SAP corran con los mismos permisos. Si uno se abrió como " & _
            "administrador y el otro no, Windows no los deja verse entre ellos." & vbCrLf & _
            "3) SAP Logon > Opciones > Accesibilidad y scripting > Scripting > " & _
            "Habilitar scripting."
        Err.Clear
        Exit Function
    End If

    Err.Clear

    Set applicationSAP = Nothing
    Set applicationSAP = SapGuiAuto.GetScriptingEngine

    If Err.Number <> 0 Or applicationSAP Is Nothing Then
        detalle = _
            "Paso 2: GetScriptingEngine devolvió error " & Err.Number & _
            " - " & Err.Description & vbCrLf & vbCrLf & _
            "SAP responde, pero no entrega el motor de scripting. Normalmente es el " & _
            "scripting deshabilitado en el cliente:" & vbCrLf & _
            "SAP Logon > Opciones > Accesibilidad y scripting > Scripting > " & _
            "Habilitar scripting."
        Err.Clear
        Exit Function
    End If

    Err.Clear

    conexiones = -1
    conexiones = applicationSAP.Children.Count
    Err.Clear

    If conexiones < 1 Then
        detalle = _
            "Paso 3: SAP responde pero no hay ninguna conexión visible." & vbCrLf & vbCrLf & _
            "Casi siempre es el scripting deshabilitado en el servidor " & _
            "(parámetro sapgui/user_scripting = FALSE). Lo habilita Basis." & vbCrLf & _
            "También pasa si SAP Logon está abierto pero sin sesión iniciada."
        Exit Function
    End If

    For i = 0 To conexiones - 1

        Set connection = Nothing
        Set connection = applicationSAP.Children(i)
        Err.Clear

        If Not connection Is Nothing Then

            sesiones = -1
            sesiones = connection.Children.Count
            Err.Clear

            For j = 0 To sesiones - 1

                Set session = Nothing
                Set session = connection.Children(j)
                Err.Clear

                If Not session Is Nothing Then

                    txActual = ""
                    txActual = UCase(Trim(CStr(session.Info.Transaction)))
                    Err.Clear

                    If txActual = TX_INGRESO Then
                        Set ConectarSAP = session
                        Exit Function
                    End If

                    If elegida Is Nothing Then
                        Set elegida = session
                    End If

                End If

            Next j

        End If

    Next i

    If elegida Is Nothing Then
        detalle = _
            "Paso 4: hay " & conexiones & " conexión(es) de SAP, pero ninguna con una " & _
            "sesión utilizable desde scripting." & vbCrLf & vbCrLf & _
            "Inicie sesión en SAP y vuelva a ejecutar."
    Else
        Set ConectarSAP = elegida
    End If

    Err.Clear

End Function

Private Function AbrirTransaccion(ByVal session As Object) As Boolean

    On Error GoTo ErrorTX

    EsperarSAP session

    CerrarVentanasSAP session, 20, False

    On Error Resume Next
    session.findById("wnd[0]").resizeWorkingPane PANE_ANCHO, PANE_ALTO, False
    Err.Clear
    On Error GoTo ErrorTX

    session.findById(ID_OKCD).Text = "/n" & TX_INGRESO
    session.findById("wnd[0]").sendVKey 0

    EsperarSAP session

    CerrarVentanasSAP session, 20, False

    AbrirTransaccion = ExisteControlSAP(session, ID_TIPO_RECEP)

    Exit Function

ErrorTX:

    AbrirTransaccion = False

End Function

Private Function ProcesarGuiaSAP( _
    ByVal session As Object, _
    ByVal ws As Worksheet, _
    ByVal filaInicio As Long, _
    ByVal filaFin As Long, _
    ByRef mensajeError As String) As Boolean

    Dim grid As Object
    Dim tipoRecepcion As String
    Dim guia As String
    Dim oc As String
    Dim fecha As String
    Dim patente As String
    Dim rol As String
    Dim tipoMaterial As Long
    Dim valorTipo As Variant
    Dim filaExcel As Long
    Dim filaSAP As Long
    Dim etapa As String
    Dim mensajeSAP As String
    Dim documento As String
    Dim confirmar As VbMsgBoxResult
    Dim totalTrozos As Double

    On Error GoTo ErrorProceso

    etapa = "Abriendo " & TX_INGRESO

    If Not AbrirTransaccion(session) Then
        Err.Raise vbObjectError + 100, , _
            "No fue posible dejar la pantalla inicial de " & TX_INGRESO & "." & _
            vbCrLf & DescripcionPantalla(session)
    End If

    etapa = "Leyendo Tipo Recepción"
    tipoRecepcion = ValorTexto(ws.Cells(filaInicio, COL_TIPO_RECEP).Value)

    etapa = "Leyendo Guía"
    guia = ValorTexto(ws.Cells(filaInicio, COL_GUIA).Value)

    etapa = "Leyendo OC"
    oc = ValorTexto(ws.Cells(filaInicio, COL_OC).Value)

    etapa = "Leyendo Fecha"
    fecha = FechaSAP(ws.Cells(filaInicio, COL_FECHA).Value)

    etapa = "Leyendo Patente"
    patente = ValorTexto(ws.Cells(filaInicio, COL_PATENTE).Value)

    etapa = "Leyendo Rol"
    rol = ValorTexto(ws.Cells(filaInicio, COL_ROL).Value)

    etapa = "Leyendo Tipo Material"
    valorTipo = ws.Cells(filaInicio, COL_TIPO_MATERIAL).Value

    If IsError(valorTipo) Then
        Err.Raise vbObjectError + 101, , _
            "Tipo Material contiene un error."
    End If

    If Trim(CStr(valorTipo)) = "" Then

        tipoMaterial = TIPO_MATERIAL_DEFECTO

    Else

        If Not IsNumeric(valorTipo) Then
            Err.Raise vbObjectError + 102, , _
                "Tipo Material debe ser 1, 2 o 3 (llegó: " & CStr(valorTipo) & ")."
        End If

        tipoMaterial = CLng(valorTipo)

        If tipoMaterial < 1 Or tipoMaterial > 3 Then
            Err.Raise vbObjectError + 103, , _
                "Tipo Material inválido: " & tipoMaterial
        End If

    End If

    etapa = "Cargando Tipo Recepción"
    SetTextoSAP session, ID_TIPO_RECEP, tipoRecepcion

    etapa = "Cargando Guía"
    SetTextoSAP session, ID_GUIA, guia

    etapa = "Cargando OC"
    SetTextoSAP session, ID_OC, oc

    etapa = "Cargando Fecha"
    SetTextoSAP session, ID_FECHA, fecha

    etapa = "Cargando Patente"
    SetTextoSAP session, ID_PATENTE, patente

    etapa = "Cargando Rol"
    SetTextoSAP session, ID_ROL, rol

    etapa = "Validando cabecera"
    session.findById("wnd[0]").sendVKey 0

    EsperarSAP session

    CerrarVentanasSAP session, 60, True

    RevisarMensajeSAP session, "La cabecera fue rechazada por SAP"

    etapa = "Seleccionando Tipo Material"
    SeleccionarTipoMaterial session, tipoMaterial

    EsperarSAP session

    CerrarVentanasSAP session, 60, True

    etapa = "Buscando grilla"

    If Not ExisteControlSAP(session, ID_GRID) Then
        Err.Raise vbObjectError + 110, , _
            "No apareció la grilla de trozos." & vbCrLf & _
            "Revise la OC, el rol o el tipo de recepción." & vbCrLf & _
            DescripcionPantalla(session)
    End If

    Set grid = session.findById(ID_GRID)

    filaSAP = 0
    totalTrozos = 0

    For filaExcel = filaInicio To filaFin

        etapa = "Fila " & filaExcel & " de Excel, línea " & (filaSAP + 1) & " de la grilla"

        AsegurarFilaVisible grid, filaSAP

        grid.modifyCell _
            filaSAP, _
            "CALIDAD", _
            ValorTexto(ws.Cells(filaExcel, COL_CALIDAD).Value)

        grid.modifyCell _
            filaSAP, _
            "CATEGORIA", _
            ValorTexto(ws.Cells(filaExcel, COL_CATEGORIA).Value)

        grid.modifyCell _
            filaSAP, _
            "LARGO", _
            NumeroDecimalSAP(ws.Cells(filaExcel, COL_LARGO).Value)

        grid.modifyCell _
            filaSAP, _
            "DIAMETRO", _
            ValorTexto(ws.Cells(filaExcel, COL_DIAMETRO).Value)

        grid.modifyCell _
            filaSAP, _
            "TROZO", _
            ValorTexto(ws.Cells(filaExcel, COL_TROZO).Value)

        If IsNumeric(ws.Cells(filaExcel, COL_TROZO).Value) Then
            totalTrozos = totalTrozos + CDbl(ws.Cells(filaExcel, COL_TROZO).Value)
        End If

        filaSAP = filaSAP + 1

    Next filaExcel

    etapa = "Validando detalle"

    grid.currentCellColumn = "CALIDAD"
    grid.triggerModified

    EsperarSAP session

    etapa = "Aceptando validaciones"
    CerrarVentanasSAP session, 60, True

    RevisarMensajeSAP session, "Las líneas fueron rechazadas por SAP"

    etapa = "Confirmación de guardado"

    confirmar = MsgBox( _
        "Sistema SAP: " & DatoSesion(session, "SystemName") & vbCrLf & _
        "Mandante: " & DatoSesion(session, "Client") & vbCrLf & _
        "Transacción: " & TX_INGRESO & vbCrLf & vbCrLf & _
        "Guía: " & guia & vbCrLf & _
        "OC: " & oc & vbCrLf & _
        "Fecha: " & fecha & vbCrLf & _
        "Patente: " & patente & vbCrLf & _
        "Rol: " & rol & vbCrLf & _
        "Tipo Material: " & tipoMaterial & vbCrLf & _
        "Líneas: " & filaSAP & "    Trozos: " & totalTrozos & vbCrLf & _
        "Filas de Excel: " & filaInicio & " a " & filaFin & vbCrLf & vbCrLf & _
        "¿Está seguro de guardar esta recepción?", _
        vbYesNo + vbQuestion + vbDefaultButton2, _
        "Confirmar guardado SAP")

    If confirmar = vbNo Then

        EscribirResultado ws, filaInicio, "NO GUARDADO"
        ws.Parent.Save

        ProcesarGuiaSAP = True
        Exit Function

    End If

    etapa = "Guardando guía"

    If Not ExisteControlSAP(session, BTN_GRABAR_1) Then
        Err.Raise vbObjectError + 120, , _
            "No está el botón de grabar " & BTN_GRABAR_1 & " en esta pantalla."
    End If

    session.findById(BTN_GRABAR_1).Press

    EsperarSAP session

    etapa = "Buscando número de recepción"

    documento = CapturarRecepcionGuardada(session, mensajeSAP)

    RevisarMensajeSAP session, "SAP rechazó la grabación"

    If documento = "" Then

        If ExisteControlSAP(session, BTN_GRABAR_2) Then

            etapa = "Confirmando grabación"

            session.findById(BTN_GRABAR_2).Press

            EsperarSAP session

            documento = CapturarRecepcionGuardada(session, mensajeSAP)

            RevisarMensajeSAP session, "SAP rechazó la grabación"

        End If

    End If

    If documento <> "" Then

        EscribirResultado ws, filaInicio, documento

    ElseIf mensajeSAP <> "" Then

        EscribirResultado ws, filaInicio, _
            "GUARDADO - RECEPCIÓN NO DETECTADA | " & mensajeSAP

    Else

        EscribirResultado ws, filaInicio, _
            "GUARDADO - RECEPCIÓN NO DETECTADA"

    End If

    ws.Parent.Save

    ProcesarGuiaSAP = True

    Exit Function

ErrorProceso:

    mensajeError = _
        "ETAPA: " & etapa & vbCrLf & _
        "ERROR: " & Err.Number & vbCrLf & _
        Err.Description

    ProcesarGuiaSAP = False

End Function

Private Sub SetTextoSAP( _
    ByVal session As Object, _
    ByVal idControl As String, _
    ByVal valor As String)

    Dim control As Object

    Set control = Nothing

    On Error Resume Next
    Set control = session.findById(idControl)
    On Error GoTo 0

    If control Is Nothing Then
        Err.Raise vbObjectError + 400, , _
            "SAP no encontró el control:" & vbCrLf & idControl & vbCrLf & _
            "Puede que la pantalla no sea la inicial de " & TX_INGRESO & "."
    End If

    control.Text = valor

End Sub

Private Sub SeleccionarTipoMaterial( _
    ByVal session As Object, _
    ByVal tipoMaterial As Long)

    Dim idRadio As String
    Dim control As Object
    Dim lista As Collection

    If tipoMaterial < 1 Or tipoMaterial > 3 Then
        Err.Raise vbObjectError + 200, , "Tipo Material inválido."
    End If

    idRadio = IdRadioTipo(tipoMaterial)

    If idRadio <> "" Then

        If ExisteControlSAP(session, idRadio) Then

            Set control = session.findById(idRadio)
            control.Select
            control.SetFocus

            Exit Sub

        End If

    End If

    Set lista = RadiosDePantalla(session)

    If lista.Count = 0 Then
        Err.Raise vbObjectError + 201, , _
            "No se encontraron opciones (radio buttons) en la pantalla."
    End If

    If tipoMaterial > lista.Count Then
        Err.Raise vbObjectError + 202, , _
            "Se pidió el Tipo Material " & tipoMaterial & _
            " y la pantalla tiene " & lista.Count & " opciones."
    End If

    Set control = lista(tipoMaterial)

    control.Select
    control.SetFocus

End Sub

Private Function IdRadioTipo(ByVal tipoMaterial As Long) As String

    Select Case tipoMaterial
        Case 1
            IdRadioTipo = RADIO_TIPO_1
        Case 2
            IdRadioTipo = RADIO_TIPO_2
        Case 3
            IdRadioTipo = RADIO_TIPO_3
        Case Else
            IdRadioTipo = ""
    End Select

End Function

Private Function RadiosDePantalla(ByVal session As Object) As Collection

    Dim lista As Collection
    Dim contenedor As Object

    Set lista = New Collection
    Set contenedor = Nothing

    On Error Resume Next
    Set contenedor = session.findById("wnd[0]/usr")
    On Error GoTo 0

    If Not contenedor Is Nothing Then
        RecolectarRadios contenedor, lista, 0
    End If

    Set RadiosDePantalla = lista

End Function

Private Sub RecolectarRadios( _
    ByVal contenedor As Object, _
    ByVal lista As Collection, _
    ByVal nivel As Long)

    Dim total As Long
    Dim i As Long
    Dim hijo As Object
    Dim tipo As String
    Dim esContenedor As Boolean

    If nivel > 6 Then Exit Sub

    total = -1

    On Error Resume Next
    total = contenedor.Children.Count
    Err.Clear
    On Error GoTo 0

    If total < 1 Then Exit Sub

    For i = 0 To total - 1

        Set hijo = Nothing
        tipo = ""
        esContenedor = False

        On Error Resume Next
        Set hijo = contenedor.Children(i)
        tipo = hijo.Type
        esContenedor = hijo.ContainerType
        Err.Clear
        On Error GoTo 0

        If Not hijo Is Nothing Then

            If tipo = "GuiRadioButton" Then

                InsertarOrdenado lista, hijo

            ElseIf esContenedor Then

                If tipo <> "GuiShell" And tipo <> "GuiCustomControl" And tipo <> "GuiGridView" Then
                    RecolectarRadios hijo, lista, nivel + 1
                End If

            End If

        End If

    Next i

End Sub

Private Sub InsertarOrdenado( _
    ByVal lista As Collection, _
    ByVal control As Object)

    Dim i As Long

    For i = 1 To lista.Count

        If PosicionControl(control) < PosicionControl(lista(i)) Then
            lista.Add control, , i
            Exit Sub
        End If

    Next i

    lista.Add control

End Sub

Private Function PosicionControl(ByVal control As Object) As Double

    Dim arriba As Double
    Dim izquierda As Double

    arriba = 0
    izquierda = 0

    On Error Resume Next
    arriba = CDbl(control.Top)
    izquierda = CDbl(control.Left)
    Err.Clear
    On Error GoTo 0

    PosicionControl = arriba * 100000 + izquierda

End Function

Private Sub AsegurarFilaVisible( _
    ByVal grid As Object, _
    ByVal fila As Long)

    Dim primera As Long
    Dim visibles As Long

    primera = 0
    visibles = 0

    On Error Resume Next
    primera = grid.firstVisibleRow
    visibles = grid.visibleRowCount
    Err.Clear
    On Error GoTo 0

    If visibles < 1 Then Exit Sub

    If fila < primera Or fila > primera + visibles - 1 Then

        On Error Resume Next
        grid.firstVisibleRow = fila
        Err.Clear
        On Error GoTo 0

    End If

End Sub

Private Function CapturarRecepcionGuardada( _
    ByVal session As Object, _
    ByRef ultimoMensaje As String) As String

    Dim texto As String
    Dim documento As String
    Dim ventana As Object
    Dim intento As Long

    ultimoMensaje = ""

    For intento = 1 To 30

        EsperarSAP session

        texto = ObtenerTodosLosMensajesSAP(session)

        If Trim(texto) <> "" Then
            ultimoMensaje = Trim(texto)
        End If

        documento = ExtraerRecepcion50(texto)

        If documento <> "" Then

            CapturarRecepcionGuardada = documento

            CerrarVentanasSAP session, 20, False

            Exit Function

        End If

        Set ventana = VentanaSuperior(session)

        If ventana Is Nothing Then
            Exit For
        End If

        On Error Resume Next
        ventana.sendVKey 0
        Err.Clear
        On Error GoTo 0

        EsperarSAP session

    Next intento

    texto = ObtenerTodosLosMensajesSAP(session)

    If Trim(texto) <> "" Then
        ultimoMensaje = Trim(texto)
    End If

    CapturarRecepcionGuardada = ExtraerRecepcion50(texto)

End Function

Private Function ExtraerRecepcion50(ByVal texto As String) As String

    Dim regex As Object
    Dim resultados As Object

    Set regex = CreateObject("VBScript.RegExp")

    regex.Global = False
    regex.IgnoreCase = True
    regex.Pattern = "\b50[0-9]{4,12}\b"

    If regex.Test(texto) Then

        Set resultados = regex.Execute(texto)

        ExtraerRecepcion50 = resultados(0).Value

    Else

        ExtraerRecepcion50 = ""

    End If

End Function

Private Function ObtenerTodosLosMensajesSAP(ByVal session As Object) As String

    Dim resultado As String
    Dim ventana As Object
    Dim texto As String
    Dim i As Long

    resultado = ObtenerMensajeBarra(session)

    For i = 1 To 3

        Set ventana = Nothing

        On Error Resume Next
        Set ventana = session.findById("wnd[" & i & "]")
        Err.Clear
        On Error GoTo 0

        If Not ventana Is Nothing Then

            texto = ObtenerTextosObjetoSAP(ventana)

            If Trim(texto) <> "" Then
                resultado = resultado & " " & texto
            End If

        End If

    Next i

    ObtenerTodosLosMensajesSAP = Trim(resultado)

End Function

Private Function ObtenerMensajeBarra(ByVal session As Object) As String

    Dim barra As Object

    Set barra = Nothing

    On Error Resume Next
    Set barra = session.findById(ID_SBAR)
    Err.Clear
    On Error GoTo 0

    If barra Is Nothing Then

        ObtenerMensajeBarra = ""

    Else

        On Error Resume Next
        ObtenerMensajeBarra = Trim(CStr(barra.Text))
        Err.Clear
        On Error GoTo 0

    End If

End Function

Private Function TipoMensajeBarra(ByVal session As Object) As String

    Dim barra As Object

    Set barra = Nothing
    TipoMensajeBarra = ""

    On Error Resume Next
    Set barra = session.findById(ID_SBAR)
    If Not barra Is Nothing Then
        TipoMensajeBarra = UCase(Trim(CStr(barra.MessageType)))
    End If
    Err.Clear
    On Error GoTo 0

End Function

Private Sub RevisarMensajeSAP( _
    ByVal session As Object, _
    ByVal detalle As String)

    Dim tipo As String

    tipo = TipoMensajeBarra(session)

    If tipo = "E" Or tipo = "A" Then
        Err.Raise vbObjectError + 300, , _
            detalle & ":" & vbCrLf & ObtenerMensajeBarra(session)
    End If

End Sub

Private Function ObtenerTextosObjetoSAP(ByVal objeto As Object) As String

    Dim resultado As String
    Dim texto As String
    Dim hijo As Object
    Dim total As Long
    Dim i As Long

    resultado = ""
    texto = ""

    On Error Resume Next
    texto = CStr(objeto.Text)
    Err.Clear
    On Error GoTo 0

    If Trim(texto) <> "" Then
        resultado = Trim(texto)
    End If

    total = -1

    On Error Resume Next
    total = objeto.Children.Count
    Err.Clear
    On Error GoTo 0

    If total < 1 Then
        ObtenerTextosObjetoSAP = resultado
        Exit Function
    End If

    For i = 0 To total - 1

        Set hijo = Nothing

        On Error Resume Next
        Set hijo = objeto.Children(i)
        Err.Clear
        On Error GoTo 0

        If Not hijo Is Nothing Then

            texto = ObtenerTextosObjetoSAP(hijo)

            If Trim(texto) <> "" Then
                resultado = resultado & " " & texto
            End If

        End If

    Next i

    ObtenerTextosObjetoSAP = Trim(resultado)

End Function

Private Function VentanaSuperior(ByVal session As Object) As Object

    Dim ventana As Object
    Dim i As Long

    Set VentanaSuperior = Nothing

    For i = 3 To 1 Step -1

        Set ventana = Nothing

        On Error Resume Next
        Set ventana = session.findById("wnd[" & i & "]")
        Err.Clear
        On Error GoTo 0

        If Not ventana Is Nothing Then
            Set VentanaSuperior = ventana
            Exit Function
        End If

    Next i

End Function

Private Sub CerrarVentanasSAP( _
    ByVal session As Object, _
    ByVal limite As Long, _
    ByVal estricto As Boolean)

    Dim ventana As Object
    Dim contador As Long

    contador = 0

    Do

        Set ventana = VentanaSuperior(session)

        If ventana Is Nothing Then
            Exit Do
        End If

        On Error Resume Next
        ventana.sendVKey 0
        Err.Clear
        On Error GoTo 0

        EsperarSAP session

        contador = contador + 1

        If contador >= limite Then

            If estricto Then

                If Not VentanaSuperior(session) Is Nothing Then
                    Err.Raise vbObjectError + 501, , _
                        "Quedó una ventana de SAP que no se cierra con Enter:" & vbCrLf & _
                        ObtenerTextosObjetoSAP(VentanaSuperior(session))
                End If

            End If

            Exit Do

        End If

    Loop

End Sub

Private Function ExisteControlSAP( _
    ByVal session As Object, _
    ByVal idControl As String) As Boolean

    Dim control As Object

    Set control = Nothing

    On Error Resume Next
    Set control = session.findById(idControl)
    Err.Clear
    On Error GoTo 0

    ExisteControlSAP = Not control Is Nothing

End Function

Private Function DescripcionPantalla(ByVal session As Object) As String

    DescripcionPantalla = _
        "Pantalla actual: transacción " & DatoSesion(session, "Transaction") & _
        ", programa " & DatoSesion(session, "Program") & _
        ", dynpro " & DatoSesion(session, "ScreenNumber") & "."

End Function

Private Function DatoSesion( _
    ByVal session As Object, _
    ByVal propiedad As String) As String

    DatoSesion = ""

    On Error Resume Next

    Select Case propiedad
        Case "SystemName"
            DatoSesion = CStr(session.Info.SystemName)
        Case "Client"
            DatoSesion = CStr(session.Info.Client)
        Case "User"
            DatoSesion = CStr(session.Info.User)
        Case "Transaction"
            DatoSesion = CStr(session.Info.Transaction)
        Case "Program"
            DatoSesion = CStr(session.Info.Program)
        Case "ScreenNumber"
            DatoSesion = CStr(session.Info.ScreenNumber)
    End Select

    Err.Clear
    On Error GoTo 0

End Function

Private Function IdControl(ByVal control As Object) As String

    IdControl = ""

    On Error Resume Next
    IdControl = CStr(control.Id)
    Err.Clear
    On Error GoTo 0

End Function

Private Function TextoControl(ByVal control As Object) As String

    TextoControl = ""

    On Error Resume Next
    TextoControl = Trim(CStr(control.Text))
    Err.Clear
    On Error GoTo 0

End Function

Private Function TooltipControl( _
    ByVal session As Object, _
    ByVal idControl As String) As String

    Dim control As Object

    TooltipControl = "(no está en esta pantalla)"

    Set control = Nothing

    On Error Resume Next
    Set control = session.findById(idControl)
    If Not control Is Nothing Then
        TooltipControl = Trim(CStr(control.Text)) & " / " & Trim(CStr(control.Tooltip))
    End If
    Err.Clear
    On Error GoTo 0

End Function

Private Sub EsperarSAP(ByVal session As Object)

    Dim inicio As Double
    Dim ocupado As Boolean

    inicio = Timer

    Do

        DoEvents

        ocupado = False

        On Error Resume Next
        ocupado = session.Busy
        Err.Clear
        On Error GoTo 0

        If Not ocupado Then
            Exit Do
        End If

        If Timer < inicio Then
            inicio = Timer
        End If

        If Timer - inicio > SEG_ESPERA Then
            Err.Raise vbObjectError + 500, , _
                "SAP superó " & SEG_ESPERA & " segundos de espera."
        End If

    Loop

End Sub

Private Function UltimaFilaDatos(ByVal ws As Worksheet) As Long

    Dim porGuia As Long
    Dim porTrozo As Long

    porGuia = ws.Cells(ws.Rows.Count, COL_GUIA).End(xlUp).Row
    porTrozo = ws.Cells(ws.Rows.Count, COL_TROZO).End(xlUp).Row

    If porGuia > porTrozo Then
        UltimaFilaDatos = porGuia
    Else
        UltimaFilaDatos = porTrozo
    End If

End Function

Private Sub EscribirResultado( _
    ByVal ws As Worksheet, _
    ByVal fila As Long, _
    ByVal valor As String)

    ws.Cells(fila, COL_DOC).NumberFormat = "@"
    ws.Cells(fila, COL_DOC).Value = valor

End Sub

Private Function EsDocumentoGuardado(ByVal valor As Variant) As Boolean

    Dim texto As String

    EsDocumentoGuardado = False

    If IsError(valor) Then Exit Function
    If IsEmpty(valor) Then Exit Function

    texto = UCase(Trim(CStr(valor)))

    If texto = "" Then Exit Function

    If Left(texto, 8) = "GUARDADO" Then
        EsDocumentoGuardado = True
        Exit Function
    End If

    EsDocumentoGuardado = IsNumeric(Left(texto, 1))

End Function

Private Function FechaSAP(ByVal valor As Variant) As String

    If IsError(valor) Then
        Err.Raise vbObjectError + 600, , "La fecha contiene un error."
    End If

    If IsDate(valor) Then

        FechaSAP = Format(CDate(valor), "dd.mm.yyyy")

    Else

        FechaSAP = Trim(CStr(valor))
        FechaSAP = Replace(FechaSAP, "/", ".")
        FechaSAP = Replace(FechaSAP, "-", ".")

    End If

End Function

Private Function ValorTexto(ByVal valor As Variant) As String

    If IsError(valor) Then

        ValorTexto = ""

    ElseIf IsEmpty(valor) Then

        ValorTexto = ""

    ElseIf Trim(CStr(valor)) = "" Then

        ValorTexto = ""

    ElseIf IsNumeric(valor) Then

        If CDbl(valor) = Fix(CDbl(valor)) Then
            ValorTexto = Format(CDbl(valor), "0")
        Else
            ValorTexto = CStr(valor)
        End If

    Else

        ValorTexto = Trim(CStr(valor))

    End If

End Function

Private Function NumeroDecimalSAP(ByVal valor As Variant) As String

    Dim resultado As String
    Dim separadorDecimal As String
    Dim numero As Double

    If IsError(valor) Then
        Err.Raise vbObjectError + 700, , "El valor Largo contiene un error."
    End If

    If IsEmpty(valor) Then
        NumeroDecimalSAP = ""
        Exit Function
    End If

    If Trim(CStr(valor)) = "" Then
        NumeroDecimalSAP = ""
        Exit Function
    End If

    If Not IsNumeric(valor) Then
        Err.Raise vbObjectError + 701, , "Largo no es numérico: " & CStr(valor)
    End If

    numero = CDbl(valor)

    resultado = Format(numero, "0.00")

    separadorDecimal = Application.International(xlDecimalSeparator)

    If separadorDecimal <> "," Then
        resultado = Replace(resultado, separadorDecimal, ",")
    End If

    NumeroDecimalSAP = resultado

End Function
