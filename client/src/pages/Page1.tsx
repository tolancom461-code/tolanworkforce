/**
 * Page 1 - Dashboard Main Page
 * This is the main dashboard page for the TolanWorkforce system
 */

export default function Page1() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to TolanWorkforce - نظام إدارة القوى العاملة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Placeholder cards for future features */}
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Employees</h3>
          <p className="text-sm text-muted-foreground">Manage employee records and information</p>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Departments</h3>
          <p className="text-sm text-muted-foreground">Organize and manage departments</p>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Salaries</h3>
          <p className="text-sm text-muted-foreground">Handle salary and compensation management</p>
        </div>
      </div>
    </div>
  );
}
