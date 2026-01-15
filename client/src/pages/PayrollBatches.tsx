import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  Calendar,
  Users,
  DollarSign,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-800' },
  paid: { label: 'مدفوع', color: 'bg-blue-100 text-blue-800' },
};

export default function PayrollBatches() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const exportExcelMutation = trpc.export.payrollReport.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Download file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('تم تصدير التقرير بنجاح');
    },
    onError: (error) => {
      toast.error('فشل تصدير التقرير: ' + error.message);
    },
  });
  
  // Form state
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: batches, refetch } = trpc.payroll.list.useQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined
  });
  const { data: batchDetails } = trpc.payroll.getDetails.useQuery(
    { batchId: selectedBatchId! },
    { enabled: !!selectedBatchId }
  );
  
  const createMutation = trpc.payroll.createBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إنشاء الدفعة ${result.batchCode} بنجاح. المجموع: ${result.totalAmount?.toFixed(2)} ر.س`);
      refetch();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });

  const resetForm = () => {
    setPeriodStart('');
    setPeriodEnd('');
    setSelectedGroup('all');
    setSelectedCostCenter('all');
  };

  const handleCreate = () => {
    if (!periodStart || !periodEnd) {
      toast.error('يرجى تحديد فترة الرواتب');
      return;
    }
    createMutation.mutate({
      periodStart,
      periodEnd,
      groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined,
      costCenterId: selectedCostCenter !== 'all' ? parseInt(selectedCostCenter) : undefined,
    });
  };

  const handleViewDetails = (batchId: number) => {
    setSelectedBatchId(batchId);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  // Calculate totals
  const totalAmount = batches?.reduce((sum, b) => sum + parseFloat(b.totalAmount?.toString() || '0'), 0) || 0;
  const draftCount = batches?.filter(b => b.status === 'draft').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            دفعات الرواتب
          </h1>
          <p className="text-muted-foreground">
            إنشاء وإدارة دفعات الرواتب
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="pending">قيد المراجعة</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إنشاء دفعة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الدفعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftCount}</p>
                <p className="text-sm text-muted-foreground">مسودات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAmount.toFixed(2)} ر.س</p>
                <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الدفعات</CardTitle>
          <CardDescription>جميع دفعات الرواتب المنشأة</CardDescription>
        </CardHeader>
        <CardContent>
          {!batches?.length ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-2 text-muted-foreground">لا توجد دفعات رواتب</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء أول دفعة
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رمز الدفعة</TableHead>
                    <TableHead className="text-right">الفترة</TableHead>
                    <TableHead className="text-right">المجموع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono font-medium">
                        {batch.batchCode}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(batch.periodStart).toLocaleDateString('ar-SA')} - {new Date(batch.periodEnd).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {parseFloat(batch.totalAmount?.toString() || '0').toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(batch.status || 'draft')}
                      </TableCell>
                      <TableCell>
                        {new Date(batch.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(batch.id)}
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء دفعة رواتب جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>بداية الفترة *</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>نهاية الفترة *</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>المجموعة (اختياري)</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع المجموعات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المجموعات</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مركز التكلفة (اختياري)</Label>
              <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع مراكز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع مراكز التكلفة</SelectItem>
                  {costCenters?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              تفاصيل الدفعة: {batchDetails?.batch?.batchCode}
            </DialogTitle>
          </DialogHeader>
          {batchDetails && (
            <div className="space-y-4">
              {/* Batch Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الفترة</p>
                  <p className="font-medium">
                    {new Date(batchDetails.batch.periodStart).toLocaleDateString('ar-SA')} - {new Date(batchDetails.batch.periodEnd).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <p>{getStatusBadge(batchDetails.batch.status || 'draft')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد العمال</p>
                  <p className="font-medium">{batchDetails.items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المجموع</p>
                  <p className="font-bold text-lg">
                    {parseFloat(batchDetails.batch.totalAmount?.toString() || '0').toFixed(2)} ر.س
                  </p>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => exportExcelMutation.mutate({ batchId: selectedBatchId! })}
                  disabled={exportExcelMutation.isPending}
                >
                  <Download className="h-4 w-4 ml-2" />
                  {exportExcelMutation.isPending ? 'جاري التصدير...' : 'تصدير Excel'}
                </Button>
              </div>

              {/* Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العامل</TableHead>
                    <TableHead className="text-right">أيام العمل</TableHead>
                    <TableHead className="text-right">المستحق</TableHead>
                    <TableHead className="text-right">الخصومات</TableHead>
                    <TableHead className="text-right">المكافآت</TableHead>
                    <TableHead className="text-right">الصافي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchDetails.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.workerName}</p>
                          <p className="text-sm text-muted-foreground">{item.workerCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.daysWorked}</TableCell>
                      <TableCell className="font-mono">
                        {parseFloat(item.baseAmount?.toString() || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-red-600">
                        {parseFloat(item.totalDeductions?.toString() || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-green-600">
                        {parseFloat(item.totalBonuses?.toString() || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {parseFloat(item.netAmount?.toString() || '0').toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
