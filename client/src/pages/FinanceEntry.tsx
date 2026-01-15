import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';

const ENTRY_TYPES = [
  { value: 'deduction', label: 'خصم', icon: TrendingDown, color: 'text-red-600' },
  { value: 'fine', label: 'غرامة', icon: Minus, color: 'text-orange-600' },
  { value: 'bonus', label: 'مكافأة', icon: TrendingUp, color: 'text-green-600' },
  { value: 'addition', label: 'إضافة', icon: Plus, color: 'text-blue-600' },
];

export default function FinanceEntry() {
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<'deduction' | 'bonus' | 'fine' | 'addition'>('deduction');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  
  const { data: workers } = trpc.workers.list.useQuery();
  
  // Get date range for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  
  const { data: financeRecords, refetch } = trpc.dailyFinance.getRecords.useQuery(
    { 
      workerId: parseInt(selectedWorker), 
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    },
    { enabled: !!selectedWorker }
  );
  
  const addEntryMutation = trpc.dailyFinance.addEntry.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إضافة القيد بنجاح. الصافي الجديد: ${result.netAmount?.toFixed(2)} ر.س`);
      refetch();
      setAmount('');
      setReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });

  const handleAddEntry = () => {
    if (!selectedWorker || !amount) {
      toast.error('يرجى اختيار العامل وإدخال المبلغ');
      return;
    }
    addEntryMutation.mutate({
      workerId: parseInt(selectedWorker),
      workDate: selectedDate,
      entryType,
      amount: parseFloat(amount),
      reason,
    });
  };

  const getEntryTypeBadge = (type: string) => {
    const typeInfo = ENTRY_TYPES.find(t => t.value === type);
    if (!typeInfo) return <Badge variant="outline">{type}</Badge>;
    const Icon = typeInfo.icon;
    return (
      <Badge variant="outline" className={typeInfo.color}>
        <Icon className="h-3 w-3 ml-1" />
        {typeInfo.label}
      </Badge>
    );
  };

  // Calculate totals
  const totals = financeRecords?.reduce((acc, record) => ({
    baseAmount: acc.baseAmount + parseFloat(record.baseAmount?.toString() || '0'),
    deductions: acc.deductions + parseFloat(record.deductions?.toString() || '0'),
    bonuses: acc.bonuses + parseFloat(record.bonuses?.toString() || '0'),
    netAmount: acc.netAmount + parseFloat(record.netAmount?.toString() || '0'),
  }), { baseAmount: 0, deductions: 0, bonuses: 0, netAmount: 0 }) || { baseAmount: 0, deductions: 0, bonuses: 0, netAmount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          الخصومات والإضافات اليومية
        </h1>
        <p className="text-muted-foreground">
          إدخال الخصومات والغرامات والمكافآت والإضافات للعمال
        </p>
      </div>

      {/* Worker Selection */}
      <Card>
        <CardHeader>
          <CardTitle>اختيار العامل</CardTitle>
          <CardDescription>اختر العامل لعرض وإضافة القيود المالية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>العامل</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العامل" />
                </SelectTrigger>
                <SelectContent>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id.toString()}>
                      {worker.fullName} ({worker.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={!selectedWorker}>
                <Search className="h-4 w-4 ml-2" />
                عرض السجلات
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Form */}
      {selectedWorker && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة قيد جديد</CardTitle>
            <CardDescription>إضافة خصم أو غرامة أو مكافأة أو إضافة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={entryType} onValueChange={(v: any) => setEntryType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ر.س)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>السبب</Label>
                <Input
                  placeholder="سبب القيد..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddEntry} disabled={addEntryMutation.isPending} className="w-full">
                  {addEntryMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Plus className="h-4 w-4 ml-2" />
                  )}
                  إضافة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {selectedWorker && financeRecords && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{totals.baseAmount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">المستحقات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{totals.deductions.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">الخصومات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{totals.bonuses.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">المكافآت</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Calculator className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{totals.netAmount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">الصافي</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      {selectedWorker && (
        <Card>
          <CardHeader>
            <CardTitle>سجلات الشهر الحالي</CardTitle>
            <CardDescription>السجلات المالية اليومية للعامل</CardDescription>
          </CardHeader>
          <CardContent>
            {!financeRecords?.length ? (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">لا توجد سجلات لهذا الشهر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المستحق</TableHead>
                      <TableHead className="text-right">الخصومات</TableHead>
                      <TableHead className="text-right">المكافآت</TableHead>
                      <TableHead className="text-right">الصافي</TableHead>
                      <TableHead className="text-right">تأخير (دقيقة)</TableHead>
                      <TableHead className="text-right">خروج مبكر (دقيقة)</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.workDate).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell className="font-mono">
                          {parseFloat(record.baseAmount?.toString() || '0').toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-red-600">
                          {parseFloat(record.deductions?.toString() || '0').toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-green-600">
                          {parseFloat(record.bonuses?.toString() || '0').toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {parseFloat(record.netAmount?.toString() || '0').toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.lateMinutes || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.earlyLeaveMinutes || 0}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
