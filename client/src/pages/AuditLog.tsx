import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, FileText } from 'lucide-react';

export default function AuditLog() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: undefined as number | undefined,
    action: '',
  });

  const { data: auditLogs, isLoading, refetch } = trpc.audit.getLog.useQuery(filters);
  const { data: workers } = trpc.workers.list.useQuery();

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'UPDATE_ATTENDANCE':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">تعديل حضور</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">سجل التدقيق</h1>
          <p className="text-muted-foreground">تتبع جميع التعديلات على سجلات الحضور</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            تصفية السجلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>العامل</Label>
              <Select
                value={filters.workerId?.toString() || 'all'}
                onValueChange={(value) => setFilters({ ...filters, workerId: value === 'all' ? undefined : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع العمال" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العمال</SelectItem>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id.toString()}>
                      {worker.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full">
                تطبيق التصفية
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>السجلات ({auditLogs?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>العامل</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>الوقت القديم</TableHead>
                    <TableHead>الوقت الجديد</TableHead>
                    <TableHead>الملاحظة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(log.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{log.userName || 'غير معروف'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.workerName || '-'}</span>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600 font-mono">
                            {log.oldValues?.eventTime ? formatTime(log.oldValues.eventTime) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-mono">
                            {log.newValues?.eventTime ? formatTime(log.newValues.eventTime) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.newValues?.note || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد سجلات تدقيق
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
