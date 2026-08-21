Option Explicit

'==============================================================================
'  ZCMMD001 - Carga de recepciones de trozos desde Excel (SAP GUI Scripting)
'------------------------------------------------------------------------------
'  Que hace:
'    1. Se conecta a la sesion SAP ya abierta y muestra sistema / mandante /
'       usuario para que confirmes que estas en el ambiente correcto (R3 PRD).
'    2. Lee el Excel con el formato de recepciones. Cada guia es un bloque:
'       la primera fila trae la cabecera + el primer trozo, las siguientes solo
'       traen trozos, y el bloque termina con una linea completamente en blanco.
'    3. Por cada guia: abre ZCMMD001 con /n, carga la cabecera, marca la opcion
'       del check list segun la columna "Tipo Material", llena la grilla,
'       PREGUNTA si estas seguro de grabar, graba y captura el N. de documento.
'    4. Escribe el documento (5000XXXXXX) en la columna "Doc." de la fila de
'       cabecera, guarda el Excel y salta a la guia siguiente.
'
'  Importante: el archivo esta escrito SIN tildes a proposito, para que funcione
'  igual sin importar como lo guarde el editor de texto. Los acentos de los
'  datos que vienen del Excel si se respetan.
'
'  Uso:  doble clic sobre el archivo
'        o bien:  cscript ZCMMD001_Recepciones.vbs "C:\ruta\OCTam.xlsx"
'==============================================================================


'============================== CONFIGURACION =================================

' --- Transaccion --------------------------------------------------------------
Const TRANSACCION   = "/nzcmmd001"

' --- Campos de la cabecera ----------------------------------------------------
Const ID_TIPO_RECEP = "wnd[0]/usr/txtTIPO_RECEP"
Const ID_GUIA       = "wnd[0]/usr/txtXGUIA"
Const ID_OC         = "wnd[0]/usr/ctxtEKKO-EBELN"
Const ID_FECHA      = "wnd[0]/usr/ctxt*EKPO-AEDAT"
Const ID_PATENTE    = "wnd[0]/usr/txtXPATEN"
Const ID_ROL        = "wnd[0]/usr/txt*ZTMMMD001-ROL_PRE"

' --- Grilla de trozos ---------------------------------------------------------
Const ID_GRID       = "wnd[0]/usr/cntlBCALV_GRID_DEMO_0100_CONT1/shellcont/shell"
Const GC_CALIDAD    = "CALIDAD"
Const GC_CATEGORIA  = "CATEGORIA"
Const GC_LARGO      = "LARGO"
Const GC_DIAMETRO   = "DIAMETRO"
Const GC_TROZO      = "TROZO"

' --- Botones de grabacion (los mismos de tu grabacion) ------------------------
Const BTN_GRABAR_1  = "wnd[0]/tbar[1]/btn[6]"
Const BTN_GRABAR_2  = "wnd[0]/tbar[1]/btn[7]"

' --- Check list: las 3 opciones ----------------------------------------------
'  ID_OPCION_3 es la que quedo en tu grabacion (radMCON = la 3ra opcion).
'  Para completar las otras dos: deja ZCMMD001 abierta en la pantalla donde
'  aparecen las 3 opciones, ejecuta ZCMMD001_Diagnostico.vbs y copia aqui los
'  IDs que salen en la seccion "OPCIONES (RADIO BUTTONS)" del TXT que genera.
'
'  Si dejas un ID en blanco el script igual funciona: selecciona la opcion por
'  POSICION en pantalla (1 = la de mas arriba, 2 = la del medio, 3 = la ultima).
Const ID_OPCION_1    = ""
Const ID_OPCION_2    = ""
Const ID_OPCION_3    = "wnd[0]/usr/radMCON"

' Opcion que se usa cuando la columna "Tipo Material" viene vacia.
Const OPCION_DEFECTO = 3

' --- Varios -------------------------------------------------------------------
Const MAX_POPUPS     = 300   ' tope de ventanas emergentes por guia
Const PANE_ANCHO     = 139   ' resizeWorkingPane (igual que tu grabacion)
Const PANE_ALTO      = 37

'========================== FIN DE LA CONFIGURACION ===========================


'--- Mapeo "Tipo Material" -> numero de opcion (1, 2 o 3). EDITABLE ------------
'    La comparacion no distingue mayusculas, tildes, puntos ni espacios.
Sub CargarMapeoTipoMaterial()
   Set gMapTipo = CreateObject("Scripting.Dictionary")
   AgregarMapeo "1", 1
   AgregarMapeo "2", 2
   AgregarMapeo "3", 3
   AgregarMapeo "ASERRABLE", 1
   AgregarMapeo "ASERRABLE PINO", 1
   AgregarMapeo "PULPABLE", 2
   AgregarMapeo "PULPA", 2
   AgregarMapeo "DEBOBINABLE", 3
   AgregarMapeo "CONTRACHAPADO", 3
End Sub


'============================ VARIABLES GLOBALES ==============================
Dim SapApp, SapConn, SapSession
Dim Xl, Wb, Ws
Dim gLog, gRutaLog
Dim gMapTipo
Dim gEtapa, gUltError
Dim gCol           ' diccionario nombre normalizado de columna -> numero
Dim gFilaEnc       ' fila del encabezado en la hoja
Dim gPreguntar, gModoPrueba
Dim gRadios, gRadiosLogueados, gTxtBuf
Dim gDocumento, gMsgSbar, gSinBloque
Dim gOkCount, gOmitCount, gErrCount

' Los objetos parten en Nothing para poder preguntar "Is Nothing" sin error.
Set SapApp = Nothing
Set SapConn = Nothing
Set SapSession = Nothing
Set Xl = Nothing
Set Wb = Nothing
Set Ws = Nothing
Set gLog = Nothing
Set gCol = Nothing
Set gMapTipo = Nothing
Set gRadios = Nothing
Set gSinBloque = Nothing
gOkCount   = 0
gOmitCount = 0
gErrCount  = 0
gRadiosLogueados = False
gEtapa = ""
gUltError = ""

Principal


'==============================================================================
'                                  PRINCIPAL
'==============================================================================
Sub Principal()
   Dim bloques, i, b, resp, total, resumen

   CargarMapeoTipoMaterial

   If Not ConectarSap() Then Exit Sub
   If Not AbrirLibro() Then Exit Sub

   AbrirLog

   If Not MapearColumnas() Then
      MsgBox "No encontre el encabezado del formato en la hoja '" & Ws.Name & "'." & vbCrLf & vbCrLf & _
             "La hoja debe tener una fila con los titulos:" & vbCrLf & _
             "Tipo.MP | Guia | OC | Fecha | Patente | Rol | Cal.Trz | Calidad | Largo | Diametro | Cantidad | Doc. | Tipo Material", _
             vbCritical + vbSystemModal, "ZCMMD001"
      CerrarLog
      Exit Sub
   End If

   bloques = LeerBloques()
   total = UBound(bloques) + 1
   If total = 0 Then
      MsgBox "No encontre ninguna guia con datos en la hoja '" & Ws.Name & "'.", _
             vbExclamation + vbSystemModal, "ZCMMD001"
      CerrarLog
      Exit Sub
   End If

   ' --- Modo de trabajo -------------------------------------------------------
   resp = MsgBox("MODO DE PRUEBA" & vbCrLf & vbCrLf & _
                 "SI  = llena la pantalla pero NO graba (para revisar antes)." & vbCrLf & _
                 "NO  = grabar de verdad en " & SapSession.Info.SystemName & " mandante " & SapSession.Info.Client & "." & vbCrLf & _
                 "CANCELAR = salir.", _
                 vbYesNoCancel + vbQuestion + vbSystemModal, "ZCMMD001 - Modo")
   If resp = vbCancel Then CerrarLog : Exit Sub
   gModoPrueba = (resp = vbYes)

   If gModoPrueba Then
      gPreguntar = True
   Else
      resp = MsgBox("Se van a cargar " & total & " guias." & vbCrLf & vbCrLf & _
                    "SI  = preguntar antes de grabar CADA guia (recomendado)." & vbCrLf & _
                    "NO  = grabar todas sin preguntar." & vbCrLf & _
                    "CANCELAR = salir.", _
                    vbYesNoCancel + vbQuestion + vbSystemModal, "ZCMMD001 - Confirmacion")
      If resp = vbCancel Then CerrarLog : Exit Sub
      gPreguntar = (resp = vbYes)
   End If

   Anotar "==============================================================="
   Anotar "Inicio  " & Now
   Anotar "Libro   : " & Wb.FullName
   Anotar "Hoja    : " & Ws.Name & "   (encabezado en fila " & gFilaEnc & ")"
   Anotar "Sistema : " & SapSession.Info.SystemName & "  Mandante: " & SapSession.Info.Client & "  Usuario: " & SapSession.Info.User
   Anotar "Guias   : " & total
   Anotar "Modo    : " & IIfTexto(gModoPrueba, "PRUEBA (no graba)", "GRABACION REAL") & _
          IIfTexto(gPreguntar, " / pregunta cada guia", " / sin preguntar")
   Anotar "==============================================================="

   ' --- Recorrido de las guias ------------------------------------------------
   For i = 0 To UBound(bloques)
      Set b = bloques(i)
      If EsProcesada(b) Then
         Anotar ""
         Anotar "[" & (i + 1) & "/" & total & "] Guia " & b("guia") & " (fila " & b("fila") & ") YA TIENE documento " & b("doc") & " -> se omite."
         gOmitCount = gOmitCount + 1
      Else
         resp = ProcesarBloque(b, i + 1, total)
         If resp = vbCancel Then
            Anotar ""
            Anotar "*** Proceso detenido por el usuario en la guia " & b("guia") & " ***"
            Exit For
         End If
      End If
   Next

   resumen = "Guias grabadas : " & gOkCount & vbCrLf & _
             "Guias omitidas : " & gOmitCount & vbCrLf & _
             "Guias con error: " & gErrCount & vbCrLf & vbCrLf & _
             "Detalle en:" & vbCrLf & gRutaLog

   Anotar ""
   Anotar "==============================================================="
   Anotar "Fin " & Now & "   OK=" & gOkCount & "  Omitidas=" & gOmitCount & "  Errores=" & gErrCount
   CerrarLog

   MsgBox resumen, vbInformation + vbSystemModal, "ZCMMD001 - Resumen"
End Sub


'==============================================================================
'                        CONEXION CON SAP Y CON EXCEL
'==============================================================================
Function ConectarSap()
   Dim SapGuiAuto, resp
   ConectarSap = False
   Set SapGuiAuto = Nothing

   On Error Resume Next
   Set SapGuiAuto = GetObject("SAPGUI")
   If Err.Number <> 0 Or SapGuiAuto Is Nothing Then
      MsgBox "No pude tomar la sesion de SAP." & vbCrLf & vbCrLf & _
             "Abre SAP Logon, entra al sistema y deja la ventana abierta antes de ejecutar el script.", _
             vbCritical + vbSystemModal, "ZCMMD001"
      Exit Function
   End If
   Set SapApp = SapGuiAuto.GetScriptingEngine
   If Err.Number <> 0 Or SapApp Is Nothing Then
      MsgBox "El scripting de SAP GUI esta desactivado." & vbCrLf & vbCrLf & _
             "Se activa en: Opciones de SAP Logon > Accesibilidad y scripting > Scripting > " & _
             "'Habilitar scripting' (y desmarca las dos notificaciones).", _
             vbCritical + vbSystemModal, "ZCMMD001"
      Exit Function
   End If
   Set SapConn = SapApp.Children(0)
   Set SapSession = SapConn.Children(0)
   If Err.Number <> 0 Or SapSession Is Nothing Then
      MsgBox "No hay ninguna sesion SAP abierta.", vbCritical + vbSystemModal, "ZCMMD001"
      Exit Function
   End If
   Err.Clear
   SapSession.findById("wnd[0]").resizeWorkingPane PANE_ANCHO, PANE_ALTO, False
   Err.Clear
   On Error GoTo 0

   resp = MsgBox("Vas a trabajar sobre:" & vbCrLf & vbCrLf & _
                 "Sistema : " & SapSession.Info.SystemName & vbCrLf & _
                 "Mandante: " & SapSession.Info.Client & vbCrLf & _
                 "Usuario : " & SapSession.Info.User & vbCrLf & _
                 "Programa: " & SapSession.Info.Program & vbCrLf & vbCrLf & _
                 "Es el ambiente correcto?", _
                 vbYesNo + vbQuestion + vbSystemModal, "ZCMMD001 - Confirma el ambiente")
   ConectarSap = (resp = vbYes)
End Function


Function AbrirLibro()
   Dim ruta, i, hoja, nom
   AbrirLibro = False

   On Error Resume Next
   Set Xl = GetObject(, "Excel.Application")
   Err.Clear
   On Error GoTo 0
   If Xl Is Nothing Then
      Set Xl = CreateObject("Excel.Application")
      Xl.Visible = True
   End If

   ruta = ""
   If WScript.Arguments.Count > 0 Then ruta = WScript.Arguments(0)

   If ruta = "" Then
      ruta = Xl.GetOpenFilename("Libros de Excel,*.xls;*.xlsx;*.xlsm", 1, "Elige el Excel con las recepciones")
      If VarType(ruta) = vbBoolean Then Exit Function
   End If

   ' Si ya esta abierto, se usa el libro abierto (para no perder cambios).
   For i = 1 To Xl.Workbooks.Count
      If LCase(Xl.Workbooks(i).FullName) = LCase(ruta) Or LCase(Xl.Workbooks(i).Name) = LCase(NombreArchivo(ruta)) Then
         Set Wb = Xl.Workbooks(i)
         Exit For
      End If
   Next
   If Wb Is Nothing Then
      On Error Resume Next
      Set Wb = Xl.Workbooks.Open(ruta)
      If Err.Number <> 0 Then
         MsgBox "No pude abrir el archivo:" & vbCrLf & ruta & vbCrLf & vbCrLf & Err.Description, _
                vbCritical + vbSystemModal, "ZCMMD001"
         Exit Function
      End If
      On Error GoTo 0
   End If
   Xl.Visible = True

   ' Hoja: se busca la que tenga el encabezado del formato.
   Set Ws = Nothing
   For Each hoja In Wb.Worksheets
      If FilaEncabezado(hoja) > 0 Then
         Set Ws = hoja
         Exit For
      End If
   Next
   If Ws Is Nothing Then
      nom = InputBox("No reconoci el encabezado en ninguna hoja." & vbCrLf & _
                     "Escribe el nombre de la hoja con los datos:", "ZCMMD001", Wb.Worksheets(1).Name)
      If Trim(nom) = "" Then Exit Function
      On Error Resume Next
      Set Ws = Wb.Worksheets(nom)
      On Error GoTo 0
      If Ws Is Nothing Then
         MsgBox "No existe la hoja '" & nom & "'.", vbCritical + vbSystemModal, "ZCMMD001"
         Exit Function
      End If
   End If

   If MsgBox("Archivo: " & Wb.Name & vbCrLf & "Hoja   : " & Ws.Name & vbCrLf & vbCrLf & _
             "Es la hoja correcta?", vbYesNo + vbQuestion + vbSystemModal, "ZCMMD001") <> vbYes Then
      nom = InputBox("Escribe el nombre de la hoja:", "ZCMMD001", Ws.Name)
      If Trim(nom) = "" Then Exit Function
      Set hoja = Nothing
      On Error Resume Next
      Set hoja = Wb.Worksheets(nom)
      On Error GoTo 0
      If hoja Is Nothing Then
         MsgBox "No existe la hoja '" & nom & "'.", vbCritical + vbSystemModal, "ZCMMD001"
         Exit Function
      End If
      Set Ws = hoja
   End If

   AbrirLibro = True
End Function


'==============================================================================
'                        LECTURA DEL FORMATO DE EXCEL
'==============================================================================

' Devuelve la fila donde esta el encabezado de la hoja, o 0 si no lo encuentra.
Function FilaEncabezado(hoja)
   Dim r, c, t, hayGuia, hayDiam
   FilaEncabezado = 0
   On Error Resume Next
   For r = 1 To 15
      hayGuia = False : hayDiam = False
      For c = 1 To 30
         t = Norm(hoja.Cells(r, c).Value)
         If t = "GUIA" Then hayGuia = True
         If t = "DIAMETRO" Then hayDiam = True
      Next
      If hayGuia And hayDiam Then
         FilaEncabezado = r
         Exit Function
      End If
   Next
End Function


Function MapearColumnas()
   Dim c, t
   MapearColumnas = False
   gFilaEnc = FilaEncabezado(Ws)
   If gFilaEnc = 0 Then Exit Function

   Set gCol = CreateObject("Scripting.Dictionary")
   For c = 1 To 40
      t = Norm(Ws.Cells(gFilaEnc, c).Value)
      If t <> "" Then
         If Not gCol.Exists(t) Then gCol.Add t, c
      End If
   Next

   ' La columna "Doc." se crea si no existe.
   If Col("DOC") = 0 Then
      c = 1
      Do While Norm(Ws.Cells(gFilaEnc, c).Value) <> "" And c < 40
         c = c + 1
      Loop
      Ws.Cells(gFilaEnc, c).Value = "Doc."
      gCol.Add "DOC", c
   End If

   MapearColumnas = (Col("GUIA") > 0 And Col("DIAMETRO") > 0 And Col("CANTIDAD") > 0)
End Function


Function Col(nombre)
   Col = 0
   If gCol Is Nothing Then Exit Function
   If gCol.Exists(nombre) Then Col = gCol(nombre)
End Function


' Lee la hoja y devuelve un arreglo de bloques (uno por guia).
' Regla del formato: la fila con "Guia" abre un bloque nuevo, las filas
' siguientes sin "Guia" son mas trozos de la misma guia, y una fila
' completamente en blanco cierra el bloque.
Function LeerBloques()
   Dim r, ultima, lista, b, det, vacia, guia
   Set lista = CreateObject("Scripting.Dictionary")
   Set b = Nothing
   Set det = Nothing
   ultima = Ws.UsedRange.Row + Ws.UsedRange.Rows.Count - 1

   For r = gFilaEnc + 1 To ultima
      vacia = FilaVacia(r)
      guia = TextoCelda(r, Col("GUIA"))

      If vacia Then
         CerrarBloque b, det, lista
      ElseIf guia <> "" Then
         CerrarBloque b, det, lista
         Set b = CreateObject("Scripting.Dictionary")
         Set det = CreateObject("Scripting.Dictionary")
         b.Add "fila", r
         b.Add "guia", guia
         b.Add "tipo", TextoCelda(r, Col("TIPOMP"))
         b.Add "oc", TextoCelda(r, Col("OC"))
         b.Add "fecha", FechaSap(ValorCelda(r, Col("FECHA")))
         b.Add "patente", TextoCelda(r, Col("PATENTE"))
         b.Add "rol", TextoCelda(r, Col("ROL"))
         b.Add "tipomat", TextoCelda(r, Col("TIPOMATERIAL"))
         b.Add "doc", TextoCelda(r, Col("DOC"))
         b.Add "opcion", OpcionDeTipoMaterial(TextoCelda(r, Col("TIPOMATERIAL")))
         b.Add "trozos", 0
         AgregarDetalle b, det, r
      Else
         If Not (b Is Nothing) Then AgregarDetalle b, det, r
      End If
   Next
   CerrarBloque b, det, lista

   If lista.Count = 0 Then
      LeerBloques = Array()
   Else
      LeerBloques = lista.Items
   End If
End Function


Sub AgregarDetalle(b, det, r)
   Dim diam, cant
   diam = EnteroSap(TextoCelda(r, Col("DIAMETRO")))
   cant = EnteroSap(TextoCelda(r, Col("CANTIDAD")))
   If diam = "" And cant = "" Then Exit Sub
   det.Add det.Count, Array(EnteroSap(TextoCelda(r, Col("CALTRZ"))), _
                            TextoCelda(r, Col("CALIDAD")), _
                            LargoSap(TextoCelda(r, Col("LARGO"))), _
                            diam, _
                            cant, _
                            r)
   If IsNumeric(cant) Then b("trozos") = b("trozos") + CLng(cant)
End Sub


Sub CerrarBloque(b, det, lista)
   If b Is Nothing Then Exit Sub
   If det.Count > 0 Then
      b.Add "det", det.Items
      lista.Add lista.Count, b
   End If
   Set b = Nothing
   Set det = Nothing
End Sub


Function FilaVacia(r)
   Dim c
   FilaVacia = True
   For Each c In Array("TIPOMP", "GUIA", "OC", "FECHA", "PATENTE", "ROL", "CALTRZ", "CALIDAD", "LARGO", "DIAMETRO", "CANTIDAD")
      If TextoCelda(r, Col(c)) <> "" Then
         FilaVacia = False
         Exit Function
      End If
   Next
End Function


Function EsProcesada(b)
   Dim d
   d = Trim(b("doc"))
   EsProcesada = (d <> "" And IsNumeric(Left(d, 1)))
End Function


'==============================================================================
'                        PROCESO DE UNA GUIA EN SAP
'==============================================================================
Function ProcesarBloque(b, idx, total)
   Dim det, resp, salida, doc, i, f, grid

   ProcesarBloque = vbYes
   gUltError = ""
   gDocumento = ""
   gMsgSbar = ""
   salida = "OK"
   det = b("det")

   Anotar ""
   Anotar "[" & idx & "/" & total & "] Guia " & b("guia") & "   fila Excel " & b("fila")
   Anotar "        Tipo.MP=" & b("tipo") & "  OC=" & b("oc") & "  Fecha=" & b("fecha") & _
          "  Patente=" & b("patente") & "  Rol=" & b("rol")
   Anotar "        Tipo Material='" & b("tipomat") & "' -> opcion " & b("opcion") & _
          "   Lineas=" & (UBound(det) + 1) & "  Trozos=" & b("trozos")

   On Error Resume Next
   Do
      '--- 1. Abrir la transaccion desde cero -------------------------------
      Etapa "Abriendo la transaccion " & TRANSACCION
      AbrirTransaccion
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Verificando la pantalla inicial de ZCMMD001"
      If Not Existe(ID_TIPO_RECEP) Then
         RegErr 5000, "No aparece el campo Tipo Recepcion (" & ID_TIPO_RECEP & "). " & _
                "Pantalla actual: transaccion '" & InfoTx() & "', programa '" & InfoPrograma() & _
                "', dynpro " & InfoDynpro() & ". Revisa que ZCMMD001 abra directamente esta pantalla."
         Exit Do
      End If

      '--- 2. Opcion del check list segun Tipo Material ----------------------
      If b("opcion") < 1 Then
         Etapa "Revisando la columna Tipo Material"
         RegErr 5002, "El Tipo Material '" & b("tipomat") & "' no esta en el mapeo del script. " & _
                "Abre el .vbs y agregalo en CargarMapeoTipoMaterial (1, 2 o 3)."
         Exit Do
      End If

      '--- 3. Cabecera -------------------------------------------------------
      Etapa "Cargando Tipo Recepcion"
      Escribir ID_TIPO_RECEP, b("tipo")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Cargando Guia"
      Escribir ID_GUIA, b("guia")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Cargando Orden de Compra"
      Escribir ID_OC, b("oc")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Cargando Fecha"
      Escribir ID_FECHA, b("fecha")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Cargando Patente"
      Escribir ID_PATENTE, b("patente")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Cargando Rol"
      Escribir ID_ROL, b("rol")
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do

      Etapa "Validando la cabecera (Enter)"
      SapSession.findById("wnd[0]").sendVKey 0
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      CerrarPopupsSap MAX_POPUPS, b
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      If SbarTipo() = "E" Or SbarTipo() = "A" Then
         RegErr 5003, "SAP rechazo la cabecera: " & SbarTexto()
         Exit Do
      End If

      '--- 4. Check list -----------------------------------------------------
      Etapa "Seleccionando la opcion " & b("opcion") & " del check list"
      SeleccionarOpcion CLng(b("opcion"))
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      CerrarPopupsSap MAX_POPUPS, b
      Err.Clear

      '--- 5. Grilla de trozos -----------------------------------------------
      Etapa "Buscando la grilla de trozos"
      If Not Existe(ID_GRID) Then
         RegErr 5004, "No aparece la grilla de trozos (" & ID_GRID & "). " & _
                "Puede que la OC, el rol o el tipo de recepcion no correspondan."
         Exit Do
      End If
      Set grid = SapSession.findById(ID_GRID)
      Etapa "Revisando el tamano de la grilla"
      Anotar "   Grilla: " & grid.rowCount & " lineas disponibles, el Excel trae " & (UBound(det) + 1) & "."
      If grid.rowCount < UBound(det) + 1 Then
         Anotar "   (aviso) la grilla muestra menos lineas de las que trae el Excel; " & _
                "si SAP no las acepta el error va a salir en la linea que corresponda."
      End If
      Err.Clear

      For i = 0 To UBound(det)
         f = det(i)
         Etapa "Cargando la linea " & (i + 1) & " de la grilla (fila Excel " & f(5) & _
               ", diametro " & f(3) & ", trozos " & f(4) & ")"
         AsegurarVisible grid, i
         grid.modifyCell i, GC_CALIDAD,   f(0)
         grid.modifyCell i, GC_CATEGORIA, f(1)
         grid.modifyCell i, GC_LARGO,     f(2)
         grid.modifyCell i, GC_DIAMETRO,  f(3)
         grid.modifyCell i, GC_TROZO,     f(4)
         If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit For
      Next
      If gUltError <> "" Then Exit Do

      Etapa "Confirmando las lineas de la grilla"
      grid.currentCellColumn = GC_CALIDAD
      Err.Clear
      grid.triggerModified
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      CerrarPopupsSap MAX_POPUPS, b
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      If SbarTipo() = "E" Or SbarTipo() = "A" Then
         RegErr 5006, "SAP rechazo las lineas: " & SbarTexto()
         Exit Do
      End If

      '--- 6. Confirmacion del usuario ---------------------------------------
      Etapa "Esperando la confirmacion del usuario"
      resp = PreguntarGrabar(b, UBound(det) + 1)
      If resp = vbCancel Then salida = "CANCELADA" : Exit Do
      If resp = vbNo Then salida = "OMITIDA" : Exit Do

      '--- 7. Grabar ----------------------------------------------------------
      Etapa "Grabando la recepcion"
      doc = Grabar(b)
      If Err.Number <> 0 Then RegErr Err.Number, Err.Description : Err.Clear : Exit Do
      gDocumento = doc
   Loop While False
   On Error GoTo 0

   If gUltError <> "" Then salida = "ERROR"

   Select Case salida
      Case "OK"
         If gDocumento <> "" Then
            Anotar "   OK -> documento " & gDocumento & "   (" & gMsgSbar & ")"
            EscribirEnExcel b, gDocumento
            gOkCount = gOkCount + 1
         Else
            Anotar "   GRABADA SIN N. DE DOCUMENTO. Mensaje de SAP: " & gMsgSbar
            EscribirEnExcel b, "REVISAR: " & Izq(gMsgSbar, 200)
            gErrCount = gErrCount + 1
            If MsgBox("Guia " & b("guia") & ": SAP no devolvio el numero de documento." & vbCrLf & vbCrLf & _
                      "Mensaje: " & gMsgSbar & vbCrLf & vbCrLf & _
                      "Revisa en SAP si la recepcion quedo grabada." & vbCrLf & vbCrLf & _
                      "Continuar con la guia siguiente?", _
                      vbYesNo + vbExclamation + vbSystemModal, "ZCMMD001") = vbNo Then ProcesarBloque = vbCancel
         End If

      Case "OMITIDA"
         If gModoPrueba Then
            Anotar "   PRUEBA: pantalla cargada completa, no se grabo (no se toca el Excel)."
            gOkCount = gOkCount + 1
         Else
            Anotar "   OMITIDA por el usuario."
            EscribirEnExcel b, "OMITIDA"
            gOmitCount = gOmitCount + 1
         End If

      Case "CANCELADA"
         Anotar "   CANCELADA por el usuario."
         gOmitCount = gOmitCount + 1
         ProcesarBloque = vbCancel

      Case "ERROR"
         gErrCount = gErrCount + 1
         If Not gModoPrueba Then EscribirEnExcel b, Izq(gUltError, 250)
         If MsgBox("Guia " & b("guia") & " (fila " & b("fila") & ")" & vbCrLf & vbCrLf & _
                   gUltError & vbCrLf & vbCrLf & _
                   "Continuar con la guia siguiente?", _
                   vbYesNo + vbExclamation + vbSystemModal, "ZCMMD001 - Error") = vbNo Then ProcesarBloque = vbCancel
   End Select
End Function


Function PreguntarGrabar(b, nLineas)
   Dim m
   If gModoPrueba Then
      m = "MODO DE PRUEBA - no se va a grabar nada." & vbCrLf & vbCrLf & _
          TextoResumen(b, nLineas) & vbCrLf & _
          "Revisa la pantalla de SAP." & vbCrLf & vbCrLf & _
          "ACEPTAR = seguir con la guia siguiente     CANCELAR = detener"
      If MsgBox(m, vbOKCancel + vbInformation + vbSystemModal, "ZCMMD001 - Prueba") = vbCancel Then
         PreguntarGrabar = vbCancel
      Else
         PreguntarGrabar = vbNo
      End If
      Exit Function
   End If

   If Not gPreguntar Then
      PreguntarGrabar = vbYes
      Exit Function
   End If

   m = "Estas seguro de GRABAR esta recepcion?" & vbCrLf & vbCrLf & _
       TextoResumen(b, nLineas) & vbCrLf & _
       "SI = grabar      NO = omitir esta guia      CANCELAR = detener todo"
   PreguntarGrabar = MsgBox(m, vbYesNoCancel + vbQuestion + vbSystemModal, "ZCMMD001 - Confirmar grabacion")
End Function


Function TextoResumen(b, nLineas)
   TextoResumen = "Guia    : " & b("guia") & vbCrLf & _
                  "OC      : " & b("oc") & vbCrLf & _
                  "Fecha   : " & b("fecha") & vbCrLf & _
                  "Patente : " & b("patente") & vbCrLf & _
                  "Rol     : " & b("rol") & vbCrLf & _
                  "Tipo.MP : " & b("tipo") & vbCrLf & _
                  "Opcion  : " & b("opcion") & IIfTexto(b("tipomat") <> "", " (Tipo Material: " & b("tipomat") & ")", " (por defecto)") & vbCrLf & _
                  "Lineas  : " & nLineas & "    Trozos: " & b("trozos") & vbCrLf & _
                  "Fila del Excel: " & b("fila") & vbCrLf
End Function


'==============================================================================
'                          AYUDANTES DE SAP GUI
'==============================================================================

' Deja la sesion en la pantalla inicial de ZCMMD001, venga de donde venga.
Sub AbrirTransaccion()
   CerrarPopupsSap 20, gSinBloque
   SapSession.findById("wnd[0]/tbar[0]/okcd").Text = TRANSACCION
   SapSession.findById("wnd[0]").sendVKey 0
   CerrarPopupsSap 20, gSinBloque
End Sub


Sub Escribir(id, valor)
   If Trim(valor) = "" Then
      Anotar "   (aviso) " & id & " sin valor en el Excel: no se escribe."
      Exit Sub
   End If
   If Not Existe(id) Then
      Err.Raise 5001, "ZCMMD001", "No existe el campo " & id & " en la pantalla actual."
   End If
   SapSession.findById(id).Text = valor
End Sub


Function Existe(id)
   Dim o
   Existe = False
   Set o = Nothing
   On Error Resume Next
   Set o = SapSession.findById(id)
   If Err.Number = 0 Then
      If Not (o Is Nothing) Then Existe = True
   End If
   Err.Clear
End Function


' Cierra con Enter todas las ventanas emergentes y devuelve el N. de documento
' si alguna de ellas lo trae. b puede ser Nothing.
Function CerrarPopupsSap(maxIter, b)
   Dim i, w, t, doc, prev, repes, ultima
   doc = ""
   i = 0
   prev = "@"
   repes = 0
   Do While SapSession.Children.Count > 1 And i < maxIter
      ultima = SapSession.Children.Count - 1
      Set w = SapSession.findById("wnd[" & ultima & "]")
      t = TextoVentana(w)
      Anotar "   ventana: " & t
      If doc = "" Then doc = ExtraerDocumento(t, b)
      If t = prev Then repes = repes + 1 Else repes = 0
      prev = t
      ' Ojo: es normal que salga la MISMA ventana varias veces seguidas (una por
      ' linea de la grilla), por eso el tope de repeticiones es alto.
      If repes >= 50 Then
         Err.Raise 5020, "ZCMMD001", "Hay una ventana emergente que no se cierra con Enter: " & t
      End If
      PulsarEnPopup w
      i = i + 1
   Loop
   If SapSession.Children.Count > 1 Then
      Err.Raise 5021, "ZCMMD001", "Quedaron ventanas emergentes abiertas despues de " & maxIter & " intentos."
   End If
   CerrarPopupsSap = doc
End Function


Sub PulsarEnPopup(w)
   On Error Resume Next
   w.sendVKey 0
   If Err.Number <> 0 Then
      Err.Clear
      w.close
      Err.Clear
   End If
End Sub


' Marca la opcion nOpcion (1, 2 o 3) del check list.
Sub SeleccionarOpcion(nOpcion)
   Dim id, radios, obj
   id = IdOpcion(nOpcion)
   If id <> "" Then
      If Existe(id) Then
         SapSession.findById(id).select
         SapSession.findById(id).setFocus
         Anotar "   Opcion " & nOpcion & " -> " & id
         Exit Sub
      End If
      Anotar "   (aviso) el ID configurado " & id & " no esta en pantalla; se busca por posicion."
   End If

   radios = ListarRadios()
   If UBound(radios) < 0 Then
      Err.Raise 5010, "ZCMMD001", "No encontre opciones (radio buttons) en la pantalla."
   End If
   If Not gRadiosLogueados Then
      Anotar "   Opciones encontradas en pantalla:"
      For Each obj In radios
         Anotar "      " & obj.Id & "   texto: " & obj.Text
      Next
      gRadiosLogueados = True
   End If
   If nOpcion < 1 Or nOpcion > UBound(radios) + 1 Then
      Err.Raise 5011, "ZCMMD001", "Pediste la opcion " & nOpcion & " y la pantalla solo tiene " & _
                (UBound(radios) + 1) & " opciones."
   End If
   Set obj = radios(nOpcion - 1)
   obj.select
   obj.setFocus
   Anotar "   Opcion " & nOpcion & " -> " & obj.Id & "  (" & obj.Text & ")"
End Sub


Function IdOpcion(n)
   IdOpcion = ""
   If n = 1 Then IdOpcion = ID_OPCION_1
   If n = 2 Then IdOpcion = ID_OPCION_2
   If n = 3 Then IdOpcion = ID_OPCION_3
End Function


' Devuelve los radio buttons de la pantalla ordenados de arriba hacia abajo.
Function ListarRadios()
   Set gRadios = CreateObject("Scripting.Dictionary")
   If Existe("wnd[0]/usr") Then RecolectarRadios SapSession.findById("wnd[0]/usr"), 0
   If gRadios.Count = 0 Then
      ListarRadios = Array()
   Else
      ListarRadios = OrdenarRadios(gRadios.Items)
   End If
End Function


Sub RecolectarRadios(cont, nivel)
   Dim i, hijo, tipo
   If nivel > 6 Then Exit Sub
   On Error Resume Next
   For i = 0 To cont.Children.Count - 1
      Set hijo = Nothing
      Set hijo = cont.Children(i)
      Err.Clear
      If Not (hijo Is Nothing) Then
         tipo = ""
         tipo = hijo.Type
         Err.Clear
         If tipo = "GuiRadioButton" Then
            gRadios.Add gRadios.Count, hijo
         ElseIf tipo <> "GuiShell" And tipo <> "GuiCustomControl" And tipo <> "GuiGridView" Then
            If hijo.ContainerType Then RecolectarRadios hijo, nivel + 1
            Err.Clear
         End If
      End If
   Next
   Err.Clear
End Sub


Function OrdenarRadios(arr)
   Dim i, j, tmp
   On Error Resume Next
   For i = 0 To UBound(arr) - 1
      For j = 0 To UBound(arr) - i - 1
         If PosRadio(arr(j)) > PosRadio(arr(j + 1)) Then
            Set tmp = arr(j)
            Set arr(j) = arr(j + 1)
            Set arr(j + 1) = tmp
         End If
      Next
   Next
   Err.Clear
   OrdenarRadios = arr
End Function


Function PosRadio(o)
   Dim t, l
   PosRadio = 0
   On Error Resume Next
   t = 0 : l = 0
   t = o.Top
   l = o.Left
   Err.Clear
   PosRadio = CDbl(t) * 100000 + CDbl(l)
End Function


Sub AsegurarVisible(grid, fila)
   Dim primera, visibles
   On Error Resume Next
   primera = 0
   visibles = 0
   primera = grid.firstVisibleRow
   visibles = grid.visibleRowCount
   If Err.Number <> 0 Then Err.Clear : Exit Sub
   If visibles < 1 Then Exit Sub
   If fila < primera Or fila > primera + visibles - 1 Then grid.firstVisibleRow = fila
   Err.Clear
End Sub


' Graba y devuelve el N. de documento (5000XXXXXX) que informa SAP.
Function Grabar(b)
   Dim doc, t
   doc = ""

   Anotar "   Presionando " & BTN_GRABAR_1
   If Not Existe(BTN_GRABAR_1) Then
      Err.Raise 5030, "ZCMMD001", "No existe el boton de grabar " & BTN_GRABAR_1 & " en esta pantalla."
   End If
   SapSession.findById(BTN_GRABAR_1).press

   t = CerrarPopupsSap(MAX_POPUPS, b)
   If doc = "" Then doc = t

   gMsgSbar = SbarTexto()
   Anotar "   Mensaje SAP [" & SbarTipo() & "]: " & gMsgSbar
   If SbarTipo() = "E" Or SbarTipo() = "A" Then
      Err.Raise 5031, "ZCMMD001", "SAP rechazo la grabacion: " & gMsgSbar
   End If
   If doc = "" Then doc = ExtraerDocumento(gMsgSbar, b)

   If BTN_GRABAR_2 <> "" Then
      If Existe(BTN_GRABAR_2) Then
         Anotar "   Presionando " & BTN_GRABAR_2
         SapSession.findById(BTN_GRABAR_2).press
         t = CerrarPopupsSap(MAX_POPUPS, b)
         If doc = "" Then doc = t
         t = SbarTexto()
         If Trim(t) <> "" Then
            gMsgSbar = t
            Anotar "   Mensaje SAP [" & SbarTipo() & "]: " & gMsgSbar
         End If
         If doc = "" Then doc = ExtraerDocumento(gMsgSbar, b)
      Else
         Anotar "   (aviso) el boton " & BTN_GRABAR_2 & " no esta en pantalla; se omite."
      End If
   End If

   Grabar = doc
End Function


Function SbarTexto()
   SbarTexto = ""
   On Error Resume Next
   SbarTexto = SapSession.findById("wnd[0]/sbar").Text
   Err.Clear
End Function


Function SbarTipo()
   SbarTipo = ""
   On Error Resume Next
   SbarTipo = UCase(SapSession.findById("wnd[0]/sbar").MessageType)
   Err.Clear
End Function


Function InfoTx()
   InfoTx = "?"
   On Error Resume Next
   InfoTx = SapSession.Info.Transaction
   Err.Clear
End Function


Function InfoPrograma()
   InfoPrograma = "?"
   On Error Resume Next
   InfoPrograma = SapSession.Info.Program
   Err.Clear
End Function


Function InfoDynpro()
   InfoDynpro = "?"
   On Error Resume Next
   InfoDynpro = SapSession.Info.ScreenNumber
   Err.Clear
End Function


' Junta el titulo y los textos de una ventana emergente.
Function TextoVentana(w)
   Dim s
   s = ""
   On Error Resume Next
   s = w.Text
   Err.Clear
   gTxtBuf = ""
   RecolectarTexto w, 0
   Err.Clear
   TextoVentana = Trim(s & " | " & Trim(gTxtBuf))
End Function


Sub RecolectarTexto(cont, nivel)
   Dim i, hijo, t
   If nivel > 4 Then Exit Sub
   If Len(gTxtBuf) > 600 Then Exit Sub
   On Error Resume Next
   For i = 0 To cont.Children.Count - 1
      Set hijo = Nothing
      Set hijo = cont.Children(i)
      Err.Clear
      If Not (hijo Is Nothing) Then
         t = ""
         t = hijo.Text
         Err.Clear
         If Len(Trim(t)) > 0 And Len(gTxtBuf) < 600 Then gTxtBuf = gTxtBuf & Trim(t) & "  "
         If hijo.ContainerType Then RecolectarTexto hijo, nivel + 1
         Err.Clear
      End If
   Next
   Err.Clear
End Sub


' Busca el numero de documento dentro de un texto de SAP.
' Se prueban varios patrones, del mas especifico al mas general, y se descartan
' la OC, la guia y el rol para no confundirlos con la recepcion.
Function ExtraerDocumento(texto, b)
   Dim re, patrones, p, coincidencias, i, v, excluir
   ExtraerDocumento = ""
   If Trim(texto & "") = "" Then Exit Function

   excluir = "|"
   On Error Resume Next
   If Not (b Is Nothing) Then excluir = "|" & b("oc") & "|" & b("guia") & "|" & b("rol") & "|"
   Err.Clear
   On Error GoTo 0

   ' \b = principio/fin de numero, para no cortar la OC por la mitad.
   patrones = Array("\b5[0-9]{9}\b", "\b5[0-9]{6,11}\b", "\b[0-9]{8,12}\b", "\b[0-9]{6,7}\b")

   Set re = New RegExp
   re.Global = True
   re.IgnoreCase = True
   For Each p In patrones
      re.Pattern = p
      Set coincidencias = re.Execute(texto)
      For i = 0 To coincidencias.Count - 1
         v = coincidencias(i).Value
         If InStr(excluir, "|" & v & "|") = 0 Then
            ExtraerDocumento = v
            Exit Function
         End If
      Next
   Next
End Function


'==============================================================================
'                               UTILIDADES
'==============================================================================

Sub Etapa(t)
   gEtapa = t
End Sub


Sub RegErr(n, d)
   gUltError = "ERROR - ETAPA: " & gEtapa & " - " & n & ": " & d
   Anotar "   " & gUltError
End Sub


Sub AgregarMapeo(clave, opcion)
   Dim k
   k = Norm(clave)
   If k = "" Then Exit Sub
   If Not gMapTipo.Exists(k) Then gMapTipo.Add k, opcion
End Sub


' Devuelve 1, 2 o 3 segun la columna "Tipo Material". -1 = valor desconocido.
Function OpcionDeTipoMaterial(texto)
   Dim k
   k = Norm(texto)
   If k = "" Then
      OpcionDeTipoMaterial = OPCION_DEFECTO
   ElseIf gMapTipo.Exists(k) Then
      OpcionDeTipoMaterial = gMapTipo(k)
   Else
      OpcionDeTipoMaterial = -1
   End If
End Function


Sub EscribirEnExcel(b, valor)
   Dim c
   c = Col("DOC")
   On Error Resume Next
   If c > 0 Then
      Ws.Cells(b("fila"), c).NumberFormat = "@"
      Ws.Cells(b("fila"), c).Value = valor
   End If
   If Err.Number <> 0 Then
      Anotar "   (aviso) no pude escribir en la columna Doc.: " & Err.Description
      Err.Clear
   End If
   Wb.Save
   If Err.Number <> 0 Then
      Anotar "   (aviso) no pude guardar el Excel: " & Err.Description
      Err.Clear
   End If
End Sub


' Texto de una celda, ya normalizado a como lo espera SAP.
Function TextoCelda(r, c)
   Dim v
   TextoCelda = ""
   If c <= 0 Then Exit Function
   v = ValorCelda(r, c)
   If IsEmpty(v) Or IsNull(v) Then Exit Function
   If VarType(v) = vbError Then Exit Function
   If VarType(v) = vbDate Then
      TextoCelda = FechaSap(v)
   Else
      TextoCelda = Trim(CStr(v))
   End If
End Function


Function ValorCelda(r, c)
   ValorCelda = Empty
   If c <= 0 Then Exit Function
   On Error Resume Next
   ValorCelda = Ws.Cells(r, c).Value
   Err.Clear
End Function


' "14.08.2026" / "19-08-2026" / 19-08-2026 (fecha de Excel) -> "14.08.2026"
Function FechaSap(v)
   Dim s, partes, d, m, y
   FechaSap = ""
   If IsEmpty(v) Or IsNull(v) Then Exit Function
   If VarType(v) = vbError Then Exit Function
   If VarType(v) = vbDate Then
      FechaSap = Pad2(Day(v)) & "." & Pad2(Month(v)) & "." & Year(v)
      Exit Function
   End If

   s = Trim(CStr(v))
   If s = "" Then Exit Function
   partes = Split(s, " ")
   s = partes(0)
   s = Replace(s, "/", ".")
   s = Replace(s, "-", ".")
   partes = Split(s, ".")
   If UBound(partes) < 2 Then
      FechaSap = s
      Exit Function
   End If
   If Len(partes(0)) = 4 Then
      y = partes(0) : m = partes(1) : d = partes(2)
   Else
      d = partes(0) : m = partes(1) : y = partes(2)
   End If
   If Len(y) = 2 Then y = "20" & y
   FechaSap = Pad2(d) & "." & Pad2(m) & "." & y
End Function


' 4 -> "4,00"   3.2 -> "3,20"   "4,5" -> "4,50"
Function LargoSap(v)
   Dim s, p, ent, dec
   s = Trim(CStr(v & ""))
   If s = "" Then
      LargoSap = ""
      Exit Function
   End If
   s = Replace(s, ".", ",")
   p = InStr(s, ",")
   If p = 0 Then
      ent = s
      dec = "00"
   Else
      ent = Left(s, p - 1)
      dec = Mid(s, p + 1)
   End If
   If ent = "" Then ent = "0"
   dec = Left(dec & "00", 2)
   LargoSap = ent & "," & dec
End Function


' 16 -> "16"   16.0 -> "16"
Function EnteroSap(v)
   Dim s, p
   s = Trim(CStr(v & ""))
   If s = "" Then
      EnteroSap = ""
      Exit Function
   End If
   s = Replace(s, ".", ",")
   p = InStr(s, ",")
   If p > 0 Then s = Left(s, p - 1)
   EnteroSap = Trim(s)
End Function


Function Pad2(x)
   Dim s
   s = Trim(CStr(x & ""))
   If Len(s) < 2 Then s = "0" & s
   Pad2 = s
End Function


' Mayusculas, sin tildes, sin espacios ni puntos: para comparar titulos y textos.
Function Norm(v)
   Dim s
   If IsEmpty(v) Or IsNull(v) Then
      Norm = ""
      Exit Function
   End If
   If VarType(v) = vbError Then
      Norm = ""
      Exit Function
   End If
   s = UCase(Trim(CStr(v)))
   s = Replace(s, ChrW(193), "A")   ' A con tilde
   s = Replace(s, ChrW(201), "E")
   s = Replace(s, ChrW(205), "I")
   s = Replace(s, ChrW(211), "O")
   s = Replace(s, ChrW(218), "U")
   s = Replace(s, ChrW(220), "U")
   s = Replace(s, ChrW(209), "N")   ' enie
   s = Replace(s, ".", "")
   s = Replace(s, " ", "")
   s = Replace(s, Chr(9), "")
   s = Replace(s, Chr(10), "")
   s = Replace(s, Chr(13), "")
   Norm = s
End Function


Function Izq(s, n)
   s = s & ""
   If Len(s) > n Then
      Izq = Left(s, n)
   Else
      Izq = s
   End If
End Function


Function IIfTexto(cond, a, b)
   If cond Then
      IIfTexto = a
   Else
      IIfTexto = b
   End If
End Function


Function NombreArchivo(ruta)
   Dim p, s
   s = ruta & ""
   p = InStrRev(s, "\")
   If p > 0 Then
      NombreArchivo = Mid(s, p + 1)
   Else
      NombreArchivo = s
   End If
End Function


'==============================================================================
'                                 BITACORA
'==============================================================================
Sub AbrirLog()
   Dim fso, carpeta
   Set fso = CreateObject("Scripting.FileSystemObject")
   carpeta = ""
   On Error Resume Next
   carpeta = Wb.Path
   Err.Clear
   If carpeta = "" Then carpeta = fso.GetSpecialFolder(2)
   gRutaLog = fso.BuildPath(carpeta, "ZCMMD001_log_" & Marca() & ".txt")
   Set gLog = fso.CreateTextFile(gRutaLog, True)
   If Err.Number <> 0 Then
      Err.Clear
      gRutaLog = fso.BuildPath(fso.GetSpecialFolder(2), "ZCMMD001_log_" & Marca() & ".txt")
      Set gLog = fso.CreateTextFile(gRutaLog, True)
      Err.Clear
   End If
End Sub


Sub Anotar(t)
   On Error Resume Next
   gLog.WriteLine Hora() & "  " & t
   Err.Clear
End Sub


Sub CerrarLog()
   On Error Resume Next
   gLog.Close
   Set gLog = Nothing
   Err.Clear
End Sub


Function Marca()
   Dim d
   d = Now
   Marca = Year(d) & Pad2(Month(d)) & Pad2(Day(d)) & "_" & Pad2(Hour(d)) & Pad2(Minute(d)) & Pad2(Second(d))
End Function


Function Hora()
   Dim d
   d = Now
   Hora = Pad2(Hour(d)) & ":" & Pad2(Minute(d)) & ":" & Pad2(Second(d))
End Function
