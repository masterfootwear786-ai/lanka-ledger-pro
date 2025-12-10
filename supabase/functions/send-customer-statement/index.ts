import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatementRequest {
  to: string;
  customerName: string;
  customerCode: string;
  stats: {
    totalInvoiced: number;
    totalPaid: number;
    pendingCheques: number;
    totalReturns: number;
    outstanding: number;
  };
  message?: string;
  pdfBase64?: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      customerName,
      customerCode,
      stats,
      message,
      pdfBase64,
      companyName = "Master Footwear",
    }: StatementRequest = await req.json();

    console.log("Sending customer statement to:", to);
    console.log("Customer:", customerName, customerCode);

    // Build HTML without extra whitespace to prevent quoted-printable encoding issues (=20)
    const pendingChequesHtml = stats.pendingCheques > 0 
      ? `<p style="color:#c2410c;background-color:#fff7ed;padding:10px;border-radius:5px;"><strong>Pending Cheques:</strong> Rs. ${stats.pendingCheques.toLocaleString()}</p>` 
      : '';
    
    const pdfNoticeHtml = pdfBase64 
      ? `<div style="background-color:#dbeafe;padding:10px;border-radius:5px;text-align:center;margin:15px 0;"><strong>Detailed statement PDF attached</strong></div>` 
      : '';
    
    const messageHtml = message 
      ? `<div style="background-color:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>Message:</strong></p><p style="margin:5px 0 0 0;">${message}</p></div>` 
      : '';

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;"><div style="background-color:#1e293b;color:white;padding:20px;text-align:center;"><h1 style="margin:0;font-size:24px;">${companyName}</h1><p style="margin:5px 0 0 0;font-size:14px;">Customer Statement</p></div><div style="padding:20px;"><p>Dear <strong>${customerName}</strong>,</p><p>Please find your account statement below:</p><table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr><td style="padding:15px;background-color:#eff6ff;border-radius:8px;width:50%;"><div style="font-size:12px;color:#64748b;">Total Invoiced</div><div style="font-size:18px;font-weight:bold;color:#2563eb;margin-top:5px;">Rs. ${stats.totalInvoiced.toLocaleString()}</div></td><td style="width:10px;"></td><td style="padding:15px;background-color:#f0fdf4;border-radius:8px;width:50%;"><div style="font-size:12px;color:#64748b;">Total Paid</div><div style="font-size:18px;font-weight:bold;color:#16a34a;margin-top:5px;">Rs. ${stats.totalPaid.toLocaleString()}</div></td></tr><tr><td colspan="3" style="height:10px;"></td></tr><tr><td style="padding:15px;background-color:#faf5ff;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Total Returns</div><div style="font-size:18px;font-weight:bold;color:#9333ea;margin-top:5px;">Rs. ${stats.totalReturns.toLocaleString()}</div></td><td style="width:10px;"></td><td style="padding:15px;background-color:#fef2f2;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Outstanding Balance</div><div style="font-size:18px;font-weight:bold;color:#dc2626;margin-top:5px;">Rs. ${stats.outstanding.toLocaleString()}</div></td></tr></table>${pendingChequesHtml}${pdfNoticeHtml}${messageHtml}<p>If you have any questions about this statement, please don't hesitate to contact us.</p><p>Thank you for your business!</p><p>Best regards,<br><strong>${companyName} Accounts Team</strong></p></div><div style="background-color:#1e293b;color:white;padding:15px;text-align:center;font-size:12px;"><p style="margin:0;">${companyName}</p></div></body></html>`;

    const smtpHost = (Deno.env.get("SMTP_HOST") || "server.cloudmail.lk").trim();
    const smtpPort = parseInt((Deno.env.get("SMTP_PORT") || "465").trim());
    const smtpUser = (Deno.env.get("SMTP_USER") || "").trim();
    const smtpPass = (Deno.env.get("SMTP_PASS") || "").trim();
    const fromEmail = (Deno.env.get("SMTP_FROM_EMAIL") || "info@masterfootwear.lk").trim();
    const fromName = (Deno.env.get("SMTP_FROM_NAME") || "Master Footwear").trim();

    console.log("Using SMTP Host:", smtpHost);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    const emailConfig: any = {
      from: `${fromName} <${fromEmail}>`,
      to: to,
      subject: `Customer Statement - ${customerCode} - ${companyName}`,
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfBase64) {
      emailConfig.attachments = [
        {
          filename: `Statement_${customerCode}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ];
    }

    await client.send(emailConfig);
    await client.close();

    console.log("Statement email sent successfully to:", to);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending statement email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || "Failed to send email",
          details: error.toString(),
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);