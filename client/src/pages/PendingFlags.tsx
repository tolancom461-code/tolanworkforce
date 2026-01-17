import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

const FLAG_TYPES = [
  { value: "emergency_call", label: "استدعاء طارئ (اعتماد يوم كامل)", icon: "🚨", action: "daily-override" },
  { value: "justified_late", label: "تأخير مبرر", icon: "⏰", action: "attendance-adjust" },
  { value: "justified_early_leave", label: "خروج مبكر مبرر", icon: "🚪", action: "attendance-adjust" },
  { value: "justified_absence", label: "غياب مبرر", icon: "📅", action: "pay-override" },
  { value: "proposed_deduction", label: "خصم مقترح", icon: "💰", action: "finance-entry" },
  { value: "proposed_bonus", label: "إضافة مقترحة", icon: "💵", action: "finance-entry" },
  { value: "general_report", label: "بلاغ عام", icon: "📝", action: "manual" },
];

export default function PendingFlags() {
  const [, navigate] = useLocation();
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Queries
  const { data: pendingFlags = [], refetch } = trpc.operationalFlags.list.useQuery({
    status: "PENDING_ADMIN_ACTION",
  });

  // Mutations
  const resolveMutation = trpc.operationalFlags.resolve.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ الإجراء بنجاح");
      setIsResolveDialogOpen(false);
      setSelectedFlag(null);
      setResolutionNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(`فشل تنفيذ الإجراء: ${error.message}`);
    },
  });

  const ignoreMutation = trpc.operationalFlags.ignore.useMutation({
    onSuccess: () => {
      toast.success("تم تجاهل البلاغ");
      setIsIgnoreDialogOpen(false);
      setSelectedFlag(null);
      setResolutionNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(`فشل تجاهل البلاغ: ${error.message}`);
    },
  });

  const getFlagTypeInfo = (type: string) => {
    return FLAG_TYPES.find(t => t.value === type) || FLAG_TYPES[FLAG_TYPES.length - 1];
  };

  const handleExecuteAction = (flag: any) => {
    const typeInfo = getFlagTypeInfo(flag.flagType);
    
    // Navigate to appropriate screen based on flag type
    switch (typeInfo.action) {
      case "daily-override":
        // Navigate to payroll batch details (if exists) or show message
        toast.info("يرجى فتح مسودة الرواتب المناسبة واستخدام زر 'تفاصيل الأيام' للعامل");
        break;
      
      case "attendance-adjust":
        navigate("/attendance/daily-management");
        toast.info(`تم فتح شاشة تعديل الحضور. ابحث عن العامل: ${flag.workerName}`);
        break;
      
      case "pay-override":
        navigate("/finance/overrides");
        toast.info(`تم فتح شاشة الاستثناءات. أضف استثناء للعامل: ${flag.workerName}`);
        break;
      
      case "finance-entry":
        navigate("/finance/entry");
        toast.info(`تم فتح شاشة الإدخال المالي. أضف ${flag.flagType === 'proposed_deduction' ? 'خصم' : 'إضافة'} للعامل: ${flag.workerName}`);
        break;
      
      case "manual":
        setSelectedFlag(flag);
        setIsResolveDialogOpen(true);
        break;
    }
    
    // Mark as resolved after navigation
    if (typeInfo.action !== "manual") {
      setTimeout(() => {
        setSelectedFlag(flag);
        setIsResolveDialogOpen(true);
      }, 2000);
    }
  };

  const handleResolve = () => {
    if (!selectedFlag) return;
    
    const typeInfo = getFlagTypeInfo(selectedFlag.flagType);
    resolveMutation.mutate({
      id: selectedFlag.id,
      action: `تم تنفيذ إجراء: ${typeInfo.label}`,
      notes: resolutionNotes || undefined,
    });
  };

  const handleIgnore = () => {
    if (!selectedFlag) return;
    
    ignoreMutation.mutate({
      id: selectedFlag.id,
      notes: resolutionNotes || undefined,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8 text-yellow-500" />
          البلاغات بانتظار الإجراء
        </h1>
        <p className="text-muted-foreground mt-2">
          معالجة البلاغات التشغيلية المعلقة
        </p>
      </div>

      {/* Alert if no pending flags */}
      {pendingFlags.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            لا توجد بلاغات بانتظار الإجراء. جميع البلاغات تم معالجتها! ✅
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Flags Table */}
      {pendingFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>البلاغات المعلقة</CardTitle>
            <CardDescription>
              إجمالي البلاغات المعلقة: {pendingFlags.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">رقم البلاغ</TableHead>
                    <TableHead className="text-center">النوع</TableHead>
                    <TableHead className="text-center">العامل</TableHead>
                    <TableHead className="text-center">المجموعة</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">الوصف</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingFlags.map((flag) => {
                    const typeInfo = getFlagTypeInfo(flag.flagType);
                    
                    return (
                      <TableRow key={flag.id}>
                        <TableCell className="text-center font-mono">#{flag.id}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span>{typeInfo.icon}</span>
                            <span className="text-sm">{typeInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <div className="font-medium">{flag.workerName}</div>
                            <div className="text-xs text-muted-foreground">{flag.workerCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{flag.groupName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            {flag.flagDate ? String(flag.flagDate) : '-'}
                            {flag.endDate && (
                              <div className="text-xs text-muted-foreground">
                                إلى {String(flag.endDate)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center max-w-xs">
                          <div className="text-sm truncate" title={flag.description}>
                            {flag.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {flag.amount ? (
                            <Badge variant="outline">{parseFloat(flag.amount).toFixed(2)} ريال</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {flag.createdAt ? new Date(flag.createdAt).toLocaleString('ar-SA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          }) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleExecuteAction(flag)}
                              className="gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              تنفيذ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFlag(flag);
                                setIsIgnoreDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              تجاهل
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد تنفيذ الإجراء</DialogTitle>
            <DialogDescription>
              هل قمت بتنفيذ الإجراء المطلوب لهذا البلاغ؟
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="text-sm space-y-2">
                  <div><strong>البلاغ:</strong> {getFlagTypeInfo(selectedFlag.flagType).label}</div>
                  <div><strong>العامل:</strong> {selectedFlag.workerName}</div>
                  <div><strong>التاريخ:</strong> {String(selectedFlag.flagDate)}</div>
                  <div><strong>الوصف:</strong> {selectedFlag.description}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolutionNotes">ملاحظات التنفيذ (اختياري)</Label>
                <Textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول كيفية تنفيذ الإجراء..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsResolveDialogOpen(false);
              setResolutionNotes("");
            }}>
              إلغاء
            </Button>
            <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "جاري الحفظ..." : "تأكيد التنفيذ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Dialog */}
      <Dialog open={isIgnoreDialogOpen} onOpenChange={setIsIgnoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجاهل البلاغ</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من تجاهل هذا البلاغ؟
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تجاهل البلاغ يعني عدم تنفيذ أي إجراء. تأكد من أن البلاغ غير صحيح أو غير ضروري.
                </AlertDescription>
              </Alert>

              <div className="rounded-md bg-muted p-4">
                <div className="text-sm space-y-2">
                  <div><strong>البلاغ:</strong> {getFlagTypeInfo(selectedFlag.flagType).label}</div>
                  <div><strong>العامل:</strong> {selectedFlag.workerName}</div>
                  <div><strong>الوصف:</strong> {selectedFlag.description}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ignoreNotes">سبب التجاهل (اختياري)</Label>
                <Textarea
                  id="ignoreNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="اشرح سبب تجاهل هذا البلاغ..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsIgnoreDialogOpen(false);
              setResolutionNotes("");
            }}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleIgnore} disabled={ignoreMutation.isPending}>
              {ignoreMutation.isPending ? "جاري الحفظ..." : "تأكيد التجاهل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
