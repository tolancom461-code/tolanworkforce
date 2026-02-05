import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, DollarSign, Settings } from "lucide-react";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-gray-600 mt-1">مرحباً بك في نظام إدارة القوى العاملة</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workers Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalWorkers || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">عدد الموظفين المسجلين</p>
          </CardContent>
        </Card>

        {/* Active Workers Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفين النشطين</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.activeWorkers || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">الموظفين النشطين حالياً</p>
          </CardContent>
        </Card>

        {/* Today Attendance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحضور اليوم</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.todayAttendance || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">عدد الموظفين الحاضرين</p>
          </CardContent>
        </Card>

        {/* Total Attendance Records Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalAttendanceRecords || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">سجلات الحضور الكلية</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
          <CardDescription>الوصول السريع للمميزات الرئيسية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/workers" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold">الموظفين</h3>
              <p className="text-sm text-gray-600">إدارة بيانات الموظفين</p>
            </a>
            
            <a href="/attendance" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Clock className="h-6 w-6 text-orange-600 mb-2" />
              <h3 className="font-semibold">الحضور</h3>
              <p className="text-sm text-gray-600">سجل الحضور والانصراف</p>
            </a>
            
            <a href="/payroll" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <DollarSign className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold">الرواتب</h3>
              <p className="text-sm text-gray-600">إدارة الرواتب والتعويضات</p>
            </a>
            
            <a href="/settings" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="h-6 w-6 text-gray-600 mb-2" />
              <h3 className="font-semibold">الإعدادات</h3>
              <p className="text-sm text-gray-600">إعدادات النظام</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
