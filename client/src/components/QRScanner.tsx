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

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
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
      })
      .catch((err) => {
        console.error('Camera access error:', err);
        setHasPermission(false);
        setError('لم يتم السماح بالوصول للكاميرا');
      });

    return () => {
      stopScanning();
    };
  }, []);

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

      await scanner.start(
        cameras[currentCameraIndex].id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
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
      setError(err.message || 'فشل في تشغيل الكاميرا');
      onError?.(err.message || 'فشل في تشغيل الكاميرا');
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
      }, 100);
    }
  };

  if (hasPermission === null) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">جاري التحقق من الكاميرا...</p>
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
          <p className="text-sm text-muted-foreground mt-1">
            يرجى السماح بالوصول للكاميرا من إعدادات المتصفح
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            إعادة المحاولة
          </Button>
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
                    className="border-2 border-primary rounded-lg"
                    style={{ width: 250, height: 250 }}
                  >
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </div>
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
