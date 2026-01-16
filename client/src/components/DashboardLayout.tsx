import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MENU_PERMISSIONS, hasPermission, type MenuPermission } from "@/lib/menuPermissions";
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
  BarChart3, 
  Calendar, 
  Edit, 
  AlertCircle, 
  Calculator, 
  Wallet, 
  Building2, 
  Shield, 
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  FileCheck
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// تصنيف القوائم حسب الأدوار والوظائف
const menuSections = [
  {
    label: "لوحات التحكم",
    items: [
      { icon: LayoutDashboard, label: "لوحة التحكم الرئيسية", path: "/dashboard", permission: MENU_PERMISSIONS.DASHBOARD },
      { icon: TrendingUp, label: "لوحة التحكم التنفيذية", path: "/executive", permission: MENU_PERMISSIONS.EXECUTIVE_DASHBOARD },
    ]
  },
  {
    label: "إدارة الموارد البشرية",
    items: [
      { icon: UserCircle, label: "العمال", path: "/workers", permission: MENU_PERMISSIONS.WORKERS },
      { icon: UsersRound, label: "المجموعات", path: "/groups", permission: MENU_PERMISSIONS.GROUPS },
      { icon: Building2, label: "مراكز التكلفة", path: "/cost-centers", permission: MENU_PERMISSIONS.COST_CENTERS },
    ]
  },
  {
    label: "نظام الحضور والانصراف",
    items: [
      { icon: QrCode, label: "تسجيل الحضور", path: "/attendance", permission: MENU_PERMISSIONS.ATTENDANCE_SCAN },
      { icon: ClipboardList, label: "سجل الحضور", path: "/attendance/log", permission: MENU_PERMISSIONS.ATTENDANCE_LOG },
      { icon: Edit, label: "تعديل الحضور", path: "/attendance/adjust", permission: MENU_PERMISSIONS.ATTENDANCE_ADJUST },
      { icon: BarChart3, label: "تقارير الحضور", path: "/attendance/reports", permission: MENU_PERMISSIONS.ATTENDANCE_REPORTS },
      { icon: Calendar, label: "إدارة أيام العمل", path: "/work-days", permission: MENU_PERMISSIONS.WORK_DAYS },
    ]
  },
  {
    label: "النظام المالي",
    items: [
      { icon: Calculator, label: "الخصومات والإضافات", path: "/finance/entry", permission: MENU_PERMISSIONS.FINANCE_ENTRY },
      { icon: AlertCircle, label: "الاستثناءات المالية", path: "/finance/overrides", permission: MENU_PERMISSIONS.FINANCE_OVERRIDES },
      { icon: Wallet, label: "دفعات الرواتب", path: "/payroll/batches", permission: MENU_PERMISSIONS.PAYROLL_BATCHES },
      { icon: FileText, label: "التقارير المالية", path: "/finance/reports", permission: MENU_PERMISSIONS.FINANCE_REPORTS },
    ]
  },
  {
    label: "إدارة النظام",
    items: [
      { icon: Users, label: "المستخدمين", path: "/users", permission: MENU_PERMISSIONS.USERS },
      { icon: Shield, label: "الأدوار والصلاحيات", path: "/roles", permission: MENU_PERMISSIONS.ROLES },
      { icon: Key, label: "إدارة الصلاحيات", path: "/permissions", permission: MENU_PERMISSIONS.PERMISSIONS },
    ]
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
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
  
  // جلب صلاحيات المستخدم
  const { data: userPermissions = [], isLoading: isLoadingPermissions } = trpc.auth.permissions.useQuery();
  
  // فلترة القوائم حسب الصلاحيات
  // إذا لم يكن للمستخدم أي صلاحيات، عرض جميع القوائم (للتوافق مع الإصدارات السابقة)
  const filteredMenuSections = userPermissions.length === 0 && !isLoadingPermissions
    ? menuSections
    : menuSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => 
            !item.permission || hasPermission(userPermissions, item.permission)
          )
        }))
        .filter(section => section.items.length > 0);
  
  // Find active menu item across all sections
  const activeMenuItem = filteredMenuSections
    .flatMap(section => section.items)
    .find(item => item.path === location);
  
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
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
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  return (
    <>
      <Sidebar ref={sidebarRef} collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-4">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-right text-sm leading-tight">
              <span className="truncate font-semibold">TolanWorkforce</span>
              <span className="truncate text-xs text-muted-foreground">نظام إدارة القوى العاملة</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {filteredMenuSections.map((section, sectionIndex) => (
            <SidebarGroup key={sectionIndex}>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item, itemIndex) => (
                    <SidebarMenuItem key={itemIndex}>
                      <SidebarMenuButton
                        onClick={() => setLocation(item.path)}
                        isActive={location === item.path}
                        tooltip={item.label}
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.fullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-right text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.fullName || "مستخدم"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="ml-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {!isCollapsed && (
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/20 transition-colors"
            onMouseDown={handleResizeStart}
          />
        )}
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2 flex-1">
            {activeMenuItem && (
              <>
                <activeMenuItem.icon className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg font-semibold">{activeMenuItem.label}</h1>
              </>
            )}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
