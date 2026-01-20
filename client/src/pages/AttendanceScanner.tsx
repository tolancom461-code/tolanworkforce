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
  RefreshCw,
  Users,
  IdCard,
  Briefcase
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRScanner from '@/components/QRScanner';

export default function AttendanceScanner() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [workerData, setWorkerData] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Play success beep sound
  const playSuccessBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure beep sound
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      // Play
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Failed to play beep:', error);
    }
  };
  
  const utils = trpc.useUtils();
  const confirmAttendanceMutation = trpc.attendance.confirmAttendance.useMutation();
  const { data: stats, refetch: refetchStats } = trpc.attendance.stats.useQuery({});
  
  // Focus on input when in manual mode
  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);
  
  const handleQRScan = async (qrData: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Fetch worker data using tRPC
      const result = await utils.attendance.getWorkerFromQR.fetch({ qrToken: qrData });
      
      if (!result || !result.worker) {
        throw new Error('رمز QR غير صالح أو غير موجود');
      }
      
      setWorkerData(result);
      setShowConfirmDialog(true);
      
      // Play success beep
      playSuccessBeep();
      
      // Show success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'رمز QR غير صالح');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleManualEntry = async () => {
    if (!manualCode.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Fetch worker data by code using tRPC
      const result = await utils.attendance.getWorkerByCode.fetch({ code: manualCode.trim() });
      
      if (!result || !result.worker) {
        throw new Error('رمز العامل غير صالح أو غير موجود');
      }
      
      setWorkerData(result);
      setShowConfirmDialog(true);
      setManualCode(''); // Clear input
      
      // Play success beep
      playSuccessBeep();
      
      // Show success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'رمز العامل غير صالح');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmAttendance = async () => {
    if (!workerData) return;
    
    setIsProcessing(true);
    try {
      const result = await confirmAttendanceMutation.mutateAsync({
        workerId: workerData.worker.id,
        eventType: workerData.nextEventType,
      });
      
      setLastResult({
        success: true,
        worker: workerData.worker,
        eventType: workerData.nextEventType,
        timestamp: new Date(),
      });
      
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      refetchStats();
      
      const eventText = workerData.nextEventType === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف';
      toast.success(`${eventText} - ${workerData.worker.fullName}`);
      
      // Play success beep
      playSuccessBeep();
      
      // Auto-close success dialog and reset
      setTimeout(() => {
        setShowSuccessDialog(false);
        setWorkerData(null);
        setLastResult(null);
      }, 3000);
      
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setWorkerData(null);
  };
  
  const getEventTypeLabel = (eventType: string) => {
    return eventType === 'check_in' ? 'حضور' : 'انصراف';
  };
  
  const getEventTypeIcon = (eventType: string) => {
    return eventType === 'check_in' ? (
      <ArrowRightCircle className="h-12 w-12 text-green-600" />
    ) : (
      <ArrowLeftCircle className="h-12 w-12 text-blue-600" />
    );
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
        
        {/* Scanner Area */}
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
                  إدخال الرمز اليدوي
                </>
              )}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'qr' 
                ? 'وجّه الكاميرا نحو رمز QR الخاص بالعامل'
                : 'أدخل رمز العامل اليدوي (الموجود على البطاقة)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mode === 'qr' ? (
                <>
                  {/* QR Scanner Component */}
                  <div className="relative">
                    <QRScanner 
                      onScan={handleQRScan}
                      onError={(error) => toast.error(error)}
                      height={350}
                    />
                    
                    {/* Success Animation Overlay */}
                    {showSuccessAnimation && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-lg z-50 animate-in fade-in duration-200">
                        <div className="animate-in zoom-in duration-500">
                          <CheckCircle2 className="h-32 w-32 text-green-500 drop-shadow-2xl animate-pulse" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Manual Input */}
                  <div className="space-y-4 py-8">
                    <div className="flex items-center justify-center">
                      <IdCard className="h-24 w-24 text-gray-400" />
                    </div>
                    <div className="max-w-md mx-auto space-y-4">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="أدخل رمز العامل (مثال: W001)"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manualCode.trim()) {
                            handleManualEntry();
                          }
                        }}
                        className="text-center text-2xl font-mono h-16"
                        disabled={isProcessing}
                      />
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={handleManualEntry}
                        disabled={!manualCode.trim() || isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin ml-2" />
                            جاري البحث...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 ml-2" />
                            تأكيد
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              {/* Processing Indicator */}
              {isProcessing && !showConfirmDialog && mode === 'qr' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">جاري معالجة الرمز...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">تأكيد {workerData && getEventTypeLabel(workerData.nextEventType)}</DialogTitle>
            <DialogDescription className="text-center">
              يرجى التحقق من بيانات العامل قبل التأكيد
            </DialogDescription>
          </DialogHeader>
          
          {workerData && (
            <div className="space-y-6 py-4">
              {/* Event Type Icon */}
              <div className="flex justify-center">
                {getEventTypeIcon(workerData.nextEventType)}
              </div>
              
              {/* Worker Info */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">اسم العامل</div>
                    <div className="font-semibold text-lg">{workerData.worker.fullName}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <IdCard className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">رقم الهوية</div>
                    <div className="font-semibold">{workerData.worker.nationalId || workerData.worker.code}</div>
                  </div>
                </div>
                
                {workerData.worker.groupName && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">المجموعة</div>
                      <div className="font-semibold">{workerData.worker.groupName}</div>
                    </div>
                  </div>
                )}
                
                {workerData.worker.jobTitle && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">المسمى الوظيفي</div>
                      <div className="font-semibold">{workerData.worker.jobTitle}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">الوقت الحالي</div>
                    <div className="font-semibold">{new Date().toLocaleTimeString('ar-SA')}</div>
                  </div>
                </div>
              </div>
              
              {/* Today's Events */}
              {workerData.todayEvents && workerData.todayEvents.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="text-sm font-semibold mb-2">سجل اليوم:</div>
                  <div className="space-y-1 text-sm">                    {workerData.todayEvents?.map((event: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{event.eventType === 'check_in' ? '✓ حضور' : '✗ انصراف'}</span>
                        <span>{new Date(event.eventTime).toLocaleTimeString('ar-SA')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={handleCancelConfirm}
                  disabled={isProcessing}
                >
                  <XCircle className="h-5 w-5 ml-2" />
                  إلغاء
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleConfirmAttendance}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin ml-2" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 ml-2" />
                      تأكيد {getEventTypeLabel(workerData.nextEventType)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-4 py-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-20 w-20 text-green-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">
                تم التسجيل بنجاح!
              </h3>
              {lastResult && (
                <>
                  <p className="text-lg font-semibold">{lastResult.worker?.fullName}</p>
                  <p className="text-muted-foreground">
                    {lastResult.eventType === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {new Date().toLocaleTimeString('ar-SA')}
                  </p>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
