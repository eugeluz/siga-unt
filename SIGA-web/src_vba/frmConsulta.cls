Attribute VB_Name = "frmConsulta"
Attribute VB_Base = "0{36CA8994-6BBA-41A3-A173-9AF83CCED2C6}{98E60865-F396-453F-87EF-1BA10ED17D32}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Private Sub btnBuscar_Click()
Dim RangoCon As Range
Dim txtAp As String, txtNom As String
Dim hInscriptos As Worksheet
Dim j As Integer, i As Integer
Dim documento As Integer


Set RangoCon = Sheets("AxC").Range("A:A")
strTitulo = "Buscar alumno en BD"
On Error GoTo Errores


 If WorksheetFunction.CountIf(RangoCon, Me.txtDNI.Value) = 0 Then
   comentario = MsgBox("El DNI " & documento & " no tiene inscripiones regitradas", vbExclamation, strTitulo)
   Me.ListBox1.Clear
Else
    Me.ListBox1.Clear

With Sheets("AxC")
txtAp = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("AxC").Range("A1:F10000"), 2, 0)
txtNom = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("AxC").Range("A1:F10000"), 3, 0)
txtApNom = UCase(txtAp & ", " & txtNom)

End With
    Call cargar_lista
End If
Exit Sub
Errores:
' MsgBox "No se encuentra.", vbExclamation, "CCUNT"
End Sub

Private Sub btnSalir_Click()
 Unload Me
End Sub

Sub cargar_lista()
Dim nRows As Integer
Dim CurIns As String, CurFec As String
Dim FecIns As Date, FecFec As Date
Dim HojaAc As Worksheet
Dim RangoFe As Range
Dim uFila As Long, RowCert As Long

Set hInscriptos = ThisWorkbook.Worksheets("AxC")
nRows = hInscriptos.Cells(Rows.Count, 1).End(xlUp).Row
hInscriptos.Activate

Set HojaFe = ThisWorkbook.Sheets("Fechas")
rowsFec = HojaFe.Cells(Rows.Count, 1).End(xlUp).Row


j = 4
i = 2
For i = 2 To nRows
documento = hInscriptos.Cells(i, 1).Value
 ' combinar curso&fecha para buscar en FECHAS
CurIns = hInscriptos.Cells(i, j).Value
FecIns = hInscriptos.Cells(i, j).Offset(0, 1)

If documento Like "*" & (Me.txtDNI.Value) & "*" Then
    ListBox1.AddItem hInscriptos.Cells(i, j).Value
    'ListBox1.AddItem HojaFe.Cells(i, 4).Value
    
    Me.ListBox1.List(Me.ListBox1.ListCount - 1, 1) = hInscriptos.Cells(i, j).Offset(0, 1)
    Me.ListBox1.List(Me.ListBox1.ListCount - 1, 2) = hInscriptos.Cells(i, j).Offset(0, 2)
    
    For a = 2 To rowsFec
        CurFec = HojaFe.Cells(a, 2).Value
        FecFec = HojaFe.Cells(a, 3).Value
        If (CurIns Like "*" & CurFec) And (FecIns Like "*" & FecFec) Then
            Me.ListBox1.List(Me.ListBox1.ListCount - 1, 3) = HojaFe.Cells(a, 1).Offset(0, 3)
         Else
        End If
    Next a
Else
End If
Next i
End Sub


Private Sub ListBox1_Click()

End Sub

Private Sub UserForm_Initialize()
With ListBox1
    .ColumnCount = 4
    .ColumnWidths = "330 pt;80 pt;80 pt;80 pt"
End With
End Sub
