import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

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

  // Fetch groups (DynamicSchedules page doesn't filter by cost center)
  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery();

  // Fetch schedules for all groups
  const { data: schedulesData, isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = 
    trpc.groupSchedules.listByGroup.useQuery(
      { groupId: undefined }, // Fetch all schedules
      { enabled: true }
    );



  // Prepare schedule rows
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

  // Handle time change
  const handleTimeChange = (scheduleId: number, field: 'startTime' | 'endTime', value: string) => {
    const modified = new Map(modifiedSchedules);
    const existing = modified.get(scheduleId) || {};
    
    modified.set(scheduleId, {
      ...existing,
      [field]: value,
    });
    
    setModifiedSchedules(modified);
  };

  // Handle hours change
  const handleHoursChange = (scheduleId: number, value: string) => {
    const modified = new Map(modifiedSchedules);
    const existing = modified.get(scheduleId) || {};
    
    modified.set(scheduleId, {
      ...existing,
      requiredHours: parseFloat(value) || 0,
    });
    
    setModifiedSchedules(modified);
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (modifiedSchedules.size === 0) {
      toast.info('لا توجد تغييرات للحفظ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the update mutation
      const updateMutation = trpc.groupSchedules.update.useMutation();

      // Save each modified schedule
      const entries = Array.from(modifiedSchedules.entries());
      for (const [scheduleId, changes] of entries) {
        const schedule = scheduleRows.find(s => s.id === scheduleId);
        if (!schedule) continue;

        await updateMutation.mutateAsync({
          id: scheduleId,
          startTime: changes.startTime || schedule.startTime,
          endTime: changes.endTime || schedule.endTime,
          requiredHours: changes.requiredHours !== undefined ? changes.requiredHours : schedule.requiredHours,
        });
      }

      toast.success(`تم حفظ ${modifiedSchedules.size} تغيير بنجاح`);
      setModifiedSchedules(new Map());
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">إدارة الورديات الديناميكية</h1>
        <p className="text-gray-600 mt-2">تعديل جداول العمل والساعات المطلوبة لكل مجموعة</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
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
                    حفظ جميع التغييرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {groupsLoading || schedulesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-gray-500 mr-3">جاري تحميل البيانات...</p>
        </div>
      ) : schedulesError || !schedulesData ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            حدث خطأ في تحميل الورديات. يرجى تحديث الصفحة والمحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      ) : Object.entries(groupedByGroup).length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            لا توجد ورديات محددة حالياً. يرجى التأكد من وجود مجموعات وورديات في النظام.
          </AlertDescription>
        </Alert>
      ) : (
        /* Schedule Tables by Group */
        Object.entries(groupedByGroup).map(([groupId, schedules]) => {
          const group = groups?.find((g: any) => g.id === parseInt(groupId));
          
          return (
            <Card key={groupId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  {group?.name}
                </CardTitle>
                <CardDescription>
                  تعديل جدول العمل والساعات المطلوبة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اليوم</TableHead>
                        <TableHead className="text-right">وقت البداية</TableHead>
                        <TableHead className="text-right">وقت النهاية</TableHead>
                        <TableHead className="text-right">الساعات المطلوبة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule: ScheduleRow) => (
                        <TableRow 
                          key={schedule.id}
                          className={schedule.isModified ? 'bg-yellow-50' : ''}
                        >
                          <TableCell className="font-medium">
                            {schedule.dayName}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="time"
                              value={
                                modifiedSchedules.get(schedule.id)?.startTime || 
                                schedule.startTime
                              }
                              onChange={(e) => 
                                handleTimeChange(schedule.id, 'startTime', e.target.value)
                              }
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="time"
                              value={
                                modifiedSchedules.get(schedule.id)?.endTime || 
                                schedule.endTime
                              }
                              onChange={(e) => 
                                handleTimeChange(schedule.id, 'endTime', e.target.value)
                              }
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={
                                modifiedSchedules.get(schedule.id)?.requiredHours !== undefined
                                  ? modifiedSchedules.get(schedule.id).requiredHours
                                  : schedule.requiredHours
                              }
                              onChange={(e) => 
                                handleHoursChange(schedule.id, e.target.value)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {schedule.isModified ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                معدل
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                نشط
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>• عدّل أوقات البداية والنهاية والساعات المطلوبة حسب احتياجاتك</p>
          <p>• الصفوف المعدلة تظهر بخلفية صفراء</p>
          <p>• انقر على "حفظ جميع التغييرات" لتطبيق جميع التعديلات</p>
          <p>• التغييرات تُحفظ فوراً في قاعدة البيانات</p>
        </CardContent>
      </Card>
    </div>
  );
}
