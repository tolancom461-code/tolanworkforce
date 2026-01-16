import { useState } from "react";
import { Link } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/payroll/StatusBadge";
import { Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PayrollBatchList() {
  const [activeTab, setActiveTab] = useState("all");
  
  const utils = trpc.useUtils();
  const { data: allBatches, isLoading: loadingAll } = trpc.payroll.listBatches.useQuery({});
  const { data: draftBatches } = trpc.payroll.listBatchesByStatus.useQuery({ status: "draft" });
  const { data: pendingBatches } = trpc.payroll.listBatchesByStatus.useQuery({ status: "under_accountant_review" });
  const { data: approvedBatches } = trpc.payroll.listBatchesByStatus.useQuery({ status: "approved" });

  const deleteMutation = trpc.payroll.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدفعة بنجاح");
      utils.payroll.listBatches.invalidate();
      utils.payroll.listBatchesByStatus.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleDelete = (batchId: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الدفعة؟")) {
      deleteMutation.mutate({ batchId });
    }
  };

  const renderBatchTable = (batches: any[] | undefined, showDelete = false) => {
    if (!batches || batches.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد دفعات
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الدفعة</TableHead>
            <TableHead>الفترة</TableHead>
            <TableHead>عدد العمال</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.batchCode}</TableCell>
              <TableCell>
                {new Date(batch.periodStart).toLocaleDateString("ar-SA")} -{" "}
                {new Date(batch.periodEnd).toLocaleDateString("ar-SA")}
              </TableCell>
              <TableCell>{batch.workerCount}</TableCell>
              <TableCell>{Number(batch.totalAmount).toLocaleString("ar-SA")} ر.س</TableCell>
              <TableCell>
                <StatusBadge status={batch.status} />
              </TableCell>
              <TableCell>{new Date(batch.createdAt).toLocaleDateString("ar-SA")}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Link href={`/payroll/batches/${batch.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 ml-2" />
                      عرض
                    </Button>
                  </Link>
                  {showDelete && batch.status === "draft" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(batch.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (loadingAll) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">دفعات الرواتب</h1>
        <Link href="/payroll/batches/create">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            إنشاء دفعة جديدة
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">الكل ({allBatches?.length || 0})</TabsTrigger>
          <TabsTrigger value="draft">المسودات ({draftBatches?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">قيد المراجعة ({pendingBatches?.length || 0})</TabsTrigger>
          <TabsTrigger value="approved">المعتمدة ({approvedBatches?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>جميع الدفعات</CardTitle>
            </CardHeader>
            <CardContent>{renderBatchTable(allBatches, true)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <CardTitle>المسودات</CardTitle>
            </CardHeader>
            <CardContent>{renderBatchTable(draftBatches, true)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>قيد المراجعة</CardTitle>
            </CardHeader>
            <CardContent>{renderBatchTable(pendingBatches)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>المعتمدة</CardTitle>
            </CardHeader>
            <CardContent>{renderBatchTable(approvedBatches)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
