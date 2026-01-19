import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, Users, Building2, Calendar } from "lucide-react";

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

export default function UserScopedPermissions() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedScopeType, setSelectedScopeType] = useState<string>("");
  const [selectedScopeId, setSelectedScopeId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();

  const { data: userPermissions, isLoading: permissionsLoading } = trpc.scopedPermissions.getUserPermissionsGrouped.useQuery(
    { userId: selectedUserId || 0 },
    { enabled: !!selectedUserId }
  );

  const grantPermission = trpc.scopedPermissions.grant.useMutation({
    onSuccess: () => {
      toast.success("تم منح الصلاحية بنجاح");
      utils.scopedPermissions.getUserPermissionsGrouped.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء منح الصلاحية");
    },
  });

  const bulkGrantPermissions = trpc.scopedPermissions.bulkGrant.useMutation({
    onSuccess: () => {
      toast.success("تم منح الصلاحيات بنجاح");
      utils.scopedPermissions.getUserPermissionsGrouped.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء منح الصلاحيات");
    },
  });

  const revokePermission = trpc.scopedPermissions.revoke.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الصلاحية بنجاح");
      utils.scopedPermissions.getUserPermissionsGrouped.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء الصلاحية");
    },
  });

  const resetForm = () => {
    setSelectedPermissions([]);
    setSelectedScopeType("");
    setSelectedScopeId("");
  };

  const handleGrantPermissions = () => {
    if (!selectedUserId || selectedPermissions.length === 0 || !selectedScopeType || !selectedScopeId) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    const permissions = selectedPermissions.map(permission => ({
      permission,
      scopeType: selectedScopeType,
      scopeId: selectedScopeId,
    }));

    bulkGrantPermissions.mutate({
      userId: selectedUserId,
      permissions,
    });
  };

  const handleRevokePermission = (permission: string, scopeType: string, scopeId: string) => {
    if (!selectedUserId) return;

    revokePermission.mutate({
      userId: selectedUserId,
      permission,
      scopeType,
      scopeId,
    });
  };

  const getScopeLabel = (scopeType: string, scopeId: string) => {
    if (scopeType === "work_group") {
      const group = groups?.find(g => g.id === Number(scopeId));
      return group ? `${group.name} (${group.code})` : scopeId;
    } else if (scopeType === "cost_center") {
      const center = costCenters?.find(c => c.id === Number(scopeId));
      return center ? `${center.name} (${center.code})` : scopeId;
    }
    return scopeId;
  };

  const getAvailableScopes = () => {
    if (selectedScopeType === "work_group") {
      return groups?.map(g => ({ value: String(g.id), label: `${g.name} (${g.code})` })) || [];
    } else if (selectedScopeType === "cost_center") {
      return costCenters?.map(c => ({ value: String(c.id), label: `${c.name} (${c.code})` })) || [];
    }
    return [];
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            إدارة الصلاحيات الذرية
          </h1>
          <p className="text-muted-foreground mt-2">
            تحكم دقيق في صلاحيات المستخدمين على مستوى السجل الواحد
          </p>
        </div>
      </div>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle>اختر المستخدم</CardTitle>
          <CardDescription>
            اختر المستخدم لعرض وإدارة صلاحياته
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedUserId?.toString() || ""}
            onValueChange={(value) => setSelectedUserId(Number(value))}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="اختر مستخدم..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.fullName} ({user.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Permissions Display */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>صلاحيات {selectedUser?.fullName}</CardTitle>
                <CardDescription>
                  الصلاحيات المخصصة لهذا المستخدم على مختلف النطاقات
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة صلاحيات
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {permissionsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !userPermissions || Object.keys(userPermissions).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد صلاحيات مخصصة لهذا المستخدم</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة صلاحية جديدة
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(userPermissions).map(([scopeType, scopes]) => {
                  const scopeTypeInfo = SCOPE_TYPES.find(st => st.value === scopeType);
                  const Icon = scopeTypeInfo?.icon || Shield;

                  return (
                    <div key={scopeType} className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Icon className="h-5 w-5" />
                        {scopeTypeInfo?.label || scopeType}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>النطاق</TableHead>
                            <TableHead>الصلاحيات</TableHead>
                            <TableHead className="text-left">إجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scopes.map((scope: any) => (
                            <TableRow key={scope.scopeId}>
                              <TableCell className="font-medium">
                                {getScopeLabel(scopeType, scope.scopeId)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {scope.permissions.map((perm: string) => {
                                    const permInfo = PERMISSIONS.find(p => p.value === perm);
                                    return (
                                      <Badge
                                        key={perm}
                                        variant="secondary"
                                        className="flex items-center gap-1"
                                      >
                                        <div className={`w-2 h-2 rounded-full ${permInfo?.color || 'bg-gray-500'}`} />
                                        {permInfo?.label || perm}
                                        <button
                                          onClick={() => handleRevokePermission(perm, scopeType, scope.scopeId)}
                                          className="ml-1 hover:text-destructive"
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-left">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    scope.permissions.forEach((perm: string) => {
                                      handleRevokePermission(perm, scopeType, scope.scopeId);
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Permission Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة صلاحيات جديدة</DialogTitle>
            <DialogDescription>
              اختر الصلاحيات والنطاق الذي تريد منحه للمستخدم
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scope Type Selection */}
            <div className="space-y-2">
              <Label>نوع النطاق</Label>
              <Select
                value={selectedScopeType}
                onValueChange={setSelectedScopeType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع النطاق..." />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Scope ID Selection */}
            {selectedScopeType && (
              <div className="space-y-2">
                <Label>النطاق المحدد</Label>
                <Select
                  value={selectedScopeId}
                  onValueChange={setSelectedScopeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النطاق..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableScopes().map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Permissions Selection */}
            <div className="space-y-2">
              <Label>الصلاحيات</Label>
              <div className="grid grid-cols-2 gap-3">
                {PERMISSIONS.map((perm) => (
                  <div key={perm.value} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={perm.value}
                      checked={selectedPermissions.includes(perm.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, perm.value]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(p => p !== perm.value));
                        }
                      }}
                    />
                    <label
                      htmlFor={perm.value}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className={`w-3 h-3 rounded-full ${perm.color}`} />
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleGrantPermissions}
              disabled={bulkGrantPermissions.isPending || selectedPermissions.length === 0 || !selectedScopeType || !selectedScopeId}
            >
              {bulkGrantPermissions.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              منح الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
