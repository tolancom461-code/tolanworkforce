import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ArrowRightCircle, 
  ArrowLeftCircle,
  RefreshCw,
  Users,
  Calendar,
  Edit,
  Lock,
  AlertCircle,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AttendanceLog() {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editCheckInTime, setEditCheckInTime] = useState('');
  const [editCheckOutTime, setEditCheckOutTime] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, selectedDate]);
  
  // Check if selected date is locked
  const { data: dateLockStatus } = trpc.attendance.checkDateLocked.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const { data: allGroups } = trpc.groups.list.useQuery();
  
  const groups = allGroups;
  const { data: todayLogData, isLoading, refetch } = trpc.attendance.todayLogWithPagination.useQuery({
    groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined,
    date: selectedDate,
    page: currentPage,
    limit: pageSize
  });
  
  const todayLog = todayLogData?.data || [];
  const totalPages = todayLogData?.totalPages || 1;
  const total = todayLogData?.total || 0;
  const { data: stats } = trpc.attendance.stats.useQuery({
    groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined
  });

  const exportMutation = trpc.attendance.exportToExcel.useMutation({
    onSuccess: (result) => {
      // Convert base64 to blob and download
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير سجل الحضور بنجاح');
    },
    onError: (error) => {
      toast.error(error.message || 'فشل تصدير سجل الحضور');
    }
  });

  const updateEventMutation = trpc.attendance.updateEvent.useMutation({
    onSuccess: () => {
      toast.success('تم تعديل سجل الحضور بنجاح');
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'فشل تعديل سجل الحضور');
    }
  });

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    
    // Format check-in time
    if (record.checkInTime) {
      const checkInDate = new Date(record.checkInTime);
      const hours = String(checkInDate.getHours()).padStart(2, '0');
      const minutes = String(checkInDate.getMinutes()).padStart(2, '0');
      setEditCheckInTime(`${hours}:${minutes}`);
    } else {
      setEditCheckInTime('');
    }
    
    // Format check-out time
    if (record.checkOutTime) {
      const checkOutDate = new Date(record.checkOutTime);
      const hours = String(checkOutDate.getHours()).padStart(2, '0');
      const minutes = String(checkOutDate.getMinutes()).padStart(2, '0');
      setEditCheckOutTime(`${hours}:${minutes}`);
    } else {
      setEditCheckOutTime('');
    }
    
    setEditNote('');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;

    // Use the original event date to preserve the record's date
    // Get the date from the original check-in or check-out time
    const originalDate = editingRecord.checkInTime || editingRecord.checkOutTime;
    if (!originalDate) return;
    
    const baseDate = new Date(originalDate);
    baseDate.setHours(0, 0, 0, 0);

    // Update check-in if changed
    if (editCheckInTime && editingRecord.checkInId) {
      const [hours, minutes] = editCheckInTime.split(':');
      const newCheckInTime = new Date(baseDate);
      newCheckInTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      updateEventMutation.mutate({
        eventId: editingRecord.checkInId,
        newTime: newCheckInTime.toISOString(),
        internalNote: editNote
      });
    }

    // Update check-out if changed
    if (editCheckOutTime && editingRecord.checkOutId) {
      const [hours, minutes] = editCheckOutTime.split(':');
      const newCheckOutTime = new Date(baseDate);
      newCheckOutTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      updateEventMutation.mutate({
        eventId: editingRecord.checkOutId,
        newTime: newCheckOutTime.toISOString(),
        internalNote: editNote
      });
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMethodBadge = (method: string | null) => {
    if (!method) return null;
    switch (method) {
      case 'qr':
        return <Badge variant="outline">QR</Badge>;
      case 'manual':
        return <Badge variant="secondary">يدوي</Badge>;
      case 'biometric':
        return <Badge variant="default">بصمة</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            سجل الحضور اليومي
          </h1>
          <p className="text-muted-foreground">
            {new Date(selectedDate).toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
            {dateLockStatus?.isLocked && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                مغلق
              </Badge>
            )}
          </div>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48">
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
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            onClick={() => exportMutation.mutate({ 
              date: selectedDate, 
              groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined 
            })}
            disabled={exportMutation.isPending || !todayLog?.length}
          >
            <Download className="h-4 w-4 ml-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      {dateLockStatus?.isLocked ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Lock className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">التاريخ مغلق للتعديل</p>
            <p className="text-sm text-red-700 mt-1">
              لا يمكن تعديل سجلات الحضور لهذا التاريخ لأنه يتضمن دفعة راتب معتمدة ({dateLockStatus.batch?.batchCode}). 
              يجب حذف المسودة أولاً للتمكن من التعديل.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">ملاحظة هامة</p>
            <p className="text-sm text-blue-700 mt-1">
              يمكنك تعديل سجلات الحضور لأي يوم طالما لم يتم إنشاء دفعة راتب له. إذا كان هناك دفعة راتب معتمدة، يجب حذف المسودة أولاً.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalWorkers || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي العمال</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <ArrowRightCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.presentToday || 0}</p>
                <p className="text-sm text-muted-foreground">حاضرون</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <ArrowLeftCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.absentToday || 0}</p>
                <p className="text-sm text-muted-foreground">غائبون</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayLog?.length || 0}</p>
                <p className="text-sm text-muted-foreground">عدد العمال</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل اليوم</CardTitle>
          <CardDescription>جميع تسجيلات الحضور والانصراف لهذا اليوم</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : !todayLog?.length ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-2 text-muted-foreground">لا توجد تسجيلات اليوم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم العامل</TableHead>
                    <TableHead className="text-right">الرمز</TableHead>
                    <TableHead className="text-right">وقت الحضور</TableHead>
                    <TableHead className="text-right">طريقة الحضور</TableHead>
                    <TableHead className="text-right">وقت الانصراف</TableHead>
                    <TableHead className="text-right">طريقة الانصراف</TableHead>
                    <TableHead className="text-right">دقائق العمل</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayLog.map((record) => (
                    <TableRow key={record.workerId}>
                      <TableCell className="font-medium">
                        {record.workerName}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {record.workerCode}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.checkInTime ? (
                          <div className="flex items-center gap-2">
                            <ArrowRightCircle className="h-4 w-4 text-green-600" />
                            {formatTime(record.checkInTime)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(record.checkInMethod)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <ArrowLeftCircle className="h-4 w-4 text-orange-600" />
                            {formatTime(record.checkOutTime)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(record.checkOutMethod)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {record.checkInTime && record.checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            {Math.round((new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000)} دقيقة
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(record)}
                          disabled={dateLockStatus?.isLocked}
                          title={dateLockStatus?.isLocked ? `التاريخ مغلق - دفعة ${dateLockStatus.batch?.batchCode}` : 'تعديل سجل الحضور'}
                        >
                          {dateLockStatus?.isLocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, total)} من {total} سجل
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل سجل الحضور</DialogTitle>
            <DialogDescription>
              تعديل أوقات الحضور والانصراف للعامل: {editingRecord?.workerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkInTime">وقت الحضور</Label>
              <Input
                id="checkInTime"
                type="time"
                value={editCheckInTime}
                onChange={(e) => setEditCheckInTime(e.target.value)}
                disabled={!editingRecord?.checkInId}
              />
              {!editingRecord?.checkInId && (
                <p className="text-sm text-muted-foreground">لم يتم تسجيل حضور بعد</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOutTime">وقت الانصراف</Label>
              <Input
                id="checkOutTime"
                type="time"
                value={editCheckOutTime}
                onChange={(e) => setEditCheckOutTime(e.target.value)}
                disabled={!editingRecord?.checkOutId}
              />
              {!editingRecord?.checkOutId && (
                <p className="text-sm text-muted-foreground">لم يتم تسجيل انصراف بعد</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">ملاحظة (اختياري)</Label>
              <Input
                id="note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="سبب التعديل..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateEventMutation.isPending}>
              {updateEventMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
