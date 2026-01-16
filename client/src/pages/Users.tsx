import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Search, UserPlus, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PERMISSION_CATEGORIES } from "@/lib/menuPermissions";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: roles } = trpc.roles.list.useQuery();
  const { data: allPermissions } = trpc.permissions.list.useQuery();
  
  const { data: userPermissions } = trpc.users.getUserPermissions.useQuery(
    { userId: selectedUser?.id || 0 },
    { enabled: !!selectedUser && isPermissionsDialogOpen }
  );

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المستخدم بنجاح");
      utils.users.list.invalidate();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء المستخدم");
    },
  });

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المستخدم بنجاح");
      utils.users.list.invalidate();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المستخدم");
    },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المستخدم");
    },
  });

  const setUserPermissions = trpc.users.setUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات بنجاح");
      utils.users.getUserPermissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الصلاحيات");
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUser.mutate({
      username: formData.get("username") as string,
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      roleId: formData.get("roleId") ? parseInt(formData.get("roleId") as string) : undefined,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(e.currentTarget);
    updateUser.mutate({
      id: selectedUser.id,
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      roleId: formData.get("roleId") ? parseInt(formData.get("roleId") as string) : null,
      isActive: formData.get("isActive") === "on",
    });
  };

  const getRoleName = (roleId: number | null) => {
    if (!roleId || !roles) return "بدون دور";
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "غير معروف";
  };

  const getRoleBadgeColor = (roleId: number | null) => {
    if (!roleId) return "secondary";
    const roleColors: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
      1: "default",
      2: "default",
      3: "secondary",
      4: "secondary",
      5: "outline",
    };
    return roleColors[roleId] || "secondary";
  };

  const handleManagePermissions = (user: any) => {
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
  };

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    if (!selectedUser || !userPermissions) return;
    
    const currentIndividualIds = userPermissions.individualPermissions.map((p: any) => p.id);
    const newPermissionIds = isChecked
      ? [...currentIndividualIds, permissionId]
      : currentIndividualIds.filter((id: number) => id !== permissionId);

    setUserPermissions.mutate({
      userId: selectedUser.id,
      permissionIds: Array.from(new Set(newPermissionIds)),
    });
  };

  const handleCategoryToggle = (categoryKey: string, isChecked: boolean) => {
    if (!selectedUser || !userPermissions || !allPermissions) return;

    const category = PERMISSION_CATEGORIES[categoryKey];
    const categoryPermissions = allPermissions.filter((p: any) => 
      category.permissions.includes(p.code)
    );
    const categoryPermissionIds = categoryPermissions.map((p: any) => p.id);

    const currentIndividualIds = userPermissions.individualPermissions.map((p: any) => p.id);
    let newPermissionIds: number[];

    if (isChecked) {
      // Add all category permissions
      newPermissionIds = Array.from(new Set([...currentIndividualIds, ...categoryPermissionIds]));
    } else {
      // Remove all category permissions
      newPermissionIds = currentIndividualIds.filter((id: number) => 
        !categoryPermissionIds.includes(id)
      );
    }

    setUserPermissions.mutate({
      userId: selectedUser.id,
      permissionIds: newPermissionIds,
    });
  };

  const isPermissionChecked = (permissionId: number) => {
    if (!userPermissions) return false;
    // Check if permission is in individual permissions
    return userPermissions.individualPermissions.some((p: any) => p.id === permissionId);
  };

  const isPermissionFromRole = (permissionId: number) => {
    if (!userPermissions) return false;
    // Check if permission comes from role
    return userPermissions.rolePermissions.some((p: any) => p.id === permissionId);
  };

  const isCategoryChecked = (categoryKey: string) => {
    if (!userPermissions || !allPermissions) return false;
    
    const category = PERMISSION_CATEGORIES[categoryKey];
    const categoryPermissions = allPermissions.filter((p: any) => 
      category.permissions.includes(p.code)
    );
    
    return categoryPermissions.every((p: any) => 
      userPermissions.individualPermissions.some((ip: any) => ip.id === p.id)
    );
  };

  const getPermissionCount = (user: any) => {
    // This would need to be fetched from the API for accurate count
    // For now, we'll show a placeholder
    return "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              إضافة وتعديل وحذف المستخدمين وتعيين الأدوار والصلاحيات
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                إضافة مستخدم
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddUser}>
                <DialogHeader>
                  <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات المستخدم الجديد
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">اسم المستخدم *</Label>
                    <Input id="username" name="username" required minLength={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">الاسم الكامل *</Label>
                    <Input id="fullName" name="fullName" required minLength={2} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roleId">الدور</Label>
                    <Select name="roleId">
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="isActive" name="isActive" defaultChecked />
                    <Label htmlFor="isActive">نشط</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إضافة
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>
              {filteredUsers?.length || 0} مستخدم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">اسم المستخدم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right">الصلاحيات الإضافية</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          لا يوجد مستخدمين
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell className="text-muted-foreground">{user.username}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeColor(user.roleId)}>
                              {getRoleName(user.roleId)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getPermissionCount(user)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleManagePermissions(user)}
                                title="إدارة الصلاحيات"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم حذف المستخدم "{user.fullName}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUser.mutate({ id: user.id })}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleEditUser}>
              <DialogHeader>
                <DialogTitle>تعديل المستخدم</DialogTitle>
                <DialogDescription>
                  تحديث بيانات المستخدم
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-fullName">الاسم الكامل *</Label>
                  <Input 
                    id="edit-fullName" 
                    name="fullName" 
                    required 
                    minLength={2}
                    defaultValue={selectedUser?.fullName}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                  <Input 
                    id="edit-email" 
                    name="email" 
                    type="email"
                    defaultValue={selectedUser?.email || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">رقم الهاتف</Label>
                  <Input 
                    id="edit-phone" 
                    name="phone"
                    defaultValue={selectedUser?.phone || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-roleId">الدور</Label>
                  <Select name="roleId" defaultValue={selectedUser?.roleId?.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="edit-isActive" 
                    name="isActive" 
                    defaultChecked={selectedUser?.isActive}
                  />
                  <Label htmlFor="edit-isActive">نشط</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ التغييرات
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إدارة صلاحيات المستخدم</DialogTitle>
              <DialogDescription>
                {selectedUser?.fullName} - {getRoleName(selectedUser?.roleId)}
              </DialogDescription>
            </DialogHeader>
            
            {!userPermissions ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {/* Role Permissions Info */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">صلاحيات الدور ({userPermissions.rolePermissions.length})</h4>
                  <p className="text-sm text-muted-foreground">
                    هذه الصلاحيات مرتبطة بدور المستخدم ولا يمكن تعديلها من هنا. لتغييرها، قم بتعديل صلاحيات الدور أو تغيير دور المستخدم.
                  </p>
                </div>

                {/* Individual Permissions */}
                <div>
                  <h4 className="font-medium mb-3">الصلاحيات الإضافية ({userPermissions.individualPermissions.length})</h4>
                  <div className="space-y-2">
                    {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                      const categoryPermissions = allPermissions?.filter((p: any) => 
                        category.permissions.includes(p.code)
                      ) || [];

                      if (categoryPermissions.length === 0) return null;

                      const isExpanded = expandedCategories.has(categoryKey);
                      const allChecked = isCategoryChecked(categoryKey);

                      return (
                        <div key={categoryKey} className="border rounded-lg">
                          <div className="flex items-center gap-3 p-3 bg-muted/30">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleCategory(categoryKey)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={(checked) => 
                                handleCategoryToggle(categoryKey, checked as boolean)
                              }
                              disabled={setUserPermissions.isPending}
                            />
                            <span className="font-medium flex-1">{category.label}</span>
                            <Badge variant="secondary">
                              {categoryPermissions.length}
                            </Badge>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-3 space-y-2 border-t">
                              {categoryPermissions.map((permission: any) => {
                                const isChecked = isPermissionChecked(permission.id);
                                const fromRole = isPermissionFromRole(permission.id);

                                return (
                                  <div key={permission.id} className="flex items-start gap-3 pr-8">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(permission.id, checked as boolean)
                                      }
                                      disabled={setUserPermissions.isPending || fromRole}
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{permission.name}</span>
                                        {fromRole && (
                                          <Badge variant="outline" className="text-xs">
                                            من الدور
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {permission.code}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsPermissionsDialogOpen(false)}
              >
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
