import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  customerName: string;
  pdfBase64: string;
  fileName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customerName, pdfBase64, fileName }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Statements <onboarding@resend.dev>",
      to: [to],
      subject: `Customer Statement - ${customerName}`,
      html: `
        <h2>Customer Statement</h2>
        <p>Dear ${customerName},</p>
        <p>Please find attached your account statement.</p>
        <p>If you have any questions regarding this statement, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Accounts Team</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
        },
      ],
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
