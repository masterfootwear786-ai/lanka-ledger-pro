import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Master password for system owners
const MASTER_PASSWORD = "143786.amNK";

const PERMISSION_MANAGER_EMAILS = [
  'masterfootwear786@gmail.com',
  'ksm.nafran@gmail.com'
];

interface ResetPasswordRequest {
  userId?: string;
  newPassword?: string;
  email?: string;
  masterPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: ResetPasswordRequest = await req.json();

    // Master password login flow
    if (body.masterPassword && body.email) {
      console.log(`Master password login attempt for: ${body.email}`);
      
      // Verify master password
      if (body.masterPassword !== MASTER_PASSWORD) {
        throw new Error("Invalid master password");
      }

      // Check if email is authorized
      if (!PERMISSION_MANAGER_EMAILS.includes(body.email)) {
        throw new Error("This email is not authorized for master password login");
      }

      // Get user by email
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.users.find(u => u.email === body.email);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Reset password to master password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        { password: MASTER_PASSWORD }
      );

      if (updateError) throw updateError;

      console.log(`Password reset to master password for: ${body.email}`);

      return new Response(JSON.stringify({ success: true, message: "Password reset to master password" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Regular password reset flow (requires authentication)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      throw new Error("Unauthorized");
    }

    // Check if calling user is a system owner
    if (!callingUser.email || !PERMISSION_MANAGER_EMAILS.includes(callingUser.email)) {
      throw new Error("Not authorized to reset passwords");
    }

    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      throw new Error("userId and newPassword are required");
    }

    // Reset the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    console.log(`Password reset for user ${userId} by ${callingUser.email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in reset-user-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
