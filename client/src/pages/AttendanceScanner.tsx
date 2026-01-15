import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  QrCode, 
  Keyboard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  ArrowLeftCircle,
  ArrowRightCircle,
  Loader2,
  Camera,
  RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRScanner from '@/components/QRScanner';

export default function AttendanceScanner() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    worker?: { fullName: string; code: string; photoUrl?: string | null };
    eventType?: string;
    timestamp?: Date;
  } | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const scanQRMutation = trpc.attendance.scanQR.useMutation();
  const manualEntryMutation = trpc.attendance.manualEntry.useMutation();
  const { data: stats, refetch: refetchStats } = trpc.attendance.stats.useQuery({});
  
  // Focus on input when in manual mode
  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);
  
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await manualEntryMutation.mutateAsync({ code: manualCode.trim() });
      setLastResult({
        success: true,
        worker: result.worker as any,
        eventType: result.eventType as string,
        timestamp: new Date(),
      });
      setShowResultDialog(true);
      setManualCode('');
      refetchStats();
      
      const eventText = result.eventType === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف';
      toast.success(`${eventText} - ${result.worker?.fullName}`);
      
      // Auto-close dialog after 3 seconds
      setTimeout(() => {
        setShowResultDialog(false);
        inputRef.current?.focus();
      }, 3000);
    } catch (error: any) {
      setLastResult({ success: false });
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleQRScan = async (qrData: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await scanQRMutation.mutateAsync({ qrToken: qrData });
      setLastResult({
        success: true,
        worker: result.worker as any,
        eventType: result.eventType as string,
        timestamp: new Date(),
      });
      setShowResultDialog(true);
      refetchStats();
      
      const eventText = result.eventType === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف';
      toast.success(`${eventText} - ${result.worker?.fullName}`);
      
      setTimeout(() => {
        setShowResultDialog(false);
      }, 3000);
    } catch (error: any) {
      setLastResult({ success: false });
      toast.error(error.message || 'رمز QR غير صالح');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            نظام تسجيل الحضور
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            مسح رمز QR أو إدخال الرمز اليدوي
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalWorkers || 0}</div>
              <div className="text-sm text-gray-500">إجمالي العمال</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.presentToday || 0}</div>
              <div className="text-sm text-gray-500">حاضرون اليوم</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.absentToday || 0}</div>
              <div className="text-sm text-gray-500">غائبون</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats?.lateToday || 0}</div>
              <div className="text-sm text-gray-500">متأخرون</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Mode Selector */}
        <div className="flex justify-center gap-4">
          <Button
            variant={mode === 'qr' ? 'default' : 'outline'}
            size="lg"
            onClick={() => setMode('qr')}
            className="flex items-center gap-2"
          >
            <Camera className="h-5 w-5" />
            مسح QR بالكاميرا
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="lg"
            onClick={() => setMode('manual')}
            className="flex items-center gap-2"
          >
            <Keyboard className="h-5 w-5" />
            إدخال يدوي
          </Button>
        </div>
        
        {/* Scanner/Input Area */}
        <Card className="bg-white dark:bg-gray-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              {mode === 'qr' ? (
                <>
                  <Camera className="h-6 w-6" />
                  ماسح رمز QR
                </>
              ) : (
                <>
                  <Keyboard className="h-6 w-6" />
                  إدخال رمز العامل
                </>
              )}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'qr' 
                ? 'وجّه الكاميرا نحو رمز QR الخاص بالعامل'
                : 'أدخل رمز العامل أو رقم الهوية'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'manual' ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="أدخل رمز العامل..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="text-2xl text-center h-16 font-mono"
                    disabled={isProcessing}
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg"
                  disabled={!manualCode.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin ml-2" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 ml-2" />
                      تسجيل
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* QR Scanner Component */}
                <QRScanner 
                  onScan={handleQRScan}
                  onError={(error) => toast.error(error)}
                  height={350}
                />
                
                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">جاري معالجة الرمز...</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث الإحصائيات
          </Button>
        </div>
        
        {/* Instructions for Mobile */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              تعليمات الاستخدام
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>اضغط على "تشغيل الكاميرا" للبدء في مسح رموز QR</li>
              <li>وجّه الكاميرا نحو رمز QR الموجود على بطاقة العامل</li>
              <li>سيتم تسجيل الحضور/الانصراف تلقائياً عند قراءة الرمز</li>
              <li>يمكنك تبديل الكاميرا الأمامية/الخلفية إذا كان جهازك يدعم ذلك</li>
              <li>في حالة عدم عمل الكاميرا، استخدم الإدخال اليدوي</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {lastResult?.success ? (
                <div className="flex flex-col items-center gap-4">
                  {lastResult.eventType === 'check_in' ? (
                    <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <ArrowRightCircle className="h-12 w-12 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <ArrowLeftCircle className="h-12 w-12 text-orange-600" />
                    </div>
                  )}
                  <span className={lastResult.eventType === 'check_in' ? 'text-green-600' : 'text-orange-600'}>
                    {lastResult.eventType === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <span className="text-red-600">فشل التسجيل</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {lastResult?.success && lastResult.worker && (
            <div className="text-center space-y-4 py-4">
              {lastResult.worker.photoUrl ? (
                <img 
                  src={lastResult.worker.photoUrl} 
                  alt={lastResult.worker.fullName}
                  className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{lastResult.worker.fullName}</h3>
                <p className="text-gray-500 font-mono">{lastResult.worker.code}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{lastResult.timestamp?.toLocaleTimeString('ar-SA')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
