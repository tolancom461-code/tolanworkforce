import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_NAMES: Record<string, string> = {
  dashboard: "لوحات التحكم",
  hr: "الموارد البشرية",
  attendance: "نظام الحضور",
  flags: "البلاغات التشغيلية",
  finance: "النظام المالي",
  system: "إدارة النظام",
  other: "أخرى",
};

export default function RolePermissions() {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const { data: roles, isLoading: rolesLoading } = trpc.roles.list.useQuery();
  const { data: groupedPermissions, isLoading: permissionsLoading } = trpc.permissions.getAllPermissionsGrouped.useQuery();
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: selectedRoleId !== null }
  );

  const updateMutation = trpc.permissions.updateRolePermissions.useMutation({
    onSuccess: () => {
      setSaveStatus("success");
      toast.success("تم حفظ الصلاحيات بنجاح");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error) => {
      setSaveStatus("error");
      toast.error(`خطأ في حفظ الصلاحيات: ${error.message}`);
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  // Load role permissions when role changes
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions.map(p => p.id)));
    }
  }, [rolePermissions]);

  // Auto-save when permissions change (debounced)
  useEffect(() => {
    if (selectedRoleId === null || isSaving) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      setSaveStatus("saving");
      updateMutation.mutate({
        roleId: selectedRoleId,
        permissionIds: Array.from(selectedPermissions),
      }, {
        onSettled: () => setIsSaving(false),
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [selectedPermissions, selectedRoleId]);

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleCategoryToggle = (categoryPermissions: Array<{ id: number }>) => {
    const categoryIds = categoryPermissions.map(p => p.id);
    const allSelected = categoryIds.every(id => selectedPermissions.has(id));

    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Unselect all
        categoryIds.forEach(id => newSet.delete(id));
      } else {
        // Select all
        categoryIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">توزيع الصلاحيات على الأدوار</h1>
        <p className="text-muted-foreground mt-2">
          اختر دوراً وحدد الصلاحيات المناسبة له. يتم الحفظ تلقائياً عند التغيير.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اختيار الدور</CardTitle>
          <CardDescription>
            اختر الدور الذي تريد تعديل صلاحياته
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedRoleId?.toString() || ""}
                onValueChange={(value) => setSelectedRoleId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر دوراً..." />
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

            {saveStatus !== "idle" && (
              <div className="flex items-center gap-2">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-sm text-muted-foreground">جاري الحفظ...</span>
                  </>
                )}
                {saveStatus === "success" && (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">تم الحفظ</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-600">خطأ في الحفظ</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedRoleId && (
        <>
          {rolePermissionsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6">
              {groupedPermissions && Object.entries(groupedPermissions).map(([category, permissions]) => {
                const categoryIds = permissions.map(p => p.id);
                const allSelected = categoryIds.every(id => selectedPermissions.has(id));
                const someSelected = categoryIds.some(id => selectedPermissions.has(id)) && !allSelected;

                return (
                  <Card key={category}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{CATEGORY_NAMES[category] || category}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryToggle(permissions)}
                        >
                          {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                        </Button>
                      </div>
                      <CardDescription>
                        {permissions.length} صلاحية
                        {someSelected && " • محدد جزئياً"}
                        {allSelected && " • محدد بالكامل"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2 space-x-reverse">
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={selectedPermissions.has(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <Label
                              htmlFor={`perm-${permission.id}`}
                              className="text-sm font-normal cursor-pointer leading-relaxed"
                            >
                              <div className="font-medium">{permission.name}</div>
                              <div className="text-xs text-muted-foreground">{permission.code}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {!selectedRoleId && (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">اختر دوراً لعرض وتعديل صلاحياته</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
