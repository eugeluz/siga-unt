Attribute VB_Name = "frmAsistencia"
Attribute VB_Base = "0{083E0C13-A6BB-4C0C-A624-A56CFD376CC1}{E30B954D-896E-402C-A163-2E9762E2857B}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub cbxCursos_Change()
Dim j As Integer
IndiceCurso = cbxCursos.ListIndex + 1
cbxFechas.ListIndex = -1
cbxFechas.Clear
With Sheets("Fechas")
For j = 1 To .Range("A" & Rows.Count).End(xlUp).Row
    If .Cells(j, 1).Value = IndiceCurso Then
        cbxFechas.AddItem .Cells(j, 3).Value
    End If
Next
End With
End Sub

Sub listaCursos()
Dim nRows As Integer
' Actualiza la lista a medida que se vana agrando cursos a la tabla
Set hCursos = ThisWorkbook.Worksheets("Cursos")
nRows = hCursos.Cells(Rows.Count, 1).End(xlUp).Row

For i = 2 To nRows
cbxCursos.AddItem hCursos.Cells(i, 2).Value
Next i
End Sub
Private Sub Completa_Click()
Dim MyCurso As String, MyFecha As String
Dim LibroAc As Workbook, LibroNue As Workbook
Dim HojaAc As Worksheet, HojaAlu As Worksheet
Dim RangoAc As Range, RangoAlu As Range
Dim uFila As Long

' Quito posibles filtros en alumnos
Workbooks("SIGA2024").Worksheets("alumnos").Range("A1").AutoFilter


MyCurso = cbxCursos.Value
MyFecha = cbxFechas.Value
Set LibroAc = Workbooks(ThisWorkbook.Name)
Set HojaAc = LibroAc.Sheets("AxC18")
Set RangoAc = HojaAc.UsedRange

RangoAc.AutoFilter Field:=4, Criteria1:=MyCurso
RangoAc.AutoFilter Field:=5, Criteria1:=MyFecha, Operator:=xlAnd

uFila = HojaAc.Range("A" & Rows.Count).End(xlUp).Row
 
 
' Copia los datos  filtrados
HojaAc.Range("A1:F" & uFila).Copy


' Acceso al libro consultas
abierto = 0
For Each LibroNue In Workbooks
Nombre = LibroNue.Name

If Nombre = "consultas.xlsx" Then
   MsgBox "El archivo  " & LibroNue.Name & " está abierto"
   abierto = 1
End If
Next LibroNue

' si no está abierto lo abre
If abierto = 0 Then
   Workbooks.Open "SIGA\consultas.xlsm"
End If

MyName = NameHoja
Workbooks("consultas.xlsm").Activate
ActiveWorkbook.Sheets.Add After:=Sheets(Sheets.Count)
Sheets(Sheets.Count).Select
Sheets(Sheets.Count).Name = MyName

' Activa la hoja que acaba de crear
Sheets(MyName).Select
Set LibroNue = Workbooks("consultas.xlsm")

' Pega lo filtrado
LibroNue.ActiveSheet.Paste

Call completarDP

End Sub

Private Sub salir_Click()
Unload Me
Workbooks("SIGA2024").Worksheets("AxC18").Range("A1").AutoFilter
End Sub

Private Sub frmAsistencia_Initialize()
Call listaCursos
End Sub

Sub completarDP()
Dim dniBuscado As Variant
Dim nRows As Long, rowDni As Long

' Completa los rótulos de las columnas
   
Set HojaAlu = Workbooks("SIGA2022").Sheets("alumnos")
Set RangoAlu = HojaAlu.UsedRange

nRows = ActiveSheet.Cells(Rows.Count, 1).End(xlUp).Row


ActiveSheet.Cells(1, 3).Offset(0, 1) = HojaAlu.Cells(1, 1).Offset(0, 9)
ActiveSheet.Cells(1, 3).Offset(0, 2) = HojaAlu.Cells(1, 1).Offset(0, 5)
ActiveSheet.Cells(1, 3).Offset(0, 3) = HojaAlu.Cells(1, 1).Offset(0, 12)


j = 0
i = 2
For i = 2 To nRows
'lo busca en ALUMNOS

dniBuscado = ActiveSheet.Cells(i, 1).Value

If WorksheetFunction.CountIf(RangoAlu, dniBuscado) > 0 Then
   ' Devuelve la posición en Alumnos del DNI buscado
   rowDni = RangoAlu.Find(dniBuscado).Row
   ActiveSheet.Cells(i, 3).Offset(0, 1) = HojaAlu.Cells(rowDni, 1).Offset(0, 9)
   ActiveSheet.Cells(i, 3).Offset(0, 2) = HojaAlu.Cells(rowDni, 1).Offset(0, 5)
   ActiveSheet.Cells(i, 3).Offset(0, 3) = HojaAlu.Cells(rowDni, 1).Offset(0, 12)

End If

Next i
End Sub

Private Sub UserForm_Initialize()
Call listaCursos
End Sub
