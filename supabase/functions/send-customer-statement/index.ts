import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    console.log("Sending statement email to:", to);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "server.cloudmail.lk",
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER") || "",
          password: Deno.env.get("SMTP_PASS") || "",
        },
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Master Footwear</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #1a365d; margin-top: 0;">Customer Statement</h2>
          
          <p>Dear ${customerName},</p>
          
          <p>Please find attached your account statement.</p>
          
          <p>If you have any questions regarding this statement, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br><strong>Master Footwear Accounts Team</strong></p>
        </div>
        
        <div style="background-color: #1a365d; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px;">
          <p style="margin: 0;">Master Footwear Pvt Ltd</p>
          <p style="margin: 5px 0;">info@masterfootwear.lk</p>
        </div>
      </body>
      </html>
    `;

    // Send email with attachment
    await client.send({
      from: `${Deno.env.get("SMTP_FROM_NAME") || "Master Footwear"} <${Deno.env.get("SMTP_FROM_EMAIL") || "info@masterfootwear.lk"}>`,
      to: to,
      subject: `Customer Statement - ${customerName}`,
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    });

    await client.close();

    console.log("Statement email sent successfully to:", to);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
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
