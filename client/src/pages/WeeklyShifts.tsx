import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DAYS_OF_WEEK = [
  { id: 0, name: 'الأحد', nameEn: 'Sunday' },
  { id: 1, name: 'الإثنين', nameEn: 'Monday' },
  { id: 2, name: 'الثلاثاء', nameEn: 'Tuesday' },
  { id: 3, name: 'الأربعاء', nameEn: 'Wednesday' },
  { id: 4, name: 'الخميس', nameEn: 'Thursday' },
  { id: 5, name: 'الجمعة', nameEn: 'Friday' },
  { id: 6, name: 'السبت', nameEn: 'Saturday' },
];

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredHours: number;
  isActive: boolean;
}

export default function WeeklyShifts() {
  // Using sonner toast
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.id,
      startTime: '08:00',
      endTime: '16:00',
      requiredHours: 8,
      isActive: true,
    }))
  );

  const { data: groups, isLoading: loadingGroups } = trpc.groups.list.useQuery();
  const { data: existingSchedules, refetch: refetchSchedules } = trpc.groupSchedules.listByGroup.useQuery(
    { groupId: selectedGroupId! },
    { enabled: !!selectedGroupId }
  );

  const saveSchedulesMutation = (trpc.groupSchedules as any).saveWeeklySchedules.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ الورديات الأسبوعية بنجاح');
      refetchSchedules();
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حفظ الورديات');
    },
  });

  // Load existing schedules when group is selected
  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0) {
      const loadedSchedules = DAYS_OF_WEEK.map(day => {
        const existing = existingSchedules.find((s: any) => s.dayOfWeek === day.id);
        if (existing) {
          return {
            dayOfWeek: day.id,
            startTime: existing.startTime || '08:00',
            endTime: existing.endTime || '16:00',
            requiredHours: Number(existing.requiredHours) || 8,
            isActive: existing.isActive !== false,
          };
        }
        return {
          dayOfWeek: day.id,
          startTime: '08:00',
          endTime: '16:00',
          requiredHours: 8,
          isActive: true,
        };
      });
      setSchedules(loadedSchedules);
    }
  }, [existingSchedules]);

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev =>
      prev.map(s =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const handleActiveToggle = (dayOfWeek: number) => {
    setSchedules(prev =>
      prev.map(s =>
        s.dayOfWeek === dayOfWeek ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  const handleSaveAll = async () => {
    if (!selectedGroupId) {
      toast.error('الرجاء اختيار مجموعة أولاً');
      return;
    }

    await saveSchedulesMutation.mutateAsync({
      groupId: selectedGroupId,
      schedules: schedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        requiredHours: s.requiredHours,
        isActive: s.isActive,
      })),
      effectiveDate: effectiveDate || undefined,
    });
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (hours < 0) hours += 24; // Handle overnight shifts
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    
    return hours + minutes / 60;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الورديات الأسبوعية</h1>
          <p className="text-muted-foreground mt-2">
            قم بتعيين أوقات وردية مختلفة لكل يوم من أيام الأسبوع
          </p>
        </div>
      </div>

      {/* Group Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            اختيار المجموعة
          </CardTitle>
          <CardDescription>
            اختر المجموعة التي تريد إدارة ورديات أيامها الأسبوعية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>المجموعة</Label>
              <Select
                value={selectedGroupId?.toString() || ''}
                onValueChange={(value) => setSelectedGroupId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مجموعة" />
                </SelectTrigger>
                <SelectContent>
                  {loadingGroups ? (
                    <SelectItem value="loading" disabled>
                      جاري التحميل...
                    </SelectItem>
                  ) : (
                    groups?.map((group: any) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.nameAr || group.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاريخ التطبيق (اختياري)</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                placeholder="اترك فارغاً للتطبيق الفوري"
              />
              <p className="text-xs text-muted-foreground">
                إذا تركت فارغاً، سيتم تطبيق الورديات فوراً
              </p>
            </div>
          </div>

          {effectiveDate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                سيتم تطبيق هذه الورديات ابتداءً من {new Date(effectiveDate).toLocaleDateString('ar-SA')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      {selectedGroupId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              جدول الورديات الأسبوعي
            </CardTitle>
            <CardDescription>
              حدد أوقات البداية والنهاية لكل يوم من أيام الأسبوع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const schedule = schedules.find(s => s.dayOfWeek === day.id)!;
                const calculatedHours = calculateHours(schedule.startTime, schedule.endTime);

                return (
                  <div
                    key={day.id}
                    className={`p-4 border rounded-lg ${
                      schedule.isActive ? 'bg-background' : 'bg-muted/50'
                    }`}
                  >
                    <div className="grid gap-4 md:grid-cols-5 items-end">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">{day.name}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule.isActive}
                            onChange={() => handleActiveToggle(day.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-muted-foreground">
                            {schedule.isActive ? 'فعّال' : 'معطّل'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>وقت البداية</Label>
                        <Input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => handleTimeChange(day.id, 'startTime', e.target.value)}
                          disabled={!schedule.isActive}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>وقت النهاية</Label>
                        <Input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => handleTimeChange(day.id, 'endTime', e.target.value)}
                          disabled={!schedule.isActive}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>عدد الساعات</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                          <span className="font-semibold">
                            {calculatedHours.toFixed(1)} ساعة
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-transparent">.</Label>
                        <div className="text-sm text-muted-foreground">
                          {schedule.isActive ? (
                            <span className="text-green-600">✓ وردية نشطة</span>
                          ) : (
                            <span className="text-gray-500">○ يوم راحة</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSchedules(
                    DAYS_OF_WEEK.map(day => ({
                      dayOfWeek: day.id,
                      startTime: '08:00',
                      endTime: '16:00',
                      requiredHours: 8,
                      isActive: true,
                    }))
                  );
                  setEffectiveDate('');
                }}
              >
                إعادة تعيين
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saveSchedulesMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saveSchedulesMutation.isPending ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedGroupId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>الرجاء اختيار مجموعة لبدء إدارة الورديات الأسبوعية</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
