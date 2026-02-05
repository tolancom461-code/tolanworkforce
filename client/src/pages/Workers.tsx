import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Workers() {
  const { data: workers, isLoading, error } = trpc.workers.list.useQuery();
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">الموظفين</h1>
          <Button>إضافة موظف</Button>
        </div>
        <div className="text-center py-8">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">الموظفين</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">خطأ في تحميل البيانات: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">الموظفين</h1>
          <p className="text-gray-600 mt-1">إدارة بيانات الموظفين والعاملين</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">إضافة موظف جديد</Button>
      </div>

      {!workers || workers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">لا توجد بيانات موظفين حالياً</p>
              <p className="text-gray-400 mt-2">ابدأ بإضافة موظف جديد</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>قائمة الموظفين</CardTitle>
              <CardDescription>
                إجمالي الموظفين: {workers.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-right py-2 px-4">الاسم</th>
                      <th className="text-right py-2 px-4">البريد الإلكتروني</th>
                      <th className="text-right py-2 px-4">الهاتف</th>
                      <th className="text-right py-2 px-4">الحالة</th>
                      <th className="text-right py-2 px-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker) => (
                      <tr key={worker.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{worker.name}</td>
                        <td className="py-2 px-4">{worker.email || "-"}</td>
                        <td className="py-2 px-4">{worker.phone || "-"}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${worker.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {worker.is_active ? "نشط" : "غير نشط"}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <button className="text-blue-600 hover:text-blue-800 mr-2">تعديل</button>
                          <button className="text-red-600 hover:text-red-800">حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
