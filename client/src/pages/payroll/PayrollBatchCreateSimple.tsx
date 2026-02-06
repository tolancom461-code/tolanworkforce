import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function PayrollBatchCreateSimple() {
  const [, setLocation] = useLocation();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: costCenters } = trpc.costCenters.list.useQuery();
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
        items: aggregateResult.map((item) => ({
          workerId: item.workerId,
          baseAmount: item.baseAmount,
          deductions: item.deductions,
          bonuses: item.bonuses,
          netAmount: item.netAmount,
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

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
