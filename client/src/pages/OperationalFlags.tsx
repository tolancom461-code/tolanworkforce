import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, Plus, Calendar, User, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

const FLAG_TYPES = [
  { value: "emergency_call", label: "استدعاء طارئ (اعتماد يوم كامل)", icon: "🚨" },
  { value: "justified_late", label: "تأخير مبرر", icon: "⏰" },
  { value: "justified_early_leave", label: "خروج مبكر مبرر", icon: "🚪" },
  { value: "justified_absence", label: "غياب مبرر", icon: "📅" },
  { value: "proposed_deduction", label: "خصم مقترح", icon: "💰" },
  { value: "proposed_bonus", label: "إضافة مقترحة", icon: "💵" },
  { value: "general_report", label: "بلاغ عام", icon: "📝" },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_ADMIN_ACTION: { label: "بانتظار الإجراء", color: "bg-yellow-500", icon: Clock },
  RESOLVED: { label: "تم المعالجة", color: "bg-green-500", icon: CheckCircle2 },
  IGNORED: { label: "تم التجاهل", color: "bg-gray-500", icon: XCircle },
};

export default function OperationalFlags() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    flagType: "",
    groupId: "",
    workerId: "",
    flagDate: "",
    endDate: "",
    description: "",
    amount: "",
  });

  // Queries
  const { data: flags = [], refetch } = trpc.operationalFlags.list.useQuery({
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });
  
  const { data: groups = [] } = trpc.groups.list.useQuery();
  const { data: workers = [] } = trpc.workers.listByGroup.useQuery(
    { groupId: parseInt(formData.groupId) },
    { enabled: !!formData.groupId }
  );

  // Mutations
  const createMutation = trpc.operationalFlags.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء البلاغ بنجاح");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`فشل إنشاء البلاغ: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      flagType: "",
      groupId: "",
      workerId: "",
      flagDate: "",
      endDate: "",
      description: "",
      amount: "",
    });
  };

  const handleCreate = () => {
    if (!formData.flagType || !formData.workerId || !formData.flagDate || !formData.description) {
      toast.error("يرجى ملء جميع الحقول الإجبارية");
      return;
    }

    createMutation.mutate({
      flagType: formData.flagType as any,
      workerId: parseInt(formData.workerId),
      groupId: formData.groupId ? parseInt(formData.groupId) : undefined,
      flagDate: formData.flagDate,
      endDate: formData.endDate || undefined,
      description: formData.description,
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
    });
  };

  const getFlagTypeLabel = (type: string) => {
    return FLAG_TYPES.find(t => t.value === type)?.label || type;
  };

  const getFlagTypeIcon = (type: string) => {
    return FLAG_TYPES.find(t => t.value === type)?.icon || "📋";
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            نظام البلاغات التشغيلية
          </h1>
          <p className="text-muted-foreground mt-2">
            توثيق الحالات التشغيلية ومتابعة معالجتها
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              إنشاء بلاغ تشغيلي
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء بلاغ تشغيلي جديد</DialogTitle>
              <DialogDescription>
                قم بتوثيق الحالة التشغيلية. سيتم إرسال البلاغ إلى الشؤون الإدارية للمعالجة.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Flag Type */}
              <div className="space-y-2">
                <Label htmlFor="flagType">نوع البلاغ *</Label>
                <Select value={formData.flagType} onValueChange={(value) => setFormData({ ...formData, flagType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع البلاغ" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAG_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Group */}
              <div className="space-y-2">
                <Label htmlFor="groupId">المجموعة *</Label>
                <Select value={formData.groupId} onValueChange={(value) => setFormData({ ...formData, groupId: value, workerId: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المجموعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Worker */}
              <div className="space-y-2">
                <Label htmlFor="workerId">العامل *</Label>
                <Select 
                  value={formData.workerId} 
                  onValueChange={(value) => setFormData({ ...formData, workerId: value })}
                  disabled={!formData.groupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.groupId ? "اختر العامل" : "اختر المجموعة أولاً"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(worker => (
                      <SelectItem key={worker.id} value={worker.id.toString()}>
                        {worker.fullName} ({worker.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flagDate">التاريخ *</Label>
                  <Input
                    id="flagDate"
                    type="date"
                    value={formData.flagDate}
                    onChange={(e) => setFormData({ ...formData, flagDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">تاريخ الانتهاء (اختياري)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Amount (for deduction/bonus) */}
              {(formData.flagType === "proposed_deduction" || formData.flagType === "proposed_bonus") && (
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ (ريال)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">وصف مختصر *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اشرح الحالة التشغيلية بشكل مختصر..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ البلاغ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>حالة البلاغ</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع البلاغات</SelectItem>
                  <SelectItem value="PENDING_ADMIN_ACTION">بانتظار الإجراء</SelectItem>
                  <SelectItem value="RESOLVED">تم المعالجة</SelectItem>
                  <SelectItem value="IGNORED">تم التجاهل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle>البلاغات التشغيلية</CardTitle>
          <CardDescription>
            إجمالي البلاغات: {flags.length}
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
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">تاريخ الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      لا توجد بلاغات
                    </TableCell>
                  </TableRow>
                ) : (
                  flags.map((flag) => {
                    const statusInfo = STATUS_MAP[flag.status];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={flag.id}>
                        <TableCell className="text-center font-mono">#{flag.id}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span>{getFlagTypeIcon(flag.flagType)}</span>
                            <span className="text-sm">{getFlagTypeLabel(flag.flagType)}</span>
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
                          <Badge className={`${statusInfo.color} text-white gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {flag.createdAt ? new Date(flag.createdAt).toLocaleString('ar-SA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
