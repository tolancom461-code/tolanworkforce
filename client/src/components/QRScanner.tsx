import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, 
  CameraOff, 
  RefreshCw,
  SwitchCamera,
  AlertCircle
} from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  width?: number;
  height?: number;
}

export default function QRScanner({ 
  onScan, 
  onError,
  width = 300,
  height = 350 
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initialize camera permission and start scanning automatically
    initializeCamera();

    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, []);

  const initializeCamera = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      // Request camera permission explicitly with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Keep the stream active briefly to ensure permission is granted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      if (!mountedRef.current) return;
      
      // Now get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        setCameras(devices);
        setHasPermission(true);
        
        // Prefer back camera on mobile
        const backCameraIndex = devices.findIndex(
          (d) => d.label.toLowerCase().includes('back') || 
                 d.label.toLowerCase().includes('rear') ||
                 d.label.toLowerCase().includes('environment') ||
                 d.label.toLowerCase().includes('خلفية')
        );
        
        const selectedIndex = backCameraIndex !== -1 ? backCameraIndex : 0;
        setCurrentCameraIndex(selectedIndex);
        
        // Auto-start scanning
        setTimeout(() => {
          if (mountedRef.current) {
            startScanningWithCamera(devices[selectedIndex].id);
          }
        }, 500);
      } else {
        setHasPermission(false);
        setError('لم يتم العثور على كاميرا على هذا الجهاز');
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      
      if (!mountedRef.current) return;
      
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('تم رفض الوصول للكاميرا. يرجى السماح بالوصول للكاميرا من إعدادات المتصفح');
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على كاميرا على هذا الجهاز');
      } else if (err.name === 'NotReadableError') {
        setError('الكاميرا قيد الاستخدام من قبل تطبيق آخر. يرجى إغلاق التطبيقات الأخرى');
      } else {
        setError(`خطأ في الوصول للكاميرا: ${err.message || 'غير معروف'}`);
      }
      
      onError?.(error || 'Camera permission denied');
    } finally {
      initializingRef.current = false;
    }
  };

  const startScanningWithCamera = async (cameraId: string) => {
    try {
      setError(null);
      
      // Check if DOM element exists
      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        console.error('QR reader element not found');
        setError('عنصر القارئ غير موجود. يرجى إعادة المحاولة');
        return;
      }
      
      // Create scanner if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader', {
          verbose: false,
          formatsToSupport: undefined // Support all formats
        });
      }

      const scanner = scannerRef.current;
      
      // Check if already scanning
      const currentState = scanner.getState();
      if (currentState === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
        // Wait a bit before restarting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!mountedRef.current) return;

      // Start scanning with optimized config
      await scanner.start(
        cameraId,
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
          aspectRatio: 1.0,
          disableFlip: false, // Allow flipping for better detection
        },
        (decodedText) => {
          // Success callback
          console.log('QR Code detected:', decodedText);
          onScan(decodedText);
        },
        (errorMessage) => {
          // Error callback - ignore continuous scanning errors
          // These are normal when no QR code is in view
        }
      );

      if (mountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error('Scanner start error:', err);
      
      if (!mountedRef.current) return;
      
      let errorMsg = 'فشل في تشغيل الكاميرا';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'تم رفض الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'الكاميرا قيد الاستخدام من قبل تطبيق آخر';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'إعدادات الكاميرا غير مدعومة. جرب كاميرا أخرى';
      } else if (err.message) {
        errorMsg = `خطأ: ${err.message}`;
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    if (cameras.length > 0) {
      startScanningWithCamera(cameras[currentCameraIndex].id);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      }
      if (mountedRef.current) {
        setIsScanning(false);
      }
    } catch (err) {
      console.error('Scanner stop error:', err);
    }
  };

  const cleanupScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        // Clear scanner and remove from DOM
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      // Clean up any remaining video elements
      const readerElement = document.getElementById('qr-reader');
      if (readerElement) {
        readerElement.innerHTML = '';
      }
    } catch (err) {
      console.error('Scanner cleanup error:', err);
      // Force cleanup even if error occurs
      try {
        const readerElement = document.getElementById('qr-reader');
        if (readerElement) {
          readerElement.innerHTML = '';
        }
      } catch {}
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    await stopScanning();
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Small delay before restarting
    setTimeout(() => {
      if (mountedRef.current) {
        startScanningWithCamera(cameras[nextIndex].id);
      }
    }, 500);
  };

  const retryPermission = () => {
    initializingRef.current = false;
    setHasPermission(null);
    setError(null);
    setCameras([]);
    initializeCamera();
  };

  if (hasPermission === null) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">جاري طلب الوصول للكاميرا...</p>
          <p className="text-xs text-muted-foreground mt-1">
            يرجى السماح بالوصول للكاميرا عند ظهور الرسالة
          </p>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="mt-2 text-destructive font-medium">لا يمكن الوصول للكاميرا</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error || 'يرجى السماح بالوصول للكاميرا من إعدادات المتصفح'}
          </p>
          <div className="mt-4 space-y-2">
            <Button 
              variant="default" 
              onClick={retryPermission}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
            <div className="text-xs text-muted-foreground text-right p-3 bg-muted rounded-md">
              <p className="font-medium mb-2">خطوات الحل:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>اضغط على أيقونة القفل/الكاميرا في شريط العنوان</li>
                <li>اختر "السماح" للكاميرا</li>
                <li>أعد تحميل الصفحة أو اضغط "إعادة المحاولة"</li>
              </ol>
              <p className="mt-2 text-xs">
                <strong>ملاحظة:</strong> إذا كانت الكاميرا تعمل ولكن الشاشة سوداء، جرب:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>إغلاق التطبيقات الأخرى التي تستخدم الكاميرا</li>
                <li>تبديل الكاميرا (إذا كان لديك أكثر من كاميرا)</li>
                <li>إعادة تشغيل المتصفح</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scanner Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="relative bg-black"
            style={{ minHeight: height }}
          >
            {/* QR Reader Element - Always visible when scanning */}
            <div 
              id="qr-reader" 
              className="w-full"
            />
            
            {/* Placeholder when not scanning */}
            {!isScanning && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-muted"
              >
                <Camera className="h-16 w-16 text-muted-foreground opacity-50" />
                <p className="mt-4 text-muted-foreground">
                  {cameras.length > 0 ? 'اضغط على زر التشغيل لبدء المسح' : 'جاري تحميل الكاميرا...'}
                </p>
              </div>
            )}

            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="border-2 border-primary rounded-lg relative"
                    style={{ width: 250, height: 250 }}
                  >
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </div>
                </div>
                {/* Scanning indicator */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  جاري المسح...
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-center text-sm">
          <AlertCircle className="h-4 w-4 inline ml-1" />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <Button onClick={startScanning} size="lg" className="gap-2">
            <Camera className="h-5 w-5" />
            تشغيل الكاميرا
          </Button>
        ) : (
          <>
            <Button onClick={stopScanning} variant="destructive" size="lg" className="gap-2">
              <CameraOff className="h-5 w-5" />
              إيقاف
            </Button>
            {cameras.length > 1 && (
              <Button onClick={switchCamera} variant="outline" size="lg" className="gap-2">
                <SwitchCamera className="h-5 w-5" />
                تبديل ({cameras.length})
              </Button>
            )}
          </>
        )}
      </div>

      {/* Camera Info */}
      {cameras.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          الكاميرا: {cameras[currentCameraIndex]?.label || 'غير معروف'}
          {cameras.length > 1 && ` (${currentCameraIndex + 1}/${cameras.length})`}
        </p>
      )}
    </div>
  );
}
