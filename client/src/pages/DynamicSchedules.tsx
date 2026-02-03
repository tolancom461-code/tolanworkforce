import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Save, Edit2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DaySchedule {
  id: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  requiredHours: number;
}

interface GroupWeekSchedules {
  groupId: number;
  groupName: string;
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  days: DaySchedule[];
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

const dayOrder = [1, 2, 3, 4, 5, 6, 7];

export function DynamicSchedules() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});

  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery();
  const { data: schedulesData, isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = 
    trpc.groupSchedules.listByGroup.useQuery(
      { groupId: undefined },
      { enabled: true }
    );
  
  const updateMutation = trpc.groupSchedules.update.useMutation();

  // Group schedules by week and group
  const groupedByWeek = useMemo(() => {
    if (!schedulesData || !groups) return [];

    const weekMap = new Map<string, GroupWeekSchedules>();
    
    schedulesData.forEach((schedule: any) => {
      const group = groups.find((g: any) => g.id === schedule.groupId);
      if (!group) return;

      // Calculate week start and end
      const scheduleDate = schedule.effectiveDate ? new Date(schedule.effectiveDate) : new Date(schedule.createdAt);
      const weekStart = getWeekStart(scheduleDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekKey = `${schedule.groupId}-${weekStart.toISOString().split('T')[0]}`;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          groupId: schedule.groupId,
          groupName: group.name,
          weekStart,
          weekEnd,
          weekLabel: formatWeekRange(weekStart),
          days: [],
        });
      }
      
      const week = weekMap.get(weekKey)!;
      week.days.push({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        dayName: dayNames[schedule.dayOfWeek] || `يوم ${schedule.dayOfWeek}`,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        requiredHours: parseFloat(schedule.requiredHours),
      });
    });

    // Sort days within each week
    weekMap.forEach((week) => {
      week.days.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));
    });

    return Array.from(weekMap.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [schedulesData, groups]);

  const handleEditDay = (day: DaySchedule) => {
    setEditingSchedule(day);
    setEditValues({
      startTime: day.startTime,
      endTime: day.endTime,
      requiredHours: day.requiredHours,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    setLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: editingSchedule.id,
        startTime: editValues.startTime,
        endTime: editValues.endTime,
        requiredHours: parseFloat(editValues.requiredHours) || 0,
      });

      toast.success('تم تحديث الوردية بنجاح');
      setEditingSchedule(null);
      await refetchSchedules();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

      {groupsLoading || schedulesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : groupedByWeek.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">لا توجد ورديات متاحة للتعديل</p>
          </CardContent>
        </Card>
      ) : (
        groupedByWeek.map((week) => (
          <Card key={`${week.groupId}-${week.weekStart.toISOString()}`} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{week.groupName}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    📅 {week.weekLabel}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                {dayOrder.map((dayNum) => {
                  const day = week.days.find((d) => d.dayOfWeek === dayNum);
                  
                  if (!day) {
                    return (
                      <div key={dayNum} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-sm text-gray-500">{dayNames[dayNum]}</p>
                        <p className="text-xs text-gray-400 mt-2">لا توجد وردية</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={day.id}
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{day.dayName}</p>
                          <p className="text-xs text-gray-500 mt-1">الساعات: {day.requiredHours}</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDay(day)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>تعديل وردية {day.dayName}</DialogTitle>
                              <DialogDescription>
                                تحديث أوقات العمل والساعات المطلوبة
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="startTime">وقت البداية</Label>
                                <input
                                  id="startTime"
                                  type="time"
                                  value={editValues.startTime}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, startTime: e.target.value })
                                  }
                                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <Label htmlFor="endTime">وقت النهاية</Label>
                                <input
                                  id="endTime"
                                  type="time"
                                  value={editValues.endTime}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, endTime: e.target.value })
                                  }
                                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <Label htmlFor="requiredHours">الساعات المطلوبة</Label>
                                <input
                                  id="requiredHours"
                                  type="number"
                                  step="0.5"
                                  value={editValues.requiredHours}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, requiredHours: e.target.value })
                                  }
                                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <Button
                                onClick={handleSaveEdit}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700"
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
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">البداية:</span>
                          <span className="font-mono font-semibold text-gray-900">{day.startTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">النهاية:</span>
                          <span className="font-mono font-semibold text-gray-900">{day.endTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  
  const daysToSubtract = day === 6 ? 0 : (day + 1) % 7;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  
  return d;
}

function formatWeekRange(date: Date): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };
  
  return `${formatDate(start)} إلى ${formatDate(end)}`;
}
