import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users, Clock, Building2, Download } from "lucide-react";

export default function Groups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [costCenterFilter, setCostCenterFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShiftsDialogOpen, setIsShiftsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    costCenterId: null as number | null,
    dailyWage: "",
    workMinutes: "",
    latePenaltyRate: "",
    earlyLeavePenaltyRate: "",
    isActive: true,
  });

  // Shift form state
  const [shiftFormData, setShiftFormData] = useState({
    shiftName: "",
    startTime: "08:00",
    endTime: "16:00",
    isActive: true,
  });

  // Calculate minute_cost automatically
  const calculatedMinuteCost = useMemo(() => {
    const wage = parseFloat(formData.dailyWage);
    const minutes = parseInt(formData.workMinutes);
    if (wage > 0 && minutes > 0) {
      return (wage / minutes).toFixed(2);
    }
    return null;
  }, [formData.dailyWage, formData.workMinutes]);

  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: shifts } = trpc.groups.getShifts.useQuery(
    { groupId: selectedGroup?.id || 0 },
    { enabled: !!selectedGroup }
  );

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المجموعة بنجاح");
      setIsAddDialogOpen(false);
      resetForm();
      utils.groups.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء المجموعة");
    },
  });

  const updateMutation = trpc.groups.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المجموعة بنجاح");
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
      resetForm();
      utils.groups.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المجموعة");
    },
  });

  const deleteMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المجموعة بنجاح");
      utils.groups.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المجموعة");
    },
  });

  const createShiftMutation = trpc.groups.createShift.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الوردية بنجاح");
      resetShiftForm();
      utils.groups.getShifts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الوردية");
    },
  });

  const deleteShiftMutation = trpc.groups.deleteShift.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الوردية بنجاح");
      utils.groups.getShifts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الوردية");
    },
  });

  const exportGroupQRMutation = trpc.workers.exportGroupQRCodes.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير QR Codes بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التصدير");
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      costCenterId: null,
      dailyWage: "",
      workMinutes: "",
      latePenaltyRate: "",
      earlyLeavePenaltyRate: "",
      isActive: true,
    });
  };

  const resetShiftForm = () => {
    setShiftFormData({
      shiftName: "",
      startTime: "08:00",
      endTime: "16:00",
      isActive: true,
    });
  };

  const handleEdit = (group: any) => {
    setSelectedGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      costCenterId: group.costCenterId,
      dailyWage: group.dailyWage || "",
      workMinutes: group.workMinutes || "",
      latePenaltyRate: group.latePenaltyRate || "",
      earlyLeavePenaltyRate: group.earlyLeavePenaltyRate || "",
      isActive: group.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewShifts = (group: any) => {
    setSelectedGroup(group);
    setIsShiftsDialogOpen(true);
  };

  const handleExportGroupQR = (groupId: number) => {
    exportGroupQRMutation.mutate({ groupId });
  };

  const handleSubmit = () => {
    // Convert string values to numbers or null
    const payload = {
      ...formData,
      dailyWage: formData.dailyWage ? parseFloat(formData.dailyWage) : null,
      workMinutes: formData.workMinutes ? parseInt(formData.workMinutes) : null,
      latePenaltyRate: formData.latePenaltyRate ? parseFloat(formData.latePenaltyRate) : null,
      earlyLeavePenaltyRate: formData.earlyLeavePenaltyRate ? parseFloat(formData.earlyLeavePenaltyRate) : null,
    };

    if (selectedGroup) {
      updateMutation.mutate({
        id: selectedGroup.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleAddShift = () => {
    if (!selectedGroup) return;
    createShiftMutation.mutate({
      groupId: selectedGroup.id,
      ...shiftFormData,
    });
  };

  const filteredGroups = groups?.filter(
    (group) => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCostCenter = costCenterFilter === "all" || 
        (costCenterFilter === "none" && !group.costCenterId) ||
        group.costCenterId?.toString() === costCenterFilter;
      return matchesSearch && matchesCostCenter;
    }
  );

  const getCostCenterName = (id: number | null) => {
    if (!id) return "-";
    const cc = costCenters?.find((c) => c.id === id);
    return cc?.name || "-";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المجموعات</h1>
            <p className="text-muted-foreground">إدارة مجموعات العمل والورديات</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedGroup(null); }}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مجموعة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة مجموعة جديدة</DialogTitle>
                <DialogDescription>أدخل بيانات المجموعة الجديدة</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">الكود</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="GRP001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم المجموعة</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="المجموعة الأولى"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>مركز التكلفة</Label>
                  <Select
                    value={formData.costCenterId?.toString() || ""}
                    onValueChange={(value) => setFormData({ ...formData, costCenterId: value ? parseInt(value) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مركز التكلفة" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters?.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Work Group Settings */}
                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">إعدادات الحساب بالدقائق</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyWage">أجر اليوم (ريال)</Label>
                      <Input
                        id="dailyWage"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.dailyWage}
                        onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                        placeholder="150.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workMinutes">دقائق الدوام</Label>
                      <Input
                        id="workMinutes"
                        type="number"
                        min="1"
                        value={formData.workMinutes}
                        onChange={(e) => setFormData({ ...formData, workMinutes: e.target.value })}
                        placeholder="480"
                      />
                    </div>
                  </div>
                  {calculatedMinuteCost && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">تكلفة الدقيقة (محسوبة تلقائياً):</span>
                        <span className="text-lg font-bold text-primary">{calculatedMinuteCost} ريال</span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="latePenaltyRate">نسبة غرامة التأخير (%)</Label>
                      <Input
                        id="latePenaltyRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.latePenaltyRate}
                        onChange={(e) => setFormData({ ...formData, latePenaltyRate: e.target.value })}
                        placeholder="0.50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earlyLeavePenaltyRate">نسبة غرامة الانصراف المبكر (%)</Label>
                      <Input
                        id="earlyLeavePenaltyRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.earlyLeavePenaltyRate}
                        onChange={(e) => setFormData({ ...formData, earlyLeavePenaltyRate: e.target.value })}
                        placeholder="0.50"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">نشط</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مجموعة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                <SelectTrigger className="w-[200px]">
                  <Building2 className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="مركز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المراكز</SelectItem>
                  <SelectItem value="none">بدون مركز</SelectItem>
                  {costCenters?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Groups Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة المجموعات
            </CardTitle>
            <CardDescription>
              {filteredGroups?.length || 0} مجموعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الكود</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">مركز التكلفة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups?.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono">{group.code}</TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{getCostCenterName(group.costCenterId)}</TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportGroupQR(group.id)}
                            title="تصدير QR Codes"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewShifts(group)}
                            title="الورديات"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(group)}
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="حذف">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف المجموعة "{group.name}"؟ سيتم حذف جميع الورديات المرتبطة بها.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({ id: group.id })}
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
                  ))}
                  {filteredGroups?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد مجموعات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل المجموعة</DialogTitle>
              <DialogDescription>تعديل بيانات المجموعة</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">الكود</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">اسم المجموعة</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>مركز التكلفة</Label>
                <Select
                  value={formData.costCenterId?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, costCenterId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters?.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Work Group Settings */}
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">إعدادات الحساب بالدقائق</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-dailyWage">أجر اليوم (ريال)</Label>
                    <Input
                      id="edit-dailyWage"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dailyWage}
                      onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                      placeholder="150.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-workMinutes">دقائق الدوام</Label>
                    <Input
                      id="edit-workMinutes"
                      type="number"
                      min="1"
                      value={formData.workMinutes}
                      onChange={(e) => setFormData({ ...formData, workMinutes: e.target.value })}
                      placeholder="480"
                    />
                  </div>
                </div>
                {calculatedMinuteCost && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">تكلفة الدقيقة (محسوبة تلقائياً):</span>
                      <span className="text-lg font-bold text-primary">{calculatedMinuteCost} ريال</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-latePenaltyRate">نسبة غرامة التأخير (%)</Label>
                    <Input
                      id="edit-latePenaltyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.latePenaltyRate}
                      onChange={(e) => setFormData({ ...formData, latePenaltyRate: e.target.value })}
                      placeholder="0.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-earlyLeavePenaltyRate">نسبة غرامة الانصراف المبكر (%)</Label>
                    <Input
                      id="edit-earlyLeavePenaltyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.earlyLeavePenaltyRate}
                      onChange={(e) => setFormData({ ...formData, earlyLeavePenaltyRate: e.target.value })}
                      placeholder="0.50"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">نشط</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shifts Dialog */}
        <Dialog open={isShiftsDialogOpen} onOpenChange={setIsShiftsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                ورديات المجموعة: {selectedGroup?.name}
              </DialogTitle>
              <DialogDescription>إدارة ورديات العمل للمجموعة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Add Shift Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">إضافة وردية جديدة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="اسم الوردية"
                      value={shiftFormData.shiftName}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, shiftName: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={shiftFormData.startTime}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={shiftFormData.endTime}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                    />
                    <Button onClick={handleAddShift} disabled={createShiftMutation.isPending}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Shifts List */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الوردية</TableHead>
                    <TableHead className="text-right">وقت البداية</TableHead>
                    <TableHead className="text-right">وقت النهاية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts?.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>{shift.shiftName}</TableCell>
                      <TableCell>{shift.startTime}</TableCell>
                      <TableCell>{shift.endTime}</TableCell>
                      <TableCell>
                        <Badge variant={shift.isActive ? "default" : "secondary"}>
                          {shift.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteShiftMutation.mutate({ id: shift.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {shifts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        لا توجد ورديات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsShiftsDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
