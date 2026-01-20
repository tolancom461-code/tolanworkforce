import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Shield, Search, ChevronDown, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Permission categories with colors
const CATEGORIES = [
  { key: "dashboard", label: "لوحات التحكم", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
  { key: "hr", label: "الموارد البشرية", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
  { key: "attendance", label: "الحضور والانصراف", color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
  { key: "finance", label: "المالية والرواتب", color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50" },
  { key: "system", label: "إعدادات النظام", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
];

export default function PermissionsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)));

  const utils = trpc.useUtils();
  const { data: permissions, isLoading } = trpc.permissions.list.useQuery();

  const createPermission = trpc.permissions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الصلاحية بنجاح");
      utils.permissions.list.invalidate();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الصلاحية");
    },
  });

  const updatePermission = trpc.permissions.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحية بنجاح");
      utils.permissions.list.invalidate();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الصلاحية");
    },
  });

  const deletePermission = trpc.permissions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الصلاحية بنجاح");
      utils.permissions.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الصلاحية");
    },
  });

  const filteredPermissions = permissions?.filter((perm) =>
    perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perm.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPermissions = CATEGORIES.map(category => ({
    ...category,
    permissions: filteredPermissions?.filter(p => p.category === category.key) || [],
  }));

  const handleAddPermission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPermission.mutate({
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as string || undefined,
    });
  };

  const handleEditPermission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPermission) return;
    const formData = new FormData(e.currentTarget);
    updatePermission.mutate({
      id: selectedPermission.id,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as string || undefined,
    });
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

  const getCategoryInfo = (categoryKey: string | null) => {
    return CATEGORIES.find(c => c.key === categoryKey) || CATEGORIES[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              إدارة الصلاحيات
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة جميع صلاحيات النظام بشكل تفصيلي ومجمع حسب الفئات
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة صلاحية جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleAddPermission}>
                <DialogHeader>
                  <DialogTitle>إضافة صلاحية جديدة</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات الصلاحية الجديدة
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">كود الصلاحية *</Label>
                    <Input
                      id="code"
                      name="code"
                      placeholder="مثال: view_workers"
                      required
                      pattern="[a-z_]+"
                      title="يجب أن يحتوي على أحرف صغيرة وشرطة سفلية فقط"
                    />
                    <p className="text-xs text-muted-foreground">
                      استخدم أحرف صغيرة وشرطة سفلية فقط (مثال: view_workers)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم الصلاحية *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="مثال: عرض العمال"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="وصف تفصيلي للصلاحية"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">الفئة *</Label>
                    <select
                      id="category"
                      name="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">اختر الفئة...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.key} value={cat.key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createPermission.isPending}>
                    {createPermission.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إضافة
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث في الصلاحيات (الاسم، الكود، الوصف)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الصلاحيات</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                صلاحية في النظام
              </p>
            </CardContent>
          </Card>
          {CATEGORIES.slice(0, 2).map(category => {
            const count = permissions?.filter(p => p.category === category.key).length || 0;
            return (
              <Card key={category.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                  <div className={`h-3 w-3 rounded-full ${category.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    صلاحية
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Permissions List by Category */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الصلاحيات</CardTitle>
            <CardDescription>
              جميع صلاحيات النظام مجمعة حسب الفئات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !permissions || permissions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد صلاحيات في النظام</p>
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
              <div className="space-y-4">
                {groupedPermissions.map(category => {
                  if (category.permissions.length === 0) return null;
                  const isExpanded = expandedCategories.has(category.key);

                  return (
                    <div key={category.key} className={`border rounded-lg overflow-hidden ${category.bgColor}`}>
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category.key)}
                        className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full ${category.color}`} />
                          <h3 className={`text-lg font-semibold ${category.textColor}`}>
                            {category.label}
                          </h3>
                          <Badge variant="secondary">
                            {category.permissions.length} صلاحية
                          </Badge>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>

                      {/* Category Content */}
                      {isExpanded && (
                        <div className="bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[250px]">اسم الصلاحية</TableHead>
                                <TableHead>الوصف</TableHead>
                                <TableHead className="text-left w-[120px]">الإجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.permissions.map((permission) => (
                                <TableRow key={permission.id}>
                                  <TableCell className="font-semibold">
                                    {permission.name}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {permission.description || "-"}
                                  </TableCell>
                                  <TableCell className="text-left">
                                    <div className="flex items-center gap-2">
                                      <Dialog
                                        open={isEditDialogOpen && selectedPermission?.id === permission.id}
                                        onOpenChange={(open) => {
                                          setIsEditDialogOpen(open);
                                          if (open) setSelectedPermission(permission);
                                        }}
                                      >
                                        <DialogTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[500px]">
                                          <form onSubmit={handleEditPermission}>
                                            <DialogHeader>
                                              <DialogTitle>تعديل الصلاحية</DialogTitle>
                                              <DialogDescription>
                                                تعديل بيانات الصلاحية
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                              <div className="space-y-2">
                                                <Label>كود الصلاحية</Label>
                                                <Input
                                                  value={permission.code}
                                                  disabled
                                                  className="bg-muted"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                  لا يمكن تعديل كود الصلاحية
                                                </p>
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-name">اسم الصلاحية *</Label>
                                                <Input
                                                  id="edit-name"
                                                  name="name"
                                                  defaultValue={permission.name}
                                                  required
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-description">الوصف</Label>
                                                <Input
                                                  id="edit-description"
                                                  name="description"
                                                  defaultValue={permission.description || ""}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-category">الفئة *</Label>
                                                <select
                                                  id="edit-category"
                                                  name="category"
                                                  defaultValue={permission.category || ""}
                                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                  required
                                                >
                                                  {CATEGORIES.map(cat => (
                                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                            <DialogFooter>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsEditDialogOpen(false)}
                                              >
                                                إلغاء
                                              </Button>
                                              <Button type="submit" disabled={updatePermission.isPending}>
                                                {updatePermission.isPending && (
                                                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                                )}
                                                حفظ التعديلات
                                              </Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              هل أنت متأكد من حذف الصلاحية "{permission.name}"؟
                                              <br />
                                              <strong className="text-destructive">
                                                تحذير: سيتم حذف هذه الصلاحية من جميع الأدوار والمستخدمين!
                                              </strong>
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deletePermission.mutate({ id: permission.id })}
                                              className="bg-destructive hover:bg-destructive/90"
                                            >
                                              حذف
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
