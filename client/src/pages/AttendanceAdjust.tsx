import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Edit,
  RefreshCw,
  Search,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceAdjust() {
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEvent, setEditingEvent] = useState<{
    id: number;
    eventType: string;
    eventTime: Date;
    note: string;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTimeOnly, setNewTimeOnly] = useState('');
  const [internalNote, setInternalNote] = useState('');
  
  const { data: workers } = trpc.workers.list.useQuery();
  const { data: events, refetch } = trpc.attendanceAdjust.getEvents.useQuery(
    { workerId: parseInt(selectedWorker), workDate: selectedDate },
    { enabled: !!selectedWorker }
  );
  
  const updateMutation = trpc.attendanceAdjust.updateEvent.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور بنجاح');
      refetch();
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    const eventDate = new Date(event.eventTime);
    setNewDate(eventDate.toISOString().split('T')[0]); // YYYY-MM-DD
    setNewTimeOnly(eventDate.toTimeString().slice(0, 5)); // HH:MM
    setInternalNote(event.note || '');
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!editingEvent || !newDate || !newTimeOnly) return;
    // Combine date and time
    const combinedDateTime = `${newDate}T${newTimeOnly}:00`;
    updateMutation.mutate({
      eventId: editingEvent.id,
      newTime: new Date(combinedDateTime).toISOString(),
      internalNote,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Edit className="h-6 w-6" />
          تعديل الحضور
        </h1>
        <p className="text-muted-foreground">
          تعديل سجلات الحضور والانصراف للعمال
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>البحث عن سجل الحضور</CardTitle>
          <CardDescription>اختر العامل والتاريخ لعرض سجلات الحضور</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={!selectedWorker}>
                <Search className="h-4 w-4 ml-2" />
                بحث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      {selectedWorker && (
        <Card>
          <CardHeader>
            <CardTitle>سجلات الحضور</CardTitle>
            <CardDescription>
              سجلات يوم {new Date(selectedDate).toLocaleDateString('ar-SA')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!events?.length ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">لا توجد سجلات لهذا اليوم</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">الطريقة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge variant={event.eventType === 'check_in' ? 'default' : 'secondary'}>
                          {event.eventType === 'check_in' ? 'حضور' : 'انصراف'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatTime(event.eventTime)}
                      </TableCell>
                      <TableCell>
                        {event.method || 'يدوي'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {event.note || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل سجل الحضور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>النوع</Label>
              <Input
                value={editingEvent?.eventType === 'check_in' ? 'حضور' : 'انصراف'}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الوقت</Label>
                <Input
                  type="time"
                  value={newTimeOnly}
                  onChange={(e) => setNewTimeOnly(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>سبب التعديل (ملاحظة داخلية)</Label>
              <Textarea
                placeholder="أدخل سبب التعديل..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || !internalNote}>
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
