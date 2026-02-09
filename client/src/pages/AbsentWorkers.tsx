import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AbsentWorkers() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam || new Date().toISOString().split('T')[0];
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch absent workers
  const { data: absentWorkers = [], isLoading, refetch } = trpc.attendance.getAbsentWorkers.useQuery({
    workDate: new Date(selectedDate),
  });

  // Mutations for adding attendance
  const addCheckInMutation = trpc.attendance.addMissingCheckIn.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة وقت الحضور بنجاح");
    },
    onError: (error) => {
      toast.error(`فشل إضافة وقت الحضور: ${error.message}`);
    },
  });

  const addCheckOutMutation = trpc.attendance.addMissingCheckOut.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة وقت الانصراف بنجاح");
      refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`فشل إضافة وقت الانصراف: ${error.message}`);
    },
  });

  const resetForm = () => {
    setCheckInTime('');
    setCheckOutTime('');
    setNotes('');
    setSelectedWorker(null);
  };

  const handleOpenDialog = (worker: any) => {
    setSelectedWorker(worker);
    setDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedWorker) return;

    if (!checkInTime || !checkOutTime) {
      toast.error("يرجى إدخال وقت الحضور والانصراف");
      return;
    }

    const workDate = new Date(selectedDate);
    
    // Add check-in
    const [checkInHours, checkInMinutes] = checkInTime.split(':');
    const checkInDate = new Date(workDate);
    checkInDate.setHours(parseInt(checkInHours), parseInt(checkInMinutes), 0, 0);
    
    try {
      await addCheckInMutation.mutateAsync({
        workerId: selectedWorker.workerId,
        checkInTime: checkInDate.toISOString(),
        note: notes || "تم التحضير يدوياً من صفحة الغائبين",
      });

      // Add check-out
      const [checkOutHours, checkOutMinutes] = checkOutTime.split(':');
      const checkOutDate = new Date(workDate);
      checkOutDate.setHours(parseInt(checkOutHours), parseInt(checkOutMinutes), 0, 0);
      
      await addCheckOutMutation.mutateAsync({
        workerId: selectedWorker.workerId,
        checkOutTime: checkOutDate.toISOString(),
        note: notes || "تم التحضير يدوياً من صفحة الغائبين",
      });
    } catch (error) {
      // Error handling is done in mutations
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">العمال الغائبون</h1>
          <p className="text-muted-foreground">
            قائمة العمال الذين لم يسجلوا حضور أو انصراف في التاريخ المحدد
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation('/attendance/log')}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى سجل الحضور
        </Button>
      </div>

      {/* Date Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>التاريخ المحدد</CardTitle>
          <CardDescription>
            {new Date(selectedDate).toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Card */}
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            إجمالي الغائبون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-700">{absentWorkers.length}</div>
          <p className="text-sm text-muted-foreground">عامل غائب</p>
        </CardContent>
      </Card>

      {/* Absent Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العمال الغائبين</CardTitle>
          <CardDescription>
            اضغط على زر "تحضير" لإضافة حضور وانصراف يدوياً للعامل
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : absentWorkers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ✅ لا يوجد عمال غائبون في هذا التاريخ
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رمز العامل</TableHead>
                  <TableHead>اسم العامل</TableHead>
                  <TableHead>المجموعة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absentWorkers.map((worker: any) => (
                  <TableRow 
                    key={worker.workerId}
                    className="border-l-4 border-l-red-500 bg-red-50/50"
                  >
                    <TableCell className="font-medium">{worker.workerCode}</TableCell>
                    <TableCell className="font-bold">{worker.workerName}</TableCell>
                    <TableCell>{worker.groupName || "غير محدد"}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenDialog(worker)}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        تحضير
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحضير يدوي للعامل</DialogTitle>
            <DialogDescription>
              العامل: {selectedWorker?.workerName} ({selectedWorker?.workerCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="checkInTime">وقت الحضور</Label>
              <Input
                id="checkInTime"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="checkOutTime">وقت الانصراف</Label>
              <Input
                id="checkOutTime"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب التحضير اليدوي..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={addCheckInMutation.isPending || addCheckOutMutation.isPending}
            >
              {addCheckInMutation.isPending || addCheckOutMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
