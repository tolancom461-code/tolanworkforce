import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertTriangle, CheckCircle, Clock, Edit2, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PunchRecord {
  id: number;
  workerId: number;
  workerName: string;
  workerCode: string;
  groupName: string;
  eventType: 'check_in' | 'check_out';
  eventTime: string;
  method: string;
  isAutomatic: boolean;
  note?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

export function PunchesReviewCenter() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING_REVIEW');
  const [selectedRecord, setSelectedRecord] = useState<PunchRecord | null>(null);
  const [editingNote, setEditingNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance events that need review
  const { data: attendanceEvents, isLoading: eventsLoading, refetch: refetchEvents } = 
    trpc.attendance.getForReview.useQuery(
      {
        workDate: new Date(selectedDate),
        status: selectedStatus as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED',
      },
      { enabled: !!selectedDate }
    );

  // Filter records
  const punchRecords = useMemo(() => {
    if (!attendanceEvents) return [];
    return attendanceEvents.map((event: any) => ({
      id: event.id,
      workerId: event.workerId,
      workerName: event.worker?.fullName || 'Unknown',
      workerCode: event.worker?.code || 'N/A',
      groupName: event.worker?.group?.name || 'N/A',
      eventType: event.eventType,
      eventTime: event.eventTime,
      method: event.method,
      isAutomatic: event.method === 'auto_complete',
      note: event.note,
      status: event.status || 'PENDING_REVIEW',
    }));
  }, [attendanceEvents]);

  const pendingCount = punchRecords.filter((r: PunchRecord) => r.status === 'PENDING_REVIEW').length;
  const approvedCount = punchRecords.filter((r: PunchRecord) => r.status === 'APPROVED').length;
  const rejectedCount = punchRecords.filter((r: PunchRecord) => r.status === 'REJECTED').length;

  const handleApprove = async (record: PunchRecord) => {
    setLoading(true);
    setError(null);

    try {
      // Call approve mutation
      const approveMutation = trpc.attendance.approvePunch.useMutation();
      await approveMutation.mutateAsync({
        id: record.id,
        note: editingNote,
      });

      toast.success('تم الموافقة على البصمة');
      setSelectedRecord(null);
      setEditingNote('');
      await refetchEvents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (record: PunchRecord) => {
    setLoading(true);
    setError(null);

    try {
      // Call reject mutation
      const rejectMutation = trpc.attendance.rejectPunch.useMutation();
      await rejectMutation.mutateAsync({
        id: record.id,
        note: editingNote,
      });

      toast.success('تم رفض البصمة');
      setSelectedRecord(null);
      setEditingNote('');
      await refetchEvents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (method: string, isAutomatic: boolean) => {
    if (isAutomatic) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-800">مكتمل تلقائي</Badge>;
    }
    
    switch (method) {
      case 'qr_code':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800">QR Code</Badge>;
      case 'biometric':
        return <Badge variant="outline" className="bg-green-50 text-green-800">بيومتري</Badge>;
      case 'manual':
        return <Badge variant="outline" className="bg-purple-50 text-purple-800">يدوي</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">موافق عليه</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">مركز مراجعة البصمات</h1>
        <p className="text-gray-600 mt-2">مراجعة والموافقة على البصمات المكتملة تلقائياً أو التي تحتاج مراجعة</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
          <CardDescription>اختر التاريخ والحالة للفلترة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_REVIEW">قيد المراجعة</SelectItem>
                  <SelectItem value="APPROVED">موافق عليه</SelectItem>
                  <SelectItem value="REJECTED">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">قيد المراجعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-gray-500">بصمة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">موافق عليها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-gray-500">بصمة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">مرفوضة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <X className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-gray-500">بصمة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Punches Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجلات البصمات</CardTitle>
          <CardDescription>اضغط على أي سجل لعرض التفاصيل والموافقة أو الرفض</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : punchRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد بصمات للعرض
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>المجموعة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">الطريقة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {punchRecords.map((record: PunchRecord) => (
                    <TableRow key={record.id} className={record.isAutomatic ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">
                        {record.workerName}
                        <br />
                        <span className="text-xs text-gray-500">{record.workerCode}</span>
                      </TableCell>
                      <TableCell>{record.groupName}</TableCell>
                      <TableCell className="text-right">
                        {record.eventType === 'check_in' ? (
                          <Badge className="bg-green-100 text-green-800">دخول</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">خروج</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {format(new Date(record.eventTime), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-right">
                        {getMethodBadge(record.method, record.isAutomatic)}
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRecord(record);
                                setEditingNote(record.note || '');
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>مراجعة البصمة</DialogTitle>
                              <DialogDescription>
                                {record.workerName} - {format(new Date(record.eventTime), 'yyyy-MM-dd HH:mm:ss')}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              {/* Punch Details */}
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">الموظف:</span>
                                  <span className="font-semibold">{record.workerName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">الكود:</span>
                                  <span className="font-semibold">{record.workerCode}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">المجموعة:</span>
                                  <span className="font-semibold">{record.groupName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">النوع:</span>
                                  <span className="font-semibold">
                                    {record.eventType === 'check_in' ? 'دخول' : 'خروج'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">الوقت:</span>
                                  <span className="font-semibold">
                                    {format(new Date(record.eventTime), 'HH:mm:ss')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">الطريقة:</span>
                                  <span className="font-semibold">
                                    {record.isAutomatic ? 'مكتمل تلقائي' : record.method}
                                  </span>
                                </div>
                              </div>

                              {/* Auto-complete Warning */}
                              {record.isAutomatic && (
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    هذه البصمة تم إكمالها تلقائياً بسبب بصمة ناقصة. يرجى المراجعة بعناية.
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Note Input */}
                              <div>
                                <Label htmlFor="note">ملاحظات</Label>
                                <Input
                                  id="note"
                                  value={editingNote}
                                  onChange={(e) => setEditingNote(e.target.value)}
                                  placeholder="أضف ملاحظاتك هنا..."
                                  className="mt-1"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => handleReject(record)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <X className="h-4 w-4 mr-2" />
                                  )}
                                  رفض
                                </Button>
                                <Button
                                  onClick={() => handleApprove(record)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                  )}
                                  موافق
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>• البصمات المكتملة تلقائياً تظهر بخلفية صفراء</p>
          <p>• يمكنك إضافة ملاحظات قبل الموافقة أو الرفض</p>
          <p>• الموافقة على البصمة ستثبتها في النظام وتزيل علامة التنبيه</p>
          <p>• الرفض سيتطلب إدخال بصمة جديدة من الموظف</p>
          <p>• جميع الإجراءات يتم تسجيلها في سجل التدقيق</p>
        </CardContent>
      </Card>
    </div>
  );
}
