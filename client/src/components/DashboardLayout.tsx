import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Users, 
  Key, 
  User, 
  UsersRound, 
  UserCircle, 
  QrCode, 
  ClipboardList, 
  Wallet, 
  Building2, 
  Shield, 
  FileText,
  TrendingUp,
  PlusCircle,
  DollarSign,
  CheckCircle,
  FileCheck,
  ChevronDown,
  Flag,
  Clock,
  Settings,
  Briefcase
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// تصنيف القوائم حسب الأدوار والوظائف
const menuSections = [
  {
    label: "📊 لوحات التحكم",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", path: "/dashboard" },
      { icon: TrendingUp, label: "لوحة المدير", path: "/executive" },
    ]
  },
  {
    label: "👥 إدارة الموارد البشرية",
    items: [
      { icon: Users, label: "المستخدمين", path: "/users" },
      { icon: UsersRound, label: "العمال", path: "/workers" },
      { icon: Briefcase, label: "المجموعات", path: "/groups" },
    ]
  },
  {
    label: "⏰ إدارة الحضور والانصراف",
    items: [
      { icon: QrCode, label: "تسجيل الحضور", path: "/attendance" },
      { icon: ClipboardList, label: "سجل الحضور", path: "/attendance/log" },
      { icon: FileText, label: "تقارير الحضور", path: "/attendance/reports" },
      { icon: Clock, label: "أيام العمل", path: "/work-days" },
    ]
  },
  {
    label: "💰 إدارة الرواتب والمالية",
    items: [
      { icon: DollarSign, label: "دفعات الرواتب", path: "/payroll/batches" },
      { icon: PlusCircle, label: "إنشاء دفعة رواتب", path: "/payroll/batches/create" },
      { icon: FileText, label: "سجل دفعات الرواتب", path: "/finance/payroll/history" },
      { icon: Wallet, label: "التجاوزات المالية", path: "/finance/overrides" },
      { icon: FileCheck, label: "تقارير الرواتب", path: "/payroll-report" },
      { icon: TrendingUp, label: "التقارير المالية", path: "/finance/reports" },
    ]
  },
  {
    label: "📋 البيانات المرجعية",
    items: [
      { icon: Building2, label: "مراكز التكلفة", path: "/cost-centers" },
      { icon: Flag, label: "الأعلام التشغيلية", path: "/operational-flags" },
      { icon: CheckCircle, label: "الأعلام المعلقة", path: "/pending-flags" },
    ]
  },
  {
    label: "⚙️ إعدادات النظام",
    items: [
      { icon: Settings, label: "الملف الشخصي", path: "/profile" },
    ]
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_COLLAPSED_SECTIONS_KEY = "sidebar-collapsed-sections";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              تسجيل الدخول مطلوب
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              يتطلب الوصول إلى هذه اللوحة المصادقة. انقر للمتابعة إلى صفحة تسجيل الدخول.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            الذهاب إلى لوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // حفظ حالة الطي/الفتح لكل قسم
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_SECTIONS_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };
  
  // جميع المستخدمين لديهم وصول كامل - لا توجد فحوصات صلاحيات
  const filteredMenuSections = menuSections;

  const isMobile = useIsMobile();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <Sidebar ref={sidebarRef} collapsible="icon" className="border-l">
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">TolanWorkforce</span>
              <span className="text-xs text-muted-foreground">نظام إدارة القوى العاملة</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {filteredMenuSections.map((section) => (
              <Collapsible
                key={section.label}
                open={!collapsedSections[section.label]}
                onOpenChange={() => toggleSection(section.label)}
                className="group/collapsible"
              >
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors">
                      {section.label}
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={location === item.path}
                              onClick={() => setLocation(item.path)}
                            >
                              <a href={item.path} className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user?.fullName?.split(" ").map(n => n[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{user?.fullName}</span>
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
