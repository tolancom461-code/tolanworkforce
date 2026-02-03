import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScheduleRow {
  id: number;
  groupId: number;
  groupName: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  requiredHours: number;
  isActive: boolean;
  isModified: boolean;
}

const dayNames: { [key: number]: string } = {
  1: 'السبت',
  2: 'الأحد',
  3: 'الاثنين',
  4: 'الثلاثاء',
  5: 'الأربعاء',
  6: 'الخميس',
  7: 'الجمعة',
};

export function DynamicSchedules() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modifiedSchedules, setModifiedSchedules] = useState<Map<number, any>>(new Map());
  const [dayEffectiveDates, setDayEffectiveDates] = useState<Map<number, 'current' | 'next' | 'previous'>>(new Map());

  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery();
  const { data: schedulesData, isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = 
    trpc.groupSchedules.listByGroup.useQuery(
      { groupId: undefined },
      { enabled: true }
    );
  
  // ✅ تم نقل useMutation إلى أعلى المكون (خارج الدوال)
  const updateMutation = trpc.groupSchedules.update.useMutation();

  const scheduleRows = useMemo(() => {
    if (!schedulesData || !groups) return [];

    const rows: ScheduleRow[] = [];
    
    groups.forEach((group: any) => {
      const groupSchedules = schedulesData.filter((s: any) => s.groupId === group.id);
      
      groupSchedules.forEach((schedule: any) => {
        rows.push({
          id: schedule.id,
          groupId: group.id,
          groupName: group.name,
          dayOfWeek: schedule.dayOfWeek,
          dayName: dayNames[schedule.dayOfWeek] || `يوم ${schedule.dayOfWeek}`,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          requiredHours: schedule.requiredHours,
          isActive: schedule.isActive,
          isModified: modifiedSchedules.has(schedule.id),
        });
      });
    });

    return rows;
  }, [schedulesData, groups, modifiedSchedules]);

  const handleTimeChange = (scheduleId: number, field: 'startTime' | 'endTime', value: string) => {
    const modified = new Map(modifiedSchedules);
    const existing = modified.get(scheduleId) || {};
    
    modified.set(scheduleId, {
      ...existing,
      [field]: value,
    });
    
    setModifiedSchedules(modified);
  };

  const handleHoursChange = (scheduleId: number, value: string) => {
    const modified = new Map(modifiedSchedules);
    const existing = modified.get(scheduleId) || {};
    
    const hours = parseFloat(value);
    modified.set(scheduleId, {
      ...existing,
      requiredHours: isNaN(hours) ? 0 : hours,
    });
    
    setModifiedSchedules(modified);
  };

  const getEffectiveDate = (dayOfWeek: number): Date | null => {
    const today = new Date();
    const currentDay = today.getDay();
    
    const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    const option = dayEffectiveDates.get(dayOfWeek) || 'current';
    
    let daysToAdd = 0;
    
    if (option === 'current') {
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && currentDay !== targetDay) daysToAdd = 0;
    } else if (option === 'next') {
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd <= 0) daysToAdd += 7;
    } else if (option === 'previous') {
      daysToAdd = (targetDay - currentDay - 7 + 14) % 7;
      if (daysToAdd >= 0) daysToAdd -= 7;
    }
    
    const result = new Date(today);
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };

  const handleSaveAll = async () => {
    if (modifiedSchedules.size === 0) {
      toast.info('لا توجد تغييرات للحفظ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entries = Array.from(modifiedSchedules.entries());
      for (const [scheduleId, changes] of entries) {
        const schedule = scheduleRows.find(s => s.id === scheduleId);
        if (!schedule) continue;

        const effectiveDate = getEffectiveDate(schedule.dayOfWeek);
        
        try {
          await updateMutation.mutateAsync({
            id: scheduleId,
            startTime: changes.startTime || schedule.startTime,
            endTime: changes.endTime || schedule.endTime,
            requiredHours: changes.requiredHours !== undefined ? changes.requiredHours : schedule.requiredHours,
            effectiveDate: effectiveDate || undefined,
          });
        } catch (err: any) {
          if (err.message.includes('تم اعتماد دفعة الراتب')) {
            toast.error(`${schedule.dayName}: تم اعتماد دفعة الراتب لا يمكن التعديل`);
          } else {
            throw err;
          }
        }
      }

      toast.success(`تم حفظ ${modifiedSchedules.size} تغيير بنجاح`);
      setModifiedSchedules(new Map());
      setDayEffectiveDates(new Map());
      await refetchSchedules();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const groupedByGroup = useMemo(() => {
    const grouped: { [key: number]: ScheduleRow[] } = {};
    
    scheduleRows.forEach((row) => {
      if (!grouped[row.groupId]) {
        grouped[row.groupId] = [];
      }
      grouped[row.groupId].push(row);
    });

    return grouped;
  }, [scheduleRows]);

  const modifiedCount = modifiedSchedules.size;

  if (schedulesError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          لا توجد ورديات محددة حالياً. يرجى التأكد من وجود مجموعات وورديات في النظام.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إدارة الورديات الديناميكية</h1>
        <p className="text-gray-600 mt-2">تعديل جداول العمل والساعات المطلوبة لكل مجموعة</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {Object.entries(groupedByGroup).map(([groupId, groupSchedules]) => (
        <Card key={groupId}>
          <CardHeader>
            <CardTitle>{groupSchedules[0]?.groupName}</CardTitle>
            <CardDescription>تعديل جداول العمل والساعات المطلوبة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اليوم</TableHead>
                    <TableHead>وقت البداية</TableHead>
                    <TableHead>وقت النهاية</TableHead>
                    <TableHead>الساعات المطلوبة</TableHead>
                    <TableHead>متى التطبيق؟</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupSchedules.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.dayName}</TableCell>
                      <TableCell>
                        <input
                          type="time"
                          value={modifiedSchedules.get(row.id)?.startTime || row.startTime}
                          onChange={(e) => handleTimeChange(row.id, 'startTime', e.target.value)}
                          className="border rounded px-2 py-1"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="time"
                          value={modifiedSchedules.get(row.id)?.endTime || row.endTime}
                          onChange={(e) => handleTimeChange(row.id, 'endTime', e.target.value)}
                          className="border rounded px-2 py-1"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="0.5"
                          value={modifiedSchedules.get(row.id)?.requiredHours !== undefined ? modifiedSchedules.get(row.id).requiredHours : row.requiredHours}
                          onChange={(e) => handleHoursChange(row.id, e.target.value)}
                          className="border rounded px-2 py-1 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={dayEffectiveDates.get(row.dayOfWeek) || 'current'}
                          onValueChange={(value: any) => {
                            const dates = new Map(dayEffectiveDates);
                            dates.set(row.dayOfWeek, value);
                            setDayEffectiveDates(dates);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="previous">الماضي</SelectItem>
                            <SelectItem value="current">الحالي</SelectItem>
                            <SelectItem value="next">القادم</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {modifiedCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  {modifiedCount} تغيير معلق
                </p>
                <p className="text-sm text-blue-800">
                  انقر على حفظ لتطبيق جميع التغييرات
                </p>
              </div>
              <Button
                onClick={handleSaveAll}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
