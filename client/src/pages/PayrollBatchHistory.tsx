import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Download, Printer, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  under_accountant_review: 'تحت مراجعة المحاسب',
  under_financial_review: 'تحت المراجعة المالية',
  under_manager_review: 'تحت مراجعة المدير',
  approved: 'موافق عليها',
  paid: 'مدفوعة',
  rejected_final: 'مرفوضة نهائياً',
  returned_from_accountant: 'مرجوعة من المحاسب',
  returned_from_financial_review: 'مرجوعة من المراجعة المالية',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_accountant_review: 'bg-blue-100 text-blue-800',
  under_financial_review: 'bg-purple-100 text-purple-800',
  under_manager_review: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  rejected_final: 'bg-red-100 text-red-800',
  returned_from_accountant: 'bg-yellow-100 text-yellow-800',
  returned_from_financial_review: 'bg-orange-100 text-orange-800',
};

export default function PayrollBatchHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'batchId' | 'totalAmount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch cost centers for filter
  const { data: costCentersData } = trpc.costCenters.list.useQuery();

  // Fetch payroll batches
  const { data: batchesData, isLoading } = trpc.payroll.getPayrollBatches.useQuery({
    search: search || undefined,
    statusFilter: statusFilter || undefined,
    costCenterFilter: costCenterFilter ? parseInt(costCenterFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortOrder,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  });

  const batches = batchesData?.batches || [];
  const total = batchesData?.total || 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  // Export to Excel
  const handleExport = () => {
    const exportData = batches.map(batch => ({
      'رقم الدفعة': batch.batchCode,
      'تاريخ البداية': format(new Date(batch.periodStart), 'dd/MM/yyyy', { locale: ar }),
      'تاريخ النهاية': format(new Date(batch.periodEnd), 'dd/MM/yyyy', { locale: ar }),
      'الحالة': STATUS_LABELS[batch.status as string] || batch.status,
      'عدد العمال': batch.totalWorkers,
      'الإجمالي': parseFloat(batch.totalAmount as string).toLocaleString('ar-SA'),
      'الخصومات': parseFloat(batch.totalDeductions as string).toLocaleString('ar-SA'),
      'الحوافز': parseFloat(batch.totalBonuses as string).toLocaleString('ar-SA'),
      'تاريخ الإنشاء': format(new Date(batch.createdAt as any as string), 'dd/MM/yyyy HH:mm', { locale: ar }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دفعات الرواتب');
    XLSX.writeFile(wb, `payroll-batches-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>سجل دفعات الرواتب</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; }
          </style>
        </head>
        <body>
          <h1>سجل دفعات الرواتب</h1>
          <table>
            <thead>
              <tr>
                <th>رقم الدفعة</th>
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                <th>الحالة</th>
                <th>عدد العمال</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${batches.map(batch => `
                <tr>
                  <td>${batch.batchCode}</td>
                  <td>${format(new Date(batch.periodStart), 'dd/MM/yyyy', { locale: ar })}</td>
                  <td>${format(new Date(batch.periodEnd), 'dd/MM/yyyy', { locale: ar })}</td>
                  <td>${STATUS_LABELS[batch.status as string] || batch.status}</td>
                  <td>${batch.totalWorkers}</td>
                  <td>${parseFloat(batch.totalAmount as string).toLocaleString('ar-SA')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">سجل دفعات الرواتب</h1>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>خيارات البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search by Batch ID */}
            <div>
              <label className="text-sm font-medium mb-2 block">البحث برقم الدفعة</label>
              <Input
                placeholder="مثال: PB-2026-001"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">الحالة</label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="under_accountant_review">تحت مراجعة المحاسب</SelectItem>
                  <SelectItem value="under_financial_review">تحت المراجعة المالية</SelectItem>
                  <SelectItem value="under_manager_review">تحت مراجعة المدير</SelectItem>
                  <SelectItem value="approved">موافق عليها</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="rejected_final">مرفوضة نهائياً</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cost Center Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">مركز التكلفة</label>
              <Select value={costCenterFilter} onValueChange={(value) => {
                setCostCenterFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع المراكز</SelectItem>
                  {costCentersData?.map(center => (
                    <SelectItem key={center.id} value={center.id.toString()}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">الترتيب</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">التاريخ</SelectItem>
                    <SelectItem value="batchId">رقم الدفعة</SelectItem>
                    <SelectItem value="totalAmount">الإجمالي</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">تصاعدي</SelectItem>
                    <SelectItem value="desc">تنازلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">من التاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">إلى التاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد دفعات رواتب</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الدفعة</TableHead>
                      <TableHead className="text-right">الفترة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">عدد العمال</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-right">الخصومات</TableHead>
                      <TableHead className="text-right">الحوافز</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map(batch => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batchCode}</TableCell>
                        <TableCell>
                          {format(new Date(batch.periodStart), 'dd/MM', { locale: ar })} - {format(new Date(batch.periodEnd), 'dd/MM', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[batch.status as string]}>
                            {STATUS_LABELS[batch.status as string] || batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{batch.totalWorkers}</TableCell>
                        <TableCell>{parseFloat(batch.totalAmount as string).toLocaleString('ar-SA')}</TableCell>
                        <TableCell>{parseFloat(batch.totalDeductions as string).toLocaleString('ar-SA')}</TableCell>
                        <TableCell>{parseFloat(batch.totalBonuses as string).toLocaleString('ar-SA')}</TableCell>
                        <TableCell>{format(new Date(batch.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, total)} من {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
