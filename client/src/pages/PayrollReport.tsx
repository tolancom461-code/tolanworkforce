import { useState, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';

type ReportType = 'group' | 'worker' | 'cost_center' | 'summary';

export default function PayrollReport() {
  // const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [reportType, setReportType] = useState<ReportType>('group');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>();
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | undefined>();
  const [showReport, setShowReport] = useState(false);

  // Queries
  const groupsQuery = trpc.groups.list.useQuery();
  const workersQuery = trpc.workers.list.useQuery();

  const reportByGroupQuery = trpc.payroll.getReportByGroup.useQuery(
    { periodStart, periodEnd, groupId: selectedGroupId },
    { enabled: showReport && reportType === 'group' }
  );

  const reportByWorkerQuery = trpc.payroll.getReportByWorker.useQuery(
    { periodStart, periodEnd, workerId: selectedWorkerId },
    { enabled: showReport && reportType === 'worker' }
  );

  const reportSummaryQuery = trpc.payroll.getReportSummary.useQuery(
    { periodStart, periodEnd },
    { enabled: showReport && reportType === 'summary' }
  );

  // Get current report data
  const getReportData = () => {
    if (reportType === 'group') return reportByGroupQuery.data || [];
    if (reportType === 'worker') return reportByWorkerQuery.data || [];
    if (reportType === 'summary') return reportSummaryQuery.data || [];
    return [];
  };

  const reportData = getReportData();

  // Calculate totals
  const calculateTotals = () => {
    if (!reportData || reportData.length === 0) {
      return {
        totalWorkers: 0,
        totalSalary: '0.00',
        totalDeductions: '0.00',
        totalBonuses: '0.00',
        totalNet: '0.00',
      };
    }

    let totalWorkers = 0;
    let totalSalary = 0;
    let totalDeductions = 0;
    let totalBonuses = 0;
    let totalNet = 0;

    reportData.forEach((row: any) => {
      totalWorkers += row.workerCount || 1;
      totalSalary += parseFloat(row.totalSalary || '0');
      totalDeductions += parseFloat(row.totalDeductions || '0');
      totalBonuses += parseFloat(row.totalBonuses || '0');
      totalNet += parseFloat(row.totalNet || '0');
    });

    return {
      totalWorkers,
      totalSalary: totalSalary.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalNet: totalNet.toFixed(2),
    };
  };

  const totals = calculateTotals();

  // Get report title
  const getReportTitle = () => {
    if (reportType === 'group') return 'تقرير كشف الرواتب حسب المجموعة';
    if (reportType === 'worker') return 'تقرير كشف الرواتب حسب العامل';
    if (reportType === 'cost_center') return 'تقرير كشف الرواتب حسب مركز التكلفة';
    if (reportType === 'summary') return 'تقرير كشف الرواتب – الملخص العام';
    return 'تقرير كشف الرواتب';
  };

  // Get filter details
  const getFilterDetails = () => {
    if (reportType === 'group' && selectedGroupId) {
      const group = groupsQuery.data?.find((g) => g.id === selectedGroupId);
      return `${group?.name || ''} (${group?.code || ''})`;
    }
    if (reportType === 'worker' && selectedWorkerId) {
      const worker = workersQuery.data?.find((w) => w.id === selectedWorkerId);
      return `${worker?.fullName || ''} (${worker?.code || ''})`;
    }
    if (reportType === 'summary') {
      return 'جميع المجموعات';
    }
    return '-';
  };

  // Handle view report
  const handleViewReport = () => {
    if (!periodStart || !periodEnd) {
      toast.error('يرجى تحديد الفترة الزمنية');
      return;
    }

    if (reportType === 'group' && !selectedGroupId) {
      toast.error('يرجى اختيار المجموعة');
      return;
    }

    if (reportType === 'worker' && !selectedWorkerId) {
      toast.error('يرجى اختيار العامل');
      return;
    }

    setShowReport(true);
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${getReportTitle()}_${periodStart}_${periodEnd}`,
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Filter Section */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle>فلترة التقرير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select
                value={reportType}
                onValueChange={(value) => {
                  setReportType(value as ReportType);
                  setShowReport(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">حسب المجموعة</SelectItem>
                  <SelectItem value="worker">حسب العامل</SelectItem>
                  <SelectItem value="summary">الملخص العام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Start */}
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setShowReport(false);
                }}
              />
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setShowReport(false);
                }}
              />
            </div>

            {/* Group Selection */}
            {reportType === 'group' && (
              <div className="space-y-2">
                <Label>المجموعة</Label>
                <Select
                  value={selectedGroupId?.toString()}
                  onValueChange={(value) => {
                    setSelectedGroupId(value ? parseInt(value) : undefined);
                    setShowReport(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المجموعة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupsQuery.data?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name} ({group.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Worker Selection */}
            {reportType === 'worker' && (
              <div className="space-y-2">
                <Label>العامل</Label>
                <Select
                  value={selectedWorkerId?.toString()}
                  onValueChange={(value) => {
                    setSelectedWorkerId(value ? parseInt(value) : undefined);
                    setShowReport(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العامل (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {workersQuery.data?.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id.toString()}>
                        {worker.fullName} ({worker.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleViewReport}>
              <Eye className="w-4 h-4 ml-2" />
              عرض التقرير
            </Button>
            {showReport && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            )}
          </div>

          {/* Warning Message */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              هذا التقرير مالي معتمد ونهائي ولا يمكن تصديره إلى Excel حفاظًا على سلامة البيانات.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Report Section */}
      {showReport && (
        <div ref={printRef} className="bg-white">
          <Card>
            <CardContent className="p-8 space-y-6">
              {/* Report Header */}
              <div className="text-center space-y-4 border-b pb-6">
                <h1 className="text-3xl font-bold text-gray-900">{getReportTitle()}</h1>
                <p className="text-sm text-gray-600">(تقرير معتمد – عرض وطباعة فقط)</p>
              </div>

              {/* Filter Info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex">
                  <span className="font-semibold w-32">الفترة:</span>
                  <span>
                    من {periodStart} إلى {periodEnd}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">نوع الفلترة:</span>
                  <span>
                    {reportType === 'group' && 'حسب المجموعة'}
                    {reportType === 'worker' && 'حسب العامل'}
                    {reportType === 'cost_center' && 'حسب مركز التكلفة'}
                    {reportType === 'summary' && 'الملخص العام'}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">تفاصيل الفلترة:</span>
                  <span>{getFilterDetails()}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">طريقة الاحتساب:</span>
                  <span>يومي</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">حالة التقرير:</span>
                  <span className="text-green-600 font-semibold">معتمد</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">تاريخ الإصدار:</span>
                  <span>{new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>

              {/* Report Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      {reportType === 'group' || reportType === 'summary' ? (
                        <>
                          <TableHead className="text-center font-bold">اسم المجموعة</TableHead>
                          <TableHead className="text-center font-bold">كود المجموعة</TableHead>
                          <TableHead className="text-center font-bold">عدد العمال</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-center font-bold">اسم العامل</TableHead>
                          <TableHead className="text-center font-bold">كود العامل</TableHead>
                          <TableHead className="text-center font-bold">المجموعة</TableHead>
                        </>
                      )}
                      <TableHead className="text-center font-bold">إجمالي الرواتب</TableHead>
                      <TableHead className="text-center font-bold">إجمالي الخصم</TableHead>
                      <TableHead className="text-center font-bold">إجمالي الإضافي</TableHead>
                      <TableHead className="text-center font-bold">الإجمالي المستحق</TableHead>
                      {reportType === 'worker' && (
                        <TableHead className="text-center font-bold">ملاحظات التصحيح</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row: any, index: number) => (
                      <TableRow key={index}>
                        {reportType === 'group' || reportType === 'summary' ? (
                          <>
                            <TableCell className="text-center">{row.groupName}</TableCell>
                            <TableCell className="text-center">{row.groupCode}</TableCell>
                            <TableCell className="text-center">{row.workerCount}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-center">{row.workerName}</TableCell>
                            <TableCell className="text-center">{row.workerCode}</TableCell>
                            <TableCell className="text-center">{row.groupName}</TableCell>
                          </>
                        )}
                        <TableCell className="text-center">{row.totalSalary}</TableCell>
                        <TableCell className="text-center">{row.totalDeductions}</TableCell>
                        <TableCell className="text-center">{row.totalBonuses}</TableCell>
                        <TableCell className="text-center font-semibold">{row.totalNet}</TableCell>
                        {reportType === 'worker' && (
                          <TableCell className="text-center text-sm">
                            {row.overrideNotes || '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {/* Grand Total Row */}
                    <TableRow className="bg-gray-100 border-t-2 border-gray-400 font-bold">
                      <TableCell className="text-center" colSpan={2}>
                        الإجمالي العام
                      </TableCell>
                      <TableCell className="text-center">{totals.totalWorkers}</TableCell>
                      <TableCell className="text-center">{totals.totalSalary}</TableCell>
                      <TableCell className="text-center">{totals.totalDeductions}</TableCell>
                      <TableCell className="text-center">{totals.totalBonuses}</TableCell>
                      <TableCell className="text-center">{totals.totalNet}</TableCell>
                      {reportType === 'worker' && <TableCell></TableCell>}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Report Footer */}
              <div className="text-center text-sm text-gray-600 border-t pt-4 space-y-1">
                <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العمالة اليومية</p>
                <p>
                  تاريخ الطباعة: {new Date().toISOString().split('T')[0]} | المستخدم: Admin
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
