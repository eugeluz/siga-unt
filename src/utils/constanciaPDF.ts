import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../img/logoCentro.png';
import { formatDateAR } from './dateAR';

export interface ConstanciaAsistenciaParams {
  alumno: {
    nombre?: string;
    apellido?: string;
    dni: string | number;
  };
  curso: string;
  fechaInicio: string;
  cantidadClases: number;
  fechasClases?: Record<number, string>;
  asistencias?: Record<number, boolean>;
}

export const generateConstanciaAsistenciaPDF = ({
  alumno,
  curso,
  fechaInicio,
  cantidadClases = 4,
  fechasClases = {},
  asistencias = {}
}: ConstanciaAsistenciaParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const marginX = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2);

  // 1. Encabezado institucional con Logo
  try {
    doc.addImage(logoImg, 'PNG', marginX, 14, 65, 15.5);
  } catch (e) {
    console.warn('No se pudo cargar el logo en la constancia:', e);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('UNIVERSIDAD NACIONAL DE TUCUMÁN', marginX + 72, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SECRETARÍA DE RELACIONES INSTITUCIONALES Y GESTIÓN UNIVERSITARIA', marginX + 72, 23.5);
  doc.text('CENTRO DE CAPACITACIÓN', marginX + 72, 27.5);

  // Línea divisoria de encabezado
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  // 2. Fecha y Lugar (alineado a la derecha)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const now = new Date();
  const fechaActualLarga = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`San Miguel de Tucumán, ${fechaActualLarga}`, pageWidth - marginX, 42, { align: 'right' });

  // 3. Saludo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('De mi mayor consideración:', marginX, 54);

  // 4. Párrafo de notificación
  const nombreCompleto = alumno.apellido && alumno.nombre
    ? `${alumno.apellido}, ${alumno.nombre}`
    : (alumno.nombre || alumno.apellido || 'el alumno');

  const parrafo1 = `        Me es grato dirigirme a Ud. a los efectos de informarle que el/la Sr/ra. ${nombreCompleto}, DNI ${alumno.dni}, se encuentra cursando una capacitación dictada en este Centro de Capacitación.`;
  const parrafo1Lines = doc.splitTextToSize(parrafo1, contentWidth);
  doc.text(parrafo1Lines, marginX, 64);

  // 5. Metadatos del curso
  let currentY = 64 + (parrafo1Lines.length * 5.8) + 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del curso:', marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(curso, marginX + 38, currentY);
  currentY += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha inicio:', marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateAR(fechaInicio), marginX + 38, currentY);
  currentY += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Cantidad de clases:', marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(cantidadClases), marginX + 38, currentY);
  currentY += 10;

  // 6. Tabla de Asistencia (horizontal)
  const totalClases = Number(cantidadClases) || 4;

  const tableHead = [
    ['', ...Array.from({ length: totalClases }, (_, i) => `Clase ${i + 1}`)]
  ];

  const tableBody = [
    [
      'Fecha de la clase',
      ...Array.from({ length: totalClases }, (_, i) => {
        const num = i + 1;
        const f = fechasClases[num];
        return f ? formatDateAR(f) : '—';
      })
    ],
    [
      'Asistencia',
      ...Array.from({ length: totalClases }, (_, i) => {
        const num = i + 1;
        const pres = asistencias[num];
        const f = fechasClases[num];
        if (pres) return 'Presente';
        if (f) return 'Ausente';
        return '—';
      })
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: totalClases > 8 ? 7.5 : (totalClases > 6 ? 8.5 : 9),
      cellPadding: 3.5,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [51, 65, 85],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        halign: 'left',
        cellWidth: 36,
        fillColor: [248, 250, 252]
      }
    },
    margin: { left: marginX, right: marginX }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // 7. Texto de cierre y validez
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  const parrafo2 = '        A pedido del interesado se emite la siguiente constancia de asistencia para ser presentada ante las autoridades que la requieran.';
  const parrafo2Lines = doc.splitTextToSize(parrafo2, contentWidth);
  doc.text(parrafo2Lines, marginX, currentY);
  currentY += (parrafo2Lines.length * 5.8) + 4;

  const parrafo3 = '        La presente constancia no acredita aprobación del curso.';
  doc.text(parrafo3, marginX, currentY);
  currentY += 9;

  const parrafo4 = '        Sin otro particular lo saludo muy atentamente.';
  doc.text(parrafo4, marginX, currentY);
  currentY += 28;

  // 8. Espacio para Firma y Sello
  const firmaX = pageWidth - marginX - 65;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(firmaX, currentY, firmaX + 65, currentY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Centro de Capacitación', firmaX + 32.5, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Secretaría de Relaciones Institucionales — UNT', firmaX + 32.5, currentY + 9.5, { align: 'center' });

  // Guardar archivo PDF
  const cleanAlumno = (alumno.apellido || 'Alumno').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanCurso = curso.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const fileName = `Constancia_Asistencia_${cleanAlumno}_${cleanCurso}.pdf`;
  doc.save(fileName);
};
