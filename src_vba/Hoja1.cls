Attribute VB_Name = "Hoja1"
Attribute VB_Base = "0{00020820-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Attribute VB_Control = "btnFacultad, 4, 0, MSForms, CommandButton"
Attribute VB_Control = "btnConsulta, 3, 1, MSForms, CommandButton"
Attribute VB_Control = "btnAsistencia, 2, 2, MSForms, CommandButton"
Attribute VB_Control = "btnInscripcion, 1, 3, MSForms, CommandButton"

Private Sub btnFacultad_Click()
frmFacultad.Show
End Sub

Private Sub btnInscripcion_Click()
frmInscripcion.Show
End Sub
Private Sub btnAsistencia_Click()
frmAsistencia.Show
End Sub

Private Sub btnConsulta_Click()
frmConsulta.Show
End Sub


