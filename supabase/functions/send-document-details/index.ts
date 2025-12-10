import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
  date?: string;
  companyName?: string;
  message?: string;
  outstandingBalance?: number;
  lineItems?: any[];
  includePaymentTerms?: boolean;
  pdfBase64?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      contactName, 
      documentType, 
      documentNo, 
      amount,
      date,
      companyName = "Master Footwear",
      message,
      outstandingBalance,
      lineItems,
      includePaymentTerms,
      pdfBase64
    }: EmailRequest = await req.json();

    console.log("Sending document email to:", to);
    console.log("Document:", documentType, documentNo);

    let lineItemsHtml = '';
    if (lineItems && lineItems.length > 0) {
      lineItemsHtml = `
        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 10px;">Line Items:</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Description</th>
                <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Quantity</th>
                <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Unit Price</th>
                <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
                  <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                  <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.unit_price.toLocaleString()}</td>
                  <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.line_total.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Build HTML without extra whitespace to prevent encoding issues
    const docDateStr = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
    const lineItemsHtmlStr = lineItemsHtml.replace(/\s+/g, ' ').trim();
    const messageHtml = message ? `<p style="margin:20px 0;background-color:#e8f4fd;padding:10px;border-radius:5px;">${message}</p>` : '';
    const outstandingHtml = outstandingBalance !== undefined ? `<p style="color:#dc2626;"><strong>Outstanding Balance:</strong> Rs. ${outstandingBalance.toLocaleString()}</p>` : '';
    const paymentTermsHtml = includePaymentTerms ? `<div style="background-color:#fef9e7;padding:15px;border-radius:5px;margin:20px 0;"><p style="margin:0;"><strong>Payment Terms:</strong> Payment is due within 30 days of invoice date.</p></div>` : '';
    const pdfNoticeHtml = pdfBase64 ? `<div style="background-color:#dbeafe;padding:10px;border-radius:5px;text-align:center;margin:15px 0;"><strong>Document PDF attached</strong></div>` : '';

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background-color:#1e293b;color:white;padding:20px;text-align:center;"><h1 style="margin:0;font-size:24px;">${companyName}</h1></div><div style="padding:20px;"><h2>${documentType} Details</h2><p>Dear ${contactName},</p><p>Please find the details of your ${documentType.toLowerCase()}:</p><div style="background-color:#f5f5f5;padding:20px;border-radius:5px;margin:20px 0;"><p><strong>${documentType} Number:</strong> ${documentNo}</p><p><strong>Date:</strong> ${docDateStr}</p><p><strong>Amount:</strong> Rs. ${amount.toLocaleString()}</p>${outstandingHtml}</div>${lineItemsHtmlStr}${pdfNoticeHtml}${messageHtml}${paymentTermsHtml}<p>If you have any questions, please don't hesitate to contact us.</p><p>Best regards,<br><strong>${companyName} Accounts Team</strong></p></div><div style="background-color:#1e293b;color:white;padding:15px;text-align:center;font-size:12px;"><p style="margin:0;">${companyName}</p></div></body></html>`;

    // Create SMTP client - trim values to remove any trailing whitespace
    const smtpHost = (Deno.env.get("SMTP_HOST") || "server.cloudmail.lk").trim();
    const smtpPort = parseInt((Deno.env.get("SMTP_PORT") || "465").trim());
    const smtpUser = (Deno.env.get("SMTP_USER") || "").trim();
    const smtpPass = (Deno.env.get("SMTP_PASS") || "").trim();
    
    const fromEmail = (Deno.env.get("SMTP_FROM_EMAIL") || "info@masterfootwear.lk").trim();
    const fromName = (Deno.env.get("SMTP_FROM_NAME") || "Master Footwear").trim();

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
      subject: `${documentType} ${documentNo} - ${companyName}`,
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfBase64) {
      emailConfig.attachments = [
        {
          filename: `${documentType.replace(/\s+/g, '_')}_${documentNo}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ];
    }

    await client.send(emailConfig);
    await client.close();

    console.log("Email sent successfully to:", to);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: {
          message: error.message || "Failed to send email",
          details: error.toString()
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
