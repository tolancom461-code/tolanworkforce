import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ExcelImportExportDialogProps {
  type: 'groups' | 'workers';
  onImportSuccess?: () => void;
}

export function ExcelImportExportDialog({
  type,
  onImportSuccess,
}: ExcelImportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const utils = trpc.useUtils();

  // Import mutations
  const importGroupsMutation = trpc.excelImportExport.importGroups.useMutation();
  const importWorkersMutation = trpc.excelImportExport.importWorkers.useMutation();

  // Export queries
  const exportGroupsQuery = trpc.excelImportExport.exportGroups.useQuery(
    undefined,
    { enabled: false }
  );
  const exportWorkersQuery = trpc.excelImportExport.exportWorkers.useQuery(
    undefined,
    { enabled: false }
  );

  // Template queries
  const groupsTemplateQuery = trpc.excelImportExport.downloadGroupsTemplate.useQuery(
    undefined,
    { enabled: false }
  );
  const workersTemplateQuery = trpc.excelImportExport.downloadWorkersTemplate.useQuery(
    undefined,
    { enabled: false }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('يرجى اختيار ملف Excel (.xlsx أو .xls)');
        return;
      }
      setFile(selectedFile);
      setImportResults(null); // Reset results when selecting new file
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف Excel');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) {
          toast.error('فشل قراءة الملف');
          setImporting(false);
          return;
        }

        try {
          let result;
          if (type === 'groups') {
            result = await importGroupsMutation.mutateAsync({ fileData: base64 });
          } else {
            result = await importWorkersMutation.mutateAsync({ fileData: base64 });
          }

          setImportResults(result);

          // Show detailed results
          if (result.failed === 0) {
            toast.success(
              `✅ تم استيراد ${result.imported} ${type === 'groups' ? 'مجموعة' : 'عامل'} بنجاح!`
            );
            setFile(null);
            
            // Refresh data
            if (type === 'groups') {
              await utils.groups.listWithPagination.invalidate();
            } else {
              await utils.workers.listWithPagination.invalidate();
            }
            
            onImportSuccess?.();
            
            // Close dialog after 2 seconds
            setTimeout(() => {
              setOpen(false);
              setImportResults(null);
            }, 2000);
          } else {
            toast.warning(
              `⚠️ استيراد جزئي: تم استيراد ${result.imported} و فشل ${result.failed}`
            );
            
            // Still refresh data for successful imports
            if (type === 'groups') {
              await utils.groups.listWithPagination.invalidate();
            } else {
              await utils.workers.listWithPagination.invalidate();
            }
            
            onImportSuccess?.();
          }
        } catch (error: any) {
          const errorMsg = error.message || 'فشل استيراد الملف';
          toast.error(`❌ خطأ الاستيراد: ${errorMsg}`);
          setImportResults(null);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(`❌ خطأ: ${error.message || 'حدث خطأ أثناء الاستيراد'}`);
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const result =
        type === 'groups'
          ? await groupsTemplateQuery.refetch()
          : await workersTemplateQuery.refetch();

      if (result.data?.data) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data.data}`;
        link.download = result.data.filename;
        link.click();

        toast.success('✅ تم تحميل القالب بنجاح');
      }
    } catch (error: any) {
      toast.error(`❌ خطأ التحميل: ${error.message || 'فشل تحميل القالب'}`);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result =
        type === 'groups'
          ? await exportGroupsQuery.refetch()
          : await exportWorkersQuery.refetch();

      if (result.data?.data) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data.data}`;
        link.download = result.data.filename;
        link.click();

        toast.success('✅ تم تصدير البيانات بنجاح');
      }
    } catch (error: any) {
      toast.error(`❌ خطأ التصدير: ${error.message || 'فشل تصدير البيانات'}`);
    } finally {
      setExporting(false);
    }
  };

  const typeLabel = type === 'groups' ? 'المجموعات' : 'العمال';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          استيراد/تصدير Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>استيراد وتصدير {typeLabel}</DialogTitle>
          <DialogDescription>
            قم باستيراد أو تصدير بيانات {typeLabel} من/إلى ملفات Excel
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              استيراد
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              تصدير
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>نصيحة:</strong> قم بتحميل قالب Excel أولاً لمعرفة تنسيق البيانات المطلوب
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">اختر ملف Excel</label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                {file && (
                  <p className="text-sm text-green-600 font-medium">
                    ✓ تم اختيار: {file.name}
                  </p>
                )}
              </div>

              {importResults && (
                <div className={`space-y-3 p-4 rounded-lg border-2 ${
                  importResults.failed === 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {importResults.failed === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    )}
                    <span className={`font-bold ${
                      importResults.failed === 0 ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      تم استيراد {importResults.imported} و فشل {importResults.failed}
                    </span>
                  </div>

                  {importResults.results && importResults.results.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-2 mt-3 pt-3 border-t-2 border-current border-opacity-20">
                      {importResults.results.map((result: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          {result.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                              {result.name}
                            </span>
                            {result.error && (
                              <p className="text-xs text-red-700 mt-1">
                                السبب: {result.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={importing}
                >
                  <Download className="w-4 h-4 mr-2" />
                  تحميل القالب
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      استيراد الآن
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  📊 <strong>ملاحظة:</strong> سيتم تصدير جميع {typeLabel} الموجودة في النظام
                </p>
              </div>

              <p className="text-sm text-gray-600">
                انقر على الزر أدناه لتحميل ملف Excel يحتوي على جميع بيانات {typeLabel}
              </p>

              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    تصدير {typeLabel} إلى Excel
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
