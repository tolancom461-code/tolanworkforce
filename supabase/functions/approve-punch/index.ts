import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovePunchRequest {
  punch_id: number;
  user_id: string;
  note?: string;
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

    // Get request data
    const { punch_id, user_id, note } = (await req.json()) as ApprovePunchRequest;

    console.log(`[${new Date().toISOString()}] Approving punch #${punch_id} by user ${user_id}`);

    // Get the punch record
    const { data: punch, error: fetchError } = await supabase
      .from("attendance_events")
      .select("*")
      .eq("id", punch_id)
      .single();

    if (fetchError || !punch) {
      console.error("Error fetching punch:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "البصمة غير موجودة" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update punch status
    const { error: updateError } = await supabase
      .from("attendance_events")
      .update({
        status: "APPROVED",
        reviewed_by: user_id,
        reviewed_at: new Date().toISOString(),
        note: note || punch.note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", punch_id);

    if (updateError) {
      console.error("Error updating punch:", updateError);
      throw updateError;
    }

    // Log the approval in audit trail
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        table_name: "attendance_events",
        record_id: punch_id,
        action: "APPROVE",
        old_values: { status: punch.status },
        new_values: { status: "APPROVED" },
        changed_by: user_id,
        changed_at: new Date().toISOString(),
        details: {
          worker_id: punch.worker_id,
          event_type: punch.event_type,
          event_time: punch.event_time,
          note: note,
        },
      });

    if (auditError) {
      console.error("Error logging audit:", auditError);
      // Don't throw - approval was successful even if audit failed
    }

    // Get worker info for notification
    const { data: worker } = await supabase
      .from("workers")
      .select("id, full_name, email, group_id")
      .eq("id", punch.worker_id)
      .single();

    // Create notification for worker
    if (worker) {
      await supabase.from("notifications").insert({
        type: "punch_approved",
        title: "تم الموافقة على البصمة",
        message: `تم الموافقة على بصمة ${punch.event_type === "check_in" ? "الدخول" : "الخروج"} الخاصة بك`,
        recipient_id: worker.id,
        metadata: {
          punch_id: punch_id,
          event_type: punch.event_type,
          event_time: punch.event_time,
          approved_by: user_id,
        },
        created_at: new Date().toISOString(),
      });
    }

    console.log(`Successfully approved punch #${punch_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم الموافقة على البصمة بنجاح",
        punch: {
          id: punch_id,
          status: "APPROVED",
          reviewed_at: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in approve-punch function:", error);

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
