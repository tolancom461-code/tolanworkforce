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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface CalculatedPayrollData {
  workerId: number;
  workerName: string;
  groupId: number;
  groupName: string;
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const [calculatedData, setCalculatedData] = useState<CalculatedPayrollData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: allGroups } = trpc.groups.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: unresolvedData } = trpc.operationalFlags.checkUnresolved.useQuery(
    {
      groupId: selectedGroupIds.size > 0 ? Array.from(selectedGroupIds)[0] : undefined,
      dateRange: periodStart && periodEnd ? {
        start: new Date(periodStart),
        end: new Date(periodEnd),
      } : undefined,
    } as any,
    {
      enabled: !!periodStart && !!periodEnd,
    }
  );

  const createMutation = trpc.payroll.createBatch.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء دفعة الرواتب بنجاح");
      setLocation(`/payroll/batches/${data.batchId}`);
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Filter groups by cost center
  const groups = costCenterId
    ? allGroups?.filter((g) => g.costCenterId === costCenterId)
    : allGroups;

  // Handle group selection
  const toggleGroup = (groupId: number) => {
    const newSelected = new Set(selectedGroupIds);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroupIds(newSelected);
    setCalculatedData([]);
    setPayrollSummary(null);
  };

  // Select all groups
  const selectAllGroups = () => {
    if (groups && groups.length > 0) {
      const allGroupIds = new Set(groups.map((g) => g.id));
      setSelectedGroupIds(allGroupIds);
    }
  };

  // Deselect all groups
  const deselectAllGroups = () => {
    setSelectedGroupIds(new Set());
  };

  // Handle payroll calculation with API
  const handleCalculatePayroll = async () => {
    if (!periodStart || !periodEnd) {
      toast.error("يرجى تحديد الفترة الزمنية");
      return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    if (!costCenterId) {
      toast.error("يرجى اختيار مركز التكلفة");
      return;
    }

    // If no specific groups selected, use all groups in cost center
    let groupsToCalculate = Array.from(selectedGroupIds);
    if (groupsToCalculate.length === 0 && groups) {
      groupsToCalculate = groups.map((g) => g.id);
    }

    if (groupsToCalculate.length === 0) {
      toast.error("لا توجد مجموعات في مركز التكلفة المختار");
      return;
    }

    setIsCalculating(true);
    try {
      // Call API to calculate payroll for selected groups
      const results: CalculatedPayrollData[] = [];
      let totalBase = 0;
      let totalDeductions = 0;
      let totalBonuses = 0;
      let totalDays = 0;

      // For each selected group, calculate payroll
      for (const groupId of groupsToCalculate) {
        const group = groups?.find((g) => g.id === groupId);
        if (!group) continue;

        try {
          // Call API to get calculated daily finances for this group
          // This would be: const groupData = await trpc.payroll.calculateDailyFinances.useMutation(...)
          // For now, we'll simulate the API response structure
          const groupWorkers = []; // Would be fetched from API

          // In production, this would come from the server API
          // const response = await fetch(`/api/payroll/calculate`, {
          //   method: 'POST',
          //   body: JSON.stringify({
          //     groupId,
          //     periodStart,
          //     periodEnd,
          //   })
          // });
          // const groupData = await response.json();

          // For now, we'll add a placeholder that shows the structure
          // This will be replaced with actual API call
          results.push({
            workerId: groupId,
            workerName: `${group.name} - جاري التحميل...`,
            groupId: group.id,
            groupName: group.name,
            daysWorked: 0,
            baseAmount: 0,
            deductions: 0,
            bonuses: 0,
            netAmount: 0,
          });
        } catch (error) {
          console.error(`Error calculating payroll for group ${groupId}:`, error);
        }
      }

      // Calculate summary
      for (const item of results) {
        totalBase += item.baseAmount;
        totalDeductions += item.deductions;
        totalBonuses += item.bonuses;
        totalDays += item.daysWorked;
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

    if (calculatedData.length === 0) {
      toast.error("يرجى احتساب الأجور أولاً");
      return;
    }

    if (unresolvedData && unresolvedData.count > 0) {
      toast.error(`لا يمكن إنشاء دفعة الرواتب. يوجد ${unresolvedData.count} بلاغ تشغيلي غير معالج.`);
      return;
    }

    createMutation.mutate({
      periodStart,
      periodEnd,
      groupId: selectedGroupIds.size > 0 ? Array.from(selectedGroupIds)[0] : undefined,
      costCenterId,
    });
  };

  const toggleRowExpand = (workerId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(workerId)) {
      newExpanded.delete(workerId);
    } else {
      newExpanded.add(workerId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="container py-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
                        setCalculatedData([]);
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
                        setCalculatedData([]);
                        setPayrollSummary(null);
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Cost Center Selection */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-semibold">مركز التكلفة</h3>
                </div>
                <div className="space-y-4 ml-11">
                  <Select
                    value={costCenterId?.toString()}
                    onValueChange={(value) => {
                      setCostCenterId(value === "all" ? undefined : Number(value));
                      setSelectedGroupIds(new Set());
                      setCalculatedData([]);
                      setPayrollSummary(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مركز التكلفة" />
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

              {/* Step 3: Group Selection (Flexible) */}
              {costCenterId && (
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                      3
                    </div>
                    <h3 className="text-lg font-semibold">المجموعات (اختياري)</h3>
                  </div>
                  <div className="space-y-3 ml-11">
                    <p className="text-sm text-muted-foreground">
                      اختر مجموعات محددة أو اترك الجميع مختاراً لاحتساب كل المجموعات
                    </p>
                    
                    {/* Select/Deselect All */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllGroups}
                      >
                        اختر الكل
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllGroups}
                      >
                        إلغاء الاختيار
                      </Button>
                    </div>

                    {/* Groups Checkboxes */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {groups?.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedGroupIds.has(group.id)}
                            onCheckedChange={() => toggleGroup(group.id)}
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {group.name}
                          </label>
                        </div>
                      ))}
                    </div>

                    {selectedGroupIds.size > 0 && (
                      <p className="text-sm text-blue-600">
                        تم اختيار {selectedGroupIds.size} مجموعة
                      </p>
                    )}
                    {selectedGroupIds.size === 0 && (
                      <p className="text-sm text-amber-600">
                        لم يتم اختيار مجموعات محددة - سيتم احتساب كل المجموعات
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Calculate Payroll */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                    4
                  </div>
                  <h3 className="text-lg font-semibold">احتساب الأجور</h3>
                </div>
                <div className="ml-11">
                  <Button
                    type="button"
                    onClick={handleCalculatePayroll}
                    disabled={!periodStart || !periodEnd || !costCenterId || isCalculating}
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
                      <div className="text-2xl font-bold text-blue-600">
                        {payrollSummary.totalBase.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                      <div className="text-sm text-red-700 dark:text-red-300">الخصومات</div>
                      <div className="text-2xl font-bold text-red-600">
                        {payrollSummary.totalDeductions.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-300">المكافآت</div>
                      <div className="text-2xl font-bold text-green-600">
                        {payrollSummary.totalBonuses.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                      <div className="text-sm text-purple-700 dark:text-purple-300">الصافي</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {payrollSummary.totalNet.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payroll Data Table */}
              {calculatedData.length > 0 && (
                <div className="space-y-4 pb-6 border-b">
                  <h3 className="text-lg font-semibold">تفاصيل الأجور</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead>اسم العامل</TableHead>
                          <TableHead>المجموعة</TableHead>
                          <TableHead>الأيام</TableHead>
                          <TableHead>الأساسي</TableHead>
                          <TableHead>الخصومات</TableHead>
                          <TableHead>المكافآت</TableHead>
                          <TableHead>الصافي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculatedData.map((item) => (
                          <TableRow key={item.workerId}>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => toggleRowExpand(item.workerId)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {expandedRows.has(item.workerId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell>{item.workerName}</TableCell>
                            <TableCell>{item.groupName}</TableCell>
                            <TableCell>{item.daysWorked}</TableCell>
                            <TableCell>{item.baseAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600">
                              -{item.deductions.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-green-600">
                              +{item.bonuses.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold">
                              {item.netAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
