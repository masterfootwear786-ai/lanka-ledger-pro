import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  contactName: string;
  documentType: string;
  documentNo: string;
  amount: number;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, contactName, documentType, documentNo, amount, message }: EmailRequest = await req.json();

    console.log("Sending email to:", to);
    console.log("Document:", documentType, documentNo);

    const emailResponse = await resend.emails.send({
      from: "Documents <onboarding@resend.dev>",
      to: [to],
      subject: `${documentType} ${documentNo}`,
      html: `
        <h2>${documentType} Details</h2>
        <p>Dear ${contactName},</p>
        <p>Please find the details of your ${documentType.toLowerCase()}:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>${documentType} Number:</strong> ${documentNo}</p>
          <p><strong>Amount:</strong> ${amount.toLocaleString()}</p>
        </div>
        ${message ? `<p>${message}</p>` : ''}
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Accounts Team</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    console.error("Error details:", JSON.stringify(error));
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
