import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Shield,
  Search,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Roles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleToToggle, setRoleToToggle] = useState<any>(null);
  
  const { data: roles, refetch } = trpc.roles.list.useQuery();
  
  const toggleStatusMutation = trpc.roles.toggleStatus.useMutation({
    onSuccess: (_, variables) => {
      const status = variables.isActive ? 'تفعيل' : 'توقيف';
      toast.success(`تم ${status} الدور بنجاح`);
      refetch();
      setRoleToToggle(null);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ');
      setRoleToToggle(null);
    }
  });
  
  const handleToggleStatus = (role: any) => {
    setRoleToToggle(role);
  };
  
  const confirmToggle = () => {
    if (!roleToToggle) return;
    
    toggleStatusMutation.mutate({
      id: roleToToggle.id,
      isActive: !roleToToggle.isActive,
    });
  };
  
  const filteredRoles = roles?.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Level colors
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-gray-500',    // Level 0 (not used)
      'bg-blue-500',    // Level 1: Guard
      'bg-green-500',   // Level 2: Supervisor
      'bg-yellow-500',  // Level 3: Accountant
      'bg-orange-500',  // Level 4: HR Admin
      'bg-purple-500',  // Level 5: Financial Manager
      'bg-red-500',     // Level 6: General Manager
    ];
    return colors[level] || 'bg-gray-500';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              إدارة الأدوار
            </h1>
            <p className="text-muted-foreground mt-1">
              الأدوار الستة الثابتة في النظام (لا يمكن إضافة أو حذف أدوار)
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  الأدوار الستة ثابتة في النظام
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  يمكنك تفعيل أو توقيف الأدوار، وإدارة صلاحياتها من صفحة "صلاحيات الأدوار". عند توقيف دور، سيتم توقيف جميع المستخدمين المرتبطين به تلقائياً.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث في الأدوار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الأدوار</CardTitle>
            <CardDescription>
              الأدوار الستة الثابتة مرتبة حسب المستوى
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستوى</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Badge className={`${getLevelColor(role.level || 0)} text-white`}>
                        المستوى {role.level || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <code className="bg-muted px-2 py-1 rounded">
                        {role.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      {role.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          موقوف
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={role.isActive ?? false}
                          onCheckedChange={() => handleToggleStatus(role)}
                          disabled={toggleStatusMutation.isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {role.isActive ? 'تفعيل' : 'توقيف'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!roleToToggle} onOpenChange={() => setRoleToToggle(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {roleToToggle?.isActive ? 'توقيف الدور' : 'تفعيل الدور'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {roleToToggle?.isActive ? (
                  <>
                    هل أنت متأكد من توقيف الدور "{roleToToggle?.name}"؟
                    <br />
                    <strong className="text-destructive">
                      تحذير: سيتم توقيف جميع المستخدمين المرتبطين بهذا الدور تلقائياً!
                    </strong>
                  </>
                ) : (
                  <>
                    هل أنت متأكد من تفعيل الدور "{roleToToggle?.name}"؟
                    <br />
                    <span className="text-muted-foreground">
                      ملاحظة: المستخدمين الموقوفين سيبقون موقوفين حتى يتم تفعيلهم يدوياً.
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmToggle}
                className={roleToToggle?.isActive ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {roleToToggle?.isActive ? 'توقيف' : 'تفعيل'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
