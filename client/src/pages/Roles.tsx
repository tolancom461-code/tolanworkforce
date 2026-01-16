import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSION_CATEGORIES, type PermissionCode } from '@/lib/menuPermissions';

export default function Roles() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  
  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('0');
  
  const { data: roles, refetch } = trpc.roles.list.useQuery();
  const { data: allPermissions } = trpc.permissions.list.useQuery();
  
  const createMutation = trpc.roles.create.useMutation({
    onSuccess: () => {
      toast.success('تم إضافة الدور بنجاح');
      refetch();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });
  
  const updateMutation = trpc.roles.update.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الدور بنجاح');
      refetch();
      setShowEditDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });
  
  const deleteMutation = trpc.roles.delete.useMutation({
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });

  const setPermissionsMutation = trpc.roles.setRolePermissions.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الصلاحيات بنجاح');
      setShowPermissionsDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
    }
  });
  
  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setLevel('0');
    setSelectedRole(null);
    setSelectedPermissions([]);
  };
  
  const handleCreate = () => {
    if (!code || !name) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    createMutation.mutate({ 
      code, 
      name, 
      description, 
      level: parseInt(level) 
    });
  };
  
  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setCode(role.code);
    setName(role.name);
    setDescription(role.description || '');
    setLevel(role.level?.toString() || '0');
    setShowEditDialog(true);
  };
  
  const handleUpdate = () => {
    if (!selectedRole || !code || !name) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    updateMutation.mutate({
      id: selectedRole.id,
      code,
      name,
      description,
      level: parseInt(level),
    });
  };
  
  const handleDelete = (id: number, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الدور "${name}"؟`)) {
      deleteMutation.mutate({ id });
    }
  };

  const utils = trpc.useUtils();

  const handleManagePermissions = async (role: any) => {
    setSelectedRole(role);
    try {
      const perms = await utils.roles.getRolePermissions.fetch({ roleId: role.id });
      setSelectedPermissions(perms.map((p: any) => p.id));
      setShowPermissionsDialog(true);
    } catch (error) {
      toast.error('حدث خطأ في تحميل الصلاحيات');
    }
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    setPermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissionIds: selectedPermissions,
    });
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };
  
  // Filter roles
  const filteredRoles = roles?.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              الأدوار
            </h1>
            <p className="text-muted-foreground">
              إدارة الأدوار والصلاحيات في النظام
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة دور
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="البحث عن دور..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الأدوار</CardTitle>
            <CardDescription>
              {filteredRoles?.length || 0} دور
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!filteredRoles?.length ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">لا توجد أدوار</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة أول دور
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الرمز</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">المستوى</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-mono font-medium">{role.code}</TableCell>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.level || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManagePermissions(role)}
                            >
                              <Settings className="h-4 w-4 ml-1" />
                              الصلاحيات
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(role)}
                            >
                              <Pencil className="h-4 w-4 ml-1" />
                              تعديل
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(role.id, role.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </Button>
                          </div>
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة دور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الرمز *</Label>
              <Input
                placeholder="مثال: MANAGER"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                placeholder="مثال: مدير"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                placeholder="وصف الدور..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Input
                type="number"
                placeholder="0"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                المستوى الأعلى يعني صلاحيات أكثر
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الدور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الرمز *</Label>
              <Input
                placeholder="مثال: MANAGER"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                placeholder="مثال: مدير"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                placeholder="وصف الدور..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Input
                type="number"
                placeholder="0"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                المستوى الأعلى يعني صلاحيات أكثر
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Pencil className="h-4 w-4 ml-2" />
              )}
              تحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة صلاحيات الدور: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              حدد الصلاحيات التي يمتلكها هذا الدور
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">الصلاحيات</Label>
              <span className="text-sm text-muted-foreground">
                {selectedPermissions.length} من {allPermissions?.length || 0} محددة
              </span>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              {(() => {
                // Group all permissions by category from database
                const permissionsByCategory: Record<string, any[]> = {};
                allPermissions?.forEach((p: any) => {
                  const category = p.category || 'أخرى';
                  if (!permissionsByCategory[category]) {
                    permissionsByCategory[category] = [];
                  }
                  permissionsByCategory[category].push(p);
                });

                return Object.entries(permissionsByCategory).map(([categoryName, categoryPerms]) => {
                  if (categoryPerms.length === 0) return null;
                  
                  const categoryPermIds = categoryPerms.map((p: any) => p.id);
                  const allSelected = categoryPermIds.every((id: number) =>
                    selectedPermissions.includes(id)
                  );

                  return (
                    <div key={categoryName} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => {
                            if (allSelected) {
                              setSelectedPermissions((prev) => prev.filter((id) => !categoryPermIds.includes(id)));
                            } else {
                              setSelectedPermissions((prev) => Array.from(new Set([...prev, ...categoryPermIds])));
                            }
                          }}
                        />
                        <Label className="font-semibold cursor-pointer flex-1" onClick={() => {
                          if (allSelected) {
                            setSelectedPermissions((prev) => prev.filter((id) => !categoryPermIds.includes(id)));
                          } else {
                            setSelectedPermissions((prev) => Array.from(new Set([...prev, ...categoryPermIds])));
                          }
                        }}>
                          {categoryName}
                        </Label>
                        <Badge variant="secondary">{categoryPerms.length}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pr-6">
                        {categoryPerms.map((perm: any) => (
                          <div key={perm.id} className="flex items-start gap-2">
                            <Checkbox
                              checked={selectedPermissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <div className="flex-1">
                              <Label className="text-sm cursor-pointer" onClick={() => togglePermission(perm.id)}>
                                {perm.name}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{perm.code}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSavePermissions} disabled={setPermissionsMutation.isPending}>
              {setPermissionsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Settings className="h-4 w-4 ml-2" />
              )}
              حفظ الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
