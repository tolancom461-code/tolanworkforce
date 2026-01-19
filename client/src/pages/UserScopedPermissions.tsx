import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Shield, Search, Settings, Users, Building2, Calendar, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

// Available permissions
const PERMISSIONS = [
  { value: "view", label: "عرض", color: "bg-blue-500" },
  { value: "create", label: "إنشاء", color: "bg-green-500" },
  { value: "update", label: "تعديل", color: "bg-yellow-500" },
  { value: "delete", label: "حذف", color: "bg-red-500" },
  { value: "export", label: "تصدير", color: "bg-purple-500" },
  { value: "approve", label: "اعتماد", color: "bg-indigo-500" },
];

// Available scope types
const SCOPE_TYPES = [
  { value: "work_group", label: "مجموعة عمل", icon: Users },
  { value: "cost_center", label: "مركز تكلفة", icon: Building2 },
  { value: "payroll_period", label: "فترة رواتب", icon: Calendar },
];

// Screens/Modules for organizing permissions
const SCREENS = [
  {
    key: "workers",
    label: "شاشة العمال",
    permissions: ["view", "create", "update", "delete", "export"],
    scopes: ["work_group", "cost_center"],
  },
  {
    key: "groups",
    label: "شاشة المجموعات",
    permissions: ["view", "create", "update", "delete"],
    scopes: ["work_group"],
  },
  {
    key: "attendance",
    label: "شاشة الحضور",
    permissions: ["view", "update", "export"],
    scopes: ["work_group", "cost_center"],
  },
  {
    key: "payroll",
    label: "شاشة الرواتب",
    permissions: ["view", "create", "update", "approve", "export"],
    scopes: ["work_group", "cost_center", "payroll_period"],
  },
  {
    key: "reports",
    label: "شاشة التقارير",
    permissions: ["view", "export"],
    scopes: ["work_group", "cost_center"],
  },
  {
    key: "cost_centers",
    label: "شاشة مراكز التكلفة",
    permissions: ["view", "create", "update", "delete"],
    scopes: [],
  },
];

export default function UserScopedPermissions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isAddPermissionDialogOpen, setIsAddPermissionDialogOpen] = useState(false);
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set());
  
  // Add permission form state
  const [selectedScreen, setSelectedScreen] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedScopeType, setSelectedScopeType] = useState<string>("");
  const [selectedScopeId, setSelectedScopeId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: roles } = trpc.roles.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();

  const { data: userPermissions, isLoading: permissionsLoading } = trpc.scopedPermissions.getUserPermissions.useQuery(
    { userId: selectedUser?.id || 0, scopeType: "" },
    { enabled: !!selectedUser }
  );

  const bulkGrantPermissions = trpc.scopedPermissions.bulkGrant.useMutation({
    onSuccess: () => {
      toast.success("تم منح الصلاحيات بنجاح");
      utils.scopedPermissions.getUserPermissions.invalidate();
      setIsAddPermissionDialogOpen(false);
      resetAddForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء منح الصلاحيات");
    },
  });

  const revokePermission = trpc.scopedPermissions.revoke.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الصلاحية بنجاح");
      utils.scopedPermissions.getUserPermissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء الصلاحية");
    },
  });

  const resetAddForm = () => {
    setSelectedScreen("");
    setSelectedPermissions([]);
    setSelectedScopeType("");
    setSelectedScopeId("");
  };

  const filteredUsers = users?.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleName = (roleId: number | null) => {
    if (!roleId || !roles) return "بدون دور";
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "غير معروف";
  };

  const handleManagePermissions = (user: any) => {
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
    setExpandedScreens(new Set());
  };

  const toggleScreen = (screenKey: string) => {
    const newExpanded = new Set(expandedScreens);
    if (newExpanded.has(screenKey)) {
      newExpanded.delete(screenKey);
    } else {
      newExpanded.add(screenKey);
    }
    setExpandedScreens(newExpanded);
  };

  const handleAddPermissions = () => {
    if (!selectedUser || selectedPermissions.length === 0) {
      toast.error("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }

    // For screens that don't require scope
    const selectedScreenData = SCREENS.find(s => s.key === selectedScreen);
    if (selectedScreenData && selectedScreenData.scopes.length === 0) {
      // Grant without scope
      const permissions = selectedPermissions.map(permission => ({
        permission,
        scopeType: "global",
        scopeId: "0",
      }));

      bulkGrantPermissions.mutate({
        userId: selectedUser.id,
        permissions,
      });
      return;
    }

    // For screens that require scope
    if (!selectedScopeType || !selectedScopeId) {
      toast.error("يرجى اختيار النطاق");
      return;
    }

    const permissions = selectedPermissions.map(permission => ({
      permission,
      scopeType: selectedScopeType,
      scopeId: selectedScopeId,
    }));

    bulkGrantPermissions.mutate({
      userId: selectedUser.id,
      permissions,
    });
  };

  const handleRevokePermission = (perm: any) => {
    if (!selectedUser) return;
    revokePermission.mutate({
      userId: selectedUser.id,
      permission: perm.permission,
      scopeType: perm.scopeType,
      scopeId: perm.scopeId,
    });
  };

  const getScopeLabel = (scopeType: string, scopeId: string) => {
    if (scopeType === "global") return "عام";
    if (scopeType === "work_group") {
      const group = groups?.find(g => g.id.toString() === scopeId);
      return group?.name || `مجموعة #${scopeId}`;
    }
    if (scopeType === "cost_center") {
      const cc = costCenters?.find(c => c.id.toString() === scopeId);
      return cc?.name || `مركز #${scopeId}`;
    }
    return scopeId;
  };

  const getPermissionLabel = (permission: string) => {
    return PERMISSIONS.find(p => p.value === permission)?.label || permission;
  };

  const getPermissionsForScreen = (screenKey: string) => {
    if (!userPermissions || userPermissions.length === 0) return [];
    
    // Return all permissions for now - can be filtered by screen context later
    return userPermissions;
  };

  const getPermissionCount = (user: any) => {
    // This would be fetched from the API
    return "—";
  };

  const currentScreenData = SCREENS.find(s => s.key === selectedScreen);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">صلاحيات المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              إدارة الصلاحيات الذرية والعملياتية لكل مستخدم بشكل تفصيلي
            </p>
          </div>
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

        {/* Users List */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>
              {filteredUsers?.length || 0} مستخدم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right">الصلاحيات الإضافية</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          لا يوجد مستخدمين
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.fullName}</span>
                              <span className="text-sm text-muted-foreground">{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManagePermissions(user)}
                              className="gap-2"
                            >
                              <Settings className="h-4 w-4" />
                              تعديل الصلاحيات
                            </Button>
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

        {/* Permissions Management Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                صلاحيات المستخدم: {selectedUser?.fullName}
              </DialogTitle>
              <DialogDescription>
                إدارة الصلاحيات الذرية والعملياتية مرتبة حسب الشاشات
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* User Info */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">اسم المستخدم:</span>
                      <span className="font-medium mr-2">{selectedUser?.username}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الدور:</span>
                      <Badge variant="outline" className="mr-2">
                        {getRoleName(selectedUser?.roleId)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Permission Button */}
              <Button
                onClick={() => setIsAddPermissionDialogOpen(true)}
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                إضافة صلاحية جديدة
              </Button>

              <Separator />

              {/* Permissions by Screen */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">الصلاحيات حسب الشاشات</h3>
                
                {permissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {SCREENS.map((screen) => {
                      const screenPermissions = getPermissionsForScreen(screen.key);
                      const isExpanded = expandedScreens.has(screen.key);

                      return (
                        <Card key={screen.key} className="overflow-hidden">
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleScreen(screen.key)}
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{screen.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {screenPermissions.length} صلاحية
                              </Badge>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t p-4 space-y-2 bg-muted/20">
                              {screenPermissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  لا توجد صلاحيات لهذه الشاشة
                                </p>
                              ) : (
                                screenPermissions.map((perm: any) => (
                                  <div
                                    key={perm.id}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline">
                                        {getPermissionLabel(perm.permission)}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        النطاق: {getScopeLabel(perm.scopeType, perm.scopeId)}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRevokePermission(perm)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Permission Dialog */}
        <Dialog open={isAddPermissionDialogOpen} onOpenChange={setIsAddPermissionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة صلاحية جديدة</DialogTitle>
              <DialogDescription>
                اختر الشاشة والصلاحيات والنطاق المطلوب
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Screen Selection */}
              <div className="space-y-2">
                <Label>الشاشة *</Label>
                <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الشاشة" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCREENS.map((screen) => (
                      <SelectItem key={screen.key} value={screen.key}>
                        {screen.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions Selection */}
              {selectedScreen && (
                <div className="space-y-2">
                  <Label>الصلاحيات *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentScreenData?.permissions.map((perm) => {
                      const permData = PERMISSIONS.find(p => p.value === perm);
                      if (!permData) return null;

                      return (
                        <div key={perm} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`perm-${perm}`}
                            checked={selectedPermissions.includes(perm)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, perm]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`perm-${perm}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {permData.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scope Selection */}
              {selectedScreen && currentScreenData && currentScreenData.scopes.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>نوع النطاق *</Label>
                    <Select value={selectedScopeType} onValueChange={setSelectedScopeType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع النطاق" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentScreenData.scopes.map((scopeType) => {
                          const scopeData = SCOPE_TYPES.find(s => s.value === scopeType);
                          if (!scopeData) return null;

                          return (
                            <SelectItem key={scopeType} value={scopeType}>
                              {scopeData.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedScopeType && (
                    <div className="space-y-2">
                      <Label>النطاق المحدد *</Label>
                      <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النطاق" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedScopeType === "work_group" &&
                            groups?.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          {selectedScopeType === "cost_center" &&
                            costCenters?.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id.toString()}>
                                {cc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddPermissionDialogOpen(false);
                resetAddForm();
              }}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddPermissions}
                disabled={bulkGrantPermissions.isPending || !selectedScreen || selectedPermissions.length === 0}
              >
                {bulkGrantPermissions.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
