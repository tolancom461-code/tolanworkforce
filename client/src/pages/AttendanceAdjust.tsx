import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const [adjustmentType, setAdjustmentType] = useState<'worker' | 'group'>('worker');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEvent, setEditingEvent] = useState<{
    id: number;
    workerId: number;
    eventType: string;
    eventTime: Date;
    note: string;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTimeOnly, setNewTimeOnly] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [bulkAdjustmentMinutes, setBulkAdjustmentMinutes] = useState<number>(0);
  
  const { data: workers } = trpc.workers.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: events, refetch } = trpc.attendanceAdjust.getEvents.useQuery(
    { workerId: parseInt(selectedWorker), workDate: selectedDate },
    { enabled: adjustmentType === 'worker' && !!selectedWorker }
  );
  const { data: groupEvents, refetch: refetchGroupEvents } = trpc.attendanceAdjust.getEventsByGroup.useQuery(
    { groupId: parseInt(selectedGroup), workDate: selectedDate },
    { enabled: adjustmentType === 'group' && !!selectedGroup }
  );
  
  const updateMutation = trpc.attendanceAdjust.updateEvent.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور بنجاح');
      if (adjustmentType === 'worker') refetch();
      else refetchGroupEvents();
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });
  
  const bulkUpdateMutation = trpc.attendance.bulkUpdate.useMutation({
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        toast.success(`تم تحديث ${successCount} سجل بنجاح`);
      } else {
        toast.warning(`تم تحديث ${successCount} سجل، فشل ${failCount} سجل`);
      }
      if (adjustmentType === 'worker') refetch();
      else refetchGroupEvents();
      setShowBulkDialog(false);
      setSelectedEvents([]);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ في التعديل الجماعي');
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
    const newTime = new Date(combinedDateTime);
    
    // Validation: Check if time is valid
    if (isNaN(newTime.getTime())) {
      toast.error('التاريخ أو الوقت غير صحيح');
      return;
    }
    
    // Validation: If this is check-out, ensure it's after check-in
    if (editingEvent.eventType === 'check_out') {
      // Find corresponding check-in event
      const currentEvents = adjustmentType === 'worker' ? events : groupEvents;
      const checkInEvent = currentEvents?.find((e: any) => 
        e.eventType === 'check_in' && 
        e.workerId === editingEvent.workerId &&
        new Date(e.eventTime).toDateString() === newTime.toDateString()
      );
      
      if (checkInEvent) {
        const checkInTime = new Date(checkInEvent.eventTime);
        const diffMinutes = (newTime.getTime() - checkInTime.getTime()) / (1000 * 60);
        
        if (diffMinutes <= 0) {
          toast.error('وقت الانصراف يجب أن يكون بعد وقت الحضور');
          return;
        }
        
        if (diffMinutes < 30) {
          toast.warning('تحذير: الفرق بين الحضور والانصراف أقل من 30 دقيقة');
        }
        
        if (diffMinutes > 24 * 60) {
          toast.warning('تحذير: الفرق بين الحضور والانصراف أكثر من 24 ساعة');
        }
      }
    }
    
    // Validation: If this is check-in, ensure it's before check-out
    if (editingEvent.eventType === 'check_in') {
      const currentEvents = adjustmentType === 'worker' ? events : groupEvents;
      const checkOutEvent = currentEvents?.find((e: any) => 
        e.eventType === 'check_out' && 
        e.workerId === editingEvent.workerId &&
        new Date(e.eventTime).toDateString() === newTime.toDateString()
      );
      
      if (checkOutEvent) {
        const checkOutTime = new Date(checkOutEvent.eventTime);
        const diffMinutes = (checkOutTime.getTime() - newTime.getTime()) / (1000 * 60);
        
        if (diffMinutes <= 0) {
          toast.error('وقت الحضور يجب أن يكون قبل وقت الانصراف');
          return;
        }
        
        if (diffMinutes < 30) {
          toast.warning('تحذير: الفرق بين الحضور والانصراف أقل من 30 دقيقة');
        }
        
        if (diffMinutes > 24 * 60) {
          toast.warning('تحذير: الفرق بين الحضور والانصراف أكثر من 24 ساعة');
        }
      }
    }
    
    updateMutation.mutate({
      eventId: editingEvent.id,
      newTime: newTime.toISOString(),
      internalNote,
    });
  };
  
  const handleBulkEdit = () => {
    if (selectedEvents.length === 0) {
      toast.error('يجب اختيار سجل واحد على الأقل');
      return;
    }
    setShowBulkDialog(true);
  };
  
  const handleBulkSave = () => {
    if (bulkAdjustmentMinutes === 0) {
      toast.error('يجب إدخال قيمة التعديل');
      return;
    }
    bulkUpdateMutation.mutate({
      eventIds: selectedEvents,
      adjustmentMinutes: bulkAdjustmentMinutes,
      internalNote: `تعديل جماعي: ${bulkAdjustmentMinutes > 0 ? '+' : ''}${bulkAdjustmentMinutes} دقيقة`,
    });
  };
  
  const toggleEventSelection = (eventId: number) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };
  
  const toggleSelectAll = () => {
    const currentEvents = adjustmentType === 'worker' ? events : groupEvents;
    if (selectedEvents.length === currentEvents?.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(currentEvents?.map(e => e.id) || []);
    }
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
          <CardDescription>اختر نوع التعديل والتاريخ لعرض سجلات الحضور</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Adjustment Type Selection */}
            <div className="space-y-2">
              <Label>نوع التعديل</Label>
              <RadioGroup value={adjustmentType} onValueChange={(value: 'worker' | 'group') => {
                setAdjustmentType(value);
                setSelectedWorker('');
                setSelectedGroup('');
                setSelectedEvents([]);
              }}>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="worker" id="worker" />
                  <Label htmlFor="worker" className="cursor-pointer">تعديل حسب العامل</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group" className="cursor-pointer">تعديل حسب المجموعة</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adjustmentType === 'worker' ? (
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
              ) : (
                <div className="space-y-2">
                  <Label>المجموعة</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المجموعة" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={() => {
                  if (adjustmentType === 'worker') refetch();
                  else refetchGroupEvents();
                }} disabled={adjustmentType === 'worker' ? !selectedWorker : !selectedGroup}>
                  <Search className="h-4 w-4 ml-2" />
                  بحث
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      {(selectedWorker || selectedGroup) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>سجلات الحضور</CardTitle>
                <CardDescription>
                  سجلات يوم {new Date(selectedDate).toLocaleDateString('ar-SA')}
                </CardDescription>
              </div>
              {((adjustmentType === 'worker' && events && events.length > 0) || (adjustmentType === 'group' && groupEvents && groupEvents.length > 0)) && (
                <Button 
                  variant="outline" 
                  onClick={handleBulkEdit}
                  disabled={selectedEvents.length === 0}
                >
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل جماعي ({selectedEvents.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(adjustmentType === 'worker' && !events?.length) || (adjustmentType === 'group' && !groupEvents?.length) ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">لا توجد سجلات لهذا اليوم</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedEvents.length === (adjustmentType === 'worker' ? events?.length || 0 : groupEvents?.length || 0)}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    {adjustmentType === 'group' && <TableHead className="text-right">العامل</TableHead>}
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">الطريقة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(adjustmentType === 'worker' ? events : groupEvents)?.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedEvents.includes(event.id)}
                          onChange={() => toggleEventSelection(event.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      {adjustmentType === 'group' && (
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.workerName}</div>
                            <div className="text-sm text-muted-foreground">{event.workerCode}</div>
                          </div>
                        </TableCell>
                      )}
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
      
      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل جماعي للحضور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>عدد السجلات المختارة</Label>
              <div className="text-2xl font-bold">{selectedEvents.length}</div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bulkAdjustment">قيمة التعديل (بالدقائق)</Label>
              <Input
                id="bulkAdjustment"
                type="number"
                value={bulkAdjustmentMinutes}
                onChange={(e) => setBulkAdjustmentMinutes(parseInt(e.target.value) || 0)}
                placeholder="مثال: 15 للإضافة، -10 للخصم"
              />
              <p className="text-sm text-muted-foreground">
                استخدم قيمة موجبة للإضافة أو سالبة للخصم
              </p>
            </div>
            
            {bulkAdjustmentMinutes !== 0 && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">معاينة:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  سيتم {bulkAdjustmentMinutes > 0 ? 'إضافة' : 'خصم'} {Math.abs(bulkAdjustmentMinutes)} دقيقة 
                  {bulkAdjustmentMinutes > 0 ? 'إلى' : 'من'} جميع السجلات المختارة
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleBulkSave} 
              disabled={bulkUpdateMutation.isPending || bulkAdjustmentMinutes === 0}
            >
              {bulkUpdateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              تطبيق التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
