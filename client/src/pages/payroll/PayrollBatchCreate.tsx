import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PayrollBatchCreate() {
  const [, setLocation] = useLocation();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [groupId, setGroupId] = useState<number | undefined>();
  const [costCenterId, setCostCenterId] = useState<number | undefined>();

  const { data: groups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();

  const createMutation = trpc.payroll.createBatch.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء دفعة الرواتب بنجاح");
      setLocation(`/payroll/batches/${data.batchId}`);
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!periodStart || !periodEnd) {
      toast.error("يرجى تحديد الفترة الزمنية");
      return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    createMutation.mutate({
      periodStart,
      periodEnd,
      groupId,
      costCenterId,
    });
  };

  return (
    <div className="container py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">إنشاء دفعة رواتب جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Period Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">الفترة الزمنية</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodStart">تاريخ البداية</Label>
                    <Input
                      id="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodEnd">تاريخ النهاية</Label>
                    <Input
                      id="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">الفلاتر (اختياري)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group">المجموعة</Label>
                    <Select
                      value={groupId?.toString()}
                      onValueChange={(value) =>
                        setGroupId(value === "all" ? undefined : Number(value))
                      }
                    >
                      <SelectTrigger id="group">
                        <SelectValue placeholder="جميع المجموعات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المجموعات</SelectItem>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costCenter">مركز التكلفة</Label>
                    <Select
                      value={costCenterId?.toString()}
                      onValueChange={(value) =>
                        setCostCenterId(value === "all" ? undefined : Number(value))
                      }
                    >
                      <SelectTrigger id="costCenter">
                        <SelectValue placeholder="جميع مراكز التكلفة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع مراكز التكلفة</SelectItem>
                        {costCenters?.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id.toString()}>
                            {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ملاحظة
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  سيتم جمع البيانات المالية تلقائياً من جدول الحضور والخصومات والإضافات
                  للفترة المحددة. يمكنك مراجعة وتعديل البيانات بعد الإنشاء.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/payroll/batches")}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 ml-2" />
                      إنشاء الدفعة
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
