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
  height = 300 
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    // Request camera permission explicitly
    requestCameraPermission();

    return () => {
      stopScanning();
    };
  }, []);

  const requestCameraPermission = async () => {
    if (permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;

    try {
      // First, request permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera on mobile
        } 
      });
      
      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      
      // Now get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        setCameras(devices);
        setHasPermission(true);
        
        // Prefer back camera on mobile
        const backCameraIndex = devices.findIndex(
          (d) => d.label.toLowerCase().includes('back') || 
                 d.label.toLowerCase().includes('rear') ||
                 d.label.toLowerCase().includes('environment')
        );
        
        if (backCameraIndex !== -1) {
          setCurrentCameraIndex(backCameraIndex);
        }
      } else {
        setHasPermission(false);
        setError('لم يتم العثور على كاميرا');
      }
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('تم رفض الوصول للكاميرا. يرجى السماح بالوصول للكاميرا من إعدادات المتصفح');
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على كاميرا على هذا الجهاز');
      } else if (err.name === 'NotReadableError') {
        setError('الكاميرا قيد الاستخدام من قبل تطبيق آخر');
      } else {
        setError('لم يتم السماح بالوصول للكاميرا');
      }
      
      onError?.(error || 'Camera permission denied');
    }
  };

  const startScanning = async () => {
    if (!cameras.length) {
      setError('لا توجد كاميرا متاحة');
      return;
    }

    try {
      setError(null);
      
      // Create scanner if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      const scanner = scannerRef.current;
      
      // Check if already scanning
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
      }

      // Use camera ID or facingMode
      const cameraConfig = cameras[currentCameraIndex].id;

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          // Additional config for better mobile support
          videoConstraints: {
            facingMode: currentCameraIndex === 0 ? 'environment' : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          // Optionally stop after successful scan
          // stopScanning();
        },
        (errorMessage) => {
          // Error callback - ignore continuous scanning errors
          // Only report if it's a critical error
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner start error:', err);
      
      let errorMsg = 'فشل في تشغيل الكاميرا';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'تم رفض الوصول للكاميرا';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'الكاميرا قيد الاستخدام';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
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
      setIsScanning(false);
    } catch (err) {
      console.error('Scanner stop error:', err);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    const wasScanning = isScanning;
    if (wasScanning) {
      await stopScanning();
    }
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Small delay before restarting
    if (wasScanning) {
      setTimeout(() => {
        startScanning();
      }, 300);
    }
  };

  const retryPermission = () => {
    permissionRequestedRef.current = false;
    setHasPermission(null);
    setError(null);
    requestCameraPermission();
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
              <p className="font-medium mb-1">خطوات الحل:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>اضغط على أيقونة القفل/الكاميرا في شريط العنوان</li>
                <li>اختر "السماح" للكاميرا</li>
                <li>اضغط "إعادة المحاولة"</li>
              </ol>
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
            ref={containerRef}
            className="relative bg-black"
            style={{ minHeight: height }}
          >
            {/* QR Reader Element */}
            <div 
              id="qr-reader" 
              className="w-full"
              style={{ 
                display: isScanning ? 'block' : 'none',
              }}
            />
            
            {/* Placeholder when not scanning */}
            {!isScanning && (
              <div 
                className="flex flex-col items-center justify-center bg-muted"
                style={{ height }}
              >
                <Camera className="h-16 w-16 text-muted-foreground opacity-50" />
                <p className="mt-4 text-muted-foreground">
                  اضغط على زر التشغيل لبدء المسح
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
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
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
                تبديل الكاميرا
              </Button>
            )}
          </>
        )}
      </div>

      {/* Camera Info */}
      {isScanning && cameras.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          الكاميرا: {cameras[currentCameraIndex]?.label || 'غير معروف'}
        </p>
      )}
    </div>
  );
}
