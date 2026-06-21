import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // 2. Listen for the install prompt
    const handler = (e: Event) => {
      console.log("PWA Install prompt triggered");
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // 3. Listen for successful installation
    const appInstalledHandler = () => {
      console.log("PWA was installed");
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      console.log("No install prompt available");
      // Fallback for browsers that don't support beforeinstallprompt (like Safari)
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.navigator as any).standalone) {
        alert("لتثبيت التطبيق على iPhone: اضغط على زر 'مشاركة' ثم اختر 'إضافة للشاشة الرئيسية'");
      } else {
        alert("تثبيت التطبيق متاح عبر قائمة المتصفح (Install App)");
      }
      return;
    }
    
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === "accepted") {
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    } catch (err) {
      console.error("Error during PWA installation:", err);
    }
  };

  // Hide button if already installed
  if (isInstalled) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleInstall}
          className="h-9 gap-1.5 rounded-lg hover:bg-accent px-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
        >
          <Download className="h-4 w-4" />
          <span>تثبيت</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>تثبيت التطبيق على جهازك</p>
      </TooltipContent>
    </Tooltip>
  );
}
