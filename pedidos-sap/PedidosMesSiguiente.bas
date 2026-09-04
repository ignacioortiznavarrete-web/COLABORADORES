' =====================================================================
'  PEDIDOS_MES_SIGUIENTE
'  Pedidos SAP  -  ME31K / ME21N / ME22N        (v14)
'  Excel + SAP GUI Scripting
' ---------------------------------------------------------------------
'  ESTE ARCHIVO TRABAJA SIEMPRE CON EL MES SIGUIENTE:
'     desde el dia 01 del mes que viene hasta el ultimo dia de ese mes.
'     El ultimo dia (28, 29, 30 o 31) lo calcula solo. No hay que tocar
'     ninguna fecha en el codigo, ningun mes.
'
'  Es el archivo hermano de PedidosMesActual.bas, que hace lo mismo con el otro
'  mes. Son iguales salvo el mes: se pueden tener los dos en el mismo
'  libro, cada uno con su macro.
'
'  Alt+F8 > PEDIDOS_MES_SIGUIENTE
'
'  Pregunta que hacer:
'     1 = Crear PEDIDOS ABIERTOS (ME31K)
'     2 = Crear PEDIDOS de compra (ME21N)
'     3 = ACTUALIZAR pedidos ya creados (ME22N)  <-- lo que se hacia a mano
'     4 = ME31K y despues ME21N
'
'  La opcion 3 hace, pedido por pedido y sin tocar el teclado:
'     a) Cabecera > Datos adicionales : validez  01 del mes .. fin de mes
'     b) Sintesis de posiciones       : fecha de entrega en TODAS las lineas
'     c) Abre la barra de abajo (detalle de posicion) y en CADA posicion
'        escribe la tolerancia 99,9 y el texto de posicion con la calidad
'     d) Graba y anota el resultado en la hoja "Registro"
'
'  INSTALACION (una sola vez)
'     Alt+F11 > Archivo > Importar archivo... > este archivo
'     (o Insertar > Modulo y pegar este texto completo)
'     Borra el modulo viejo para que no queden macros repetidas.
'     Guarda el libro como .xlsm
'
'  LA PLANILLA (Hoja1). Un bloque por proveedor:
'     A Material   B Precio   C Cantidad   D UMP   E Proveedor
'     F Valor total   G Moneda   H Pedido Abierto   I Calidad   J Numero de oc
'     La fila que dice "Material" abre cada bloque.
'     Los datos de cabecera (E a J) se leen de la PRIMERA fila del bloque.
' =====================================================================

Option Explicit

' ============================ AJUSTES ================================
Const HOJA              As String = "Hoja1"
Const HOJA_LOG          As String = "Registro"   ' "" = no dejar registro

Const CLASE_CONTRATO    As String = "WK"
Const ORG_COMPRAS       As String = "TCMA"
Const GRUPO_COMPRAS     As String = "628"
Const CENTRO            As String = "TCP1"
Const ALMACEN           As String = "PAN1"
Const GRUPO_ARTICULO    As String = "X1000"
Const TIPO_PEDIDO       As String = "NB"

Const TOL_EXCESO        As String = "99,9"       ' sobreentrega  EKPO-UEBTO
Const PREFIJO_CALIDAD   As String = ""           ' ej. "CALIDAD " si quieres texto largo
Const NODO_TEXTO_POS    As String = "F01"        ' nodo "Texto de posicion"

Const GUARDAR_AUTO      As Boolean = True        ' False = revisas y grabas tu
Const INTERVALO_POS     As Long = 10             ' posiciones del contrato 10,20,30...
Const ENTREGA_AL_CIERRE As Boolean = True        ' True  = entrega el ultimo dia del mes
                                                 ' False = entrega el dia 01

Const FORMATO_FECHA     As String = "DD.MM.YYYY" ' formato de fecha de tu usuario SAP
Const SEP_DECIMAL       As String = ","          ' separador decimal de tu usuario SAP
Const MAX_POSICIONES    As Long = 200            ' tope al recorrer la grilla

' Columnas de la planilla
Const C_MAT = 1: Const C_PRE = 2: Const C_CAN = 3: Const C_UMP = 4
Const C_PRV = 5: Const C_VAL = 6: Const C_MON = 7: Const C_PED = 8
Const C_CAL = 9                    ' Columna I: Calidad
Const C_OC = 10                    ' Columna J: Numero de oc

' ========================== VARIABLES GLOBALES =======================
Dim session As Object
Dim ws As Worksheet
Dim fIni As Date, fFin As Date
Dim d1 As String, d2 As String, dEntrega As String

Dim mapCampos(0 To 80) As String   ' columna de la grilla -> nombre de campo
Dim cEMATN As Long, cMENGE As Long, cMEINS As Long, cNETPR As Long
Dim cWAERS As Long, cKONNR As Long, cKTPNR As Long, cEEIND As Long

Dim clavesPos() As String          ' claves reales del combo de posiciones
Dim nClavesPos As Long

Dim gN As String                   ' dynpro de SAPLMEGUI ya descubierto (0014, 0016...)
Dim gBaseCab As String             ' ruta de la cabecera ya descubierta
Dim gBaseDet As String             ' ruta del detalle de posicion ya descubierto
Dim pestValidez As String          ' pestana de cabecera con la validez
Dim pestTolerancia As String       ' pestana de posicion con la tolerancia
Dim pestTextos As String           ' pestana de posicion con los textos
Dim logFila As Long

' =====================================================================
'                          LA MACRO DEL MES
'  PEDIDOS_MES_SIGUIENTE: del 01 del mes que viene al ultimo dia de ese mes
' =====================================================================
Sub PEDIDOS_MES_SIGUIENTE()
    Ejecutar 1
End Sub

' ---------------------------------------------------------------------
Private Sub Ejecutar(desplazamiento As Long)
    Dim opcion As String, titulo As String

    Set ws = ThisWorkbook.Sheets(HOJA)
    FijarPeriodo desplazamiento
    titulo = "Pedidos SAP   " & d1 & "  a  " & d2

    opcion = InputBox("PERIODO QUE SE VA A USAR:" & vbCrLf & _
                      "   desde " & d1 & "   hasta " & d2 & vbCrLf & _
                      "   entrega: " & dEntrega & vbCrLf & vbCrLf & _
                      "Que deseas hacer?" & vbCrLf & vbCrLf & _
                      "1 = Crear PEDIDOS ABIERTOS (ME31K)" & vbCrLf & _
                      "2 = Crear PEDIDOS de compra (ME21N)" & vbCrLf & _
                      "3 = ACTUALIZAR pedidos ya creados (ME22N):" & vbCrLf & _
                      "      validez + fecha de entrega + " & TOL_EXCESO & " + calidad" & vbCrLf & _
                      "4 = ME31K y despues ME21N", titulo, "3")
    If Trim(opcion) = "" Then Exit Sub

    If Not ConectarSAP() Then Exit Sub
    AbrirRegistro

    Select Case Trim(opcion)
        Case "1": ProcesarBloques "CONTRATO"
        Case "2": ProcesarBloques "PEDIDO"
        Case "3": ProcesarBloques "ACTUALIZAR"
        Case "4": ProcesarBloques "CONTRATO": ProcesarBloques "PEDIDO"
        Case Else
            MsgBox "Opcion no valida.", vbExclamation
            Exit Sub
    End Select

    ThisWorkbook.Save
    MsgBox "Proceso terminado." & vbCrLf & vbCrLf & _
           "Periodo usado: " & d1 & " a " & d2 & vbCrLf & _
           "Revisa el detalle en la hoja " & HOJA_LOG & ".", vbInformation, titulo
End Sub

' El mes completo: dia 01 hasta el ultimo dia (28, 29, 30 o 31, lo calcula solo)
Private Sub FijarPeriodo(desplazamiento As Long)
    fIni = DateSerial(Year(Date), Month(Date) + desplazamiento, 1)
    fFin = DateSerial(Year(Date), Month(Date) + desplazamiento + 1, 0)
    d1 = FSap(fIni)
    d2 = FSap(fFin)
    If ENTREGA_AL_CIERRE Then
        dEntrega = d2
    Else
        dEntrega = d1
    End If
End Sub

' =====================================================================
'                            RUTINAS BASE
' =====================================================================
Private Function FSap(d As Date) As String
    Dim dd As String, mm As String, aa As String
    dd = Right("0" & Day(d), 2)
    mm = Right("0" & Month(d), 2)
    aa = CStr(Year(d))
    Select Case UCase(FORMATO_FECHA)
        Case "MM/DD/YYYY": FSap = mm & "/" & dd & "/" & aa
        Case "DD/MM/YYYY": FSap = dd & "/" & mm & "/" & aa
        Case "YYYY-MM-DD": FSap = aa & "-" & mm & "-" & dd
        Case "DD-MM-YYYY": FSap = dd & "-" & mm & "-" & aa
        Case Else:         FSap = dd & "." & mm & "." & aa
    End Select
End Function

Private Function FNum(v As Variant) As String
    Dim s As String
    s = Trim(CStr(v))
    If SEP_DECIMAL = "," Then
        s = Replace(s, ".", ",")
    Else
        s = Replace(s, ",", ".")
    End If
    FNum = s
End Function

Private Function LimpiarNumero(v As Variant) As String
    Dim s As String, i As Long, c As String, r As String
    s = Trim(CStr(v))
    For i = 1 To Len(s)
        c = Mid(s, i, 1)
        If c >= "0" And c <= "9" Then r = r & c
    Next i
    LimpiarNumero = r
End Function

Private Function ConectarSAP() As Boolean
    Dim SapGuiAuto As Object, app As Object, conn As Object
    ConectarSAP = False
    On Error Resume Next
    Set SapGuiAuto = GetObject("SAPGUI")
    On Error GoTo 0
    If SapGuiAuto Is Nothing Then
        MsgBox "SAP GUI no esta abierto.", vbCritical
        Exit Function
    End If
    On Error Resume Next
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

Private Sub WaitSeconds(segundos As Double)
    Dim t As Double
    t = Timer + segundos
    Do While Timer < t
        DoEvents
    Loop
End Sub

Private Sub SetText(id As String, valor As String)
    On Error Resume Next
    session.findById(id).Text = valor
    On Error GoTo 0
End Sub

Private Sub TrySelect(id As String)
    On Error Resume Next
    session.findById(id).Selected = True
    On Error GoTo 0
End Sub

Private Function Sbar() As String
    Dim t As String
    On Error Resume Next
    t = session.findById("wnd[0]/sbar").Text
    On Error GoTo 0
    Sbar = Trim(t)
End Function

Private Function SbarTipo() As String
    Dim t As String
    On Error Resume Next
    t = session.findById("wnd[0]/sbar").MessageType
    On Error GoTo 0
    SbarTipo = UCase(Trim(t))
End Function

Private Function ExtraerNumero(txt As String) As String
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

' Confirma ventanas emergentes con Enter (mensajes informativos)
Private Sub ConfirmarPopups()
    Dim intento As Long, w1 As Object
    For intento = 1 To 5
        Set w1 = Nothing
        On Error Resume Next
        Set w1 = session.findById("wnd[1]")
        On Error GoTo 0
        If w1 Is Nothing Then Exit Sub
        On Error Resume Next
        session.findById("wnd[1]/tbar[0]/btn[0]").press
        On Error GoTo 0
        WaitSeconds 0.4
    Next intento
End Sub

' Cierra con F12 una ventana emergente que se quedo pegada
Private Sub CerrarPopups()
    Dim intento As Long, w1 As Object
    For intento = 1 To 5
        Set w1 = Nothing
        On Error Resume Next
        Set w1 = session.findById("wnd[1]")
        On Error GoTo 0
        If w1 Is Nothing Then Exit Sub
        On Error Resume Next
        session.findById("wnd[1]").sendVKey 12
        On Error GoTo 0
        WaitSeconds 0.4
    Next intento
End Sub

' Sale de la transaccion dejando la sesion limpia para el siguiente pedido
Private Sub SalirTransaccion()
    CerrarPopups
    On Error Resume Next
    session.findById("wnd[0]/tbar[0]/okcd").Text = "/n"
    session.findById("wnd[0]").sendVKey 0
    On Error GoTo 0
    WaitSeconds 0.8
    ConfirmarPopups
End Sub

' =====================================================================
'  NAVEGACION DE ME21N / ME22N (pantalla SAPLMEGUI)
'  El numero de dynpro (0010, 0014, 0016...) cambia de un sistema a otro
'  y hasta de una sesion a otra: por eso se busca y se recuerda.
' =====================================================================
Private Function FindIdVar(plantilla As String) As Object
    Dim nums As Variant, i As Long, o As Object

    If InStr(plantilla, "{N}") = 0 Then
        Set o = Nothing
        On Error Resume Next
        Set o = session.findById(plantilla)
        On Error GoTo 0
        Set FindIdVar = o
        Exit Function
    End If

    If gN <> "" Then
        Set o = Nothing
        On Error Resume Next
        Set o = session.findById(Replace(plantilla, "{N}", gN))
        On Error GoTo 0
        If Not o Is Nothing Then
            Set FindIdVar = o
            Exit Function
        End If
    End If

    nums = Array("0010", "0013", "0014", "0015", "0016", "0017", "0018", "0019", "0020")
    For i = 0 To UBound(nums)
        Set o = Nothing
        On Error Resume Next
        Set o = session.findById(Replace(plantilla, "{N}", CStr(nums(i))))
        On Error GoTo 0
        If Not o Is Nothing Then
            gN = CStr(nums(i))
            Set FindIdVar = o
            Exit Function
        End If
    Next i
    Set FindIdVar = Nothing
End Function

Private Sub PressVar(plantilla As String)
    Dim o As Object
    Set o = FindIdVar(plantilla)
    If Not o Is Nothing Then
        On Error Resume Next
        o.press
        On Error GoTo 0
    End If
End Sub

' Deja abierta una de las tres bandas de la pantalla
'   1 = Cabecera      2 = Sintesis de posiciones      3 = Detalle de posicion
' Solo pulsa el boton si la banda esta cerrada: asi no la cierra sin querer.
Private Function AsegurarSeccion(numSub As Long) As Boolean
    Dim intento As Long, base As String, o As Object
    base = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB" & numSub & ":SAPLMEVIEWS:1100/"
    For intento = 1 To 4
        Set o = FindIdVar(base & "subSUB2:SAPLMEVIEWS:1200")
        If Not o Is Nothing Then
            AsegurarSeccion = True
            Exit Function
        End If
        If intento Mod 2 = 1 Then
            PressVar base & "subSUB1:SAPLMEVIEWS:4002/btnDYN_4000-BUTTON"
        Else
            PressVar base & "subSUB1:SAPLMEVIEWS:4000/btnDYN_4000-BUTTON"
        End If
        WaitSeconds 0.8
    Next intento
    AsegurarSeccion = False
End Function

' Cierra una banda para que la grilla muestre mas lineas
Private Sub ColapsarSeccion(numSub As Long)
    Dim base As String, o As Object
    base = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB" & numSub & ":SAPLMEVIEWS:1100/"
    Set o = FindIdVar(base & "subSUB2:SAPLMEVIEWS:1200")
    If o Is Nothing Then Exit Sub
    PressVar base & "subSUB1:SAPLMEVIEWS:4000/btnDYN_4000-BUTTON"
    PressVar base & "subSUB1:SAPLMEVIEWS:4002/btnDYN_4000-BUTTON"
    WaitSeconds 0.6
End Sub

' ------------------------- rutas base --------------------------------
Private Function BaseCabecera() As String
    Dim cand As Variant, i As Long, o As Object, r As String
    If gBaseCab <> "" Then
        BaseCabecera = gBaseCab
        Exit Function
    End If
    cand = Array("1102", "1101", "1100")
    For i = 0 To UBound(cand)
        r = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:" & _
            cand(i) & "/tabsHEADER_DETAIL"
        Set o = FindIdVar(r)
        If Not o Is Nothing Then
            gBaseCab = r & "/"
            BaseCabecera = gBaseCab
            Exit Function
        End If
    Next i
    BaseCabecera = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/"
End Function

Private Function BaseDetalle() As String
    Dim cand As Variant, i As Long, o As Object, r As String
    If gBaseDet <> "" Then
        BaseDetalle = gBaseDet
        Exit Function
    End If
    cand = Array("1303", "1302", "1301")
    For i = 0 To UBound(cand)
        r = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:" & _
            cand(i) & "/tabsITEM_DETAIL"
        Set o = FindIdVar(r)
        If Not o Is Nothing Then
            gBaseDet = r & "/"
            BaseDetalle = gBaseDet
            Exit Function
        End If
    Next i
    BaseDetalle = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/"
End Function

Private Function BaseGrilla() As String
    BaseGrilla = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/"
End Function

Private Function Grilla() As Object
    Set Grilla = FindIdVar(Left(BaseGrilla(), Len(BaseGrilla()) - 1))
End Function

' --------------------- pestanas de la cabecera -----------------------
' Un campo dentro de una pestana de cabecera, probando las dos formas
' de subpantalla y los dos tipos de campo.
Private Function CampoCabecera(pest As String, subPant As String, campo As String) As Object
    Dim ssub As Variant, tipo As Variant, i As Long, j As Long, o As Object
    ssub = Array("ssubTABSTRIPCONTROL2SUB:", "ssubTABSTRIPCONTROL1SUB:")
    tipo = Array("ctxt", "txt")
    For i = 0 To UBound(ssub)
        For j = 0 To UBound(tipo)
            Set o = FindIdVar(BaseCabecera() & "tabp" & pest & "/" & ssub(i) & subPant & "/" & tipo(j) & campo)
            If Not o Is Nothing Then
                Set CampoCabecera = o
                Exit Function
            End If
        Next j
    Next i
    Set CampoCabecera = Nothing
End Function

Private Sub SeleccionarPestanaCab(pest As String)
    Dim o As Object
    Set o = FindIdVar(BaseCabecera() & "tabp" & pest)
    If o Is Nothing Then Exit Sub
    On Error Resume Next
    o.Select
    On Error GoTo 0
    WaitSeconds 0.5
End Sub

' Busca en que pestana de cabecera vive un campo. Primero prueba TABHDT7
' (la que salio en la grabacion) y despues recorre de la 1 a la 20.
Private Function BuscarPestanaCab(subPant As String, campo As String) As String
    Dim i As Long, nombre As String, o As Object

    If pestValidez <> "" Then
        Set o = CampoCabecera(pestValidez, subPant, campo)
        If o Is Nothing Then
            SeleccionarPestanaCab pestValidez
            Set o = CampoCabecera(pestValidez, subPant, campo)
        End If
        If Not o Is Nothing Then
            BuscarPestanaCab = pestValidez
            Exit Function
        End If
    End If

    For i = 0 To 20
        If i = 0 Then
            nombre = "TABHDT7"
        Else
            nombre = "TABHDT" & i
        End If
        Set o = FindIdVar(BaseCabecera() & "tabp" & nombre)
        If Not o Is Nothing Then
            SeleccionarPestanaCab nombre
            Set o = CampoCabecera(nombre, subPant, campo)
            If Not o Is Nothing Then
                pestValidez = nombre
                BuscarPestanaCab = nombre
                Exit Function
            End If
        End If
    Next i
    BuscarPestanaCab = ""
End Function

' ------------------ pestanas del detalle de posicion -----------------
Private Function CampoDetalle(pest As String, subPant As String, campo As String) As Object
    Dim ssub As Variant, tipo As Variant, i As Long, j As Long, o As Object
    ssub = Array("ssubTABSTRIPCONTROL1SUB:", "ssubTABSTRIPCONTROL2SUB:")
    tipo = Array("txt", "ctxt")
    For i = 0 To UBound(ssub)
        For j = 0 To UBound(tipo)
            Set o = FindIdVar(BaseDetalle() & "tabp" & pest & "/" & ssub(i) & subPant & "/" & tipo(j) & campo)
            If Not o Is Nothing Then
                Set CampoDetalle = o
                Exit Function
            End If
        Next j
    Next i
    Set CampoDetalle = Nothing
End Function

Private Sub SeleccionarPestanaDet(pest As String)
    Dim o As Object
    Set o = FindIdVar(BaseDetalle() & "tabp" & pest)
    If o Is Nothing Then Exit Sub
    On Error Resume Next
    o.Select
    On Error GoTo 0
    WaitSeconds 0.5
End Sub

' Busca la pestana de posicion donde vive un campo, empezando por la
' que ya se encontro antes (asi solo se busca en el primer pedido).
Private Function BuscarPestanaDet(subPant As String, campo As String, _
                                  ByRef cache As String, sugerida As String) As String
    Dim i As Long, nombre As String, o As Object

    If cache <> "" Then
        Set o = CampoDetalle(cache, subPant, campo)
        If o Is Nothing Then
            SeleccionarPestanaDet cache
            Set o = CampoDetalle(cache, subPant, campo)
        End If
        If Not o Is Nothing Then
            BuscarPestanaDet = cache
            Exit Function
        End If
    End If

    For i = 0 To 20
        If i = 0 Then
            nombre = sugerida
        Else
            nombre = "TABIDT" & i
        End If
        Set o = FindIdVar(BaseDetalle() & "tabp" & nombre)
        If Not o Is Nothing Then
            SeleccionarPestanaDet nombre
            Set o = CampoDetalle(nombre, subPant, campo)
            If Not o Is Nothing Then
                cache = nombre
                BuscarPestanaDet = nombre
                Exit Function
            End If
        End If
    Next i
    BuscarPestanaDet = ""
End Function

' ------------------------- grilla de posiciones ----------------------
Private Sub ReiniciarColumnas()
    Dim i As Long
    For i = 0 To 80
        mapCampos(i) = ""
    Next i
    cEMATN = -1: cMENGE = -1: cMEINS = -1: cNETPR = -1
    cWAERS = -1: cKONNR = -1: cKTPNR = -1: cEEIND = -1
End Sub

' Ubica la columna de un campo: primero el indice de la grabacion y si
' no coincide escanea de la 0 a la 60.
Private Function DescubrirCol(campoConTipo As String, idxSugerido As Long) As Long
    Dim c As Long, o As Object, campo As String, tipo As String
    If Left(campoConTipo, 4) = "ctxt" Then
        tipo = "ctxt": campo = Mid(campoConTipo, 5)
    Else
        tipo = "txt": campo = Mid(campoConTipo, 4)
    End If

    Set o = FindIdVar(BaseGrilla() & tipo & campo & "[" & idxSugerido & ",0]")
    If Not o Is Nothing Then
        mapCampos(idxSugerido) = tipo & campo
        DescubrirCol = idxSugerido
        Exit Function
    End If

    For c = 0 To 60
        Set o = FindIdVar(BaseGrilla() & tipo & campo & "[" & c & ",0]")
        If Not o Is Nothing Then
            mapCampos(c) = tipo & campo
            DescubrirCol = c
            Exit Function
        End If
    Next c
    DescubrirCol = -1
End Function

Private Sub EscribirCelda(col As Long, fila As Long, valor As String)
    Dim o As Object
    If col < 0 Then Exit Sub
    If mapCampos(col) = "" Then Exit Sub
    Set o = FindIdVar(BaseGrilla() & mapCampos(col) & "[" & col & "," & fila & "]")
    If o Is Nothing Then Exit Sub
    On Error Resume Next
    o.Text = valor
    On Error GoTo 0
End Sub

Private Function LeerCelda(col As Long, fila As Long) As String
    Dim o As Object
    LeerCelda = ""
    If col < 0 Then Exit Function
    If mapCampos(col) = "" Then Exit Function
    Set o = FindIdVar(BaseGrilla() & mapCampos(col) & "[" & col & "," & fila & "]")
    If o Is Nothing Then Exit Function
    On Error Resume Next
    LeerCelda = Trim(o.Text)
    On Error GoTo 0
End Function

' =====================================================================
'  LO QUE ANTES SE HACIA A MANO
' =====================================================================

' ---- Cabecera > Datos adicionales: validez desde d1 hasta d2 --------
Private Function PonerValidezCabecera() As Boolean
    Dim o As Object, pest As String

    PonerValidezCabecera = False
    If Not AsegurarSeccion(1) Then Exit Function

    pest = BuscarPestanaCab("SAPLMEGUI:1229", "MEPO1229-KDATB")
    If pest = "" Then Exit Function

    Set o = CampoCabecera(pest, "SAPLMEGUI:1229", "MEPO1229-KDATB")
    If o Is Nothing Then Exit Function
    On Error Resume Next
    o.Text = d1
    On Error GoTo 0

    Set o = CampoCabecera(pest, "SAPLMEGUI:1229", "MEPO1229-KDATE")
    If Not o Is Nothing Then
        On Error Resume Next
        o.Text = d2
        On Error GoTo 0
    End If

    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 0.8
    ConfirmarPopups

    ' comprobar que quedo escrito
    Set o = CampoCabecera(pest, "SAPLMEGUI:1229", "MEPO1229-KDATB")
    If o Is Nothing Then Exit Function
    On Error Resume Next
    If Trim(o.Text) = d1 Then PonerValidezCabecera = True
    On Error GoTo 0
End Function

' ---- Fecha de entrega en TODAS las posiciones de la grilla ----------
' Devuelve cuantas posiciones tiene el pedido.
Private Function PonerFechasEntrega(fecha As String, ByRef escritas As Long) As Long
    Dim tbl As Object, n As Long, filaVis As Long, filasVis As Long
    Dim scrollPos As Long, mat As String

    PonerFechasEntrega = 0
    escritas = 0
    If Not AsegurarSeccion(2) Then Exit Function

    Set tbl = Grilla()
    If tbl Is Nothing Then Exit Function

    cEMATN = DescubrirCol("ctxtMEPO1211-EMATN", 4)
    cEEIND = DescubrirCol("ctxtMEPO1211-EEIND", 9)
    If cEMATN < 0 Then Exit Function

    filasVis = tbl.VisibleRowCount
    scrollPos = tbl.VerticalScrollbar.Position
    n = 0
    Do While n < MAX_POSICIONES
        filaVis = n - scrollPos
        If filaVis >= filasVis Then
            On Error Resume Next
            tbl.VerticalScrollbar.Position = n
            On Error GoTo 0
            WaitSeconds 0.4
            Set tbl = Grilla()
            If tbl Is Nothing Then Exit Do
            scrollPos = tbl.VerticalScrollbar.Position
            filaVis = n - scrollPos
            If filaVis < 0 Or filaVis >= filasVis Then Exit Do
        End If
        mat = LeerCelda(cEMATN, filaVis)
        If mat = "" Then Exit Do
        If cEEIND >= 0 Then
            EscribirCelda cEEIND, filaVis, fecha
            escritas = escritas + 1
        End If
        n = n + 1
    Loop

    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1
    ConfirmarPopups
    PonerFechasEntrega = n
End Function

' Ruta del combo que elige la posicion en el detalle de abajo
Private Function RutaComboPos() As String
    RutaComboPos = "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB1:SAPLMEGUI:6000/cmbDYN_6000-LIST"
End Function

' Lee del combo las claves de todas las posiciones del pedido, en vez de
' suponer el formato ("   1", "0001", "10"...), que cambia entre sistemas.
Private Function CargarClavesPosiciones() As Long
    Dim o As Object, col As Object, ent As Object, i As Long, n As Long, k As String

    nClavesPos = 0
    CargarClavesPosiciones = 0

    Set o = FindIdVar(RutaComboPos())
    If o Is Nothing Then Exit Function

    Set col = Nothing
    On Error Resume Next
    Set col = o.Entries
    On Error GoTo 0
    If col Is Nothing Then Exit Function

    n = 0
    On Error Resume Next
    n = col.Count
    On Error GoTo 0
    If n <= 0 Then Exit Function
    If n > MAX_POSICIONES Then n = MAX_POSICIONES

    ReDim clavesPos(0 To n - 1)
    For i = 0 To n - 1
        k = ""
        Set ent = Nothing
        On Error Resume Next
        Set ent = col.ElementAt(i)
        If ent Is Nothing Then Set ent = col.Item(i)
        k = ent.Key
        On Error GoTo 0
        clavesPos(i) = k
    Next i

    nClavesPos = n
    CargarClavesPosiciones = n
End Function

' ---- Ir a la posicion numero n del detalle de abajo -----------------
Private Function IrAPosicion(numPos As Long) As Boolean
    Dim o As Object, clave As String, leida As String
    Dim ruta As String

    ruta = RutaComboPos()
    If numPos >= 1 And numPos <= nClavesPos Then
        clave = clavesPos(numPos - 1)
    Else
        clave = Right("    " & CStr(numPos), 4)
    End If

    Set o = FindIdVar(ruta)
    If Not o Is Nothing Then
        On Error Resume Next
        o.Key = clave
        On Error GoTo 0
        WaitSeconds 0.7
        ConfirmarPopups
        Set o = FindIdVar(ruta)
        If Not o Is Nothing Then
            leida = ""
            On Error Resume Next
            leida = o.Key
            On Error GoTo 0
            If Trim(leida) = Trim(clave) Then
                IrAPosicion = True
                Exit Function
            End If
        End If
    End If

    ' si el combo no responde, usar el boton "posicion siguiente"
    If numPos > 1 Then
        PressVar "wnd[0]/usr/subSUB0:SAPLMEGUI:{N}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB1:SAPLMEGUI:6000/btn%#AUTOTEXT002"
        WaitSeconds 0.7
        ConfirmarPopups
    End If
    IrAPosicion = True
End Function

' ---- Tolerancia de exceso (99,9) en la posicion abierta -------------
Private Function PonerTolerancia() As Boolean
    Dim o As Object, pest As String, intento As Long, valor As String

    PonerTolerancia = False
    valor = FNum(TOL_EXCESO)

    For intento = 1 To 3
        pest = BuscarPestanaDet("SAPLMEGUI:1313", "MEPO1313-UEBTO", pestTolerancia, "TABIDT6")
        If pest <> "" Then
            SeleccionarPestanaDet pest
            Set o = CampoDetalle(pest, "SAPLMEGUI:1313", "MEPO1313-UEBTO")
            If Not o Is Nothing Then
                On Error Resume Next
                o.SetFocus
                o.Text = valor
                On Error GoTo 0
                Set o = CampoDetalle(pest, "SAPLMEGUI:1313", "MEPO1313-UEBTO")
                If Not o Is Nothing Then
                    On Error Resume Next
                    If InStr(o.Text, "99") > 0 Then PonerTolerancia = True
                    On Error GoTo 0
                End If
                If PonerTolerancia Then Exit Function
            End If
        End If
        WaitSeconds 0.4
    Next intento
End Function

' ---- Texto de posicion (la calidad) en la posicion abierta ----------
Private Function PonerTextoPosicion(valor As String) As Boolean
    Dim arbol As Object, edi As Object, pest As String
    Dim intento As Long, leido As String, ruta As String

    If Trim(valor) = "" Then
        PonerTextoPosicion = True
        Exit Function
    End If
    PonerTextoPosicion = False

    For intento = 1 To 3
        pest = BuscarPestanaDetTextos()
        If pest <> "" Then
            SeleccionarPestanaDet pest
            ruta = BaseDetalle() & "tabp" & pest & "/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1329/subTEXTS:SAPLMMTE:0200/"

            Set arbol = FindIdVar(ruta & "cntlTEXT_TYPES_0200/shell")
            If Not arbol Is Nothing Then SeleccionarNodoTexto arbol

            Set edi = FindIdVar(ruta & "subEDITOR:SAPLMMTE:0201/cntlTEXT_EDITOR_0201/shellcont/shell")
            If Not edi Is Nothing Then
                leido = ""
                On Error Resume Next
                edi.SetFocus
                edi.Text = valor & vbCr
                edi.setSelectionIndexes 1, 1
                leido = edi.Text
                On Error GoTo 0
                If InStr(leido, valor) > 0 Then
                    PonerTextoPosicion = True
                    Exit Function
                End If
            End If
        End If
        WaitSeconds 0.4
    Next intento
End Function

Private Function BuscarPestanaDetTextos() As String
    Dim i As Long, nombre As String, o As Object

    If pestTextos <> "" Then
        Set o = FindIdVar(BaseDetalle() & "tabp" & pestTextos & "/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1329/subTEXTS:SAPLMMTE:0200/cntlTEXT_TYPES_0200/shell")
        If o Is Nothing Then
            SeleccionarPestanaDet pestTextos
            Set o = FindIdVar(BaseDetalle() & "tabp" & pestTextos & "/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1329/subTEXTS:SAPLMMTE:0200/cntlTEXT_TYPES_0200/shell")
        End If
        If Not o Is Nothing Then
            BuscarPestanaDetTextos = pestTextos
            Exit Function
        End If
    End If

    For i = 0 To 20
        If i = 0 Then
            nombre = "TABIDT14"
        Else
            nombre = "TABIDT" & i
        End If
        Set o = FindIdVar(BaseDetalle() & "tabp" & nombre)
        If Not o Is Nothing Then
            SeleccionarPestanaDet nombre
            Set o = FindIdVar(BaseDetalle() & "tabp" & nombre & "/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1329/subTEXTS:SAPLMMTE:0200/cntlTEXT_TYPES_0200/shell")
            If Not o Is Nothing Then
                pestTextos = nombre
                BuscarPestanaDetTextos = nombre
                Exit Function
            End If
        End If
    Next i
    BuscarPestanaDetTextos = ""
End Function

' Marca el nodo "Texto de posicion" del arbol de textos
Private Sub SeleccionarNodoTexto(arbol As Object)
    Dim col As Object, i As Long, n As Long, k As String, txt As String

    On Error Resume Next
    arbol.selectedNode = NODO_TEXTO_POS
    On Error GoTo 0
    WaitSeconds 0.4

    k = ""
    On Error Resume Next
    k = arbol.selectedNode
    On Error GoTo 0
    If k = NODO_TEXTO_POS Then Exit Sub

    Set col = Nothing
    On Error Resume Next
    Set col = arbol.GetAllNodeKeys()
    On Error GoTo 0
    If col Is Nothing Then Exit Sub

    n = 0
    On Error Resume Next
    n = col.Count
    On Error GoTo 0

    For i = 0 To n - 1
        k = "": txt = ""
        On Error Resume Next
        k = col.ElementAt(i)
        txt = UCase(arbol.GetNodeTextByKey(k))
        On Error GoTo 0
        If InStr(txt, "POSICI") > 0 Or InStr(txt, "ITEM TEXT") > 0 Then
            On Error Resume Next
            arbol.selectedNode = k
            On Error GoTo 0
            WaitSeconds 0.4
            Exit Sub
        End If
    Next i
End Sub

' Recorre las posiciones poniendo tolerancia y texto en todas
' Devuelve "n tolerancias / m textos" para el registro
Private Function RecorrerPosiciones(ByVal nPos As Long, calidad As String) As String
    Dim n As Long, okTol As Long, okTxt As Long, total As Long

    If Not AsegurarSeccion(3) Then
        RecorrerPosiciones = "no se pudo abrir el detalle de posicion"
        Exit Function
    End If

    ' cuantas posiciones hay: lo que diga la grilla y, si el combo dice
    ' menos, el combo (asi no se toca una linea que no existe)
    CargarClavesPosiciones
    total = nPos
    If total <= 0 Then total = nClavesPos
    If nClavesPos > 0 And nClavesPos < total Then total = nClavesPos
    If total > MAX_POSICIONES Then total = MAX_POSICIONES
    If total <= 0 Then
        RecorrerPosiciones = "no se pudieron contar las posiciones"
        Exit Function
    End If
    nPos = total

    For n = 1 To total
        If IrAPosicion(n) Then
            If PonerTolerancia() Then okTol = okTol + 1
            If PonerTextoPosicion(calidad) Then okTxt = okTxt + 1
        End If
    Next n

    If Trim(calidad) = "" Then
        RecorrerPosiciones = FNum(TOL_EXCESO) & " en " & okTol & "/" & nPos & _
                             " posiciones, sin calidad que escribir"
    Else
        RecorrerPosiciones = FNum(TOL_EXCESO) & " en " & okTol & "/" & nPos & _
                             " posiciones, calidad " & calidad & " en " & okTxt & "/" & nPos
    End If
End Function

' =====================================================================
'  RECORRIDO DE LA PLANILLA (un bloque por proveedor)
' =====================================================================
Private Sub ProcesarBloques(modo As String)
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

            If finBloque >= iniBloque Then
                Select Case modo
                    Case "CONTRATO":   CrearContrato iniBloque, finBloque
                    Case "PEDIDO":     CrearPedido iniBloque, finBloque
                    Case "ACTUALIZAR": ActualizarPedido iniBloque, finBloque
                End Select
            End If
            fila = finBloque + 1
        Else
            fila = fila + 1
        End If
    Loop
End Sub

' =====================================================================
'  ME22N - ACTUALIZAR UN PEDIDO YA CREADO
'  (esto es lo que se hacia posicion por posicion a mano)
' =====================================================================
Private Sub ActualizarPedido(f1 As Long, f2 As Long)
    Dim oc As String, calidad As String, proveedor As String
    Dim nPos As Long, nFechas As Long, detalle As String

    oc = LimpiarNumero(ws.Cells(f1, C_OC).Value)
    proveedor = Trim(CStr(ws.Cells(f1, C_PRV).Value))
    calidad = Trim(CStr(ws.Cells(f1, C_CAL).Value))
    If calidad <> "" Then calidad = PREFIJO_CALIDAD & calidad

    If oc = "" Then
        Registrar f1, "", proveedor, "OMITIDO", "El bloque no tiene numero de pedido en la columna J"
        Exit Sub
    End If

    ReiniciarColumnas
    If Not AbrirPedidoME22N(oc) Then
        Registrar f1, oc, proveedor, "ERROR", "No se pudo abrir el pedido. SAP dice: " & Sbar()
        SalirTransaccion
        Exit Sub
    End If

    ' 1) validez en Datos adicionales de la cabecera
    If PonerValidezCabecera() Then
        detalle = "validez " & d1 & " a " & d2
    Else
        detalle = "NO se pudo escribir la validez de cabecera"
    End If
    ColapsarSeccion 1          ' cerrar la cabecera: la grilla muestra mas lineas

    ' 2) fecha de entrega en todas las posiciones
    nPos = PonerFechasEntrega(dEntrega, nFechas)
    If nPos = 0 Then
        detalle = detalle & " | NO se leyeron posiciones en la grilla"
        nPos = f2 - f1 + 1
    ElseIf nFechas = 0 Then
        detalle = detalle & " | " & nPos & " posiciones, pero la columna Fecha entrega" & _
                  " no esta visible en la sintesis: NO se cambio la entrega"
    Else
        detalle = detalle & " | entrega " & dEntrega & " en " & nFechas & "/" & nPos & " posiciones"
    End If

    ' 3) tolerancia y calidad, posicion por posicion
    detalle = detalle & " | " & RecorrerPosiciones(nPos, calidad)

    ' 4) grabar
    If GUARDAR_AUTO Then
        If GrabarME22N(oc) Then
            Registrar f1, oc, proveedor, "OK", detalle & " | " & Sbar()
        Else
            Registrar f1, oc, proveedor, "REVISAR", detalle & " | SAP dice: " & Sbar()
            SalirTransaccion
        End If
    Else
        MsgBox "Pedido " & oc & " (" & proveedor & ") preparado." & vbCrLf & vbCrLf & _
               detalle & vbCrLf & vbCrLf & _
               "Revisa en SAP y graba con Ctrl+S. Despues pulsa Aceptar para seguir.", _
               vbInformation, "Revision manual - ME22N"
        Registrar f1, oc, proveedor, "MANUAL", detalle
    End If
End Sub

' Abre en ME22N el pedido indicado y comprueba que es ese y no otro
Private Function AbrirPedidoME22N(oc As String) As Boolean
    Dim o As Object, intento As Long, titulo As String

    AbrirPedidoME22N = False

    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME22N"
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1.5
    ConfirmarPopups

    ' ME22N abre el ultimo pedido tratado: hay que pedir el nuestro
    Set o = CampoSeleccionPedido()
    If o Is Nothing Then
        On Error Resume Next
        session.findById("wnd[0]/tbar[1]/btn[17]").press     ' Otro documento
        On Error GoTo 0
        WaitSeconds 1.2
        Set o = CampoSeleccionPedido()
    End If
    If o Is Nothing Then Exit Function

    On Error Resume Next
    o.Text = oc
    session.findById("wnd[1]/tbar[0]/btn[0]").press
    On Error GoTo 0
    WaitSeconds 1.5
    ConfirmarPopups

    For intento = 1 To 4
        titulo = ""
        On Error Resume Next
        titulo = session.findById("wnd[0]").Text
        On Error GoTo 0
        If InStr(titulo, oc) > 0 Then
            AbrirPedidoME22N = True
            Exit Function
        End If
        WaitSeconds 0.6
    Next intento

    CerrarPopups
End Function

Private Function CampoSeleccionPedido() As Object
    Dim ids As Variant, i As Long, o As Object
    ids = Array("wnd[1]/usr/subSUB0:SAPLMEGUI:0030/ctxtMEPO_SELECT-EBELN", _
                "wnd[1]/usr/subSUB0:SAPLMEGUI:0031/ctxtMEPO_SELECT-EBELN", _
                "wnd[1]/usr/subSUB0:SAPLMEGUI:0032/ctxtMEPO_SELECT-EBELN", _
                "wnd[1]/usr/ctxtMEPO_SELECT-EBELN", _
                "wnd[1]/usr/ctxtRM06E-BSTNR")
    For i = 0 To UBound(ids)
        Set o = Nothing
        On Error Resume Next
        Set o = session.findById(CStr(ids(i)))
        On Error GoTo 0
        If Not o Is Nothing Then
            Set CampoSeleccionPedido = o
            Exit Function
        End If
    Next i
    Set CampoSeleccionPedido = Nothing
End Function

Private Function GrabarME22N(oc As String) As Boolean
    Dim intento As Long, txt As String, nro As String

    GrabarME22N = False
    On Error Resume Next
    session.findById("wnd[0]/tbar[0]/btn[11]").press
    On Error GoTo 0
    WaitSeconds 1.5
    ConfirmarPopups

    For intento = 1 To 6
        txt = Sbar()
        nro = ExtraerNumero(txt)
        If SbarTipo() = "E" Or SbarTipo() = "A" Then Exit Function
        If nro = oc Then
            GrabarME22N = True
            Exit Function
        End If
        If nro <> "" And InStr(UCase(txt), "MODIFIC") > 0 Then
            GrabarME22N = True
            Exit Function
        End If
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 0.7
        ConfirmarPopups
    Next intento
End Function

' =====================================================================
'  ME31K - PEDIDO ABIERTO (contrato marco)
'  Escribe las posiciones directo en la tabla, graba y guarda el numero
'  en la columna H.
' =====================================================================
Private Sub CrearContrato(f1 As Long, f2 As Long)
    Dim proveedor As String, moneda As String, valTotal As String
    Dim i As Long, nro As String

    proveedor = Trim(CStr(ws.Cells(f1, C_PRV).Value))
    valTotal = FNum(ws.Cells(f1, C_VAL).Value)
    moneda = Trim(CStr(ws.Cells(f1, C_MON).Value))

    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME31K"
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 0.9

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

    ' Validez: dia 01 del mes elegido hasta el ultimo dia de ese mes
    SetText "wnd[0]/usr/ctxtRM06E-VEDAT", d1
    SetText "wnd[0]/usr/ctxtRM06E-KDATB", d1
    SetText "wnd[0]/usr/ctxtRM06E-KDATE", d2
    SetText "wnd[0]/usr/ctxtEKKO-KDATB", d1
    SetText "wnd[0]/usr/ctxtEKKO-KDATE", d2
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1

    ' ---- Cabecera: repetir fechas y valor ----
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

    ' ---- Posiciones: escritura directa en la tabla ----
    Dim tbl As Object, colMat As Long, colCtd As Long, colUm As Long, colPrc As Long
    Dim filasVis As Long, pos As Long, filaTbl As Long

    Set tbl = GetTablaME31K()
    If tbl Is Nothing Then
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 1
        Set tbl = GetTablaME31K()
    End If
    If tbl Is Nothing Then
        Registrar f1, "", proveedor, "ERROR", "No aparecio la tabla de posiciones de ME31K"
        MsgBox "No encontre la tabla de posiciones de ME31K en pantalla." & vbCrLf & _
               "Revisa en que pantalla quedo SAP.", vbCritical
        Exit Sub
    End If

    colMat = ColTbl(tbl, "EKPO-EMATN")
    If colMat = -1 Then colMat = ColTbl(tbl, "EKPO-MATNR")
    colCtd = ColTbl(tbl, "EKPO-KTMNG")
    If colCtd = -1 Then colCtd = ColTbl(tbl, "EKPO-MENGE")
    colUm = ColTbl(tbl, "EKPO-MEINS")
    colPrc = ColTbl(tbl, "EKPO-NETPR")

    filasVis = tbl.VisibleRowCount
    pos = 0
    For i = f1 To f2
        filaTbl = pos - tbl.VerticalScrollbar.Position
        If filaTbl >= filasVis Then
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

    If GUARDAR_AUTO Then
        GrabarYCapturar f1, proveedor, moneda
    Else
        MsgBox "Bloque del proveedor " & proveedor & " (" & moneda & ") cargado con " & _
               (f2 - f1 + 1) & " posiciones." & vbCrLf & vbCrLf & _
               "1. Revisa en SAP: materiales, cantidades, UMP y precios." & vbCrLf & _
               "2. Si esta correcto graba (Ctrl+S) y espera el mensaje con el numero." & vbCrLf & _
               "3. Recien entonces pulsa Aceptar aqui.", _
               vbInformation, "Revision manual - Pedido Abierto"

        nro = ExtraerNumero(Sbar())
        If nro = "" Then
            nro = InputBox("No pude capturar el numero automaticamente." & vbCrLf & _
                           "Mensaje SAP: " & Sbar() & vbCrLf & vbCrLf & _
                           "Escribe el numero del contrato (o deja vacio para omitir):", _
                           "Numero de Pedido Abierto")
        End If
        If Trim(nro) <> "" Then
            ws.Cells(f1, C_PED).Value = Trim(nro)
            Registrar f1, Trim(nro), proveedor, "OK", "Pedido abierto creado (manual)"
            ThisWorkbook.Save
        End If
    End If
End Sub

' Busca la tabla de posiciones de ME31K probando los nombres conocidos
Private Function GetTablaME31K() As Object
    Dim nombres As Variant, i As Long, t As Object
    nombres = Array("wnd[0]/usr/tblSAPMM06ETC_0220", _
                    "wnd[0]/usr/tblSAPMM06ETC_0120", _
                    "wnd[0]/usr/tblSAPMM06ETC_0201", _
                    "wnd[0]/usr/tblSAPMM06ETCTRL_0220")
    For i = 0 To UBound(nombres)
        Set t = Nothing
        On Error Resume Next
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
Private Function ColTbl(tbl As Object, nombre As String) As Long
    Dim c As Long, nm As String
    ColTbl = -1
    For c = 0 To 80
        nm = ""
        On Error Resume Next
        nm = tbl.GetCell(0, c).Name
        On Error GoTo 0
        If nm = "" Then Exit For
        If InStr(nm, nombre) > 0 Then
            ColTbl = c
            Exit Function
        End If
    Next c
End Function

' Graba el contrato, confirma los avisos y captura el numero
Private Sub GrabarYCapturar(f1 As Long, proveedor As String, moneda As String)
    Dim nro As String, intento As Long, w1 As Object, sbarTxt As String

    session.findById("wnd[0]/tbar[0]/btn[11]").press
    WaitSeconds 1

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
        sbarTxt = Sbar()
        nro = ExtraerNumero(sbarTxt)
        If nro <> "" Then Exit For
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 0.7
    Next intento

    If nro <> "" Then
        ws.Cells(f1, C_PED).Value = nro
        Registrar f1, nro, proveedor, "OK", "Pedido abierto creado, validez " & d1 & " a " & d2
        ThisWorkbook.Save
    Else
        Registrar f1, "", proveedor, "REVISAR", "No se capturo el numero. SAP dice: " & sbarTxt
        nro = InputBox("No pude capturar el numero del contrato del proveedor " & proveedor & _
                       " (" & moneda & ")." & vbCrLf & _
                       "Mensaje SAP: " & sbarTxt & vbCrLf & vbCrLf & _
                       "Revisa en SAP si quedo grabado y escribe el numero aqui" & vbCrLf & _
                       "(o deja vacio para omitir):", "Numero de Pedido Abierto")
        If Trim(nro) <> "" Then
            ws.Cells(f1, C_PED).Value = Trim(nro)
            ThisWorkbook.Save
        End If
    End If
End Sub

' =====================================================================
'  ME21N - PEDIDO DE COMPRA CONTRA EL PEDIDO ABIERTO
'  Carga toda la grilla de una vez, pone la validez en la cabecera y
'  despues la tolerancia y la calidad en cada posicion.
' =====================================================================
Private Sub CrearPedido(f1 As Long, f2 As Long)
    Dim calidad As String, contrato As String, proveedor As String, moneda As String
    Dim i As Long, n As Long, nItems As Long
    Dim tbl As Object, filasVis As Long, scrollPos As Long, filaVis As Long
    Dim detalle As String

    proveedor = Trim(CStr(ws.Cells(f1, C_PRV).Value))
    calidad = Trim(CStr(ws.Cells(f1, C_CAL).Value))
    If calidad <> "" Then calidad = PREFIJO_CALIDAD & calidad
    contrato = LimpiarNumero(ws.Cells(f1, C_PED).Value)
    moneda = Trim(CStr(ws.Cells(f1, C_MON).Value))
    nItems = f2 - f1 + 1

    If contrato = "" Then
        Registrar f1, "", proveedor, "OMITIDO", "El bloque no tiene Pedido Abierto en la columna H"
        Exit Sub
    End If

    ReiniciarColumnas
    session.findById("wnd[0]/tbar[0]/okcd").Text = "/nME21N"
    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1.5
    ConfirmarPopups

    If Not AsegurarSeccion(2) Then
        Registrar f1, "", proveedor, "ERROR", "No se pudo abrir la sintesis de posiciones de ME21N"
        Exit Sub
    End If

    Set tbl = Grilla()
    If tbl Is Nothing Then
        Registrar f1, "", proveedor, "ERROR", "No aparecio la grilla de posiciones de ME21N"
        Exit Sub
    End If

    cEMATN = DescubrirCol("ctxtMEPO1211-EMATN", 4)
    cMENGE = DescubrirCol("txtMEPO1211-MENGE", 6)
    cMEINS = DescubrirCol("ctxtMEPO1211-MEINS", 7)
    cNETPR = DescubrirCol("txtMEPO1211-NETPR", 10)
    cWAERS = DescubrirCol("txtMEPO1211-WAERS", 11)
    cKONNR = DescubrirCol("ctxtMEPO1211-KONNR", 27)
    cKTPNR = DescubrirCol("txtMEPO1211-KTPNR", 28)
    cEEIND = DescubrirCol("ctxtMEPO1211-EEIND", 9)

    If cKONNR = -1 Then
        Registrar f1, "", proveedor, "ERROR", "No esta la columna Contrato marco en la grilla"
        MsgBox "No pude ubicar la columna Contrato marco (Convenio) en la grilla." & vbCrLf & _
               "Activa la variante 'Convenio' en Parametrizaciones de tabla.", vbCritical
        Exit Sub
    End If

    filasVis = tbl.VisibleRowCount
    scrollPos = tbl.VerticalScrollbar.Position

    For i = f1 To f2
        n = i - f1
        filaVis = n - scrollPos
        If filaVis >= filasVis Then
            On Error Resume Next
            tbl.VerticalScrollbar.Position = n
            On Error GoTo 0
            WaitSeconds 0.4
            Set tbl = Grilla()
            If tbl Is Nothing Then Exit For
            scrollPos = tbl.VerticalScrollbar.Position
            filaVis = n - scrollPos
        End If
        EscribirCelda cEMATN, filaVis, Trim(CStr(ws.Cells(i, C_MAT).Value))
        EscribirCelda cMENGE, filaVis, FNum(ws.Cells(i, C_CAN).Value)
        EscribirCelda cMEINS, filaVis, Trim(CStr(ws.Cells(i, C_UMP).Value))
        EscribirCelda cNETPR, filaVis, FNum(ws.Cells(i, C_PRE).Value)
        EscribirCelda cWAERS, filaVis, moneda
        EscribirCelda cKONNR, filaVis, contrato
        EscribirCelda cKTPNR, filaVis, CStr((n + 1) * INTERVALO_POS)
        EscribirCelda cEEIND, filaVis, dEntrega
    Next i

    session.findById("wnd[0]").sendVKey 0
    WaitSeconds 1.5
    ConfirmarPopups

    ' ---- Cabecera > Datos adicionales: validez del mes ----
    If PonerValidezCabecera() Then
        detalle = "validez " & d1 & " a " & d2
    Else
        detalle = "NO se pudo escribir la validez de cabecera"
    End If
    ColapsarSeccion 1

    ' ---- Tolerancia y calidad en todas las posiciones ----
    detalle = detalle & " | entrega " & dEntrega & " | " & RecorrerPosiciones(nItems, calidad)

    If GUARDAR_AUTO Then
        GrabarPedidoYCapturar f1, proveedor, detalle
    Else
        MsgBox "Pedido del proveedor " & proveedor & " listo." & vbCrLf & vbCrLf & _
               detalle & vbCrLf & vbCrLf & _
               "Revisa y graba (Ctrl+S), despues pulsa Aceptar.", _
               vbInformation, "Revision manual - Pedido"
        Registrar f1, "", proveedor, "MANUAL", detalle
    End If
End Sub

Private Sub GrabarPedidoYCapturar(f1 As Long, proveedor As String, detalle As String)
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
        sbarTxt = Sbar()
        nro = ExtraerNumero(sbarTxt)
        If nro <> "" Then Exit For
        session.findById("wnd[0]").sendVKey 0
        WaitSeconds 0.7
    Next intento

    If nro <> "" Then
        ws.Cells(f1, C_OC).Value = nro
        Registrar f1, nro, proveedor, "OK", detalle & " | " & sbarTxt
        ThisWorkbook.Save
    Else
        Registrar f1, "", proveedor, "REVISAR", detalle & " | SAP dice: " & sbarTxt
        MsgBox "No pude confirmar el numero del pedido del proveedor " & proveedor & "." & vbCrLf & _
               "Mensaje SAP: " & sbarTxt & vbCrLf & "Revisa en SAP si quedo grabado.", vbExclamation
    End If
End Sub

' =====================================================================
'  REGISTRO: una linea por bloque en la hoja "Registro"
' =====================================================================
Private Sub AbrirRegistro()
    Dim hs As Worksheet

    logFila = 0
    If HOJA_LOG = "" Then Exit Sub

    Set hs = Nothing
    On Error Resume Next
    Set hs = ThisWorkbook.Sheets(HOJA_LOG)
    On Error GoTo 0
    If hs Is Nothing Then
        Set hs = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        hs.Name = HOJA_LOG
    End If

    If Trim(CStr(hs.Cells(1, 1).Value)) = "" Then
        hs.Cells(1, 1).Value = "Fecha y hora"
        hs.Cells(1, 2).Value = "Fila"
        hs.Cells(1, 3).Value = "Documento"
        hs.Cells(1, 4).Value = "Proveedor"
        hs.Cells(1, 5).Value = "Resultado"
        hs.Cells(1, 6).Value = "Detalle"
        hs.Cells(1, 7).Value = "Periodo"
        hs.Rows(1).Font.Bold = True
        hs.Columns(3).NumberFormat = "@"
    End If

    logFila = hs.Cells(hs.Rows.Count, 1).End(xlUp).Row
    If logFila < 1 Then logFila = 1
End Sub

Private Sub Registrar(fila As Long, documento As String, proveedor As String, _
                      resultado As String, detalle As String)
    Dim hs As Worksheet

    If HOJA_LOG = "" Then Exit Sub
    Set hs = Nothing
    On Error Resume Next
    Set hs = ThisWorkbook.Sheets(HOJA_LOG)
    On Error GoTo 0
    If hs Is Nothing Then Exit Sub

    logFila = logFila + 1
    hs.Cells(logFila, 1).Value = Now
    hs.Cells(logFila, 2).Value = fila
    hs.Cells(logFila, 3).Value = documento
    hs.Cells(logFila, 4).Value = proveedor
    hs.Cells(logFila, 5).Value = resultado
    hs.Cells(logFila, 6).Value = detalle
    hs.Cells(logFila, 7).Value = d1 & " a " & d2
End Sub
