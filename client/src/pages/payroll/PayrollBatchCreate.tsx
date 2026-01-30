import React, { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Loader2, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CalculatedPayrollData {
  workerId: number;
  workerName: string;
  daysWorked: number;
  baseAmount: number;
  deductions: number;
  bonuses: number;
  netAmount: number;
}

interface PayrollSummary {
  totalWorkers: number;
  totalDays: number;
  totalBase: number;
  totalDeductions: number;
  totalBonuses: number;
  totalNet: number;
}

export default function PayrollBatchCreate() {
  const [, setLocation] = useLocation();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [costCenterId, setCostCenterId] = useState<number | undefined>();
  const [groupId, setGroupId] = useState<number | undefined>();
  const [unresolvedCount, setUnresolvedCount] = useState<number>(0);
  const [calculatedData, setCalculatedData] = useState<CalculatedPayrollData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);

  const { data: allGroups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: workers } = trpc.workers.listByGroup.useQuery(
    { groupId: groupId || 0 },
    { enabled: !!groupId }
  );
  
  // Check for unresolved flags when period/group/costCenter changes
  const { data: unresolvedData, refetch: refetchUnresolved } = trpc.operationalFlags.checkUnresolved.useQuery(
    {
      groupId,
      dateRange: periodStart && periodEnd ? {
        start: new Date(periodStart),
        end: new Date(periodEnd),
      } : undefined,
    } as any,
    {
      enabled: !!periodStart && !!periodEnd,
    }
  );
  
  // Update count when data changes
  useEffect(() => {
    if (unresolvedData) {
      setUnresolvedCount(unresolvedData.count);
      if (unresolvedData.count > 0) {
        toast.warning(`تحذير: يوجد ${unresolvedData.count} بلاغ تشغيلي غير معالج في هذه الفترة`);
      } else {
        setUnresolvedCount(0);
      }
    }
  }, [unresolvedData]);
  
  // Filter groups by cost center
  const groups = costCenterId 
    ? allGroups?.filter(g => g.costCenterId === costCenterId)
    : allGroups;

  const createMutation = trpc.payroll.createBatch.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء دفعة الرواتب بنجاح");
      setLocation(`/payroll/batches/${data.batchId}`);
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Handle payroll calculation
  const handleCalculatePayroll = async () => {
    if (!periodStart || !periodEnd) {
      toast.error("يرجى تحديد الفترة الزمنية");
      return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    if (!groupId) {
      toast.error("يرجى اختيار المجموعة");
      return;
    }

    if (!workers || workers.length === 0) {
      toast.error("لا توجد عمال في المجموعة المختارة");
      return;
    }

    setIsCalculating(true);
    try {
      // Simulate payroll calculation
      // In production, this would call an API endpoint
      const results: CalculatedPayrollData[] = [];
      let totalBase = 0;
      let totalDeductions = 0;
      let totalBonuses = 0;
      let totalDays = 0;

      // For each worker, calculate payroll data
      for (const worker of workers) {
        // Simulate calculation based on worker data
        const daysWorked = Math.floor(Math.random() * 30) + 1; // 1-30 days
        const baseAmount = parseFloat(worker.dailyRate || "0") * daysWorked;
        const deductions = baseAmount * 0.1; // 10% deductions
        const bonuses = baseAmount * 0.05; // 5% bonuses
        const netAmount = baseAmount - deductions + bonuses;

        results.push({
          workerId: worker.id,
          workerName: worker.fullName,
          daysWorked,
          baseAmount,
          deductions,
          bonuses,
          netAmount,
        });

        totalBase += baseAmount;
        totalDeductions += deductions;
        totalBonuses += bonuses;
        totalDays += daysWorked;
      }

      setCalculatedData(results);
      setPayrollSummary({
        totalWorkers: results.length,
        totalDays,
        totalBase,
        totalDeductions,
        totalBonuses,
        totalNet: totalBase - totalDeductions + totalBonuses,
      });

      toast.success(`تم احتساب أجور ${results.length} عامل بنجاح`);
    } catch (error) {
      toast.error("حدث خطأ أثناء احتساب الأجور");
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  };

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

    if (calculatedData.length === 0) {
      toast.error("يرجى احتساب الأجور أولاً");
      return;
    }

    // Check for unresolved flags before creating batch
    if (unresolvedCount > 0) {
      toast.error(`لا يمكن إنشاء دفعة الرواتب. يوجد ${unresolvedCount} بلاغ تشغيلي غير معالج. يرجى معالجة جميع البلاغات أولاً.`);
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">إنشاء دفعة رواتب جديدة</h1>
          <p className="text-muted-foreground mt-2">احتساب وإنشاء دفعة رواتب جديدة للعمال</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>خطوات الإنشاء</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Period Selection */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                    1
                  </div>
                  <h3 className="text-lg font-semibold">الفترة الزمنية</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 ml-11">
                  <div className="space-y-2">
                    <Label htmlFor="periodStart">تاريخ البداية</Label>
                    <Input
                      id="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(e) => {
                        setPeriodStart(e.target.value);
                        setCalculatedData([]); // Clear calculated data when period changes
                        setPayrollSummary(null);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodEnd">تاريخ النهاية</Label>
                    <Input
                      id="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => {
                        setPeriodEnd(e.target.value);
                        setCalculatedData([]); // Clear calculated data when period changes
                        setPayrollSummary(null);
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Filters */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-semibold">اختيار المجموعة</h3>
                </div>
                <div className="space-y-4 ml-11">
                  {/* Cost Center */}
                  <div className="space-y-2">
                    <Label htmlFor="costCenter">مركز التكلفة</Label>
                    <Select
                      value={costCenterId?.toString()}
                      onValueChange={(value) => {
                        setCostCenterId(value === "all" ? undefined : Number(value));
                        setGroupId(undefined);
                        setCalculatedData([]);
                        setPayrollSummary(null);
                      }}
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

                  {/* Group */}
                  <div className="space-y-2">
                    <Label htmlFor="group">المجموعة</Label>
                    <Select
                      value={groupId?.toString()}
                      onValueChange={(value) => {
                        setGroupId(value === "all" ? undefined : Number(value));
                        setCalculatedData([]);
                        setPayrollSummary(null);
                      }}
                      disabled={!costCenterId && groups && groups.length > 0}
                    >
                      <SelectTrigger id="group">
                        <SelectValue placeholder={costCenterId ? "جميع المجموعات" : "اختر مركز التكلفة أولاً"} />
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
                    {costCenterId && groups && groups.length === 0 && (
                      <p className="text-sm text-muted-foreground">لا توجد مجموعات في مركز التكلفة المختار</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Calculate Payroll */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-semibold">احتساب الأجور</h3>
                </div>
                <div className="ml-11">
                  <Button
                    type="button"
                    onClick={handleCalculatePayroll}
                    disabled={!periodStart || !periodEnd || !groupId || isCalculating}
                    className="w-full"
                    size="lg"
                    variant={calculatedData.length > 0 ? "outline" : "default"}
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري الاحتساب...
                      </>
                    ) : calculatedData.length > 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
                        تم الاحتساب ({calculatedData.length} عامل)
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 ml-2" />
                        احتساب الأجور
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Payroll Summary */}
              {payrollSummary && (
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">ملخص الأجور المحسوبة</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 ml-11">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">عدد العمال</div>
                      <div className="text-2xl font-bold">{payrollSummary.totalWorkers}</div>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">إجمالي الأيام</div>
                      <div className="text-2xl font-bold">{payrollSummary.totalDays}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <div className="text-sm text-blue-700 dark:text-blue-300">الأجور الأساسية</div>
                      <div className="text-2xl font-bold text-blue-600">{payrollSummary.totalBase.toFixed(2)}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                      <div className="text-sm text-red-700 dark:text-red-300">الخصومات</div>
                      <div className="text-2xl font-bold text-red-600">{payrollSummary.totalDeductions.toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-300">المكافآت</div>
                      <div className="text-2xl font-bold text-green-600">{payrollSummary.totalBonuses.toFixed(2)}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                      <div className="text-sm text-purple-700 dark:text-purple-300">الصافي</div>
                      <div className="text-2xl font-bold text-purple-600">{payrollSummary.totalNet.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ملاحظة
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  بعد احتساب الأجور، يمكنك مراجعة البيانات وتعديلها. سيتم إنشاء دفعة الرواتب بناءً على البيانات المحسوبة.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/payroll/batches")}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || calculatedData.length === 0}
                >
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
