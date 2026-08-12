Attribute VB_Name = "frmFacultad"
Attribute VB_Base = "0{4BC71A2E-C84B-4E77-8D0D-2932587BCEF4}{2FE1B668-A39F-44FA-BF3E-58848DE7E8D2}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub btnCancelar_Click()
Unload Me
Close
End Sub

MyFacultad = cbxCursos.Value
Anios = 2018
'MyFecha = cbxFechas.Value
Set LibroAc = Workbooks(ThisWorkbook.Name)

Set HojaAlu = LibroAlu.Sheets("alumnos")
Set RangoAlu = HojaAlu.UsedRange

RangoAlu.AutoFilter Field:=9, Criteria1:=MyFacultad

uFila = HojaAc.Range("A" & Rows.Count).End(xlUp).Row

' Copia los datos  filtrados
HojaAlu.Range("A2").Copy

' Abre el libro asistencia
abierto = 0
For Each LibroNue In Workbooks
Nombre = LibroNue.Name

If Nombre = "informe.xlsx" Then
   MsgBox "El archivo  " & LibroNue.Name & " está abierto"
   abierto = 1
End If
Next LibroNue

' si no está abierto lo abre
If abierto = 0 Then
   Workbooks.Open "SIGA-2018/consultas.xlsx"
End If

MyName = NameHoja.Value
Workbooks("informe").Activate
ActiveWorkbook.Sheets.Add After:=Sheets(Sheets.Count)
Sheets(Sheets.Count).Select
Sheets(Sheets.Count).Name = MyName

' Activa la hoja que acaba de crear
Sheets(MyName).Select
Set LibroNue = Workbooks("informe")

LibroNue.ActiveSheet.Paste

Call completarDP


End Sub

Private Sub salir_Click()
Unload Me

'Workbooks("SIGA2018").Activate
Workbooks("SIGA2024").Worksheets("AxC18").Range("A1").AutoFilter
End Sub

Private Sub frmAsistencia_Initialize()
Call listaCursos
End Sub

Sub FiltraFacu()
Dim nRows As Long, rowDni As Long

' Completa los rótulos de las columnas
   
Set HojaAc = Workbooks("SIGA2024").Sheets("AxC18")
Set RangoAc = HojaAc.UsedRange

nRows = ActiveSheet.Cells(Rows.Count, 1).End(xlUp).Row

ActiveSheet.Cells(1, 1).Offset(0, 0) = HojaAc.Cells(1, 1).Offset(0, 0)
ActiveSheet.Cells(1, 1).Offset(0, 1) = HojaAc.Cells(1, 1).Offset(0, 1)
ActiveSheet.Cells(1, 2).Offset(0, 1) = HojaAc.Cells(1, 1).Offset(0, 2)
ActiveSheet.Cells(1, 3).Offset(0, 1) = HojaAc.Cells(1, 1).Offset(0, 3)
ActiveSheet.Cells(1, 5).Offset(0, 1) = HojaAc.Cells(1, 1).Offset(0, 5)


i = 2
For i = 2 To nRows
ActiveSheet.Cells(i, 1).Offset(0, 0) = HojaAc.Cells(i, 1).Offset(0, 0)
ActiveSheet.Cells(i, 1).Offset(0, 1) = HojaAc.Cells(i, 1).Offset(0, 1)
ActiveSheet.Cells(i, 2).Offset(0, 1) = HojaAc.Cells(i, 1).Offset(0, 2)
ActiveSheet.Cells(i, 3).Offset(0, 1) = HojaAc.Cells(i, 1).Offset(0, 3)
ActiveSheet.Cells(i, 5).Offset(0, 1) = HojaAc.Cells(i, 1).Offset(0, 5)
Next i
End Sub


Private Sub btn_Cancelar_Click()
Unload Me

Workbooks("SIGA2024").Worksheets("alumnos").Range("A1").AutoFilter
Workbooks("SIGA2024").Worksheets("AxC18").Range("A1").AutoFilter
Workbooks("SIGA2024").Worksheets("fac").Range("A1").AutoFilter
End Sub


Private Sub prueba_Click()
Sub ConsultaPorFacultad()
    Dim HojaAc As Worksheet
    Dim LibroNue As Workbook
    Dim MyFac As String
    Dim uFila As Long
    Dim MyName As String

    ' Desactivar actualizaciones para evitar parpadeo y errores visuales
    Application.ScreenUpdating = False
    Application.EnableEvents = False

    ' Referencia a la hoja de origen
    Set HojaAc = ThisWorkbook.Sheets("AxC18")
    
    ' Preguntar facultad
    MyFac = InputBox("Ingrese la Facultad a consultar:", "Consulta por Facultad")
    If MyFac = "" Then Exit Sub
    
    ' Aplicar filtro por Facultad
    With HojaAc
        .AutoFilterMode = False
        uFila = .Cells(.Rows.Count, 1).End(xlUp).Row
        .Range("A1:F" & uFila).AutoFilter Field:=6, Criteria1:=MyFac
        
        ' Verificar si hay datos filtrados (además del encabezado)
        If Application.WorksheetFunction.Subtotal(103, .Range("A2:A" & uFila)) = 0 Then
            MsgBox "No se encontraron datos para la facultad: " & MyFac, vbExclamation
            .AutoFilterMode = False
            GoTo Salida
        End If
    End With

    ' Crear nuevo libro
    Set LibroNue = Workbooks.Add
    MyName = MyFac
    On Error Resume Next
    LibroNue.Sheets(1).Name = MyName
    On Error GoTo 0

    ' Copiar solo valores visibles
    HojaAc.Range("A1:F" & uFila).SpecialCells(xlCellTypeVisible).Copy
    
    With LibroNue.Sheets(MyName)
        .Range("A1").PasteSpecial Paste:=xlPasteValues
    End With

    ' Limpiar portapapeles
    Application.CutCopyMode = False
    
    ' Guardar el archivo automáticamente
    LibroNue.SaveAs Filename:=ThisWorkbook.Path & "\consultas.xlsm", FileFormat:=xlOpenXMLWorkbookMacroEnabled
    MsgBox "Consulta exportada correctamente a 'consultas.xlsm'", vbInformation

    ' Quitar el autofiltro
    HojaAc.AutoFilterMode = False

Salida:
    Application.ScreenUpdating = True
    Application.EnableEvents = True
End Sub


End Sub

Private Sub cbxFacultad_Change()

End Sub

Private Sub LISTADO_Click()

    Dim MyFacultad As String, MyID_Fac As String
    Dim MyFac As String
    Dim LibroAc As Workbook, LibroNue As Workbook
    Dim HojaFac  As Worksheet, HojaAxC As Worksheet
    Dim RangoFac As Range, RangoAxC As Range
    Dim uFila As Long, abierto As Integer
    Dim Nombre As String, MyName As String
    Dim i As Long
    Dim existe As Boolean

    ' Asegurar referencia al libro actual
    Set LibroAc = Workbooks(ThisWorkbook.Name)

    ' ============================
    ' Paso 1: Obtener ID_Facultad
    ' ============================
    MyFacultad = cbxFacultad.Value
          
    Set HojaFac = LibroAc.Sheets("fac")
    If HojaFac.AutoFilterMode Then HojaFac.AutoFilterMode = False

    Set RangoFac = HojaFac.Range("A1").CurrentRegion ' tabla completa
    RangoFac.AutoFilter Field:=2, Criteria1:=MyFacultad ' columna 2 = "Facultad"

    ' Obtener el ID_Fac de la fila visible
    For i = 2 To HojaFac.Cells(HojaFac.Rows.Count, 1).End(xlUp).Row
        If Not HojaFac.Rows(i).Hidden Then
            MyFac = Trim(CStr(HojaFac.Cells(i, 1).Value)) ' columna 1 = ID_Facultad
            Exit For
        End If
    Next i

    If MyFac = "" Then
        MsgBox "No se encontró el ID de Facultad correspondiente.", vbExclamation
        Exit Sub
    End If

    HojaFac.AutoFilterMode = False ' limpio filtros

    ' ============================
    ' Paso 2: Filtrar AxC18 por UA (columna 7)
    ' ============================
    Set HojaAxC = LibroAc.Sheets("AxC18")
    If HojaAxC.AutoFilterMode Then HojaAxC.AutoFilterMode = False

    uFila = HojaAxC.Cells(HojaAxC.Rows.Count, 1).End(xlUp).Row
    Set RangoAxC = HojaAxC.Range("A1:H" & uFila) ' ajustá el rango según columnas

    ' Confirmar que columna 7 contiene el ID_Fac
    existe = False
    For i = 2 To uFila
        If Trim(CStr(HojaAxC.Cells(i, 7).Value)) = MyFac Then
            existe = True
            Exit For
        End If
    Next i

    If Not existe Then
        MsgBox "No se encontraron datos en AxC18 para la facultad seleccionada.", vbInformation
        Exit Sub
    End If
    RangoAxC.AutoFilter Field:=7, Criteria1:=MyFac, Operator:=xlAnd

    ' ============================
    ' Paso 3: Copiar resultados filtrados
    ' ============================
    RangoAxC.SpecialCells(xlCellTypeVisible).Copy

    ' ============================
    ' Paso 4: Abrir o usar libro consultas
    ' ============================
    abierto = 0
    For Each LibroNue In Workbooks
        If LibroNue.Name = "consultas.xlsm" Then
            abierto = 1
            Exit For
        End If
    Next LibroNue

    If abierto = 0 Then
      Set LibroNue = Workbooks.Open("C:\Users\Eugenia\Dropbox\SIGA\consultas.xlsm")
    Else
        Set LibroNue = Workbooks("consultas.xlsm")
    End If

    ' ============================
    ' Paso 5: Crear nueva hoja y pegar
    ' ============================
    MyName = MyFacultad
    Application.DisplayAlerts = False
    On Error Resume Next
    LibroNue.Sheets(MyName).Delete ' borra si ya existía
    On Error GoTo 0
    Application.DisplayAlerts = True

    LibroNue.Sheets.Add After:=LibroNue.Sheets(LibroNue.Sheets.Count)
    With LibroNue.Sheets(LibroNue.Sheets.Count)
        .Name = MyName
        .Range("A1").PasteSpecial xlPasteValues
    End With

    Application.CutCopyMode = False

    ' ============================
    ' Paso 6: Llamar a macro adicional si aplica
    ' ============================
    ' Call FiltraFacu

End Sub


