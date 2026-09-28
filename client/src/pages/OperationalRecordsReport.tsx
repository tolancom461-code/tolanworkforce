import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileBarChart } from 'lucide-react';

function formatTime(value?: string | null) {
  if (!value) return '-';
  const match = String(value).match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (!match) return String(value);
  const hour24 = Number(match[1]);
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${match[2]} ${hour24 < 12 ? 'ص' : 'م'}`;
}

function recordTypeLabel(type: string) {
  if (type === 'group_called') return 'استدعاء مجموعة';
  if (type === 'emergency_called') return 'استدعاء طارئ';
  if (type === 'games_closed') return 'إغلاق الألعاب';
  if (type === 'restaurants_closed') return 'إغلاق المطاعم';
  return type;
}

export default function OperationalRecordsReport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [costCenterId, setCostCenterId] = useState('all');
  const [groupId, setGroupId] = useState('all');

  const { data: operationalDay } = trpc.restaurants.currentWorkDate.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: allGroups } = trpc.groups.list.useQuery();
  const scopedRoles = new Set(['supervisor_tolan', 'supervisor_malqa', 'restaurant_operations']);
  const isScoped = !!user?.role && scopedRoles.has(user.role);
  const { data: userCostCenters } = trpc.users.getUserCostCenters.useQuery(
    { userId: user?.id || 0 },
    { enabled: isScoped && !!user?.id }
  );

  useEffect(() => {
    if (!operationalDay?.workDate || startDate || endDate) return;
    setStartDate(operationalDay.workDate);
    setEndDate(operationalDay.workDate);
  }, [operationalDay?.workDate, startDate, endDate]);

  const visibleCostCenters = useMemo(() => {
    if (!isScoped) return costCenters || [];
    const allowedIds = new Set((userCostCenters || []).map((row: any) => Number(row.costCenterId)));
    return (costCenters || []).filter((row: any) => allowedIds.has(Number(row.id)));
  }, [costCenters, isScoped, userCostCenters]);

  useEffect(() => {
    if (!isScoped || costCenterId !== 'all' || visibleCostCenters.length !== 1) return;
    setCostCenterId(String(visibleCostCenters[0].id));
  }, [isScoped, costCenterId, visibleCostCenters]);

  const visibleGroups = useMemo(() => {
    return (allGroups || []).filter((group: any) => {
      if (!group.isActive) return false;
      if (costCenterId !== 'all') return Number(group.costCenterId) === Number(costCenterId);
      if (!isScoped) return true;
      const allowedIds = new Set(visibleCostCenters.map((row: any) => Number(row.id)));
      return allowedIds.has(Number(group.costCenterId));
    });
  }, [allGroups, costCenterId, isScoped, visibleCostCenters]);

  const { data: rows, isLoading } = trpc.restaurants.operationalRecordsReport.useQuery(
    {
      startDate,
      endDate,
      costCenterId: costCenterId === 'all' ? undefined : Number(costCenterId),
      groupId: groupId === 'all' ? undefined : Number(groupId),
    },
    { enabled: !!startDate && !!endDate && startDate <= endDate }
  );

  const closingRows = (rows || []).filter((row: any) => row.eventType === 'games_closed' || row.eventType === 'restaurants_closed');
  const callRows = (rows || []).filter((row: any) => row.eventType === 'group_called' || row.eventType === 'emergency_called');
  const closingByDate = useMemo(() => {
    const byDate = new Map<string, { workDate: string; games: any[]; restaurants: any[] }>();
    for (const row of closingRows) {
      const current = byDate.get(row.workDate) || { workDate: row.workDate, games: [], restaurants: [] };
      if (row.eventType === 'games_closed') current.games.push(row);
      if (row.eventType === 'restaurants_closed') current.restaurants.push(row);
      byDate.set(row.workDate, current);
    }
    return Array.from(byDate.values()).sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [rows]);
  const displayName = (value?: string | null) => value || '-';
  const formatClosingCell = (items: any[]) => {
    if (!items.length) return '-';
    return items.map((row: any) => `${formatTime(row.eventAt)} — ${displayName(row.costCenterName)} — ${displayName(row.actorName)}`).join(' | ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6" />
            تقارير الاستدعاء والإغلاق
          </h1>
          <p className="text-muted-foreground">تقارير تشغيلية ورقابية فقط، ولا تؤثر على الحضور أو الرواتب.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">فلاتر التقرير</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>من اليوم التشغيلي</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>إلى اليوم التشغيلي</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>مركز التكلفة</Label>
              <Select value={costCenterId} onValueChange={(value) => { setCostCenterId(value); setGroupId('all'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isScoped && <SelectItem value="all">كل مراكز التكلفة</SelectItem>}
                  {visibleCostCenters.map((center: any) => (
                    <SelectItem key={center.id} value={String(center.id)}>{center.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المجموعة</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المجموعات</SelectItem>
                  {visibleGroups.map((group: any) => (
                    <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="closing">
          <TabsList>
            <TabsTrigger value="closing">تقرير أوقات الإغلاق ({closingByDate.length})</TabsTrigger>
            <TabsTrigger value="calls">تقرير الاستدعاءات ({callRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="closing">
            <Card>
              <CardHeader><CardTitle className="text-base">أوقات إغلاق الألعاب والمطاعم</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>اليوم التشغيلي</TableHead>
                    <TableHead>إغلاق الألعاب — المركز — المسجل</TableHead>
                    <TableHead>إغلاق المطاعم — المركز — المسجل</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {closingByDate.map((row) => (
                      <TableRow key={row.workDate}>
                        <TableCell className="font-medium">{row.workDate}</TableCell>
                        <TableCell>{formatClosingCell(row.games)}</TableCell>
                        <TableCell>{formatClosingCell(row.restaurants)}</TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && closingByDate.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">لا توجد سجلات مطابقة.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls">
            <Card>
              <CardHeader><CardTitle className="text-base">استدعاءات المجموعات والاستدعاءات الطارئة</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>اليوم</TableHead><TableHead>مركز التكلفة</TableHead><TableHead>النوع</TableHead>
                    <TableHead>المجموعة</TableHead><TableHead>العامل</TableHead><TableHead>وقت الاستدعاء</TableHead>
                    <TableHead>السبب</TableHead><TableHead>سجله</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {callRows.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.workDate}</TableCell><TableCell>{displayName(row.costCenterName)}</TableCell>
                        <TableCell><Badge variant="secondary">{recordTypeLabel(row.eventType)}</Badge></TableCell>
                        <TableCell>{displayName(row.groupName)}</TableCell>
                        <TableCell>{row.workerCode ? `${row.workerCode} — ${displayName(row.workerName)}` : '-'}</TableCell>
                        <TableCell className="font-medium">{formatTime(row.eventAt)}</TableCell>
                        <TableCell>{displayName(row.note)}</TableCell><TableCell>{displayName(row.actorName)}</TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && callRows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد سجلات مطابقة.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {language === 'en' && <p className="text-xs text-muted-foreground">Operational records remain informational only.</p>}
      </div>
    </DashboardLayout>
  );
}
