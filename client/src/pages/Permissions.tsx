// @ts-nocheck - OLD PERMISSION SYSTEM DISABLED
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
import { Loader2, Shield, Key, Save, User, AlertCircle } from "lucide-react";
import { SYSTEM_PERMISSIONS, getPermissionsByCategory } from "../../../shared/systemPermissions";

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
      const directIds = userPermissions.direct.map((p: any) => p.id);
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
    if (!selectedUserId) {
      toast.error("يرجى اختيار مستخدم");
      return;
    }
    setUserPermissions.mutate({ userId: selectedUserId, permissionIds: selectedPermissions });
  };

  const permissionsByCategory = getPermissionsByCategory();
  
  // Group database permissions by category
  const dbPermissionsByCategory: Record<string, any[]> = {};
  permissions?.forEach((perm: any) => {
    const category = perm.category || 'أخرى';
    if (!dbPermissionsByCategory[category]) {
      dbPermissionsByCategory[category] = [];
    }
    dbPermissionsByCategory[category].push(perm);
  });

  const hasDbPermissions = permissions && permissions.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            إدارة الصلاحيات
          </h1>
          <p className="text-muted-foreground">
            تعيين الصلاحيات للمستخدمين
          </p>
        </div>

        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              اختر المستخدم
            </CardTitle>
            <CardDescription>
              اختر المستخدم لتعيين الصلاحيات له
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedUserId?.toString() || ""}
              onValueChange={(value) => setSelectedUserId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر مستخدماً..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!hasDbPermissions && (
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    لا توجد صلاحيات معرفة في قاعدة البيانات
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    يجب إضافة الصلاحيات إلى قاعدة البيانات أولاً. فيما يلي قائمة الصلاحيات المعرفة في النظام:
                  </p>
                  
                  <div className="space-y-4">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category}>
                        <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {perms.map((perm) => (
                            <div key={perm.code} className="flex items-start gap-2 text-sm">
                              <Badge variant="outline" className="font-mono text-xs">
                                {perm.code}
                              </Badge>
                              <div>
                                <div className="font-medium">{perm.name}</div>
                                <div className="text-xs text-muted-foreground">{perm.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                    <p className="text-sm font-mono text-muted-foreground">
                      يمكنك إضافة هذه الصلاحيات باستخدام واجهة إدارة قاعدة البيانات في لوحة التحكم.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Permissions List */}
        {selectedUserId && hasDbPermissions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                الصلاحيات المتاحة
              </CardTitle>
              <CardDescription>
                حدد الصلاحيات التي تريد منحها للمستخدم
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userPermissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Role-based Permissions (Read-only) */}
                  {userPermissions?.fromRoles && userPermissions.fromRoles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">صلاحيات من الأدوار (للقراءة فقط)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {userPermissions.fromRoles.map((perm: any) => (
                          <div key={perm.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Checkbox checked disabled />
                            <span className="text-sm">{perm.name}</span>
                            <Badge variant="secondary" className="mr-auto text-xs">من الدور</Badge>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  )}

                  {/* Direct Permissions (Editable) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">صلاحيات مباشرة</h3>
                    </div>
                    
                    {Object.entries(dbPermissionsByCategory).map(([category, perms]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {perms.map((perm: any) => (
                            <div key={perm.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                              <Checkbox
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => handlePermissionChange(perm.id, checked as boolean)}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{perm.name}</div>
                                {perm.description && (
                                  <div className="text-xs text-muted-foreground">{perm.description}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={setUserPermissions.isPending}
                    >
                      {setUserPermissions.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 ml-2" />
                          حفظ الصلاحيات
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedUserId && hasDbPermissions && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                اختر مستخدماً لعرض وتعديل صلاحياته
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
