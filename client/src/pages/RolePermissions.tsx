import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield,
  Settings,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Permission categories with colors
const CATEGORIES = [
  { key: "dashboard", label: "لوحات التحكم", color: "bg-blue-500" },
  { key: "hr", label: "الموارد البشرية", color: "bg-green-500" },
  { key: "attendance", label: "الحضور والانصراف", color: "bg-yellow-500" },
  { key: "finance", label: "المالية والرواتب", color: "bg-purple-500" },
  { key: "system", label: "إعدادات النظام", color: "bg-red-500" },
];

export default function RolePermissions() {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  
  const { data: roles } = trpc.roles.list.useQuery();
  const { data: allPermissions } = trpc.permissions.list.useQuery();
  const { data: rolePermissions, refetch: refetchRolePermissions } = trpc.roles.getPermissions.useQuery(
    { roleId: selectedRole?.id || 0 },
    { enabled: !!selectedRole }
  );
  
  const updatePermissionsMutation = trpc.roles.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث صلاحيات الدور بنجاح');
      refetchRolePermissions();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });
  
  // Update selected permissions when role permissions are loaded
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissionIds(rolePermissions.map(p => p.id));
    }
  }, [rolePermissions]);
  
  const handleEditPermissions = (role: any) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };
  
  const handleSavePermissions = () => {
    if (!selectedRole) return;
    
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissionIds: selectedPermissionIds,
    });
  };
  
  const togglePermission = (permissionId: number) => {
    setSelectedPermissionIds(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };
  
  const toggleCategory = (categoryKey: string) => {
    const categoryPermissions = allPermissions?.filter(p => p.category === categoryKey) || [];
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    
    // Check if all permissions in this category are selected
    const allSelected = categoryPermissionIds.every(id => selectedPermissionIds.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedPermissionIds(prev => prev.filter(id => !categoryPermissionIds.includes(id)));
    } else {
      // Select all
      setSelectedPermissionIds(prev => {
        const newSet = new Set([...prev, ...categoryPermissionIds]);
        return Array.from(newSet);
      });
    }
  };
  
  const isCategoryFullySelected = (categoryKey: string) => {
    const categoryPermissions = allPermissions?.filter(p => p.category === categoryKey) || [];
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    return categoryPermissionIds.length > 0 && categoryPermissionIds.every(id => selectedPermissionIds.includes(id));
  };
  
  const isCategoryPartiallySelected = (categoryKey: string) => {
    const categoryPermissions = allPermissions?.filter(p => p.category === categoryKey) || [];
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    return categoryPermissionIds.some(id => selectedPermissionIds.includes(id)) && !isCategoryFullySelected(categoryKey);
  };
  
  const groupedPermissions = CATEGORIES.map(category => ({
    ...category,
    permissions: allPermissions?.filter(p => p.category === category.key) || [],
  }));
  
  // Get permission count for each role
  const getRolePermissionCount = (roleId: number) => {
    // This would need a separate query in a real implementation
    // For now, we'll just show a placeholder
    return '...';
  };
  
  // Level colors
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-gray-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-purple-500',
      'bg-red-500',
    ];
    return colors[level] || 'bg-gray-500';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              صلاحيات الأدوار
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة الصلاحيات الأساسية لكل دور من الأدوار الستة
            </p>
          </div>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الأدوار</CardTitle>
            <CardDescription>
              اختر دوراً لتعديل صلاحياته الأساسية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستوى</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Badge className={`${getLevelColor(role.level || 0)} text-white`}>
                        المستوى {role.level || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {role.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          موقوف
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPermissions(role)}
                      >
                        <Settings className="h-4 w-4 ml-2" />
                        تعديل الصلاحيات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Permissions Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                تعديل صلاحيات: {selectedRole?.name}
              </DialogTitle>
              <DialogDescription>
                اختر الصلاحيات الأساسية التي تريد منحها لهذا الدور
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {groupedPermissions.map(category => {
                if (category.permissions.length === 0) return null;
                
                const fullySelected = isCategoryFullySelected(category.key);
                const partiallySelected = isCategoryPartiallySelected(category.key);
                
                return (
                  <div key={category.key} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <Checkbox
                        checked={fullySelected}
                        onCheckedChange={() => toggleCategory(category.key)}
                        className={partiallySelected ? 'data-[state=checked]:bg-gray-400' : ''}
                      />
                      <div className={`h-3 w-3 rounded-full ${category.color}`} />
                      <h3 className="text-lg font-semibold">
                        {category.label}
                      </h3>
                      <Badge variant="secondary">
                        {category.permissions.filter(p => selectedPermissionIds.includes(p.id)).length} / {category.permissions.length}
                      </Badge>
                    </div>
                    
                    {/* Category Permissions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                      {category.permissions.map(permission => (
                        <div key={permission.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent">
                          <Checkbox
                            checked={selectedPermissionIds.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-sm">
                              {permission.name}
                            </p>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">
                              {permission.code}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={updatePermissionsMutation.isPending}
              >
                {updatePermissionsMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                حفظ الصلاحيات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
