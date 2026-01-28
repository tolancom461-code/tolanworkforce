import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PERMISSIONS } from '../../../shared/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
  'لوحة التحكم': ['dashboard_view'],
  'الحضور والانصراف': ['attendance_record', 'attendance_view', 'attendance_manage', 'attendance_export'],
  'العمال': ['worker_view', 'worker_create', 'worker_edit', 'worker_delete', 'worker_export'],
  'المجموعات': ['group_view', 'group_manage'],
  'الرواتب': ['payroll_view', 'payroll_create', 'payroll_edit', 'payroll_delete', 'payroll_batch_accountant_review', 'payroll_batch_financial_review', 'payroll_batch_manager_review', 'payroll_batch_final_approve', 'payroll_export'],
  'التقارير المالية': ['financial_reports_view', 'financial_reports_export'],
  'التقارير': ['reports_view', 'reports_export'],
  'المستخدمين': ['user_view', 'user_create', 'user_edit', 'user_delete', 'user_permissions_manage'],
  'البلاغات التشغيلية': ['operational_flags_view', 'operational_flags_manage'],
  'مراكز التكلفة': ['cost_center_view', 'cost_center_manage'],
  'إدارة الأدوار': ['role_view', 'role_manage'],
  'إعدادات النظام': ['system_settings_view', 'system_settings_manage'],
};

const PERMISSION_LABELS: Record<string, string> = {
  dashboard_view: 'عرض لوحة التحكم',
  attendance_record: 'تسجيل الحضور',
  attendance_view: 'عرض الحضور',
  attendance_manage: 'إدارة الحضور',
  attendance_export: 'تصدير الحضور',
  worker_view: 'عرض العمال',
  worker_create: 'إضافة عامل',
  worker_edit: 'تعديل عامل',
  worker_delete: 'حذف عامل',
  worker_export: 'تصدير العمال',
  group_view: 'عرض المجموعات',
  group_manage: 'إدارة المجموعات',
  payroll_view: 'عرض الرواتب',
  payroll_create: 'إنشاء دفعة رواتب',
  payroll_edit: 'تعديل دفعة رواتب',
  payroll_delete: 'حذف دفعة رواتب',
  payroll_batch_accountant_review: 'مراجعة محاسب',
  payroll_batch_financial_review: 'مراجعة مالية',
  payroll_batch_manager_review: 'مراجعة مدير',
  payroll_batch_final_approve: 'الاعتماد النهائي',
  payroll_export: 'تصدير الرواتب',
  financial_reports_view: 'عرض التقارير المالية',
  financial_reports_export: 'تصدير التقارير المالية',
  reports_view: 'عرض التقارير',
  reports_export: 'تصدير التقارير',
  user_view: 'عرض المستخدمين',
  user_create: 'إضافة مستخدم',
  user_edit: 'تعديل مستخدم',
  user_delete: 'حذف مستخدم',
  user_permissions_manage: 'إدارة صلاحيات المستخدمين',
  operational_flags_view: 'عرض البلاغات',
  operational_flags_manage: 'إدارة البلاغات',
  cost_center_view: 'عرض مراكز التكلفة',
  cost_center_manage: 'إدارة مراكز التكلفة',
  role_view: 'عرض الأدوار',
  role_manage: 'إدارة الأدوار',
  system_settings_view: 'عرض إعدادات النظام',
  system_settings_manage: 'إدارة إعدادات النظام',
};

export default function RolesManagement() {
  const hasPermission = () => true; // All users have full permissions
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  // Form state
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleLevel, setRoleLevel] = useState(0);
  
  // Permissions state
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  
  const { data: roles, refetch: refetchRoles } = trpc.roles.list.useQuery();
  const { data: allPermissions } = trpc.permissions.list.useQuery();
  const { data: rolePermissions, refetch: refetchRolePermissions } = trpc.roles.getPermissions.useQuery(
    { roleId: selectedRole?.id! },
    { enabled: !!selectedRole }
  );
  
  const createMutation = trpc.roles.create.useMutation({
    onSuccess: () => {
      toast.success('تم إنشاء الدور بنجاح');
      refetchRoles();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('فشل إنشاء الدور: ' + error.message);
    },
  });
  
  const updateMutation = trpc.roles.update.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الدور بنجاح');
      refetchRoles();
      setShowEditDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('فشل تحديث الدور: ' + error.message);
    },
  });
  
  const deleteMutation = trpc.roles.delete.useMutation({
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      refetchRoles();
    },
    onError: (error) => {
      toast.error('فشل حذف الدور: ' + error.message);
    },
  });
  
  const updatePermissionsMutation = trpc.roles.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الصلاحيات بنجاح');
      refetchRolePermissions();
      setShowPermissionsDialog(false);
    },
    onError: (error) => {
      toast.error('فشل تحديث الصلاحيات: ' + error.message);
    },
  });
  
  const resetForm = () => {
    setRoleCode('');
    setRoleName('');
    setRoleDescription('');
    setRoleLevel(0);
    setSelectedRole(null);
  };
  
  const handleCreate = () => {
    createMutation.mutate({
      code: roleCode,
      name: roleName,
      description: roleDescription,
      level: roleLevel,
    });
  };
  
  const handleUpdate = () => {
    if (!selectedRole) return;
    updateMutation.mutate({
      id: selectedRole.id,
      code: roleCode,
      name: roleName,
      description: roleDescription,
      level: roleLevel,
    });
  };
  
  const handleDelete = (roleId: number) => {
    deleteMutation.mutate({ id: roleId });
  };
  
  const handleEditClick = (role: any) => {
    setSelectedRole(role);
    setRoleCode(role.code);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleLevel(role.level || 0);
    setShowEditDialog(true);
  };
  
  const handlePermissionsClick = (role: any) => {
    setSelectedRole(role);
    setShowPermissionsDialog(true);
  };
  
  const handleSavePermissions = () => {
    if (!selectedRole) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissionIds: selectedPermissions,
    });
  };
  
  // Update selected permissions when role permissions are loaded
  useState(() => {
    if (rolePermissions) {
      setSelectedPermissions(rolePermissions.map((p: any) => p.id));
    }
  });
  
  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };
  
  const toggleCategory = (category: string) => {
    const categoryPermissionCodes = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    const categoryPermissionIds = allPermissions
      ?.filter((p: any) => categoryPermissionCodes.includes(p.code))
      .map((p: any) => p.id) || [];
    
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !categoryPermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => {
        const combined = [...prev, ...categoryPermissionIds];
        return Array.from(new Set(combined));
      });
    }
  };
  
  if (!hasPermission(PERMISSIONS.ROLE_VIEW)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              غير مصرح
            </CardTitle>
            <CardDescription>
              ليس لديك صلاحية الوصول إلى هذه الصفحة
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            إدارة الأدوار
          </h1>
          <p className="text-muted-foreground">
            إنشاء وتعديل الأدوار وتخصيص الصلاحيات
          </p>
        </div>
        {hasPermission(PERMISSIONS.ROLE_MANAGE) && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة دور جديد
          </Button>
        )}
      </div>
      
      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>الأدوار الموجودة</CardTitle>
          <CardDescription>
            عرض وإدارة جميع الأدوار في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرمز</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المستوى</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map((role: any) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono">{role.code}</TableCell>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                  <TableCell>{role.level || 0}</TableCell>
                  <TableCell>
                    {role.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 ml-1" />
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 ml-1" />
                        غير نشط
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePermissionsClick(role)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {hasPermission(PERMISSIONS.ROLE_MANAGE) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف الدور "{role.name}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(role.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة دور جديد</DialogTitle>
            <DialogDescription>
              أدخل معلومات الدور الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">الرمز *</Label>
              <Input
                id="code"
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                placeholder="مثال: hr_manager"
              />
            </div>
            <div>
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="مثال: مدير موارد بشرية"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="وصف مختصر للدور..."
              />
            </div>
            <div>
              <Label htmlFor="level">المستوى</Label>
              <Input
                id="level"
                type="number"
                value={roleLevel}
                onChange={(e) => setRoleLevel(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!roleCode || !roleName || createMutation.isPending}
            >
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل دور</DialogTitle>
            <DialogDescription>
              تحديث معلومات الدور
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-code">الرمز *</Label>
              <Input
                id="edit-code"
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">الاسم *</Label>
              <Input
                id="edit-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-level">المستوى</Label>
              <Input
                id="edit-level"
                type="number"
                value={roleLevel}
                onChange={(e) => setRoleLevel(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!roleCode || !roleName || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تخصيص صلاحيات: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              اختر الصلاحيات المتاحة لهذا الدور
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, permissionCodes]) => {
              const categoryPermissions = allPermissions?.filter((p: any) => 
                permissionCodes.includes(p.code)
              ) || [];
              
              const allSelected = categoryPermissions.every((p: any) => 
                selectedPermissions.includes(p.id)
              );
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <Label className="font-semibold text-base cursor-pointer" onClick={() => toggleCategory(category)}>
                      {category}
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pr-6">
                    {categoryPermissions.map((permission: any) => (
                      <div key={permission.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <Label className="cursor-pointer text-sm" onClick={() => togglePermission(permission.id)}>
                          {PERMISSION_LABELS[permission.code] || permission.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
