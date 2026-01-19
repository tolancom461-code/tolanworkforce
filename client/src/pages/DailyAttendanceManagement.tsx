import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useScopedPermissions } from '@/hooks/useScopedPermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  RefreshCw,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function DailyAttendanceManagement() {
  const { checkPermission, isAdmin } = useScopedPermissions();
  const currentDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [overrideDialog, setOverrideDialog] = useState<{ workerId: number; workerName: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const { data: groups } = trpc.groups.list.useQuery();
  const { data: allWorkers, isLoading, refetch } = trpc.workers.list.useQuery();
  
  // Filter workers by group on client side
  const workers = allWorkers?.filter(w => 
    selectedGroup === 'all' || w.groupId === parseInt(selectedGroup)
  );

  // Get daily finance records with override status
  const { data: financeRecords } = trpc.dailyFinance.getRecords.useQuery({
    workerId: 0, // Will be filtered by date and group
    startDate: selectedDate,
    endDate: selectedDate,
  });

  const setOverrideMutation = trpc.dailyFinance.setFullDayOverride.useMutation({
    onSuccess: () => {
      toast.success('تم اعتماد الحضور الكامل بنجاح');
      refetch();
      setOverrideDialog(null);
      setOverrideReason('');
    },
    onError: (error) => {
      toast.error('فشل اعتماد الحضور: ' + error.message);
    },
  });

  const handleOverrideToggle = async (workerId: number, workerName: string, currentOverride: boolean) => {
    if (currentOverride) {
      // Disable override
      setOverrideMutation.mutate({
        workerId,
        workDate: selectedDate,
        override: false,
      });
    } else {
      // Show dialog to get reason
      setOverrideDialog({ workerId, workerName });
    }
  };

  const handleOverrideConfirm = () => {
    if (!overrideDialog || !overrideReason.trim()) {
      toast.error('يرجى إدخال سبب الاعتماد');
      return;
    }

    setOverrideMutation.mutate({
      workerId: overrideDialog.workerId,
      workDate: selectedDate,
      override: true,
      reason: overrideReason,
    });
  };

  const getWorkerFinance = (workerId: number) => {
    if (!financeRecords) return null;
    return financeRecords.find((f: any) => f.workerId === workerId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الحضور اليومي</h1>
          <p className="text-muted-foreground">اعتماد الحضور الكامل للعمال في حالات الاستثناء</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>تصفية البيانات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">المجموعة</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="اختر المجموعة" />
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
          </div>
        </CardContent>
      </Card>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة العمال - {new Date(selectedDate).toLocaleDateString('ar-SA')}
          </CardTitle>
          <CardDescription>اعتماد الحضور الكامل للعمال في حالات الاستدعاء الطارئ أو الاستثناء المعتمد</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : !workers?.length ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-2 text-muted-foreground">لا يوجد عمال</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم العامل</TableHead>
                    <TableHead className="text-right">الرمز</TableHead>
                    <TableHead className="text-right">المجموعة</TableHead>
                    <TableHead className="text-right">ساعات الحضور</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">اعتماد حضور كامل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => {
                    const finance = getWorkerFinance(worker.id);
                    const hasOverride = finance?.fullDayOverride || false;
                    const actualHours = finance?.baseAmount ? parseFloat(finance.baseAmount.toString()) / (worker.dailyRate ? parseFloat(worker.dailyRate.toString()) / 8 : 1) : 0;
                    const isPresent = finance !== null;

                    return (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium">{worker.fullName}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{worker.code}</TableCell>
                        <TableCell>
                          {groups?.find(g => g.id === worker.groupId)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{actualHours.toFixed(1)} ساعة</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPresent ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              حاضر
                            </Badge>
                          ) : (
                            <Badge variant="secondary">غائب</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(isAdmin() || (worker.groupId && checkPermission('approve', 'work_group', worker.groupId))) ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={hasOverride}
                                onCheckedChange={() => handleOverrideToggle(worker.id, worker.fullName, hasOverride)}
                                disabled={setOverrideMutation.isPending}
                              />
                              {hasOverride && (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  معتمد
                                </Badge>
                              )}
                            </div>
                          ) : (
                            hasOverride ? (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                معتمد
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">غير معتمد</span>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Reason Dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اعتماد حضور كامل</DialogTitle>
            <DialogDescription>
              سيتم احتساب يومية كاملة للعامل {overrideDialog?.workerName} حتى لو كانت ساعات الحضور الفعلية أقل
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">سبب الاعتماد *</Label>
              <Input
                id="reason"
                placeholder="مثال: استدعاء طارئ، إجازة معتمدة، ظرف استثنائي"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={handleOverrideConfirm} disabled={setOverrideMutation.isPending || !overrideReason.trim()}>
              {setOverrideMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-2" />
              )}
              اعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
