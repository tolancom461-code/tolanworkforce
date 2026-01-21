import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSIONS, ROLE_PERMISSIONS, Permission } from '../../../shared/permissions';

const ROLES = [
  { value: 'admin', label: 'مسؤول النظام' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'financial_reviewer', label: 'مراجع مالي' },
  { value: 'accounts_manager', label: 'مدير حسابات' },
  { value: 'hr_manager', label: 'مدير موارد بشرية' },
  { value: 'security_guard', label: 'حارس' },
  { value: 'user', label: 'مستخدم عادي' },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: 'عرض لوحة التحكم',
  [PERMISSIONS.WORKER_VIEW]: 'عرض العمال',
  [PERMISSIONS.WORKER_CREATE]: 'إضافة عامل',
  [PERMISSIONS.WORKER_EDIT]: 'تعديل عامل',
  [PERMISSIONS.WORKER_DELETE]: 'حذف عامل',
  [PERMISSIONS.WORKER_EXPORT]: 'تصدير العمال',
  [PERMISSIONS.GROUP_VIEW]: 'عرض المجموعات',
  [PERMISSIONS.GROUP_MANAGE]: 'إدارة المجموعات',
  [PERMISSIONS.ATTENDANCE_VIEW]: 'عرض الحضور',
  [PERMISSIONS.ATTENDANCE_RECORD]: 'تسجيل الحضور',
  [PERMISSIONS.ATTENDANCE_MANAGE]: 'إدارة الحضور',
  [PERMISSIONS.ATTENDANCE_EXPORT]: 'تصدير الحضور',
  [PERMISSIONS.OPERATIONAL_FLAGS_VIEW]: 'عرض البلاغات',
  [PERMISSIONS.OPERATIONAL_FLAGS_MANAGE]: 'إدارة البلاغات',
  [PERMISSIONS.PAYROLL_VIEW]: 'عرض الرواتب',
  [PERMISSIONS.PAYROLL_CREATE]: 'إنشاء دفعة رواتب',
  [PERMISSIONS.PAYROLL_EDIT]: 'تعديل دفعة رواتب',
  [PERMISSIONS.PAYROLL_DELETE]: 'حذف دفعة رواتب',
  [PERMISSIONS.PAYROLL_ACCOUNTANT_REVIEW]: 'مراجعة محاسب',
  [PERMISSIONS.PAYROLL_FINANCIAL_REVIEW]: 'مراجعة مالية',
  [PERMISSIONS.PAYROLL_MANAGER_REVIEW]: 'مراجعة مدير',
  [PERMISSIONS.PAYROLL_BATCH_FINAL_APPROVE]: 'الاعتماد النهائي',
  [PERMISSIONS.PAYROLL_EXPORT]: 'تصدير الرواتب',
  [PERMISSIONS.FINANCIAL_REPORTS_VIEW]: 'عرض التقارير المالية',
  [PERMISSIONS.FINANCIAL_REPORTS_EXPORT]: 'تصدير التقارير المالية',
  [PERMISSIONS.REPORTS_VIEW]: 'عرض التقارير',
  [PERMISSIONS.REPORTS_EXPORT]: 'تصدير التقارير',
  [PERMISSIONS.USER_VIEW]: 'عرض المستخدمين',
  [PERMISSIONS.USER_CREATE]: 'إضافة مستخدم',
  [PERMISSIONS.USER_EDIT]: 'تعديل مستخدم',
  [PERMISSIONS.USER_DELETE]: 'حذف مستخدم',
  [PERMISSIONS.USER_PERMISSIONS_MANAGE]: 'إدارة صلاحيات المستخدمين',
  [PERMISSIONS.COST_CENTER_VIEW]: 'عرض مراكز التكلفة',
  [PERMISSIONS.COST_CENTER_MANAGE]: 'إدارة مراكز التكلفة',
  [PERMISSIONS.SYSTEM_SETTINGS_VIEW]: 'عرض إعدادات النظام',
  [PERMISSIONS.SYSTEM_SETTINGS_MANAGE]: 'إدارة إعدادات النظام',
};

export default function UserPermissions() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [showAddPermissionDialog, setShowAddPermissionDialog] = useState(false);
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: users = [], isLoading: usersLoading } = trpc.users.list.useQuery();
  // Temporarily disabled until API is ready
  const userPermissions: any[] = [];
  const permissionsLoading = false;

  // Permission management mutations - to be implemented
  const addPermissionMutation = { isPending: false, mutate: () => {} };
  const removePermissionMutation = { isPending: false, mutate: () => {} };

  const updateRoleMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success('تم تغيير الدور بنجاح');
      utils.users.list.invalidate();
      setShowChangeRoleDialog(false);
      setSelectedRole('');
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleAddPermission = () => {
    toast.info('إضافة الصلاحيات قيد التطوير');
    setShowAddPermissionDialog(false);
  };

  const handleRemovePermission = (permissionId: number) => {
    toast.info('حذف الصلاحيات قيد التطوير');
  };

  const handleChangeRole = () => {
    if (!selectedUser || !selectedRole) return;
    
    updateRoleMutation.mutate({
      id: selectedUser,
      roleId: undefined, // Keep existing roleId
      // Note: role field update needs to be added to users.update API
    });
    
    toast.info('تغيير الدور قيد التطوير');
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  const getRolePermissions = (role: string): Permission[] => {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">إدارة صلاحيات المستخدمين</h1>
          <p className="text-muted-foreground">
            إدارة صلاحيات المستخدمين وأدوارهم
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>المستخدمون</CardTitle>
            <CardDescription>
              اختر مستخدماً لعرض وتعديل صلاحياته
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={selectedUser === user.id ? 'bg-muted' : ''}
                  >
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user.id)}
                      >
                        عرض الصلاحيات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Permissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedUserData ? `صلاحيات: ${selectedUserData.fullName}` : 'صلاحيات المستخدم'}
                </CardTitle>
                <CardDescription>
                  {selectedUserData && (
                    <>
                      الدور الحالي: <Badge variant="outline">{getRoleLabel(selectedUserData.role)}</Badge>
                    </>
                  )}
                </CardDescription>
              </div>
              {selectedUser && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeRoleDialog(true)}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    تغيير الدور
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddPermissionDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة صلاحية
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>اختر مستخدماً لعرض صلاحياته</p>
              </div>
            ) : permissionsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Role-based Permissions */}
                <div>
                  <h3 className="text-sm font-medium mb-3">صلاحيات الدور ({getRoleLabel(selectedUserData!.role)})</h3>
                  <div className="flex flex-wrap gap-2">
                    {getRolePermissions(selectedUserData!.role).map((perm: Permission) => (
                      <Badge key={perm} variant="secondary">
                        {PERMISSION_LABELS[perm]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Custom Permissions */}
                <div>
                  <h3 className="text-sm font-medium mb-3">صلاحيات إضافية</h3>
                  {userPermissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد صلاحيات إضافية</p>
                  ) : (
                    <div className="space-y-2">
                      {userPermissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <Badge>{PERMISSION_LABELS[perm.permission as Permission] || perm.permission}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              النطاق: {perm.scopeType}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePermission(perm.id)}
                            disabled={removePermissionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Permission Dialog */}
      <Dialog open={showAddPermissionDialog} onOpenChange={setShowAddPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة صلاحية</DialogTitle>
            <DialogDescription>
              اختر صلاحية لإضافتها إلى المستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedPermission || ''}
              onValueChange={(value) => setSelectedPermission(value as Permission)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر صلاحية" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddPermissionDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddPermission}
              disabled={!selectedPermission || addPermissionMutation.isPending}
            >
              {addPermissionMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير الدور</DialogTitle>
            <DialogDescription>
              اختر دوراً جديداً للمستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر دوراً" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangeRoleDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={!selectedRole || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'جاري التغيير...' : 'تغيير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
