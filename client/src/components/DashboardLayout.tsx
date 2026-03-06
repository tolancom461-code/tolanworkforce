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
  Briefcase,
  Home as HomeIcon,
  Banknote,
  Calendar,
  ClipboardCheck,
  AlertCircle,
  FileSearch,
  ArrowLeftRight,
  HardDrive,
  ShieldCheck
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// تعريف الصفحات المسموحة لكل دور
type UserRoleType = 'guard' | 'supervisor_tolan' | 'supervisor_malqa' | 'admin_affairs' | 'accountant' | 'auditor' | 'finance_manager' | 'executive' | 'super_admin';

const ROLE_ALLOWED_PATHS: Record<UserRoleType, string[] | 'all'> = {
  // الحارس: فقط تسجيل الحضور (بدون سجل الحضور وبدون تقارير الحضور)
  guard: ['/attendance', '/profile'],
  supervisor_tolan: ['/operations', '/profile'],  // بدون معالجة الملاحظات
  supervisor_malqa: ['/operations', '/profile'],  // بدون معالجة الملاحظات
  // الشؤون الإدارية: بدون صفحة المستخدمين
  admin_affairs: [
    '/dashboard', '/executive', '/workers', '/groups',
    '/attendance', '/attendance/log', '/attendance/reports', '/work-days',
    '/payroll/dashboard', '/payroll/batches', '/payroll/batches/create',
    '/finance/payroll/history', '/finance/overrides', '/payroll-report', '/finance/reports',
    '/schedules/weekly', '/punches/review',
    '/operations', '/operations/notes-review', '/operations/supervisor-performance',
    '/cost-centers', '/temporary-assignments', '/profile',
  ],
  // المحاسب: بدون لوحة التحكم، بدون سجل الحضور، بدون المستخدمين
  accountant: [
    '/workers', '/groups',
    '/payroll/dashboard', '/payroll/batches',
    '/finance/payroll/history', '/finance/overrides', '/payroll-report', '/finance/reports',
    '/schedules/weekly', '/punches/review',
    '/operations', '/operations/notes-review', '/operations/supervisor-performance',
    '/cost-centers', '/temporary-assignments', '/profile',
  ],
  // المراجع: اعتماد/رفض + تقارير مالية + سجلات حضور (استعراض فقط) + سجل التدقيق
  auditor: [
    '/payroll/dashboard', '/payroll/batches',
    '/finance/payroll/history', '/payroll-report', '/finance/reports',
    '/attendance/log', '/attendance/reports',
    '/audit-log',
    '/profile',
  ],
  // المدير المالي: اعتماد/رفض + تقارير مالية + سجلات حضور (استعراض فقط) + سجل التدقيق
  finance_manager: [
    '/payroll/dashboard', '/payroll/batches',
    '/finance/payroll/history', '/payroll-report', '/finance/reports',
    '/finance/cost-center-report',
    '/attendance/log', '/attendance/reports',
    '/audit-log',
    '/backup',
    '/profile',
  ],
  executive: ['/executive/finance', '/profile'],
  super_admin: 'all',
};

function isPathAllowed(role: UserRoleType, path: string): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (allowed === 'all') return true;
  // تحقق دقيق: إذا كان المسار موجود بالضبط في القائمة أو يبدأ بمسار مسموح
  // لكن يجب التأكد أن المسار الفرعي موجود أيضاً في القائمة
  if (allowed.includes(path)) return true;
  // للمسارات الفرعية: السماح فقط إذا كان المسار الأب موجود والمسار الفرعي ليس محظوراً صراحة
  return allowed.some(p => {
    if (path.startsWith(p + '/')) {
      // المسارات الفرعية مسموحة فقط إذا كان المسار الفرعي نفسه موجود في القائمة
      // هذا يمنع المشرفين من الوصول لـ /operations/notes-review عندما يكون لديهم فقط /operations
      return allowed.includes(path);
    }
    return false;
  });
}

// تصنيف القوائم حسب الأدوار والوظائف
const menuSections = [
  {
    label: "\u{1F4CA} لوحات التحكم",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", path: "/dashboard" },
      { icon: TrendingUp, label: "لوحة المدير", path: "/executive" },
      { icon: DollarSign, label: "لوحة الإدارة العليا", path: "/executive/finance" },
    ]
  },
  {
    label: "\u{1F465} إدارة الموارد البشرية",
    items: [
      { icon: Users, label: "المستخدمين", path: "/users" },
      { icon: UsersRound, label: "العمال", path: "/workers" },
      { icon: Briefcase, label: "المجموعات", path: "/groups" },
    ]
  },
  {
    label: "\u23F0 إدارة الحضور والانصراف",
    items: [
      { icon: QrCode, label: "تسجيل الحضور", path: "/attendance" },
      { icon: ClipboardList, label: "سجل الحضور", path: "/attendance/log" },
      { icon: FileText, label: "تقارير الحضور", path: "/attendance/reports" },
      { icon: Clock, label: "أيام العمل", path: "/work-days" },
    ]
  },
  {
    label: "\u{1F4B0} إدارة الرواتب والمالية",
    items: [
      { icon: Banknote, label: "لوحة تحكم الرواتب", path: "/payroll/dashboard", color: "text-green-600" },
      { icon: DollarSign, label: "دفعات الرواتب", path: "/payroll/batches" },
      { icon: FileText, label: "سجل دفعات الرواتب", path: "/finance/payroll/history" },
      { icon: Wallet, label: "التجاوزات المالية", path: "/finance/overrides" },
      { icon: FileCheck, label: "تقارير الرواتب", path: "/payroll-report" },
      { icon: TrendingUp, label: "التقارير المالية", path: "/finance/reports" },
      // { icon: FileSearch, label: "تقرير مستحقات العمالة", path: "/finance/cost-center-report" }, // مخفي مؤقتاً
    ]
  },
  {
    label: "\u23F3 إدارة الورديات والجداول",
    items: [
      { icon: Clock, label: "الورديات الأسبوعية", path: "/schedules/weekly", color: "text-purple-600" },
    ]
  },
  {
    label: "\u2713 مراجعة البصمات",
    items: [
      { icon: ClipboardCheck, label: "مركز مراجعة البصمات", path: "/punches/review", color: "text-orange-600" },
    ]
  },
  {
    label: "\u2699\uFE0F العمليات التشغيلية",
    items: [
      { icon: AlertCircle, label: "لوحة العمليات", path: "/operations", color: "text-blue-600" },
      { icon: ClipboardCheck, label: "معالجات الملاحظات", path: "/operations/notes-review", color: "text-amber-600" },
      { icon: ShieldCheck, label: "متابعة أداء المشرفين", path: "/operations/supervisor-performance", color: "text-teal-600" },
    ]
  },
  {
    label: "\u{1F4CB} البيانات المرجعية",
    items: [
      { icon: Building2, label: "مراكز التكلفة", path: "/cost-centers" },
      { icon: ArrowLeftRight, label: "الانتدابات المؤقتة", path: "/temporary-assignments", color: "text-cyan-600" },
    ]
  },
  {
    label: "\u2699\uFE0F \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645",
    items: [
      { icon: Shield, label: "سجل التدقيق", path: "/audit-log", color: "text-red-600" },
      { icon: HardDrive, label: "\u0627\u0644\u0646\u0633\u062e \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a", path: "/backup", color: "text-blue-600" },
      { icon: ShieldCheck, label: "\u0625\u0639\u0627\u062f\u0629 \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629", path: "/financial-recalculation", color: "text-green-600" },
      { icon: Settings, label: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a", path: "/profile" },
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

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  color?: string;
  badge?: number | null;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

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
  
  // جلب عدد البصمات المعلقة
  const { data: pendingPunchesCount = 0 } = trpc.attendance.getPendingCount.useQuery();
  
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
  
  // تصفية القائمة حسب دور المستخدم
  const userRole = (user?.role || 'guard') as UserRoleType;
  const filteredMenuSections = menuSections
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => isPathAllowed(userRole, item.path))
        .map(item => {
          if (item.path === "/punches/review") {
            return { ...item, badge: pendingPunchesCount };
          }
          return item;
        })
    }))
    .filter(section => section.items.length > 0);

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
                              <a href={item.path} className="flex items-center gap-2 justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <item.icon className={`h-4 w-4 ${(item as any).color || ''}`} />
                                  <span>{item.label}</span>
                                </div>
                                {(item as any).badge !== undefined && (item as any).badge !== null && (item as any).badge > 0 && (
                                  <Badge variant="destructive" className="ml-auto text-xs h-5 flex items-center justify-center">
                                    {(item as any).badge}
                                  </Badge>
                                )}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/home', { replace: true })}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            title="العودة للرئيسية"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">الرئيسية</span>
          </Button>
          <div className="flex-1" />
          
          {/* User info and logout */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-sm text-muted-foreground">
              {user?.fullName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="flex items-center gap-2"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
