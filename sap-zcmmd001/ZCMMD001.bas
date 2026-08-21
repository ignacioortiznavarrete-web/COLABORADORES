Attribute VB_Name = "ZCMMD001"
Option Explicit

'==============================================================================
'  ZCMMD001 - Carga de recepciones de trozos desde Excel (SAP GUI Scripting)
'------------------------------------------------------------------------------
'  Macros de este modulo (Alt+F8 para ejecutarlas):
'
'    CargarRecepcionesZCMMD001   La carga. Recorre el Excel guia por guia, entra
'                                a ZCMMD001, llena la cabecera y la grilla,
'                                PREGUNTA si estas seguro de grabar, graba,
'                                captura el N. de documento (5000XXXXXX), lo
'                                escribe en la columna Doc. y pasa a la siguiente.
'
'    DiagnosticoZCMMD001         Utilitario. Deja SAP en la pantalla que quieras
'                                revisar y genera un TXT en el Escritorio con
'                                todos los IDs: las 3 opciones del check list,
'                                los botones y las columnas de la grilla.
'
'  El formato del Excel: una fila con los titulos (Tipo.MP, Guia, OC, Fecha,
'  Patente, Rol, Cal.Trz, Calidad, Largo, Diametro, Cantidad, Doc.,
'  Tipo Material). La fila con Guia abre una guia nueva, las siguientes sin Guia
'  son mas diametros de la misma, y una LINEA COMPLETAMENTE EN BLANCO la cierra.
'
'  El codigo esta escrito SIN tildes a proposito, para que se vea igual sin
'  importar la configuracion regional. Los acentos de los datos del Excel si se
'  respetan.
'
'  Requisitos: SAP GUI abierto con sesion iniciada y scripting habilitado
'  (SAP Logon > Opciones > Accesibilidad y scripting > Scripting).
'==============================================================================

'============================== CONFIGURACION =================================

' --- Transaccion --------------------------------------------------------------
Private Const TRANSACCION   = "/nzcmmd001"

' --- Campos de la cabecera ----------------------------------------------------
Private Const ID_TIPO_RECEP = "wnd[0]/usr/txtTIPO_RECEP"
Private Const ID_GUIA       = "wnd[0]/usr/txtXGUIA"
Private Const ID_OC         = "wnd[0]/usr/ctxtEKKO-EBELN"
Private Const ID_FECHA      = "wnd[0]/usr/ctxt*EKPO-AEDAT"
Private Const ID_PATENTE    = "wnd[0]/usr/txtXPATEN"
Private Const ID_ROL        = "wnd[0]/usr/txt*ZTMMMD001-ROL_PRE"

' --- Grilla de trozos ---------------------------------------------------------
Private Const ID_GRID       = "wnd[0]/usr/cntlBCALV_GRID_DEMO_0100_CONT1/shellcont/shell"
Private Const GC_CALIDAD    = "CALIDAD"
Private Const GC_CATEGORIA  = "CATEGORIA"
Private Const GC_LARGO      = "LARGO"
Private Const GC_DIAMETRO   = "DIAMETRO"
Private Const GC_TROZO      = "TROZO"

' --- Botones de grabacion (los mismos de tu grabacion) ------------------------
Private Const BTN_GRABAR_1  = "wnd[0]/tbar[1]/btn[6]"
Private Const BTN_GRABAR_2  = "wnd[0]/tbar[1]/btn[7]"

' --- Check list: las 3 opciones ----------------------------------------------
'  ID_OPCION_3 es la que quedo en tu grabacion (radMCON = la 3ra opcion).
'  Para completar las otras dos: deja ZCMMD001 abierta en la pantalla donde
'  aparecen las 3 opciones, ejecuta ZCMMD001_Diagnostico.vbs y copia aqui los
'  IDs que salen en la seccion "OPCIONES (RADIO BUTTONS)" del TXT que genera.
'
'  Si dejas un ID en blanco el script igual funciona: selecciona la opcion por
'  POSICION en pantalla (1 = la de mas arriba, 2 = la del medio, 3 = la ultima).
Private Const ID_OPCION_1    = ""
Private Const ID_OPCION_2    = ""
Private Const ID_OPCION_3    = "wnd[0]/usr/radMCON"

' Opcion que se usa cuando la columna "Tipo Material" viene vacia.
Private Const OPCION_DEFECTO = 3

' --- Varios -------------------------------------------------------------------
Private Const MAX_POPUPS     = 300   ' tope de ventanas emergentes por guia
Private Const PANE_ANCHO     = 139   ' resizeWorkingPane (igual que tu grabacion)
Private Const PANE_ALTO      = 37

'========================== FIN DE LA CONFIGURACION ===========================

Private Sub CargarMapeoTipoMaterial()
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
Private SapApp As Object, SapConn As Object, SapSession As Object
Private Wb As Object, Ws As Object
Private gLogNum, gRutaLog
Private gMapTipo As Object
Private gEtapa, gUltError
Private gCol As Object          ' titulo normalizado de columna -> numero de columna
Private gFilaEnc                ' fila del encabezado en la hoja
Private gPreguntar, gModoPrueba
Private gRadios As Object, gRadiosLogueados, gTxtBuf
Private gDocumento, gMsgSbar, gSinBloque As Object
Private gOkCount, gOmitCount, gErrCount
Private gDiagNum, gDiagRadios


'==============================================================================
'                    MACRO PRINCIPAL: carga de las recepciones
'==============================================================================
Public Sub CargarRecepcionesZCMMD001()
   Dim bloques, i, b, resp, total, resumen

   ' --- estado inicial --------------------------------------------------------
   Set SapApp = Nothing
   Set SapConn = Nothing
   Set SapSession = Nothing
   Set Wb = Nothing
   Set Ws = Nothing
   Set gCol = Nothing
   Set gMapTipo = Nothing
   Set gRadios = Nothing
   Set gSinBloque = Nothing
   gLogNum = 0
   gOkCount = 0
   gOmitCount = 0
   gErrCount = 0
   gRadiosLogueados = False
   gEtapa = ""
   gUltError = ""

   CargarMapeoTipoMaterial

   If Not ConectarSap() Then Exit Sub
   If Not BuscarLibroYHoja() Then Exit Sub

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
   If resp = vbCancel Then CerrarLog: Exit Sub
   gModoPrueba = (resp = vbYes)

   If gModoPrueba Then
      gPreguntar = True
   Else
      resp = MsgBox("Se van a cargar " & total & " guias." & vbCrLf & vbCrLf & _
                    "SI  = preguntar antes de grabar CADA guia (recomendado)." & vbCrLf & _
                    "NO  = grabar todas sin preguntar." & vbCrLf & _
                    "CANCELAR = salir.", _
                    vbYesNoCancel + vbQuestion + vbSystemModal, "ZCMMD001 - Confirmacion")
      If resp = vbCancel Then CerrarLog: Exit Sub
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
'                        CONEXION CON SAP Y CON EL LIBRO
'==============================================================================

' Toma la sesion SAP abierta. True si quedo lista en SapSession.
Private Function TomarSesionSap()
   Dim SapGuiAuto As Object
   TomarSesionSap = False
   Set SapGuiAuto = Nothing

   On Error Resume Next
   Set SapGuiAuto = GetObject("SAPGUI")
   If Err.Number <> 0 Or SapGuiAuto Is Nothing Then
      MsgBox "No pude tomar la sesion de SAP." & vbCrLf & vbCrLf & _
             "Abre SAP Logon, entra al sistema y deja la ventana abierta antes de ejecutar la macro.", _
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
   On Error GoTo 0
   TomarSesionSap = True
End Function


' Toma la sesion y ademas hace confirmar el ambiente.
Private Function ConectarSap()
   Dim resp
   ConectarSap = False
   If Not TomarSesionSap() Then Exit Function

   On Error Resume Next
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


' Busca la hoja con el encabezado del formato: primero en el libro que tiene la
' macro, despues en los demas libros abiertos, y si no, pide el archivo.
Private Function BuscarLibroYHoja()
   Dim libro As Object, hoja As Object, ruta, nom
   BuscarLibroYHoja = False
   Set Wb = Nothing
   Set Ws = Nothing

   For Each hoja In ThisWorkbook.Worksheets
      If FilaEncabezado(hoja) > 0 Then
         Set Wb = ThisWorkbook
         Set Ws = hoja
         Exit For
      End If
   Next

   If Ws Is Nothing Then
      For Each libro In Application.Workbooks
         For Each hoja In libro.Worksheets
            If FilaEncabezado(hoja) > 0 Then
               Set Wb = libro
               Set Ws = hoja
               Exit For
            End If
         Next
         If Not Ws Is Nothing Then Exit For
      Next
   End If

   If Ws Is Nothing Then
      ruta = Application.GetOpenFilename("Libros de Excel,*.xls;*.xlsx;*.xlsm", 1, "Elige el Excel con las recepciones")
      If VarType(ruta) = vbBoolean Then Exit Function
      On Error Resume Next
      Set libro = Application.Workbooks.Open(ruta)
      If Err.Number <> 0 Then
         MsgBox "No pude abrir el archivo:" & vbCrLf & ruta & vbCrLf & vbCrLf & Err.Description, _
                vbCritical + vbSystemModal, "ZCMMD001"
         Exit Function
      End If
      On Error GoTo 0
      For Each hoja In libro.Worksheets
         If FilaEncabezado(hoja) > 0 Then
            Set Wb = libro
            Set Ws = hoja
            Exit For
         End If
      Next
   End If

   If Ws Is Nothing Then
      MsgBox "No encontre ninguna hoja con el encabezado del formato." & vbCrLf & vbCrLf & _
             "Tiene que haber una fila con los titulos Guia y Diametro (y las demas columnas).", _
             vbCritical + vbSystemModal, "ZCMMD001"
      Exit Function
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
         MsgBox "No existe la hoja '" & nom & "' en " & Wb.Name & ".", vbCritical + vbSystemModal, "ZCMMD001"
         Exit Function
      End If
      Set Ws = hoja
   End If

   ' Un .xlsx no puede guardar macros: si la macro esta en este mismo libro,
   ' Excel no lo va a poder guardar y se perderian los numeros de documento.
   If Wb Is ThisWorkbook And LCase(Right(Wb.Name, 5)) = ".xlsx" Then
      MsgBox "Este libro tiene la macro pero esta guardado como .xlsx, y Excel no " & _
             "guarda macros en ese formato." & vbCrLf & vbCrLf & _
             "Guardalo primero como 'Libro de Excel habilitado para macros (*.xlsm)', " & _
             "si no los numeros de documento no van a quedar grabados en el archivo.", _
             vbExclamation + vbSystemModal, "ZCMMD001"
   End If

   BuscarLibroYHoja = True
End Function


'==============================================================================
'                        LECTURA DEL FORMATO DE EXCEL
'==============================================================================
Private Function FilaEncabezado(hoja)
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

Private Function MapearColumnas()
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

Private Function Col(nombre)
   Col = 0
   If gCol Is Nothing Then Exit Function
   If gCol.Exists(nombre) Then Col = gCol(nombre)
End Function

Private Function LeerBloques()
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

Private Sub AgregarDetalle(b, det, r)
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

Private Sub CerrarBloque(b, det, lista)
   If b Is Nothing Then Exit Sub
   If det.Count > 0 Then
      b.Add "det", det.Items
      lista.Add lista.Count, b
   End If
   Set b = Nothing
   Set det = Nothing
End Sub

Private Function FilaVacia(r)
   Dim c
   FilaVacia = True
   For Each c In Array("TIPOMP", "GUIA", "OC", "FECHA", "PATENTE", "ROL", "CALTRZ", "CALIDAD", "LARGO", "DIAMETRO", "CANTIDAD")
      If TextoCelda(r, Col(c)) <> "" Then
         FilaVacia = False
         Exit Function
      End If
   Next
End Function

Private Function EsProcesada(b)
   Dim d
   d = Trim(b("doc"))
   EsProcesada = (d <> "" And IsNumeric(Left(d, 1)))
End Function


'==============================================================================
'                        PROCESO DE UNA GUIA EN SAP
'==============================================================================
Private Function ProcesarBloque(b, idx, total)
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

Private Function PreguntarGrabar(b, nLineas)
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

Private Function TextoResumen(b, nLineas)
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
Private Sub AbrirTransaccion()
   CerrarPopupsSap 20, gSinBloque
   SapSession.findById("wnd[0]/tbar[0]/okcd").Text = TRANSACCION
   SapSession.findById("wnd[0]").sendVKey 0
   CerrarPopupsSap 20, gSinBloque
End Sub

Private Sub Escribir(id, valor)
   If Trim(valor) = "" Then
      Anotar "   (aviso) " & id & " sin valor en el Excel: no se escribe."
      Exit Sub
   End If
   If Not Existe(id) Then
      Err.Raise 5001, "ZCMMD001", "No existe el campo " & id & " en la pantalla actual."
   End If
   SapSession.findById(id).Text = valor
End Sub

Private Function Existe(id)
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

Private Function CerrarPopupsSap(maxIter, b)
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

Private Sub PulsarEnPopup(w)
   On Error Resume Next
   w.sendVKey 0
   If Err.Number <> 0 Then
      Err.Clear
      w.close
      Err.Clear
   End If
End Sub

Private Sub SeleccionarOpcion(nOpcion)
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

Private Function IdOpcion(n)
   IdOpcion = ""
   If n = 1 Then IdOpcion = ID_OPCION_1
   If n = 2 Then IdOpcion = ID_OPCION_2
   If n = 3 Then IdOpcion = ID_OPCION_3
End Function

Private Function ListarRadios()
   Set gRadios = CreateObject("Scripting.Dictionary")
   If Existe("wnd[0]/usr") Then RecolectarRadios SapSession.findById("wnd[0]/usr"), 0
   If gRadios.Count = 0 Then
      ListarRadios = Array()
   Else
      ListarRadios = OrdenarRadios(gRadios.Items)
   End If
End Function

Private Sub RecolectarRadios(cont, nivel)
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

Private Function OrdenarRadios(arr)
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

Private Function PosRadio(o)
   Dim t, l
   PosRadio = 0
   On Error Resume Next
   t = 0 : l = 0
   t = o.Top
   l = o.Left
   Err.Clear
   PosRadio = CDbl(t) * 100000 + CDbl(l)
End Function

Private Sub AsegurarVisible(grid, fila)
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

Private Function Grabar(b)
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

Private Function SbarTexto()
   SbarTexto = ""
   On Error Resume Next
   SbarTexto = SapSession.findById("wnd[0]/sbar").Text
   Err.Clear
End Function

Private Function SbarTipo()
   SbarTipo = ""
   On Error Resume Next
   SbarTipo = UCase(SapSession.findById("wnd[0]/sbar").MessageType)
   Err.Clear
End Function

Private Function InfoTx()
   InfoTx = "?"
   On Error Resume Next
   InfoTx = SapSession.Info.Transaction
   Err.Clear
End Function

Private Function InfoPrograma()
   InfoPrograma = "?"
   On Error Resume Next
   InfoPrograma = SapSession.Info.Program
   Err.Clear
End Function

Private Function InfoDynpro()
   InfoDynpro = "?"
   On Error Resume Next
   InfoDynpro = SapSession.Info.ScreenNumber
   Err.Clear
End Function

Private Function TextoVentana(w)
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

Private Sub RecolectarTexto(cont, nivel)
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

Private Function ExtraerDocumento(texto, b)
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

   Set re = CreateObject("VBScript.RegExp")
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
Private Sub Etapa(t)
   gEtapa = t
End Sub

Private Sub RegErr(n, d)
   gUltError = "ERROR - ETAPA: " & gEtapa & " - " & n & ": " & d
   Anotar "   " & gUltError
End Sub

Private Sub AgregarMapeo(clave, opcion)
   Dim k
   k = Norm(clave)
   If k = "" Then Exit Sub
   If Not gMapTipo.Exists(k) Then gMapTipo.Add k, opcion
End Sub

Private Function OpcionDeTipoMaterial(texto)
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

Private Sub EscribirEnExcel(b, valor)
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

Private Function TextoCelda(r, c)
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

Private Function ValorCelda(r, c)
   ValorCelda = Empty
   If c <= 0 Then Exit Function
   On Error Resume Next
   ValorCelda = Ws.Cells(r, c).Value
   Err.Clear
End Function

Private Function FechaSap(v)
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

Private Function LargoSap(v)
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

Private Function EnteroSap(v)
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

Private Function Pad2(x)
   Dim s
   s = Trim(CStr(x & ""))
   If Len(s) < 2 Then s = "0" & s
   Pad2 = s
End Function

Private Function Norm(v)
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

Private Function Izq(ByVal s, ByVal n)
   s = s & ""
   If Len(s) > n Then
      Izq = Left(s, n)
   Else
      Izq = s
   End If
End Function

Private Function IIfTexto(cond, a, b)
   If cond Then
      IIfTexto = a
   Else
      IIfTexto = b
   End If
End Function

Private Function Marca()
   Dim d
   d = Now
   Marca = Year(d) & Pad2(Month(d)) & Pad2(Day(d)) & "_" & Pad2(Hour(d)) & Pad2(Minute(d)) & Pad2(Second(d))
End Function

Private Function Hora()
   Dim d
   d = Now
   Hora = Pad2(Hour(d)) & ":" & Pad2(Minute(d)) & ":" & Pad2(Second(d))
End Function


'==============================================================================
'                                 BITACORA
'==============================================================================
Private Sub AbrirLog()
   Dim carpeta
   gLogNum = 0
   carpeta = ""
   On Error Resume Next
   carpeta = Wb.Path
   Err.Clear
   If carpeta = "" Then carpeta = Environ("TEMP")
   gRutaLog = carpeta & "\ZCMMD001_log_" & Marca() & ".txt"
   gLogNum = FreeFile
   Open gRutaLog For Output As #gLogNum
   If Err.Number <> 0 Then
      Err.Clear
      gRutaLog = Environ("TEMP") & "\ZCMMD001_log_" & Marca() & ".txt"
      gLogNum = FreeFile
      Open gRutaLog For Output As #gLogNum
      If Err.Number <> 0 Then
         gLogNum = 0
         Err.Clear
      End If
   End If
End Sub


Private Sub Anotar(t)
   On Error Resume Next
   If gLogNum <> 0 Then Print #gLogNum, Hora() & "  " & t
   Err.Clear
End Sub


Private Sub CerrarLog()
   On Error Resume Next
   If gLogNum <> 0 Then Close #gLogNum
   gLogNum = 0
   Err.Clear
End Sub


'==============================================================================
'          MACRO UTILITARIA: volcado de los IDs de la pantalla de SAP
'------------------------------------------------------------------------------
'  Deja SAP en la pantalla que quieras revisar (por ejemplo la de las 3 opciones
'  del check list) y ejecuta esta macro. Genera un TXT en el Escritorio con los
'  IDs exactos para completar la configuracion de arriba.
'==============================================================================
Public Sub DiagnosticoZCMMD001()
   Dim ruta, i

   Set SapApp = Nothing
   Set SapConn = Nothing
   Set SapSession = Nothing
   gDiagRadios = 0
   If Not TomarSesionSap() Then Exit Sub

   ruta = Environ("USERPROFILE") & "\Desktop\ZCMMD001_diagnostico.txt"
   gDiagNum = FreeFile
   On Error Resume Next
   Open ruta For Output As #gDiagNum
   If Err.Number <> 0 Then
      Err.Clear
      ruta = Environ("TEMP") & "\ZCMMD001_diagnostico.txt"
      gDiagNum = FreeFile
      Open ruta For Output As #gDiagNum
      If Err.Number <> 0 Then
         MsgBox "No pude crear el archivo de diagnostico.", vbCritical, "ZCMMD001"
         Exit Sub
      End If
   End If
   On Error GoTo 0

   DiagEsc "=============================================================="
   DiagEsc " DIAGNOSTICO ZCMMD001 - " & Now
   DiagEsc "=============================================================="
   DiagEsc "Sistema    : " & SapSession.Info.SystemName
   DiagEsc "Mandante   : " & SapSession.Info.Client
   DiagEsc "Usuario    : " & SapSession.Info.User
   DiagEsc "Transaccion: " & InfoTx()
   DiagEsc "Programa   : " & InfoPrograma()
   DiagEsc "Dynpro     : " & InfoDynpro()
   DiagEsc "Ventanas   : " & SapSession.Children.Count
   DiagEsc ""

   DiagEsc "=============================================================="
   DiagEsc " OPCIONES (RADIO BUTTONS) - en el orden en que se ven"
   DiagEsc " Copia estos IDs en ID_OPCION_1 / ID_OPCION_2 / ID_OPCION_3"
   DiagEsc "=============================================================="
   DiagRecorrer "wnd[0]/usr", 0, True
   If gDiagRadios = 0 Then DiagEsc "  (no hay radio buttons en esta pantalla)"
   DiagEsc ""

   DiagEsc "=============================================================="
   DiagEsc " TODOS LOS CAMPOS DE LA PANTALLA"
   DiagEsc "=============================================================="
   DiagRecorrer "wnd[0]/usr", 0, False
   DiagEsc ""

   DiagEsc "=============================================================="
   DiagEsc " BOTONES DE LA BARRA ESTANDAR  (wnd[0]/tbar[0])"
   DiagEsc "=============================================================="
   DiagBotones "wnd[0]/tbar[0]"
   DiagEsc ""
   DiagEsc "=============================================================="
   DiagEsc " BOTONES DE LA BARRA DE APLICACION  (wnd[0]/tbar[1])"
   DiagEsc " Aqui salen los de Grabar: revisa BTN_GRABAR_1 y BTN_GRABAR_2"
   DiagEsc "=============================================================="
   DiagBotones "wnd[0]/tbar[1]"
   DiagEsc ""

   DiagEsc "=============================================================="
   DiagEsc " GRILLA DE TROZOS"
   DiagEsc "=============================================================="
   DiagGrilla
   DiagEsc ""

   If SapSession.Children.Count > 1 Then
      DiagEsc "=============================================================="
      DiagEsc " VENTANAS EMERGENTES ABIERTAS"
      DiagEsc "=============================================================="
      For i = 1 To SapSession.Children.Count - 1
         DiagEsc "  wnd[" & i & "]  " & TextoVentana(SapSession.findById("wnd[" & i & "]"))
      Next
   End If

   Close #gDiagNum
   gDiagNum = 0

   MsgBox "Listo. El detalle quedo en:" & vbCrLf & vbCrLf & ruta, vbInformation, "Diagnostico ZCMMD001"
   On Error Resume Next
   Shell "notepad.exe " & Chr(34) & ruta & Chr(34), vbNormalFocus
   Err.Clear
End Sub


Private Sub DiagEsc(t)
   On Error Resume Next
   If gDiagNum <> 0 Then Print #gDiagNum, t
   Err.Clear
End Sub


' Recorre la pantalla. soloRadios = True imprime solo los radio buttons.
Private Sub DiagRecorrer(id, nivel, soloRadios)
   Dim cont As Object, i, hijo As Object, tipo, sangria
   If nivel > 8 Then Exit Sub
   Set cont = Nothing
   On Error Resume Next
   Set cont = SapSession.findById(id)
   Err.Clear
   If cont Is Nothing Then Exit Sub

   sangria = Space(nivel * 2)
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
               gDiagRadios = gDiagRadios + 1
               DiagEsc "  OPCION " & gDiagRadios & ":"
               DiagEsc "     ID     : " & hijo.Id
               DiagEsc "     Texto  : " & hijo.Text
               DiagEsc "     Marcada: " & hijo.Selected
               DiagEsc ""
            End If
         Else
            DiagEsc sangria & tipo & "  |  " & hijo.Id
            If Len(Trim(hijo.Text & "")) > 0 Then DiagEsc sangria & "      texto: " & hijo.Text
         End If
         If tipo <> "GuiShell" And tipo <> "GuiCustomControl" And tipo <> "GuiGridView" Then
            If hijo.ContainerType Then DiagRecorrer hijo.Id, nivel + 1, soloRadios
            Err.Clear
         End If
      End If
   Next
   Err.Clear
End Sub


Private Sub DiagBotones(id)
   Dim cont As Object, i, hijo As Object
   Set cont = Nothing
   On Error Resume Next
   Set cont = SapSession.findById(id)
   Err.Clear
   If cont Is Nothing Then
      DiagEsc "  (no existe " & id & ")"
      Exit Sub
   End If
   For i = 0 To cont.Children.Count - 1
      Set hijo = Nothing
      Set hijo = cont.Children(i)
      Err.Clear
      If Not (hijo Is Nothing) Then
         DiagEsc "  " & hijo.Id
         DiagEsc "      texto: " & hijo.Text & "   |   ayuda: " & hijo.Tooltip
         Err.Clear
      End If
   Next
   Err.Clear
End Sub


Private Sub DiagGrilla()
   Dim grid As Object, cols As Object, i, nom, titulo, valor
   Set grid = Nothing
   On Error Resume Next
   Set grid = SapSession.findById(ID_GRID)
   Err.Clear
   If grid Is Nothing Then
      DiagEsc "  No encontre la grilla en " & ID_GRID
      DiagEsc "  (busca en TODOS LOS CAMPOS un ID que termine en /shell)"
      Exit Sub
   End If
   DiagEsc "  ID              : " & ID_GRID
   DiagEsc "  Filas           : " & grid.rowCount
   DiagEsc "  Filas a la vista: " & grid.visibleRowCount
   DiagEsc "  Columnas        : " & grid.columnCount
   DiagEsc ""
   DiagEsc "  COLUMNAS (nombre tecnico -> titulo -> valor de la fila 0)"
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
      DiagEsc "     " & nom & "   ->   " & titulo & "   ->   [" & valor & "]"
   Next
   Err.Clear
End Sub
