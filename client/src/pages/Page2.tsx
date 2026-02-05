/**
 * Page 2 - Additional Features
 * This page is reserved for future features
 */

export default function Page2() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Page 2</h1>
        <p className="text-muted-foreground">
          This page is available for future features
        </p>
      </div>

      <div className="p-6 rounded-lg border bg-card">
        <h3 className="font-semibold mb-4">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Additional features will be added here in the future.
        </p>
      </div>
    </div>
  );
}
