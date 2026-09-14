Attribute VB_Name = "Módulo2"
Sub ordenarFecha()
Attribute ordenarFecha.VB_Description = "Ordena por fecha y luego por curso"
Attribute ordenarFecha.VB_ProcData.VB_Invoke_Func = "o\n14"
' Ordena por fecha y luego por curso
' Acceso directo: CTRL+o
'
    Range("D8").Select
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Clear
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Fecha inicio]"), SortOn:=xlSortOnValues, Order:= _
        xlAscending, DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Curso]"), SortOn:=xlSortOnValues, Order:=xlAscending, _
        DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Apellido]"), SortOn:=xlSortOnValues, Order:= _
        xlAscending, DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Nombre]"), SortOn:=xlSortOnValues, Order:=xlAscending _
        , DataOption:=xlSortNormal
    With ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort
        .Header = xlYes
        .MatchCase = False
        .Orientation = xlTopToBottom
        .SortMethod = xlPinYin
        .Apply
    End With
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Clear
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Fecha inicio]"), SortOn:=xlSortOnValues, Order:= _
        xlDescending, DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Curso]"), SortOn:=xlSortOnValues, Order:=xlAscending, _
        DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Apellido]"), SortOn:=xlSortOnValues, Order:= _
        xlAscending, DataOption:=xlSortNormal
    ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort.SortFields.Add _
        Key:=Range("Tabla1[Nombre]"), SortOn:=xlSortOnValues, Order:=xlAscending _
        , DataOption:=xlSortNormal
    With ActiveWorkbook.Worksheets("AxC18").ListObjects("Tabla1").Sort
        .Header = xlYes
        .MatchCase = False
        .Orientation = xlTopToBottom
        .SortMethod = xlPinYin
        .Apply
    End With
End Sub
