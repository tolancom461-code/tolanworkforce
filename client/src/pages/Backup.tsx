import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HardDrive,
  Download,
  FileSpreadsheet,
  Database,
  FileText,
  Clock,
  CheckCircle2,
  Shield,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Backup() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("excel");

  // Queries
  const { data: tableInfo, isLoading: tablesLoading, refetch: refetchTables } = trpc.backup.getTableInfo.useQuery();
  const { data: backupHistory, refetch: refetchHistory } = trpc.backup.getHistory.useQuery();

  // Mutations
  const exportExcelMutation = trpc.backup.exportExcel.useMutation({
    onSuccess: (data) => {
      if (data.base64 && data.filename) {
        downloadBase64File(
          data.base64,
          data.filename,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        toast.success("تم تحميل النسخة الاحتياطية بنجاح", {
          description: data.filename,
        });
        refetchHistory();
      }
    },
    onError: (err) => {
      toast.error("خطأ في التصدير", { description: err.message });
    },
  });

  const exportSqlMutation = trpc.backup.exportSql.useMutation({
    onSuccess: (data) => {
      if (data.base64 && data.filename) {
        downloadBase64File(data.base64, data.filename, "application/sql");
        toast.success("تم تحميل النسخة الاحتياطية بنجاح", {
          description: data.filename,
        });
        refetchHistory();
      }
    },
    onError: (err) => {
      toast.error("خطأ في التصدير", { description: err.message });
    },
  });

  const exportCsvMutation = trpc.backup.exportCsv.useMutation({
    onSuccess: (data) => {
      if (data.base64 && data.filename) {
        downloadBase64File(data.base64, data.filename, "text/csv");
        toast.success("تم تحميل الملف بنجاح", {
          description: data.filename,
        });
        refetchHistory();
      }
    },
    onError: (err) => {
      toast.error("خطأ في التصدير", { description: err.message });
    },
  });

  const handleSelectAll = () => {
    if (!tableInfo) return;
    if (selectedTables.length === tableInfo.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tableInfo.map((t: any) => t.name));
    }
  };

  const handleToggleTable = (name: string) => {
    setSelectedTables((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleExportExcel = () => {
    if (selectedTables.length === 0) {
      toast.error("يرجى اختيار جدول واحد على الأقل");
      return;
    }
    exportExcelMutation.mutate({ tableNames: selectedTables });
  };

  const handleExportSql = () => {
    exportSqlMutation.mutate();
  };

  const handleExportCsv = (tableName: string) => {
    exportCsvMutation.mutate({ tableName });
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExporting =
    exportExcelMutation.isPending ||
    exportSqlMutation.isPending ||
    exportCsvMutation.isPending;

  const totalRows = (tableInfo || []).reduce(
    (sum: number, t: any) => sum + (t.rowCount || 0),
    0
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">النسخ الاحتياطي</h1>
            <p className="text-sm text-muted-foreground">
              إنشاء نسخ احتياطية وتحميلها على جهازك المحلي
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            وصول مقيد
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{(tableInfo || []).length}</p>
                <p className="text-xs text-muted-foreground">جدول بيانات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalRows.toLocaleString("ar-SA")}</p>
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{selectedTables.length}</p>
                <p className="text-xs text-muted-foreground">جدول محدد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(backupHistory || []).length}
                </p>
                <p className="text-xs text-muted-foreground">عمليات نسخ سابقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </TabsTrigger>
          <TabsTrigger value="sql" className="gap-2">
            <Database className="h-4 w-4" />
            نسخة SQL كاملة
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            سجل النسخ
          </TabsTrigger>
        </TabsList>

        {/* Excel Export Tab */}
        <TabsContent value="excel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                تصدير بيانات مختارة (Excel)
              </CardTitle>
              <CardDescription>
                اختر الجداول التي تريد تصديرها كملف Excel. كل جدول سيكون في ورقة منفصلة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tablesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  جاري تحميل معلومات الجداول...
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          tableInfo &&
                          selectedTables.length === tableInfo.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">تحديد الكل</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchTables()}
                        className="gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        تحديث
                      </Button>
                      <Button
                        onClick={handleExportExcel}
                        disabled={
                          selectedTables.length === 0 || isExporting
                        }
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        {exportExcelMutation.isPending
                          ? "جاري التصدير..."
                          : `تصدير Excel (${selectedTables.length} جدول)`}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12"></TableHead>
                          <TableHead className="text-right">
                            اسم الجدول
                          </TableHead>
                          <TableHead className="text-right">
                            عدد السجلات
                          </TableHead>
                          <TableHead className="text-right">
                            تصدير CSV
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tableInfo || []).map((t: any) => (
                          <TableRow key={t.name}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTables.includes(t.name)}
                                onCheckedChange={() =>
                                  handleToggleTable(t.name)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{t.label}</span>
                                <span className="text-xs text-muted-foreground mr-2">
                                  ({t.name})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {t.rowCount.toLocaleString("ar-SA")} سجل
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-blue-600 hover:text-blue-700"
                                onClick={() => handleExportCsv(t.name)}
                                disabled={t.rowCount === 0 || isExporting}
                              >
                                <FileText className="h-3 w-3" />
                                CSV
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SQL Dump Tab */}
        <TabsContent value="sql" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                نسخة احتياطية كاملة (SQL)
              </CardTitle>
              <CardDescription>
                تصدير جميع بيانات قاعدة البيانات كملف SQL يمكن استخدامه لاستعادة البيانات لاحقاً.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center space-y-4">
                <Database className="h-16 w-16 text-blue-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">
                    نسخة احتياطية كاملة لقاعدة البيانات
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    يتم تصدير جميع الجداول والبيانات في ملف SQL واحد
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                    <p className="font-bold text-blue-600">
                      {(tableInfo || []).length}
                    </p>
                    <p className="text-muted-foreground">جدول</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                    <p className="font-bold text-blue-600">
                      {totalRows.toLocaleString("ar-SA")}
                    </p>
                    <p className="text-muted-foreground">سجل</p>
                  </div>
                </div>
                <Button
                  onClick={handleExportSql}
                  disabled={isExporting}
                  size="lg"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-5 w-5" />
                  {exportSqlMutation.isPending
                    ? "جاري إنشاء النسخة..."
                    : "تحميل نسخة SQL كاملة"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">معلومات مهمة</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    ملف SQL يحتوي على جميع البيانات بصيغة INSERT INTO
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    يمكن استخدام الملف لاستعادة البيانات في أي قاعدة بيانات MySQL
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    يُنصح بعمل نسخة احتياطية دورية وحفظها في مكان آمن
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>
                    الملف يحتوي على بيانات حساسة - يرجى حفظه بشكل آمن
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  سجل عمليات النسخ الاحتياطي
                </CardTitle>
                <CardDescription>
                  جميع عمليات النسخ الاحتياطي التي تمت سابقاً
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                تحديث
              </Button>
            </CardHeader>
            <CardContent>
              {!backupHistory || backupHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد عمليات نسخ احتياطي سابقة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">
                          نوع النسخة
                        </TableHead>
                        <TableHead className="text-right">التفاصيل</TableHead>
                        <TableHead className="text-right">بواسطة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupHistory.map((h: any, idx: number) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                h.details?.type === "excel"
                                  ? "border-green-300 text-green-700"
                                  : h.details?.type === "sql"
                                  ? "border-blue-300 text-blue-700"
                                  : "border-gray-300 text-gray-700"
                              }
                            >
                              {h.details?.type === "excel" && (
                                <FileSpreadsheet className="h-3 w-3 ml-1" />
                              )}
                              {h.details?.type === "sql" && (
                                <Database className="h-3 w-3 ml-1" />
                              )}
                              {h.details?.type === "csv" && (
                                <FileText className="h-3 w-3 ml-1" />
                              )}
                              {h.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.details?.type === "excel" &&
                              h.details?.tables && (
                                <span>
                                  {h.details.tables.length} جدول
                                </span>
                              )}
                            {h.details?.type === "csv" &&
                              h.details?.table && (
                                <span>جدول: {h.details.table}</span>
                              )}
                            {h.details?.type === "sql" && (
                              <span>نسخة كاملة</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.userName || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(h.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
