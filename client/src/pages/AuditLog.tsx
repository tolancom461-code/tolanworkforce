import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileSearch, 
  Calendar, 
  User, 
  Filter, 
  ChevronRight, 
  ChevronLeft,
  BarChart3,
  Eye,
  X,
  UserCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ===== Arabic action labels =====
const ACTION_LABELS: Record<string, string> = {
  // Workers
  CREATE_WORKER: 'إضافة عامل',
  UPDATE_WORKER: 'تعديل عامل',
  DELETE_WORKER: 'حذف عامل',
  // Users
  CREATE_USER: 'إضافة مستخدم',
  UPDATE_USER: 'تعديل مستخدم',
  DELETE_USER: 'حذف مستخدم',
  UPDATE_USER_ROLE: 'تغيير دور مستخدم',
  // Groups
  CREATE_GROUP: 'إضافة مجموعة',
  UPDATE_GROUP: 'تعديل مجموعة',
  DELETE_GROUP: 'حذف مجموعة',
  // Attendance
  UPDATE_ATTENDANCE: 'تعديل حضور',
  DELETE_ATTENDANCE: 'حذف بصمة',
  // Payroll
  CREATE_PAYROLL_BATCH: 'إنشاء دفعة رواتب',
  SUBMIT_PAYROLL_FOR_REVIEW: 'إرسال دفعة للمراجعة',
  ACCOUNTANT_APPROVE_PAYROLL: 'اعتماد المحاسب',
  ACCOUNTANT_REJECT_PAYROLL: 'رفض المحاسب',
  AUDITOR_APPROVE_PAYROLL: 'اعتماد المراجع',
  AUDITOR_REJECT_PAYROLL: 'رفض المراجع',
  FM_APPROVE_PAYROLL: 'اعتماد مدير الحسابات',
  FM_REJECT_PAYROLL: 'رفض مدير الحسابات',
  DELETE_PAYROLL_BATCH: 'حذف دفعة رواتب',
  FORCE_DELETE_PAYROLL_BATCH: 'حذف نهائي لدفعة',
  FORCE_UNLOCK_PAYROLL: 'إلغاء قفل دفعة',
  RELOCK_PAYROLL: 'إعادة قفل دفعة',
  // Pay Overrides
  CREATE_PAY_OVERRIDE: 'إضافة تجاوز مالي',
  APPROVE_PAY_OVERRIDE: 'اعتماد تجاوز مالي',
  REJECT_PAY_OVERRIDE: 'رفض تجاوز مالي',
  // Temporary Assignments
  CREATE_TEMP_ASSIGNMENT: 'إنشاء انتداب مؤقت',
  UPDATE_TEMP_ASSIGNMENT: 'تعديل انتداب مؤقت',
  CANCEL_TEMP_ASSIGNMENT: 'إلغاء انتداب مؤقت',
  DELETE_TEMP_ASSIGNMENT: 'حذف انتداب مؤقت',
  // Backup
  'نسخ احتياطي Excel': 'نسخ احتياطي Excel',
  'نسخ احتياطي SQL': 'نسخ احتياطي SQL',
  'نسخ احتياطي CSV': 'نسخ احتياطي CSV',
};

const TABLE_LABELS: Record<string, string> = {
  workers: 'العمال',
  users: 'المستخدمين',
  groups: 'المجموعات',
  attendance_events: 'الحضور',
  payroll_batches: 'الرواتب',
  pay_overrides: 'التجاوزات المالية',
  temporary_assignments: 'الانتدابات المؤقتة',
  backup: 'النسخ الاحتياطي',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  admin_affairs: 'الشؤون الإدارية',
  accountant: 'المحاسب',
  auditor: 'المراجع المالي',
  finance_manager: 'مدير الحسابات',
  guard: 'حارس',
  executive: 'الإدارة العليا',
  supervisor_tolan: 'مشرف طولان',
  supervisor_malqa: 'مشرف ملقا',
};

// ===== ترجمة أسماء الحقول التقنية إلى عربي =====
const FIELD_LABELS: Record<string, string> = {
  // Workers
  fullName: 'الاسم الكامل',
  code: 'الرمز',
  groupId: 'رقم المجموعة',
  status: 'الحالة',
  nationality: 'الجنسية',
  jobTitle: 'المسمى الوظيفي',
  hireDate: 'تاريخ التعيين',
  baseSalary: 'الراتب الأساسي',
  housingAllowance: 'بدل السكن',
  transportAllowance: 'بدل النقل',
  foodAllowance: 'بدل الطعام',
  otherAllowance: 'بدلات أخرى',
  iqamaNumber: 'رقم الإقامة',
  passportNumber: 'رقم الجواز',
  phone: 'الهاتف',
  // Users
  username: 'اسم المستخدم',
  role: 'الدور',
  isActive: 'نشط',
  email: 'البريد الإلكتروني',
  // Groups
  name: 'الاسم',
  costCenterId: 'مركز التكلفة',
  // Attendance
  workerId: 'رقم العامل',
  eventType: 'نوع الحدث',
  eventTime: 'وقت الحدث',
  // Payroll
  periodStart: 'بداية الفترة',
  periodEnd: 'نهاية الفترة',
  itemsCount: 'عدد العناصر',
  note: 'ملاحظة',
  // Pay Overrides
  overrideType: 'نوع التجاوز',
  amount: 'المبلغ',
  reason: 'السبب',
  // Backup
  type: 'النوع',
  tables: 'الجداول',
  table: 'الجدول',
  timestamp: 'الوقت',
  // Temp Assignments
  workerName: 'اسم العامل',
  fromGroupId: 'من مجموعة',
  toGroupId: 'إلى مجموعة',
  startDate: 'تاريخ البداية',
  endDate: 'تاريخ النهاية',
};

// Action category colors
function getActionColor(action: string): string {
  if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('إنشاء')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('FORCE') || action.includes('CANCEL')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (action.includes('UPDATE') || action.includes('SUBMIT') || action.includes('LOCK')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (action.includes('نسخ احتياطي')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
}

// ===== استخراج اسم الكيان المتأثر من البيانات =====
function getEntityName(log: any): string | null {
  const action = log.action || '';
  const tableName = log.tableName || '';
  const oldValues = log.oldValues;
  const newValues = log.newValues;
  
  // العمال: fullName
  if (tableName === 'workers' || action.includes('WORKER')) {
    return newValues?.fullName || oldValues?.fullName || null;
  }
  
  // المستخدمين: fullName أو username
  if (tableName === 'users' || action.includes('USER')) {
    return newValues?.fullName || oldValues?.fullName || newValues?.username || oldValues?.username || null;
  }
  
  // المجموعات: name أو code
  if (tableName === 'groups' || action.includes('GROUP')) {
    const name = newValues?.name || oldValues?.name;
    const code = newValues?.code || oldValues?.code;
    if (name && code) return `${name} (${code})`;
    return name || code || null;
  }
  
  // الحضور: workerId
  if (tableName === 'attendance_events' || action.includes('ATTENDANCE')) {
    const wId = newValues?.workerId || oldValues?.workerId;
    if (wId) return `عامل رقم ${wId}`;
    return null;
  }
  
  // الرواتب: periodStart + periodEnd
  if (tableName === 'payroll_batches' || action.includes('PAYROLL')) {
    const start = newValues?.periodStart || oldValues?.periodStart;
    const end = newValues?.periodEnd || oldValues?.periodEnd;
    if (start && end) return `فترة ${start} - ${end}`;
    return log.recordId ? `دفعة رقم ${log.recordId}` : null;
  }
  
  // التجاوزات المالية: workerId + overrideType
  if (tableName === 'pay_overrides' || action.includes('PAY_OVERRIDE')) {
    const wId = newValues?.workerId || oldValues?.workerId;
    const oType = newValues?.overrideType || oldValues?.overrideType;
    if (wId && oType) return `عامل ${wId} - ${oType}`;
    if (wId) return `عامل رقم ${wId}`;
    return null;
  }
  
  // الانتدابات المؤقتة
  if (tableName === 'temporary_assignments' || action.includes('TEMP_ASSIGNMENT')) {
    const wName = newValues?.workerName || oldValues?.workerName;
    if (wName) return wName;
    const wId = newValues?.workerId || oldValues?.workerId;
    if (wId) return `عامل رقم ${wId}`;
    return null;
  }
  
  // النسخ الاحتياطي
  if (tableName === 'backup' || action.includes('نسخ احتياطي')) {
    const bType = newValues?.type;
    if (bType) return `نسخة ${bType.toUpperCase()}`;
    return null;
  }
  
  return null;
}

// Category filter options
const TABLE_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'workers', label: 'العمال' },
  { value: 'users', label: 'المستخدمين' },
  { value: 'groups', label: 'المجموعات' },
  { value: 'attendance_events', label: 'الحضور' },
  { value: 'payroll_batches', label: 'الرواتب' },
  { value: 'pay_overrides', label: 'التجاوزات المالية' },
  { value: 'temporary_assignments', label: 'الانتدابات المؤقتة' },
  { value: 'backup', label: 'النسخ الاحتياطي' },
];

export default function AuditLog() {
  const [activeTab, setActiveTab] = useState('logs');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    tableName: '',
    userId: undefined as number | undefined,
  });
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Queries
  const { data: auditData, isLoading, refetch } = trpc.audit.getLog.useQuery({
    ...filters,
    tableName: filters.tableName || undefined,
    action: filters.action || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: stats } = trpc.audit.getStats.useQuery({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const { data: auditUsers } = trpc.audit.getUsers.useQuery();

  const logs = auditData?.logs || [];
  const total = auditData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    if (!stats) return [];
    return stats.map(s => s.action);
  }, [stats]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleFilter = () => {
    setPage(0);
    refetch();
  };

  const handleReset = () => {
    setFilters({ startDate: '', endDate: '', action: '', tableName: '', userId: undefined });
    setPage(0);
  };

  // Format values for detail view
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (key === 'eventTime' || key === 'createdAt' || key === 'timestamp') {
      try { return formatDate(value); } catch { return String(value); }
    }
    if (key === 'role' && ROLE_LABELS[value]) return ROLE_LABELS[value];
    if (key === 'status') {
      const statusLabels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', terminated: 'منتهي', transferred: 'منقول' };
      return statusLabels[value] || String(value);
    }
    if (key === 'eventType') {
      return value === 'check_in' ? 'حضور' : value === 'check_out' ? 'انصراف' : String(value);
    }
    if (key === 'isActive') return value ? 'نعم' : 'لا';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderDetailValues = (label: string, values: any) => {
    if (!values || typeof values !== 'object') return null;
    const entries = Object.entries(values);
    if (entries.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">{label}</h4>
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-sm gap-4">
              <span className="text-muted-foreground whitespace-nowrap">{FIELD_LABELS[key] || key}</span>
              <span className="font-medium text-xs text-left">{formatValue(key, val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSearch className="h-7 w-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold">سجل التدقيق</h1>
          <p className="text-sm text-muted-foreground">متابعة جميع العمليات والتغييرات في النظام</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="logs" className="gap-2">
            <FileSearch className="h-4 w-4" />
            السجلات
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            الإحصائيات
          </TabsTrigger>
        </TabsList>

        {/* ===== Logs Tab ===== */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                تصفية السجلات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">القسم</Label>
                  <Select
                    value={filters.tableName || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, tableName: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_FILTER_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نوع العملية</Label>
                  <Select
                    value={filters.action || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, action: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>
                          {ACTION_LABELS[action] || action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">المستخدم</Label>
                  <Select
                    value={filters.userId?.toString() || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, userId: value === 'all' ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      {auditUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={handleFilter} size="sm" className="gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  تطبيق
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm" className="gap-1">
                  <X className="h-3.5 w-3.5" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              إجمالي السجلات: <span className="font-bold text-foreground">{total}</span>
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground">
                صفحة {page + 1} من {totalPages}
              </p>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
              ) : logs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">التاريخ والوقت</TableHead>
                        <TableHead className="w-[140px]">المستخدم</TableHead>
                        <TableHead className="w-[100px]">القسم</TableHead>
                        <TableHead className="w-[160px]">العملية</TableHead>
                        <TableHead className="w-[180px]">الكيان المتأثر</TableHead>
                        <TableHead className="w-[60px]">تفاصيل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const entityName = getEntityName(log);
                        return (
                          <TableRow key={log.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs font-mono">{formatDate(log.createdAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-sm block truncate">{log.userName || 'غير معروف'}</span>
                                  {log.userRole && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {ROLE_LABELS[log.userRole] || log.userRole}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {TABLE_LABELS[log.tableName || ''] || log.tableName || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[11px] font-normal ${getActionColor(log.action)}`}>
                                {ACTION_LABELS[log.action] || log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entityName ? (
                                <div className="flex items-center gap-1.5">
                                  <UserCircle className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400 truncate max-w-[160px]">
                                    {entityName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  لا توجد سجلات تدقيق
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ===== Stats Tab ===== */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">تصفية الإحصائيات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">من تاريخ</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">إلى تاريخ</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ملخص</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">
                  {stats?.reduce((sum, s) => sum + s.count, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">إجمالي العمليات المسجلة</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                إحصائيات حسب نوع العملية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.length > 0 ? (
                <div className="space-y-2">
                  {stats.map((stat) => {
                    const maxCount = Math.max(...stats.map(s => s.count));
                    const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                    return (
                      <div key={stat.action} className="flex items-center gap-3">
                        <div className="w-[180px] flex-shrink-0">
                          <Badge className={`text-[11px] font-normal ${getActionColor(stat.action)}`}>
                            {ACTION_LABELS[stat.action] || stat.action}
                          </Badge>
                        </div>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold w-12 text-left">{stat.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد إحصائيات
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              تفاصيل العملية
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* الكيان المتأثر - بارز في الأعلى */}
              {getEntityName(selectedLog) && (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 flex items-center gap-3">
                  <UserCircle className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">الكيان المتأثر</p>
                    <p className="font-bold text-indigo-800 dark:text-indigo-300">{getEntityName(selectedLog)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">التاريخ:</span>
                  <p className="font-mono text-xs mt-0.5">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">المستخدم:</span>
                  <p className="mt-0.5">{selectedLog.userName || 'غير معروف'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">العملية:</span>
                  <div className="mt-0.5">
                    <Badge className={`text-[11px] ${getActionColor(selectedLog.action)}`}>
                      {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">القسم:</span>
                  <p className="mt-0.5">{TABLE_LABELS[selectedLog.tableName || ''] || selectedLog.tableName || '-'}</p>
                </div>
                {selectedLog.recordId && (
                  <div>
                    <span className="text-muted-foreground">رقم السجل:</span>
                    <p className="font-mono mt-0.5">{selectedLog.recordId}</p>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-muted-foreground">عنوان IP:</span>
                    <p className="font-mono text-xs mt-0.5">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>
              
              {renderDetailValues('القيم القديمة', selectedLog.oldValues)}
              {renderDetailValues('القيم الجديدة', selectedLog.newValues)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
