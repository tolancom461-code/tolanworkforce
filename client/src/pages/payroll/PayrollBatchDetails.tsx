import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/payroll/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Edit, Loader2, ArrowLeft, Users, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PayrollBatchDetails() {
  const [, params] = useRoute("/payroll/batches/:id");
  const [, setLocation] = useLocation();
  const batchId = Number(params?.id);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    baseAmount: "",
    totalDeductions: "",
    totalBonuses: "",
    notes: "",
  });

  // Daily Details Dialog State
  const [dailyDetailsOpen, setDailyDetailsOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [overrideForm, setOverrideForm] = useState<{
    [key: string]: { enabled: boolean; reason: string };
  }>({});

  const utils = trpc.useUtils();
  const { data: batch, isLoading } = trpc.payroll.getDetails.useQuery({ batchId });

  const updateItemMutation = trpc.payroll.updateItem.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث البيانات بنجاح");
      setEditingItem(null);
      utils.payroll.getDetails.invalidate({ batchId });
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const submitMutation = trpc.payroll.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الدفعة للمراجعة");
      utils.payroll.getDetails.invalidate({ batchId });
      utils.payroll.listBatches.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Daily Override Mutation
  const updateOverrideMutation = trpc.payroll.updateFullDayOverride.useMutation({
    onSuccess: () => {
      toast.success("تم تطبيق التصحيح بنجاح");
      // إعادة جلب البيانات اليومية
      if (selectedWorker && batch) {
        handleOpenDailyDetails(selectedWorker);
      }
      // إعادة جلب تفاصيل الدفعة لتحديث المجاميع
      utils.payroll.getDetails.invalidate({ batchId });
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const exportMutation = trpc.payroll.exportToExcel.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("تم تصدير الملف بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في التصدير: ${error.message}`);
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      baseAmount: item.baseAmount,
      totalDeductions: item.totalDeductions,
      totalBonuses: item.totalBonuses,
      notes: item.notes || "",
    });
  };

  const handleSaveEdit = () => {
    updateItemMutation.mutate({
      itemId: editingItem.id,
      ...editForm,
    });
  };

  const handleSubmitForReview = () => {
    if (confirm("هل أنت متأكد من إرسال الدفعة للمراجعة؟ لن تتمكن من التعديل بعد ذلك.")) {
      submitMutation.mutate({ batchId });
    }
  };

  // Daily Details Handlers
  const handleOpenDailyDetails = async (worker: any) => {
    setSelectedWorker(worker);
    setDailyDetailsOpen(true);
    
    // Fetch daily finance data
    try {
      const data = await utils.client.payroll.getDailyFinanceForWorker.query({
        workerId: worker.workerId,
        periodStart: batch!.batch.periodStart.toISOString().split('T')[0],
        periodEnd: batch!.batch.periodEnd.toISOString().split('T')[0],
      });
      setDailyData(data);
      
      // Initialize override form
      const initialForm: any = {};
      data.forEach((day: any) => {
        initialForm[day.workDate] = {
          enabled: day.fullDayOverride || false,
          reason: day.overrideReason || "",
        };
      });
      setOverrideForm(initialForm);
    } catch (error: any) {
      toast.error(`خطأ في جلب البيانات: ${error.message}`);
    }
  };

  const handleOverrideChange = (workDate: string, enabled: boolean) => {
    setOverrideForm(prev => ({
      ...prev,
      [workDate]: {
        ...prev[workDate],
        enabled,
      },
    }));
  };

  const handleReasonChange = (workDate: string, reason: string) => {
    setOverrideForm(prev => ({
      ...prev,
      [workDate]: {
        ...prev[workDate],
        reason,
      },
    }));
  };

  const handleSaveOverride = (workDate: string) => {
    const form = overrideForm[workDate];
    
    if (form.enabled && !form.reason.trim()) {
      toast.error("يرجى إدخال سبب التصحيح");
      return;
    }

    updateOverrideMutation.mutate({
      workerId: selectedWorker!.workerId,
      workDate,
      fullDayOverride: form.enabled,
      overrideReason: form.enabled ? form.reason : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">لم يتم العثور على الدفعة</p>
            <Button className="mt-4" onClick={() => setLocation("/payroll/batches")}>
              العودة إلى القائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = batch.batch.status === "draft" || batch.batch.status === "returned_from_accountant" || batch.batch.status === "returned_from_financial_review";
  const canSubmit = batch.batch.status === "draft" || batch.batch.status === "returned_from_accountant" || batch.batch.status === "returned_from_financial_review";

  // Group items by groupId
  const groupedItems = batch.items?.reduce((acc: any, item: any) => {
    const groupKey = item.groupId || 'unknown';
    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupId: item.groupId,
        groupName: item.groupName || 'مجموعة غير محددة',
        workers: [],
        summary: {
          count: 0,
          totalBase: 0,
          totalDeductions: 0,
          totalBonuses: 0,
          totalNet: 0,
        },
      };
    }
    acc[groupKey].workers.push(item);
    acc[groupKey].summary.count += 1;
    acc[groupKey].summary.totalBase += parseFloat(item.baseAmount || '0');
    acc[groupKey].summary.totalDeductions += parseFloat(item.totalDeductions || '0');
    acc[groupKey].summary.totalBonuses += parseFloat(item.totalBonuses || '0');
    acc[groupKey].summary.totalNet += parseFloat(item.netAmount || '0');
    return acc;
  }, {});

  const groups = Object.values(groupedItems || {});

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/payroll/batches")}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">دفعة رواتب #{batch.batch.batchCode}</h1>
            <p className="text-muted-foreground">
              {new Date(batch.batch.periodStart).toLocaleDateString("ar-SA")} -{" "}
              {new Date(batch.batch.periodEnd).toLocaleDateString("ar-SA")}
            </p>
          </div>
        </div>
        <StatusBadge status={batch.batch.status as any} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              عدد العمال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.batch.totalWorkers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الرواتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(batch.batch.totalAmount || 0).toLocaleString("ar-SA")} ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط الراتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(batch.batch.totalWorkers || 0) > 0
                ? (Number(batch.batch.totalAmount || 0) / (batch.batch.totalWorkers || 1)).toLocaleString("ar-SA", {
                    maximumFractionDigits: 0,
                  })
                : 0}{" "}
              ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              عدد الرفضات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.batch.rejectionCount || 0} / 3</div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Table - Grouped by Group */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>تفاصيل العمال حسب المجموعات</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => exportMutation.mutate({ batchId })} 
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 ml-2" />
                    تصدير Excel
                  </>
                )}
              </Button>
              {canSubmit && (
                <Button onClick={handleSubmitForReview} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 ml-2" />
                      إرسال للمراجعة
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العامل / المجموعة</TableHead>
                <TableHead>الراتب الأساسي</TableHead>
                <TableHead>الخصومات</TableHead>
                <TableHead>الإضافات</TableHead>
                <TableHead>الصافي</TableHead>
                <TableHead>ملاحظات</TableHead>
                {canEdit && <TableHead>الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group: any) => (
                <>
                  {/* Group Summary Row */}
                  <TableRow key={`group-${group.groupId}`} className="bg-muted/50 font-semibold">
                    <TableCell className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {group.groupName} ({group.summary.count} عامل)
                    </TableCell>
                    <TableCell>
                      {group.summary.totalBase.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                    </TableCell>
                    <TableCell className="text-red-600">
                      {group.summary.totalDeductions.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                    </TableCell>
                    <TableCell className="text-green-600">
                      {group.summary.totalBonuses.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                    </TableCell>
                    <TableCell className="font-bold">
                      {group.summary.totalNet.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                    </TableCell>
                    <TableCell></TableCell>
                    {canEdit && <TableCell></TableCell>}
                  </TableRow>

                  {/* Worker Rows */}
                  {group.workers.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="pl-12 font-medium">{item.workerName}</TableCell>
                      <TableCell>{Number(item.baseAmount).toLocaleString("ar-SA")} ر.س</TableCell>
                      <TableCell className="text-red-600">
                        {Number(item.totalDeductions).toLocaleString("ar-SA")} ر.س
                      </TableCell>
                      <TableCell className="text-green-600">
                        {Number(item.totalBonuses).toLocaleString("ar-SA")} ر.س
                      </TableCell>
                      <TableCell className="font-bold">
                        {Number(item.netAmount).toLocaleString("ar-SA")} ر.س
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDailyDetails(item)}
                              title="تفاصيل الأيام"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات العامل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم العامل</Label>
              <Input value={editingItem?.workerName || ""} disabled />
            </div>
            <div>
              <Label htmlFor="baseAmount">الراتب الأساسي</Label>
              <Input
                id="baseAmount"
                type="number"
                step="0.01"
                value={editForm.baseAmount}
                onChange={(e) => setEditForm({ ...editForm, baseAmount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="totalDeductions">الخصومات</Label>
              <Input
                id="totalDeductions"
                type="number"
                step="0.01"
                value={editForm.totalDeductions}
                onChange={(e) => setEditForm({ ...editForm, totalDeductions: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="totalBonuses">الإضافات</Label>
              <Input
                id="totalBonuses"
                type="number"
                step="0.01"
                value={editForm.totalBonuses}
                onChange={(e) => setEditForm({ ...editForm, totalBonuses: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Input
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateItemMutation.isPending}>
              {updateItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Details Dialog */}
      <Dialog open={dailyDetailsOpen} onOpenChange={setDailyDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              تفاصيل الأيام - {selectedWorker?.workerName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dailyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد بيانات يومية لهذا العامل
              </p>
            ) : (
              <div className="space-y-3">
                {dailyData.map((day: any) => {
                  const form = overrideForm[day.workDate] || { enabled: false, reason: "" };
                  const isOverridden = form.enabled;
                  
                  return (
                    <Card key={day.workDate} className={isOverridden ? "border-green-500 bg-green-50" : ""}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* التاريخ والمعلومات الأساسية */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-lg">
                                {new Date(day.workDate).toLocaleDateString('ar-SA', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">الحضور:</span>{" "}
                                  <span className="font-medium">{day.checkInTime || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">الانصراف:</span>{" "}
                                  <span className="font-medium">{day.checkOutTime || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">دقائق التأخير:</span>{" "}
                                  <span className="font-medium text-red-600">{day.lateMinutes || 0}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">دقائق الانصراف المبكر:</span>{" "}
                                  <span className="font-medium text-red-600">{day.earlyLeaveMinutes || 0}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-left space-y-1">
                              <div className="text-sm">
                                <span className="text-muted-foreground">الخصم:</span>{" "}
                                <span className="font-bold text-red-600">
                                  {Number(day.totalDeduction || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">الصافي:</span>{" "}
                                <span className="font-bold text-green-600">
                                  {Number(day.netAmount || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* قسم التصحيح */}
                          <div className="border-t pt-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`override-${day.workDate}`}
                                checked={form.enabled}
                                onCheckedChange={(checked) => handleOverrideChange(day.workDate, checked as boolean)}
                              />
                              <Label htmlFor={`override-${day.workDate}`} className="font-medium cursor-pointer">
                                اعتماد يوم كامل (تصحيح إداري)
                              </Label>
                            </div>
                            
                            {form.enabled && (
                              <div className="space-y-2">
                                <Label htmlFor={`reason-${day.workDate}`}>
                                  سبب التصحيح <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                  id={`reason-${day.workDate}`}
                                  value={form.reason}
                                  onChange={(e) => handleReasonChange(day.workDate, e.target.value)}
                                  placeholder="مثال: عذر طارئ معتمد من الإدارة"
                                  rows={2}
                                  className="resize-none"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveOverride(day.workDate)}
                                  disabled={updateOverrideMutation.isPending}
                                >
                                  {updateOverrideMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-3 w-3 ml-2 animate-spin" />
                                      جاري الحفظ...
                                    </>
                                  ) : (
                                    "حفظ التصحيح"
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* عرض سبب التصحيح إذا كان محفوظاً */}
                            {day.fullDayOverride && day.overrideReason && (
                              <div className="bg-green-100 border border-green-300 rounded p-3">
                                <p className="text-sm font-medium text-green-800">
                                  ✓ تم اعتماد هذا اليوم كاملاً
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                  <span className="font-medium">السبب:</span> {day.overrideReason}
                                </p>
                                {day.overrideBy && (
                                  <p className="text-xs text-green-600 mt-1">
                                    بواسطة: {day.overrideBy} في {new Date(day.overrideAt).toLocaleString('ar-SA')}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDailyDetailsOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
