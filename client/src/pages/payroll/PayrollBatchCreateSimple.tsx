import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Link } from "wouter";

export default function PayrollBatchCreateSimple() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshFinanceRecords, setRefreshFinanceRecords] = useState(true); // ✅ تفعيل إعادة الحساب تلقائياً

  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: recentChanges } = trpc.groupSchedules.getRecentChanges.useQuery({ hoursThreshold: 24 });
  const { data: pendingFlagsCount } = (trpc as any).operationalDashboard?.getPendingCount?.useQuery?.() || { data: 0 };
  const hasPendingFlags = (pendingFlagsCount ?? 0) > 0;
  const aggregateMutation = trpc.payroll.aggregatePayrollDataByCostCenter.useMutation();
  const createBatchMutation = trpc.payroll.createBatch.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("=== Form submitted! ===");
    console.log("periodStart:", periodStart);
    console.log("periodEnd:", periodEnd);
    console.log("costCenterId:", costCenterId);

    if (!periodStart || !periodEnd || !costCenterId) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    
    // Check if groups in this cost center have schedules
    try {
      const groupsWithoutSchedules = await utils.groups.listWithoutSchedules.fetch();
      const selectedCostCenterGroups = groupsWithoutSchedules.filter(
        (g: any) => g.costCenterId === parseInt(costCenterId)
      );
      
      if (selectedCostCenterGroups.length > 0) {
        const groupNames = selectedCostCenterGroups.map((g: any) => g.name).join('، ');
        setError(
          `المجموعات التالية لا تحتوي على جدول أسبوعي: ${groupNames}. يرجى إضافة جداول أولاً من صفحة الورديات الأسبوعية.`
        );
        return;
      }
    } catch (err) {
      console.error("Error checking schedules:", err);
    }
    
    // Check for recent schedule changes
    if (recentChanges && recentChanges.length > 0) {
      const recentGroupNames = recentChanges.map((c: any) => {
        const hoursAgo = Math.round((Date.now() - new Date(c.lastModified).getTime()) / (1000 * 60 * 60));
        return `${c.groupName} (تم التعديل منذ ${hoursAgo} ساعة)`;
      }).join('، ');
      
      const confirmed = window.confirm(
        `⚠️ تنبيه: تم تعديل الجداول الأسبوعية للمجموعات التالية خلال آخر 24 ساعة:\n\n${recentGroupNames}\n\nهل أنت متأكد من أن البيانات صحيحة وتريد المتابعة؟`
      );
      
      if (!confirmed) {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("=== Calling aggregatePayrollData ===");
      const aggregateResult = await aggregateMutation.mutateAsync({
        periodStart,
        periodEnd,
        costCenterId: parseInt(costCenterId),
      });

      console.log("=== Aggregate result ===", aggregateResult);

      if (!aggregateResult || aggregateResult.length === 0) {
        setError("لم يتم العثور على بيانات أجور للفترة المحددة");
        setLoading(false);
        return;
      }

      console.log("=== Creating batch ===");
      const batch = await createBatchMutation.mutateAsync({
        periodStart,
        periodEnd,
        costCenterId: parseInt(costCenterId),
        refreshFinanceRecords,
        items: aggregateResult.map((item: any) => ({
          workerId: item.workerId,
          baseAmount: item.baseAmount,
          deductions: item.deductions,
          bonuses: item.bonuses,
          netAmount: item.netAmount,
          daysWorked: item.daysWorked || 0,
          notes: item.notes || undefined,
        })),
      });

      console.log("=== Batch created ===", batch);
      setSuccess(`تم إنشاء دفعة رواتب بنجاح! رقم الدفعة: ${batch.batchId}`);
      
      setTimeout(() => {
        setLocation(`/payroll/batches/${batch.batchId}`);
      }, 2000);
    } catch (err: any) {
      console.error("=== Error ===", err);
      setError(err.message || "حدث خطأ أثناء إنشاء دفعة الرواتب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        إنشاء دفعة رواتب جديدة
      </h1>

      {hasPendingFlags && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "#856404" }}>
            ⚠️ تنبيه: يوجد {pendingFlagsCount} ملاحظة تشغيلية معلقة
          </div>
          <p style={{ color: "#856404", margin: 0 }}>
            لا يمكن إنشاء دفعة رواتب قبل معالجة جميع الملاحظات التشغيلية المعلقة. يرجى مراجعتها واعتمادها أولاً.
          </p>
          <Link href="/operations/notes-review">
            <span
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#856404",
                color: "white",
                borderRadius: "4px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              الانتقال لمعالجات الملاحظات التشغيلية
            </span>
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#e3f2fd",
            border: "1px solid #2196f3",
            borderRadius: "8px",
            display: "flex",
            alignItems: "start",
            gap: "12px",
          }}
        >
          <input
            type="checkbox"
            id="refresh-finance"
            checked={refreshFinanceRecords}
            onChange={(e) => setRefreshFinanceRecords(e.target.checked)}
            style={{
              width: "20px",
              height: "20px",
              marginTop: "2px",
              cursor: "pointer",
            }}
          />
          <div style={{ flex: 1 }}>
            <label
              htmlFor="refresh-finance"
              style={{
                display: "block",
                fontWeight: "500",
                color: "#1976d2",
                cursor: "pointer",
                marginBottom: "4px",
              }}
            >
              تحديث السجلات المالية (الرواتب والورديات) بناءً على الإعدادات الحالية
            </label>
            <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
              سيتم إعادة حساب السجلات المالية غير المعتمدة فقط بناءً على أحدث رواتب وورديات في المجموعات
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="period-start" style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            من تاريخ
          </label>
          <input
            id="period-start"
            type="date"
            value={periodStart}
            onChange={(e) => {
              console.log("periodStart changed:", e.target.value);
              setPeriodStart(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="period-end" style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            إلى تاريخ
          </label>
          <input
            id="period-end"
            type="date"
            value={periodEnd}
            onChange={(e) => {
              console.log("periodEnd changed:", e.target.value);
              setPeriodEnd(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="cost-center" style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            مركز التكلفة
          </label>
          <select
            id="cost-center"
            value={costCenterId}
            onChange={(e) => {
              console.log("costCenterId changed:", e.target.value);
              setCostCenterId(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
            }}
            required
          >
            <option value="">اختر مركز التكلفة</option>
            {costCenters?.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "4px",
              color: "#c00",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#efe",
              border: "1px solid #cfc",
              borderRadius: "4px",
              color: "#0c0",
            }}
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          onClick={() => console.log("=== Button clicked! ===")}
          style={{
            padding: "12px 24px",
            backgroundColor: loading ? "#ccc" : "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "جاري الاحتساب..." : "احتساب وإنشاء دفعة رواتب"}
        </button>
      </form>
    </div>
  );
}
