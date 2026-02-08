import ExcelJS from 'exceljs';
import { getAttendanceForWorkerPeriod } from './db';

export async function generateBatchDetailsExcel(
  batchId: number,
  batchTitle: string,
  periodStart: string,
  periodEnd: string,
  workers: Array<{
    workerId: number;
    workerName: string;
    workerCode: string;
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('تفاصيل دفعة الراتب');

  // Set RTL direction for Arabic
  worksheet.views = [{ rightToLeft: true }];

  // Add header
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `تفاصيل ${batchTitle}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('A2:I2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `الفترة: من ${periodStart} إلى ${periodEnd}`;
  periodCell.font = { size: 12 };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Add empty row
  worksheet.addRow([]);

  // Add column headers
  const headerRow = worksheet.addRow([
    'اسم العامل',
    'كود العامل',
    'التاريخ',
    'وقت الحضور',
    'وقت الانصراف',
    'دقائق العمل الفعلية',
    'المبلغ الأساسي',
    'الخصومات',
    'الإضافات'
  ]);
  
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };

  // Set column widths
  worksheet.columns = [
    { width: 20 }, // اسم العامل
    { width: 15 }, // كود العامل
    { width: 15 }, // التاريخ
    { width: 15 }, // وقت الحضور
    { width: 15 }, // وقت الانصراف
    { width: 20 }, // دقائق العمل الفعلية
    { width: 15 }, // المبلغ الأساسي
    { width: 15 }, // الخصومات
    { width: 15 }  // الإضافات
  ];

  // Add data for each worker
  for (const worker of workers) {
    const attendanceData = await getAttendanceForWorkerPeriod(
      worker.workerId,
      periodStart,
      periodEnd
    );

    for (const day of attendanceData) {
      const checkInTime = day.checkIn
        ? new Date(day.checkIn.eventTime).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-';
      
      const checkOutTime = day.checkOut
        ? new Date(day.checkOut.eventTime).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-';

      const row = worksheet.addRow([
        worker.workerName,
        worker.workerCode,
        day.date,
        checkInTime,
        checkOutTime,
        day.actualWorkMinutes || 0,
        day.baseAmount || 0,
        day.deductions || 0,
        day.bonuses || 0
      ]);

      row.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Format numbers
      row.getCell(6).numFmt = '#,##0'; // دقائق العمل
      row.getCell(7).numFmt = '#,##0.00'; // المبلغ
      row.getCell(8).numFmt = '#,##0.00'; // الخصومات
      row.getCell(9).numFmt = '#,##0.00'; // الإضافات
    }
  }

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
