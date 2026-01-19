import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Users, Clock, BarChart3, Shield, Zap } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.localLogin.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ username, password });
      toast.success('تم تسجيل الدخول بنجاح');
      setShowLoginDialog(false);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: 'إدارة العمال',
      description: 'إدارة شاملة لبيانات العمال والموظفين مع إمكانية التصنيف والبحث السريع'
    },
    {
      icon: Clock,
      title: 'تسجيل الحضور',
      description: 'نظام متطور لتسجيل الحضور والانصراف باستخدام QR Code أو الإدخال اليدوي'
    },
    {
      icon: BarChart3,
      title: 'التقارير والإحصائيات',
      description: 'تقارير تفصيلية عن الحضور والغياب والتأخير مع إمكانية التصدير'
    },
    {
      icon: Building2,
      title: 'إدارة المجموعات',
      description: 'تنظيم العمال في مجموعات ومراكز تكلفة لسهولة الإدارة والمتابعة'
    },
    {
      icon: Shield,
      title: 'الأمان والخصوصية',
      description: 'نظام آمن لحماية بيانات العمال مع صلاحيات وصول محددة'
    },
    {
      icon: Zap,
      title: 'سريع وسهل',
      description: 'واجهة مستخدم بسيطة وسريعة تدعم اللغة العربية بالكامل'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">TolanWorkforce</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">نظام إدارة القوى العاملة</p>
            </div>
          </div>
          <Button onClick={() => setShowLoginDialog(true)} size="lg">
            تسجيل دخول
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            نظام إدارة القوى العاملة
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              الشامل والمتطور
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            حل متكامل لإدارة الموظفين والعمال مع نظام حضور ذكي وتقارير تفصيلية.
            سهل الاستخدام، آمن، وموثوق.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => setShowLoginDialog(true)} size="lg" className="text-lg px-8 py-6">
              ابدأ الآن
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              اعرف المزيد
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            مميزات النظام
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            كل ما تحتاجه لإدارة القوى العاملة بكفاءة وفعالية
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">99.9%</div>
              <div className="text-lg opacity-90">وقت التشغيل</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-lg opacity-90">دعم فني</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-lg opacity-90">أمان البيانات</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
            جاهز للبدء؟
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            ابدأ في إدارة القوى العاملة بكفاءة أعلى اليوم
          </p>
          <Button onClick={() => setShowLoginDialog(true)} size="lg" className="text-lg px-8 py-6">
            تسجيل دخول الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2026 TolanWorkforce. جميع الحقوق محفوظة.</p>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">تسجيل الدخول</DialogTitle>
            <DialogDescription>
              أدخل اسم المستخدم وكلمة المرور للوصول إلى النظام
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'جاري التحقق...' : 'دخول'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
