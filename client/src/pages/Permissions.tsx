import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Shield, Key, Save, User } from "lucide-react";

export default function Permissions() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: permissions, isLoading: permissionsLoading } = trpc.permissions.list.useQuery();
  const { data: userPermissions, isLoading: userPermissionsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  const utils = trpc.useUtils();
  const setUserPermissions = trpc.permissions.setUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الصلاحيات بنجاح");
      utils.permissions.getUserPermissions.invalidate({ userId: selectedUserId! });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الصلاحيات");
    },
  });

  useEffect(() => {
    if (userPermissions) {
      const directIds = userPermissions.direct.map((p) => p.id);
      setSelectedPermissions(directIds);
    }
  }, [userPermissions]);

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    if (checked) {
      setSelectedPermissions((prev) => [...prev, permissionId]);
    } else {
      setSelectedPermissions((prev) => prev.filter((id) => id !== permissionId));
    }
  };

  const handleSave = () => {
    if (!selectedUserId) return;
    setUserPermissions.mutate({
      userId: selectedUserId,
      permissionIds: selectedPermissions,
    });
  };

  // Group permissions by category
  const groupedPermissions = permissions?.reduce((acc, permission) => {
    const category = permission.category || "عام";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const isPermissionFromRole = (permissionId: number) => {
    return userPermissions?.fromRoles.some((p) => p.id === permissionId);
  };

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الصلاحيات</h1>
          <p className="text-muted-foreground mt-1">
            تعيين صلاحيات المستخدمين بشكل مباشر
          </p>
        </div>

        {/* User Selection */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              اختر المستخدم
            </CardTitle>
            <CardDescription>
              اختر المستخدم الذي تريد تعديل صلاحياته
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedUserId?.toString() || ""}
              onValueChange={(value) => setSelectedUserId(parseInt(value))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="اختر مستخدم..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{user.fullName}</span>
                      <span className="text-muted-foreground">({user.username})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        {selectedUserId && (
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  صلاحيات {selectedUser?.fullName}
                </CardTitle>
                <CardDescription>
                  حدد الصلاحيات التي تريد منحها للمستخدم
                </CardDescription>
              </div>
              <Button
                onClick={handleSave}
                disabled={setUserPermissions.isPending}
                className="gap-2"
              >
                {setUserPermissions.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ الصلاحيات
              </Button>
            </CardHeader>
            <CardContent>
              {permissionsLoading || userPermissionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Role Permissions Info */}
                  {userPermissions?.fromRoles && userPermissions.fromRoles.length > 0 && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium">صلاحيات من الدور</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        هذه الصلاحيات موروثة من دور المستخدم ولا يمكن إزالتها مباشرة
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {userPermissions.fromRoles.map((perm) => (
                          <Badge key={perm.id} variant="secondary">
                            {perm.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Permissions */}
                  {groupedPermissions && Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {category}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {perms?.map((permission) => {
                          const fromRole = isPermissionFromRole(permission.id);
                          const isChecked = selectedPermissions.includes(permission.id) || fromRole;
                          
                          return (
                            <div
                              key={permission.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                isChecked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                              } ${fromRole ? "opacity-70" : ""}`}
                            >
                              <Checkbox
                                id={`perm-${permission.id}`}
                                checked={isChecked}
                                disabled={fromRole}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(permission.id, checked as boolean)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={`perm-${permission.id}`}
                                  className="font-medium text-sm cursor-pointer"
                                >
                                  {permission.name}
                                </label>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {permission.description}
                                  </p>
                                )}
                                {fromRole && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    من الدور
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Separator className="mt-6" />
                    </div>
                  ))}

                  {(!permissions || permissions.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                      لا توجد صلاحيات معرّفة في النظام
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedUserId && (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">اختر مستخدم</h3>
              <p className="text-muted-foreground">
                اختر مستخدم من القائمة أعلاه لعرض وتعديل صلاحياته
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
