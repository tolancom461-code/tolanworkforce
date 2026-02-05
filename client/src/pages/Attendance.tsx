import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Attendance() {
  const { data: events, isLoading, error } = trpc.attendance.list.useQuery({ limit: 50, offset: 0 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">الحضور والانصراف</h1>
        <div className="text-center py-8">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">الحضور والانصراف</h1>
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
          <h1 className="text-3xl font-bold">الحضور والانصراف</h1>
          <p className="text-gray-600 mt-1">سجل حضور وانصراف الموظفين</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">تسجيل حضور جديد</Button>
      </div>

      {!events || events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">لا توجد سجلات حضور حالياً</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>سجل الحضور</CardTitle>
            <CardDescription>
              إجمالي السجلات: {events.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-right py-2 px-4">التاريخ</th>
                    <th className="text-right py-2 px-4">وقت الحضور</th>
                    <th className="text-right py-2 px-4">وقت الانصراف</th>
                    <th className="text-right py-2 px-4">ملاحظات</th>
                    <th className="text-right py-2 px-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{event.date}</td>
                      <td className="py-2 px-4">{event.check_in_time ? new Date(event.check_in_time).toLocaleTimeString('ar-SA') : "-"}</td>
                      <td className="py-2 px-4">{event.check_out_time ? new Date(event.check_out_time).toLocaleTimeString('ar-SA') : "-"}</td>
                      <td className="py-2 px-4">{event.notes || "-"}</td>
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
      )}
    </div>
  );
}
