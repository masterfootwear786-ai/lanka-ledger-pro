import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
  outstandingBalance?: number;
  lineItems?: any[];
  includePaymentTerms?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { 
      to, 
      contactName, 
      documentType, 
      documentNo, 
      amount, 
      message,
      outstandingBalance,
      lineItems,
      includePaymentTerms
    }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !contactName || !documentType || !documentNo || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Attempting to send email to:", to);

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

    const emailResponse = await resend.emails.send({
      from: "Documents <onboarding@resend.dev>",
      to: [to],
      subject: `${documentType} ${documentNo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${documentType} Details</h2>
          <p>Dear ${contactName},</p>
          <p>Please find the details of your ${documentType.toLowerCase()}:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>${documentType} Number:</strong> ${documentNo}</p>
            <p><strong>Amount:</strong> ${amount.toLocaleString()}</p>
            ${outstandingBalance !== undefined ? `
              <p style="color: #dc2626;"><strong>Outstanding Balance:</strong> ${outstandingBalance.toLocaleString()}</p>
            ` : ''}
          </div>
          ${lineItemsHtml}
          ${message ? `<p style="margin: 20px 0;">${message}</p>` : ''}
          ${includePaymentTerms ? `
            <div style="background-color: #fef9e7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Payment Terms:</strong> Payment is due within 30 days of invoice date.</p>
            </div>
          ` : ''}
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Accounts Team</p>
        </div>
      `,
    });

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(emailResponse.error.message || "Failed to send email via Resend");
    }

    console.log("Email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify({ success: true, data: emailResponse.data }), {
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
