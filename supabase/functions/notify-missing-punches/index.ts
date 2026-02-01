import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MissingPunch {
  worker_id: number;
  worker_name: string;
  group_id: number;
  missing_type: string;
  expected_time: string;
  status: string;
}

interface NotificationPayload {
  worker_id: number;
  worker_name: string;
  group_id: number;
  missing_type: string;
  expected_time: string;
  manager_email: string;
  manager_name: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get work date from request
    const { workDate } = await req.json();
    const date = new Date(workDate).toISOString().split("T")[0];

    console.log(`[${new Date().toISOString()}] Checking for missing punches on ${date}`);

    // Call the detect_missing_punches function
    const { data: missingPunches, error: detectError } = await supabase.rpc(
      "detect_missing_punches",
      { p_work_date: date }
    );

    if (detectError) {
      console.error("Error detecting missing punches:", detectError);
      throw detectError;
    }

    console.log(`Found ${missingPunches?.length || 0} missing punches`);

    if (!missingPunches || missingPunches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: "No missing punches found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get group managers for notifications
    const groupIds = [...new Set((missingPunches as MissingPunch[]).map((p) => p.group_id))];

    const { data: managers, error: managersError } = await supabase
      .from("users")
      .select("id, email, full_name, group_id")
      .in("group_id", groupIds)
      .eq("role", "manager");

    if (managersError) {
      console.error("Error fetching managers:", managersError);
      throw managersError;
    }

    console.log(`Found ${managers?.length || 0} managers to notify`);

    // Create notifications for each missing punch
    const notifications: NotificationPayload[] = [];

    for (const punch of missingPunches as MissingPunch[]) {
      const manager = managers?.find((m: any) => m.group_id === punch.group_id);

      if (manager) {
        notifications.push({
          worker_id: punch.worker_id,
          worker_name: punch.worker_name,
          group_id: punch.group_id,
          missing_type: punch.missing_type === "check_in" ? "دخول" : "خروج",
          expected_time: punch.expected_time,
          manager_email: manager.email,
          manager_name: manager.full_name,
        });
      }
    }

    // Insert notifications into the database
    const { data: insertedNotifications, error: insertError } = await supabase
      .from("notifications")
      .insert(
        notifications.map((n) => ({
          type: "missing_punch",
          title: `بصمة ناقصة - ${n.worker_name}`,
          message: `الموظف ${n.worker_name} لم يقم بـ${n.missing_type} في الوقت المتوقع (${n.expected_time})`,
          recipient_id: n.worker_id,
          metadata: {
            worker_id: n.worker_id,
            worker_name: n.worker_name,
            group_id: n.group_id,
            missing_type: n.missing_type,
            expected_time: n.expected_time,
            manager_email: n.manager_email,
            manager_name: n.manager_name,
          },
          created_at: new Date().toISOString(),
        }))
      );

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      throw insertError;
    }

    console.log(`Successfully created ${insertedNotifications?.length || 0} notifications`);

    // Send email notifications to managers
    const emailNotifications = notifications.map((n) => ({
      to: n.manager_email,
      subject: `⚠️ تنبيه: بصمة ناقصة - ${n.worker_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>تنبيه بصمة ناقصة</h2>
          <p>السلام عليكم ورحمة الله وبركاته</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-right: 4px solid #ff6b6b;">
            <p><strong>الموظف:</strong> ${n.worker_name}</p>
            <p><strong>نوع البصمة الناقصة:</strong> ${n.missing_type}</p>
            <p><strong>الوقت المتوقع:</strong> ${n.expected_time}</p>
            <p><strong>التاريخ:</strong> ${date}</p>
          </div>
          
          <p style="margin-top: 20px;">يرجى مراجعة نظام إدارة القوى العاملة لاتخاذ الإجراء المناسب.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            هذا البريد تم إرساله تلقائياً من نظام إدارة القوى العاملة
          </p>
        </div>
      `,
    }));

    // Log email notifications (in production, integrate with email service)
    console.log("Email notifications to send:", emailNotifications);

    return new Response(
      JSON.stringify({
        success: true,
        notified: insertedNotifications?.length || 0,
        missingPunches: missingPunches.length,
        message: `تم إنشاء ${insertedNotifications?.length || 0} إشعار للمديرين`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-missing-punches function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
