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
import { ArrowRight, Edit, Loader2, ArrowLeft } from "lucide-react";
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

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>تفاصيل العمال</CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العامل</TableHead>
                <TableHead>الراتب الأساسي</TableHead>
                <TableHead>الخصومات</TableHead>
                <TableHead>الإضافات</TableHead>
                <TableHead>الصافي</TableHead>
                <TableHead>ملاحظات</TableHead>
                {canEdit && <TableHead>الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.workerName}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
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
                onChange={(e) =>
                  setEditForm({ ...editForm, totalDeductions: e.target.value })
                }
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
    </div>
  );
}
