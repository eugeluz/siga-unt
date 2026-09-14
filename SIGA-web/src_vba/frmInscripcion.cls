Attribute VB_Name = "frmInscripcion"
Attribute VB_Base = "0{65A23DDB-4B76-4C23-B38E-EE610ADF9CE6}{C26BAE4D-1D78-468F-A4D0-BCB6F4A46FEA}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
'EXCELeINFO
'MVP Sergio Alejandro Campos
'http://www.exceleinfo.com
'https://www.youtube.com/user/sergioacamposh
'http://blogs.itpro.es/exceleinfo

'---------------------------------------------------------------------------------------
' Module    : frmBUSCARV
' Author    : MVP Excel, Sergio Alejandro Campos
' Date      : 26/01/2015
' Purpose   : Uso de VLOOKUP identificando número, letras y fechas
'---------------------------------------------------------------------------------------
'
Private Sub btnBuscar_Click()
Dim RangoA As Range, TablaA As Range
Dim txtFeNa As Variant
Dim txtEdad As Integer
Dim Edad As Integer
Dim strTitulo As String
Dim Continuar As String
Dim documento As String


strTitulo = "Buscar alumno en BD"
Set RangoA = Sheets("alumnos").Range("A:A")
documento = Me.txtDNI.Value

'Verifico si existe en Alumnos
If WorksheetFunction.CountIf(RangoA, Me.txtDNI.Value) = 0 Then
  Continuar = MsgBox("No se encontró el DNI " & documento & ".  Dar de alta los datos?", vbYesNo + vbExclamation, strTitulo)
  btnActualizar.Enabled = False
  btnInscribir.Enabled = True
  btnAlta.Enabled = True
If Continuar = vbNo Then Exit Sub
Else
' Habilito y deshabilito botones
btnInscribir.Enabled = True
btnAlta.Enabled = False
btnActualizar.Enabled = True
'Hago el BUSCARV con ese DNI
With Me
txtApellido = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A1:S10000"), 2, 0)
txtNombre = UCase(Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A1:S10000"), 3, 0))
txtFeNa = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A1:S10000"), 4, 0)
'Convierto la fecha para que visualice ok
If txtFechaNac <> Null Then
   txtFechaNac = CDate(txtFeNa)
End If
 If txtEdad <> Null Then
 'redondeo la edad
  txtEdad = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A1:S10000"), 5, 0)
 LblEdad = Round(txtEdad)
 End If
 
'
txtTelPart = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 6, 0)
txtEmail = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 13, 0)
cbxEstudios = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 7, 0)
txtTitulo = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 8, 0)
lstUA = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 9, 0)
txtArea = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 10, 0)
lstCargo = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 11, 0)
txtPersonas = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 12, 0)
txtTelLab = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 14, 0)
txtInt = Application.WorksheetFunction.VLookup(CLng(Me.txtDNI), Sheets("alumnos").Range("A:S"), 15, 0)
End With


End If

End Sub
Private Sub btnAlta_Click()
'Declaración de variables
'
Dim strTitulo As String
Dim Continuar As String
Dim TransRowRng As Range
Dim RowA As Integer
Dim NewRowC As Integer
Dim documento As Integer
Dim RangoA As Range

Set RangoA = Sheets("alumnos").Range("A:A")
strTitulo = "ALTAS en BD - Centro Capacitación"


    Set TransRowRng = ThisWorkbook.Worksheets("alumnos").Cells(1, 1).CurrentRegion
    RowA = TransRowRng.Rows.Count + 1
  
      
    With ThisWorkbook.Worksheets("alumnos")
        .Cells(RowA, 1).Value = Val(Me.txtDNI)
        .Cells(RowA, 2).Value = UCase(Me.txtApellido)
        .Cells(RowA, 3).Value = UCase(Me.txtNombre)
        .Cells(RowA, 4).Value = Me.txtFechaNac
        .Cells(RowA, 5).Value = Me.LblEdad
        .Cells(RowA, 6).Value = Me.txtTelPart
        .Cells(RowA, 7).Value = Me.cbxEstudios
        .Cells(RowA, 8).Value = Me.txtTitulo
        .Cells(RowA, 9).Value = Me.lstUA
        .Cells(RowA, 10).Value = Me.txtArea
        .Cells(RowA, 11).Value = Me.lstCargo
        .Cells(RowA, 12).Value = Me.txtPersonas
        
        If Me.txtEmail = Null Or Me.txtEmail = "" Then
             .Cells(RowA, 13).Value = "No indicó"
        Else
             .Cells(RowA, 13).Value = Me.txtEmail
        End If
        .Cells(RowA, 14).Value = Me.txtTelLab
        .Cells(RowA, 15).Value = Me.txtInt
        .Cells(RowA, 16).Value = Me.lbl1
        .Cells(RowA, 17).Value = Me.lbl2
        .Cells(RowA, 18).Value = Me.lbl3
        .Cells(RowA, 19).Value = Me.lbl4
        .Cells(RowA, 20).Value = Me.lbl5
        .Cells(RowA, 21).Value = Me.lbl6
    End With
    '
    MsgBox "Alta exitosa." & vbInformation, strTitulo
    '
    Call Limpiar
End Sub
'
'Cerrar formulario
Private Sub btnCancelar_Click()
Unload Me
End Sub


Private Sub btnInscribir_Click()
'Alta en AxC '
Dim strTitulo As String
Dim NewRowC As Integer
Dim RangoC1 As Range, RagoC5 As Range
Dim RangoAxC As Range, RangoAxC26 As Range
Dim TblDNI As Integer
Dim TblEtapa As Integer


Set RangoC1 = Sheets("AxC").Range("A:A")
Set RangoAxC = ThisWorkbook.Worksheets("AxC").Cells(1, 1).CurrentRegion
Set RangoAxC26 = ThisWorkbook.Worksheets("AxC26").Cells(1, 1).CurrentRegion

NewRowC = RangoAxC.Rows.Count + 1

With ThisWorkbook.Worksheets("AxC")
.Cells(NewRowC, 1).Value = Val(Me.txtDNI)
.Cells(NewRowC, 2).Value = UCase(Me.txtApellido)
.Cells(NewRowC, 3).Value = UCase(Me.txtNombre)
.Cells(NewRowC, 4).Value = Me.cbxCursos
.Cells(NewRowC, 5).Value = Me.cbxFechas
.Cells(NewRowC, 6).Value = "Cursando"
 If Me.txtEmail = Null Or Me.txtEmail = "" Then
             .Cells(NewRowC, 6).Value = "No indicó"
        Else
             .Cells(NewRowC, 6).Value = Me.txtEmail
        End If

strTitulo = "Inscripción - Centro Capacitación"
MsgBox "Cargado en AxC", vbInformation, strTitulo
End With



With ThisWorkbook.Worksheets("AxC26")
NewRowC = RangoAxC26.Rows.Count + 1
.Cells(NewRowC, 1).Value = Val(Me.txtDNI)
.Cells(NewRowC, 2).Value = UCase(Me.txtApellido)
.Cells(NewRowC, 3).Value = UCase(Me.txtNombre)
.Cells(NewRowC, 4).Value = Me.cbxCursos
.Cells(NewRowC, 5).Value = Me.cbxFechas
.Cells(NewRowC, 6).Value = "Cursando"

 If Me.txtEmail = Null Or Me.txtEmail = "" Then
             .Cells(NewRowC, 6).Value = "No indicó"
        Else
             .Cells(NewRowC, 6).Value = Me.txtEmail
        End If

strTitulo = "Inscripción - Centro Capacitación"
MsgBox "Copiado en AxC26", vbInformation, strTitulo
End With

End Sub

Private Sub btnActualizar_Click()
'Declaración de variables
'
Dim strTitulo As String
Dim Continuar As String
Dim TransRowRng As Range

Dim Cuenta As String
Dim FilaReg As Integer
Dim RangoA As Range
Dim DocB As Variant


strTitulo = "Actualización en BD"
'
Continuar = MsgBox("Actualizar los datos?", vbYesNo + vbExclamation, strTitulo)

If Continuar = vbNo Then Exit Sub

Set RangoA = Sheets("alumnos").Range("A:A").CurrentRegion
Set TransRowRng = ThisWorkbook.Worksheets("alumnos").Cells(1, 1).CurrentRegion
FilaReg = RangoA.Find(Me.txtDNI.Value).Row

With ThisWorkbook.Worksheets("alumnos")
     .Cells(FilaReg, 2).Value = UCase(Me.txtApellido)
     .Cells(FilaReg, 3).Value = UCase(Me.txtNombre)
     .Cells(FilaReg, 4).Value = Me.txtFechaNac
     .Cells(FilaReg, 5).Value = Me.LblEdad
     .Cells(FilaReg, 6).Value = Me.txtTelPart
     .Cells(FilaReg, 7).Value = Me.cbxEstudios
     .Cells(FilaReg, 8).Value = Me.txtTitulo
        .Cells(FilaReg, 9).Value = Me.lstUA
        .Cells(FilaReg, 10).Value = Me.txtArea
        .Cells(FilaReg, 11).Value = Me.lstCargo
        .Cells(FilaReg, 12).Value = Me.txtPersonas
        .Cells(FilaReg, 13).Value = Me.txtEmail
        .Cells(FilaReg, 14).Value = Me.txtTelLab
        .Cells(FilaReg, 15).Value = Me.txtInt
        .Cells(FilaReg, 16).Value = Me.lbl1
        .Cells(FilaReg, 17).Value = Me.lbl2
        .Cells(FilaReg, 18).Value = Me.lbl3
        .Cells(FilaReg, 19).Value = Me.lbl4
        .Cells(FilaReg, 20).Value = Me.lbl5
        .Cells(FilaReg, 21).Value = Me.lbl6
End With
  MsgBox "Actualización exitosa.", vbInformation, strTitulo
End Sub

Private Sub btnOtro_Click()
Call Limpiar

End Sub

Private Sub lblEdad_Click()
Dim FechaNac As Date
Dim Fechaactual As Date
Dim varEdad As Integer
' calculo la Edad
Fechaactual = Now
FechaNac = txtFechaNac
varEdad = (Fechaactual - FechaNac) / 365
LblEdad = Round(varEdad)
End Sub


Private Sub spinPers_Change()
frmInscripcion.txtPersonas = frmInscripcion.spinPers.Value
End Sub


Private Sub Limpiar()
Dim Obj As Object
 LblEdad = ""
btnInscribir.Enabled = False
btnAlta.Enabled = False
btnActualizar.Enabled = False

For Each Obj In frmInscripcion.Controls
If TypeName(Obj) = "TextBox" Then
   Obj.Value = ""
Else
If TypeName(Obj) = "ComboBox" Then
   Obj.Value = ""
End If
End If
Next
End Sub
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

Private Sub UserForm_Initialize()
btnInscribir.Enabled = False
btnAlta.Enabled = False
btnActualizar.Enabled = False
Call listaEstudios
Call listaCursos
End Sub
Sub listaEstudios()
Dim nRows As Integer

Set hEstud = ThisWorkbook.Worksheets("Tablas")
nRows = hEstud.Cells(Rows.Count, 2).End(xlUp).Row
For i = 2 To nRows
cbxEstudios.AddItem hEstud.Cells(i, 2).Value
Next i
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

