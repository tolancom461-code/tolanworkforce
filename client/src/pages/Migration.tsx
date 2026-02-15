import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function Migration() {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const migrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/trpc/migration.addFlexibleScheduleColumns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.result?.data) {
        setResult(data.result.data);
      } else if (data.error) {
        setResult({ success: false, message: data.error.message });
      }
    },
    onError: (error: any) => {
      setResult({ success: false, message: error.message });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Migration</CardTitle>
          <CardDescription>
            Add flexible schedule columns to groups table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => migrationMutation.mutate()}
            disabled={migrationMutation.isPending}
          >
            {migrationMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Run Migration
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
