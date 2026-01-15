import { useState } from 'react';
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
  Calendar
} from 'lucide-react';

export default function AttendanceLog() {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: todayLog, isLoading, refetch } = trpc.attendance.todayLog.useQuery({
    groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined
  });
  const { data: stats } = trpc.attendance.stats.useQuery({
    groupId: selectedGroup !== 'all' ? parseInt(selectedGroup) : undefined
  });

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventBadge = (eventType: string) => {
    if (eventType === 'check_in') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <ArrowRightCircle className="h-3 w-3 ml-1" />
          حضور
        </Badge>
      );
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        <ArrowLeftCircle className="h-3 w-3 ml-1" />
        انصراف
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
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
            {new Date().toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground">إجمالي التسجيلات</p>
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
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">اسم العامل</TableHead>
                    <TableHead className="text-right">الرمز</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الطريقة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayLog.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">
                        {formatTime(record.eventTime)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.workerName}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {record.workerCode}
                      </TableCell>
                      <TableCell>
                        {getEventBadge(record.eventType)}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(record.method || 'manual')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
