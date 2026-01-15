import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, Shield, Calendar, Save } from "lucide-react";

export default function Profile() {
  const { user, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const utils = trpc.useUtils();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
      utils.auth.me.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الملف الشخصي");
    },
  });

  const handleEdit = () => {
    setFormData({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate({
      fullName: formData.fullName || undefined,
      email: formData.email || null,
      phone: formData.phone || null,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الملف الشخصي</h1>
          <p className="text-muted-foreground mt-1">
            عرض وتعديل معلوماتك الشخصية
          </p>
        </div>

        {/* Profile Card */}
        <Card className="border-0 shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardHeader className="-mt-16 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{user?.fullName}</CardTitle>
                <CardDescription className="text-base">@{user?.username}</CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={handleEdit} variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  تعديل الملف
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Separator className="mb-6" />

            {isEditing ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">الاسم الكامل</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={updateProfile.isPending} className="gap-2">
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    حفظ التغييرات
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                      <p className="font-medium">{user?.fullName || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-2/10">
                      <Mail className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium">{user?.email || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-3/10">
                      <Phone className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium">{user?.phone || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-4/10">
                      <Shield className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الدور</p>
                      <Badge variant="secondary">{user?.role || "مستخدم"}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>معلومات الحساب</CardTitle>
            <CardDescription>تفاصيل إضافية عن حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">اسم المستخدم</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">حالة الحساب</span>
                <Badge variant={user?.isActive ? "default" : "secondary"}>
                  {user?.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <span className="font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">آخر تسجيل دخول</span>
                <span className="font-medium">
                  {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("ar-SA") : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
