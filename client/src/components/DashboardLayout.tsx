import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PERMISSIONS } from "../../../shared/permissions";
import { usePermission } from "@/hooks/usePermission";
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
    label: "📋 لوحات التحكم",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", path: "/dashboard" },
      { icon: TrendingUp, label: "لوحة التحكم التنفيذية", path: "/executive", permission: PERMISSIONS.DASHBOARD_VIEW },
    ]
  },
  {
    label: "👥 الموارد البشرية",
    items: [
      { icon: UserCircle, label: "إدارة العمال", path: "/workers", permission: PERMISSIONS.WORKER_VIEW },
      { icon: Users, label: "مجموعات العمل", path: "/groups", permission: PERMISSIONS.GROUP_VIEW },
    ]
  },
  {
    label: "⏰ الحضور والانصراف",
    items: [
      { icon: QrCode, label: "تسجيل الحضور", path: "/attendance", permission: PERMISSIONS.ATTENDANCE_RECORD },
      { icon: ClipboardList, label: "سجل الحضور", path: "/attendance/log", permission: PERMISSIONS.ATTENDANCE_VIEW },
      { icon: FileText, label: "تقارير الحضور", path: "/attendance/reports", permission: PERMISSIONS.ATTENDANCE_REPORTS_VIEW },
      { icon: Clock, label: "أيام العمل", path: "/work-days", permission: PERMISSIONS.SYSTEM_SETTINGS_VIEW },
      { icon: Flag, label: "البلاغات التشغيلية", path: "/operational-flags", permission: PERMISSIONS.OPERATIONAL_FLAGS_VIEW },
      { icon: CheckCircle, label: "البلاغات المعلقة", path: "/pending-flags", permission: PERMISSIONS.OPERATIONAL_FLAGS_VIEW },
    ]
  },
  {
    label: "💰 الرواتب والمالية",
    items: [
      { icon: Wallet, label: "دفعات الرواتب", path: "/payroll/batches", permission: PERMISSIONS.PAYROLL_VIEW },
      { icon: FileCheck, label: "تقارير الرواتب", path: "/payroll-report", permission: PERMISSIONS.PAYROLL_VIEW },
      { icon: DollarSign, label: "التقارير المالية", path: "/finance/reports", permission: PERMISSIONS.FINANCIAL_REPORTS_VIEW },
    ]
  },
  {
    label: "📋 البيانات المرجعية",
    items: [
      { icon: Building2, label: "مراكز التكلفة", path: "/cost-centers", permission: PERMISSIONS.COST_CENTER_VIEW },
    ]
  },
  {
    label: "⚙️ إعدادات النظام",
    items: [
      { icon: Users, label: "المستخدمين", path: "/users", permission: PERMISSIONS.USER_VIEW },
      { icon: Shield, label: "إدارة الأدوار", path: "/settings/roles", permission: PERMISSIONS.ROLE_VIEW },
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
  
  // استخدام hook الصلاحيات
  const { hasPermission: checkPermission } = usePermission();
  
  // فلترة القوائم حسب الصلاحيات
  const filteredMenuSections = menuSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => 
        !item.permission || checkPermission(item.permission)
      )
    }))
    .filter(section => section.items.length > 0); // إخفاء الأقسام الفارغة

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
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold">TolanWorkforce</span>
                <span className="text-xs text-muted-foreground">نظام إدارة القوى العاملة</span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          <SidebarMenu>
            {filteredMenuSections.map((section) => (
              <Collapsible
                key={section.label}
                open={!collapsedSections[section.label]}
                onOpenChange={() => toggleSection(section.label)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={section.label}
                      className="w-full justify-between font-semibold"
                    >
                      <span>{section.label}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="mt-1 space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location === item.path;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              onClick={() => setLocation(item.path)}
                              isActive={isActive}
                              tooltip={item.label}
                              className="pl-8"
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {user?.fullName?.charAt(0) || "a"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-right text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.fullName || "anem2031"}</span>
                      <span className="truncate text-xs">{user?.email || "anem2031@gmail.com"}</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {!isMobile && !isCollapsed && (
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
            onMouseDown={handleMouseDown}
            style={{
              userSelect: "none",
            }}
          />
        )}
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg font-semibold">
              {filteredMenuSections
                .flatMap((s) => s.items)
                .find((item) => item.path === location)?.label || "لوحة التحكم"}
            </span>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
