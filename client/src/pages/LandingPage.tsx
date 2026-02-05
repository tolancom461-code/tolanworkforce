import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authStorage } from "@/lib/auth-storage";
import { trpc } from "@/lib/trpc";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const localLoginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: (data) => {
      // Store token in sessionStorage
      authStorage.setToken(data.accessToken);
      toast.success("تم تسجيل الدخول بنجاح");
      // Redirect to dashboard
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تسجيل الدخول");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      await localLoginMutation.mutateAsync({ username, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            TolanWorkforce
          </h1>
          <p className="text-center text-gray-600 mb-8">
            نظام إدارة القوى العاملة
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم المستخدم
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading || localLoginMutation.isPending}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || localLoginMutation.isPending}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || localLoginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading || localLoginMutation.isPending ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>بيانات التجربة:</strong>
            </p>
            <p className="text-sm text-blue-800">اسم المستخدم: admin</p>
            <p className="text-sm text-blue-800">كلمة المرور: ADMIN1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
