import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Edit, Trash2, Printer, Send, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SendDocumentDropdown } from "@/components/documents/SendDocumentDropdown";
import { supabase } from "@/integrations/supabase/client";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Truck, Warehouse, Trash } from "lucide-react";

type StatusFilter = "all" | "draft" | "approved" | "paid";

export default function Invoices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [stockRestoreType, setStockRestoreType] = useState<'lorry' | 'store' | 'bin'>('lorry');
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('invoices');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:contacts(name, area, phone, district, email, whatsapp)
        `,
        )
        .is('deleted_at', null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);

      // Fetch company data for SendDocumentDropdown
      if (data && data.length > 0) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", data[0].company_id)
          .single();
        setCompanyData(company);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "approved":
        return "bg-blue-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  // 🔎 Search + Status filter
  const filteredInvoices = invoices.filter((invoice) => {
    const term = searchTerm.trim().toLowerCase();

    // status filter
    if (statusFilter !== "all" && invoice.status !== statusFilter) {
      return false;
    }

    if (!term) return true;

    const invoiceNo = String(invoice.invoice_no || "").toLowerCase();
    const customerName = String(invoice.customer?.name || "").toLowerCase();
    const city = String(invoice.customer?.area || "").toLowerCase();
    const status = String(invoice.status || "").toLowerCase();

    return invoiceNo.includes(term) || customerName.includes(term) || city.includes(term) || status.includes(term);
  });

  const handleView = async (invoice: any) => {
    try {
      const { data: lines, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("line_no", { ascending: true });

      if (error) throw error;

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", invoice.company_id)
        .single();

      if (companyError) throw companyError;

      setSelectedInvoice(invoice);
      setInvoiceLines(lines || []);
      setCompanyData(company);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (invoice: any) => {
    navigate(`/sales/invoices/edit/${invoice.id}`);
  };

  const handleDeleteRequest = (invoice: any) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    requirePassword(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get user's company_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.company_id) throw new Error("No company assigned to user");

        // Fetch invoice lines before soft delete
        const { data: invoiceLines } = await supabase
          .from("invoice_lines")
          .select("*")
          .eq("invoice_id", invoiceToDelete.id);

        // Only restore stock if NOT bin option selected
        if (stockRestoreType !== 'bin' && invoiceLines && invoiceLines.length > 0) {
          for (const line of invoiceLines) {
            if (!line.item_id) continue;

            const sizes = [
              { size: '39', qty: line.size_39 || 0 },
              { size: '40', qty: line.size_40 || 0 },
              { size: '41', qty: line.size_41 || 0 },
              { size: '42', qty: line.size_42 || 0 },
              { size: '43', qty: line.size_43 || 0 },
              { size: '44', qty: line.size_44 || 0 },
              { size: '45', qty: line.size_45 || 0 },
            ];

            for (const { size, qty } of sizes) {
              if (qty <= 0) continue;

              // Restore to the selected stock type (lorry or store)
              const { data: existingStock } = await supabase
                .from('stock_by_size')
                .select('id, quantity')
                .eq('item_id', line.item_id)
                .eq('size', size)
                .eq('stock_type', stockRestoreType)
                .eq('company_id', profile.company_id)
                .maybeSingle();

              if (existingStock) {
                const newQuantity = (existingStock.quantity || 0) + qty;
                await supabase
                  .from('stock_by_size')
                  .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                  .eq('id', existingStock.id);
              } else {
                await supabase
                  .from('stock_by_size')
                  .insert({
                    company_id: profile.company_id,
                    item_id: line.item_id,
                    size,
                    stock_type: stockRestoreType,
                    quantity: qty,
                  });
              }

              // Also update main stock
              const { data: mainStock } = await supabase
                .from('stock_by_size')
                .select('id, quantity')
                .eq('item_id', line.item_id)
                .eq('size', size)
                .eq('stock_type', 'main')
                .eq('company_id', profile.company_id)
                .maybeSingle();

              if (mainStock) {
                const newMainQty = (mainStock.quantity || 0) + qty;
                await supabase
                  .from('stock_by_size')
                  .update({ quantity: newMainQty, updated_at: new Date().toISOString() })
                  .eq('id', mainStock.id);
              } else {
                await supabase
                  .from('stock_by_size')
                  .insert({
                    company_id: profile.company_id,
                    item_id: line.item_id,
                    size,
                    stock_type: 'main',
                    quantity: qty,
                  });
              }
            }
          }
        }

        // Update invoice lines with the selected stock_type for reference when restoring (skip for bin)
        if (stockRestoreType !== 'bin') {
          await supabase
            .from("invoice_lines")
            .update({ stock_type: stockRestoreType })
            .eq("invoice_id", invoiceToDelete.id);
        }

        // Soft delete invoice (keep lines intact for restore)
        const { error } = await supabase
          .from("invoices")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id,
            stock_type: stockRestoreType === 'bin' ? 'bin' : stockRestoreType
          })
          .eq("id", invoiceToDelete.id);

        if (error) throw error;

        const successMessage = stockRestoreType === 'bin' 
          ? 'Invoice moved to trash. Stock discarded (not restored to inventory).'
          : `Invoice moved to trash and stock restored to ${stockRestoreType === 'lorry' ? 'Lorry Stock' : 'Warehouse'}.`;

        toast({
          title: "Success",
          description: successMessage,
        });

        setDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        setStockRestoreType('lorry');
        fetchInvoices();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handlePrint = async (invoice: any) => {
    try {
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("line_no", { ascending: true });

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", invoice.company_id)
        .single();

      const groupedLines = (lines || []).reduce((acc: any, line: any) => {
        const key = `${line.description}-${line.item_id || 'no-item'}`;
        if (!acc[key]) {
          acc[key] = {
            description: line.description,
            unit_price: line.unit_price,
            sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
            line_total: 0
          };
        }
        acc[key].sizes[39] += line.size_39 || 0;
        acc[key].sizes[40] += line.size_40 || 0;
        acc[key].sizes[41] += line.size_41 || 0;
        acc[key].sizes[42] += line.size_42 || 0;
        acc[key].sizes[43] += line.size_43 || 0;
        acc[key].sizes[44] += line.size_44 || 0;
        acc[key].sizes[45] += line.size_45 || 0;
        acc[key].line_total += line.line_total || 0;
        return acc;
      }, {});

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice.invoice_no}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
              .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
              .company-info { flex: 1; }
              .company-logo { width: 100px; height: auto; margin-bottom: 8px; }
              .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
              .company-details { font-size: 11px; color: #666; }
              .invoice-header { text-align: right; }
              .invoice-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
              .invoice-no { font-size: 14px; font-weight: 600; }
              .invoice-date { font-size: 11px; color: #666; margin-top: 5px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
              .info-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
              .info-title { font-size: 11px; font-weight: bold; color: #333; margin-bottom: 8px; text-transform: uppercase; }
              .customer-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
              .customer-detail { font-size: 11px; color: #666; margin-bottom: 2px; }
              .customer-phone { font-size: 11px; margin-top: 6px; }
              .customer-phone span { color: #666; }
              .customer-phone strong { color: #333; }
              .line-items { margin: 15px 0; }
              table { width: 100%; border-collapse: collapse; }
              th { background: #f0f0f0; padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; font-weight: bold; }
              td { padding: 6px; border: 1px solid #ddd; font-size: 11px; }
              .size-col { text-align: center; width: 35px; }
              .total-pairs { text-align: center; font-weight: 600; }
              .price-col { text-align: right; }
              .total-section { margin-top: 20px; float: right; width: 250px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
              .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
              .total-row.grand { font-weight: bold; font-size: 14px; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
              .signature-section { clear: both; margin-top: 280px; display: flex; justify-content: space-between; }
              .signature-box { flex: 1; text-align: center; padding: 0 30px; }
              .signature-line { border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px auto; }
              .signature-label { font-size: 11px; color: #666; }
              @media print { body { padding: 10px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-info">
                ${company?.logo_url ? `<img src="${company.logo_url}" class="company-logo" />` : ''}
                <div class="company-name">${company?.name || ''}</div>
                <div class="company-details">
                  ${company?.address || ''}<br/>
                  ${company?.phone || ''} ${company?.email ? `| ${company.email}` : ''}
                </div>
              </div>
              <div class="invoice-header">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-no">#${invoice.invoice_no}</div>
                <div class="invoice-date">
                  Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
                  ${invoice.due_date ? `<br/>Due: ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
                </div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-box">
                <div class="info-title">Bill To:</div>
                <div class="customer-name">${invoice.customer?.name || 'N/A'}</div>
                ${invoice.customer?.area ? `<div class="customer-detail">${invoice.customer.area}</div>` : ''}
                ${invoice.customer?.phone ? `<div class="customer-phone"><span>Tel:</span> <strong>${invoice.customer.phone}</strong></div>` : ''}
              </div>
              <div class="info-box">
                <div class="info-title">Payment Information:</div>
                <div style="font-weight: 600;">Payment Method: ${(() => {
                  try {
                    const terms = invoice.terms;
                    if (!terms) return 'Not specified';
                    const parsed = typeof terms === 'string' && terms.startsWith('{') ? JSON.parse(terms) : null;
                    if (parsed?.payment_method) {
                      return parsed.payment_method.charAt(0).toUpperCase() + parsed.payment_method.slice(1);
                    }
                    return terms.charAt(0).toUpperCase() + terms.slice(1);
                  } catch (e) {
                    return invoice.terms || 'Not specified';
                  }
                })()}</div>
              </div>
            </div>

            <div class="line-items">
              <table>
                <thead>
                  <tr>
                    <th>Art No</th>
                    <th>Description</th>
                    <th>Color</th>
                    <th class="size-col">39</th>
                    <th class="size-col">40</th>
                    <th class="size-col">41</th>
                    <th class="size-col">42</th>
                    <th class="size-col">43</th>
                    <th class="size-col">44</th>
                    <th class="size-col">45</th>
                    <th class="size-col">Total</th>
                    <th class="price-col">Unit Price</th>
                    <th class="price-col">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const groupedArray = Object.values(groupedLines) as any[];
                    // Calculate grand totals
                    const grandTotals = groupedArray.reduce((totals: any, line: any) => {
                      totals.sizes[39] += line.sizes[39] || 0;
                      totals.sizes[40] += line.sizes[40] || 0;
                      totals.sizes[41] += line.sizes[41] || 0;
                      totals.sizes[42] += line.sizes[42] || 0;
                      totals.sizes[43] += line.sizes[43] || 0;
                      totals.sizes[44] += line.sizes[44] || 0;
                      totals.sizes[45] += line.sizes[45] || 0;
                      totals.lineTotal += line.line_total || 0;
                      return totals;
                    }, { sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 }, lineTotal: 0 });
                    
                    const grandTotalPairs = grandTotals.sizes[39] + grandTotals.sizes[40] + grandTotals.sizes[41] + grandTotals.sizes[42] + grandTotals.sizes[43] + grandTotals.sizes[44] + grandTotals.sizes[45];
                    
                    const rowsHtml = groupedArray.map((line: any) => {
                      const parts = (line.description || '').split(' - ');
                      const artNo = parts[0] || '-';
                      const color = parts[1] || '-';
                      const totalPairs = (line.sizes[39] || 0) + (line.sizes[40] || 0) + (line.sizes[41] || 0) + (line.sizes[42] || 0) + (line.sizes[43] || 0) + (line.sizes[44] || 0) + (line.sizes[45] || 0);
                      return '<tr>' +
                        '<td>' + artNo + '</td>' +
                        '<td>' + line.description + '</td>' +
                        '<td class="size-col">' + color + '</td>' +
                        '<td class="size-col">' + (line.sizes[39] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[40] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[41] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[42] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[43] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[44] || '-') + '</td>' +
                        '<td class="size-col">' + (line.sizes[45] || '-') + '</td>' +
                        '<td class="total-pairs">' + totalPairs + '</td>' +
                        '<td class="price-col">' + (line.unit_price?.toFixed(2) || '0.00') + '</td>' +
                        '<td class="price-col">' + (line.line_total?.toFixed(2) || '0.00') + '</td>' +
                      '</tr>';
                    }).join('');
                    
                    // Add total row
                    const totalRowHtml = '<tr style="background: #e0e7ff; font-weight: bold; border-top: 2px solid #333;">' +
                      '<td colspan="3" style="font-size: 12px; color: #4338ca;">TOTAL</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[39] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[40] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[41] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[42] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[43] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[44] || '-') + '</td>' +
                      '<td class="size-col" style="color: #4338ca;">' + (grandTotals.sizes[45] || '-') + '</td>' +
                      '<td class="total-pairs" style="font-size: 13px; color: #4338ca;">' + grandTotalPairs + ' <span style="font-size: 9px; color: #666;">pairs</span></td>' +
                      '<td class="price-col"></td>' +
                      '<td class="price-col" style="font-size: 13px; color: #4338ca;">' + grandTotals.lineTotal.toFixed(2) + '</td>' +
                    '</tr>';
                    
                    return rowsHtml + totalRowHtml;
                  })()}
                </tbody>
              </table>
            </div>

            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax:</span>
                <span>${(invoice.tax_total || 0).toFixed(2)}</span>
              </div>
              ${invoice.discount ? `
                <div class="total-row" style="color: #c00;">
                  <span>Discount:</span>
                  <span>-${invoice.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>${(invoice.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Customer Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Sales Rep Signature</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("line_no", { ascending: true });

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", invoice.company_id)
        .single();

      const groupedLines = (lines || []).reduce((acc: any, line: any) => {
        const key = `${line.description}-${line.item_id || 'no-item'}`;
        if (!acc[key]) {
          acc[key] = {
            description: line.description,
            unit_price: line.unit_price,
            sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
            line_total: 0
          };
        }
        acc[key].sizes[39] += line.size_39 || 0;
        acc[key].sizes[40] += line.size_40 || 0;
        acc[key].sizes[41] += line.size_41 || 0;
        acc[key].sizes[42] += line.size_42 || 0;
        acc[key].sizes[43] += line.size_43 || 0;
        acc[key].sizes[44] += line.size_44 || 0;
        acc[key].sizes[45] += line.size_45 || 0;
        acc[key].line_total += line.line_total || 0;
        return acc;
      }, {});

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Company header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(company?.name || "Company", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(company?.address || "", 14, 27);
      doc.text(`Tel: ${company?.phone || ""} | Email: ${company?.email || ""}`, 14, 32);

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth - 14, 20, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: ${invoice.invoice_no}`, pageWidth - 14, 27, { align: "right" });
      doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 14, 32, { align: "right" });

      // Line under header
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      // Customer info
      doc.setFontSize(10);
      doc.text(`Customer: ${invoice.customer?.name || ""}`, 14, 48);
      doc.text(`Status: ${invoice.status || "draft"}`, 14, 54);

      // Table
      const tableData = Object.values(groupedLines).map((line: any) => {
        const totalPairs = line.sizes[39] + line.sizes[40] + line.sizes[41] + line.sizes[42] + line.sizes[43] + line.sizes[44] + line.sizes[45];
        return [
          line.description,
          line.sizes[39] || "-",
          line.sizes[40] || "-",
          line.sizes[41] || "-",
          line.sizes[42] || "-",
          line.sizes[43] || "-",
          line.sizes[44] || "-",
          line.sizes[45] || "-",
          totalPairs,
          line.unit_price?.toFixed(2),
          line.line_total?.toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: 62,
        head: [["Art No / Color", "39", "40", "41", "42", "43", "44", "45", "Pairs", "Price", "Total"]],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
        columnStyles: {
          0: { cellWidth: 40 },
          9: { halign: "right" },
          10: { halign: "right" },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Totals
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: ${(invoice.grand_total || 0).toLocaleString()}`, pageWidth - 14, finalY, { align: "right" });

      doc.save(`invoice-${invoice.invoice_no}.pdf`);
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusFilterLabel = (value: StatusFilter) => {
    switch (value) {
      case "all":
        return "All Statuses";
      case "draft":
        return "Draft";
      case "approved":
        return "Approved";
      case "paid":
        return "Paid";
      default:
        return "All Statuses";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("sales.invoices")}</h1>
          <p className="mt-2 text-muted-foreground">Manage customer invoices</p>
        </div>
        <Button onClick={() => navigate('/sales/invoices/create')}>
          <Plus className="mr-2 h-4 w-4" />
          {t("sales.createInvoice")}
        </Button>
      </div>

      {/* Search + Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{getStatusFilterLabel(statusFilter)}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("approved")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("paid")}>Paid</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Goods Issue By</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.customer?.name || "N/A"}</TableCell>
                    <TableCell>{invoice.customer?.area || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={(() => {
                          try {
                            const terms = invoice.terms;
                            if (!terms) return "cash";
                            const parsed = typeof terms === 'string' && terms.startsWith('{') 
                              ? JSON.parse(terms) 
                              : null;
                            return parsed?.payment_method || terms;
                          } catch {
                            return invoice.terms || "cash";
                          }
                        })()}
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from('invoices')
                              .update({ 
                                terms: value === 'cheque' 
                                  ? JSON.stringify({ payment_method: 'cheque', cheques: [] })
                                  : value 
                              })
                              .eq('id', invoice.id);
                            
                            if (error) throw error;
                            
                            toast({
                              title: "Success",
                              description: "Payment type updated successfully.",
                            });
                            
                            fetchInvoices();
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={invoice.stock_type === 'store' 
                          ? 'border-green-500 text-green-600 bg-green-500/10' 
                          : 'border-blue-500 text-blue-600 bg-blue-500/10'
                        }
                      >
                        {invoice.stock_type === 'store' ? (
                          <span className="flex items-center gap-1">
                            <Warehouse className="h-3 w-3" />
                            Warehouse
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Lorry
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{invoice.grand_total?.toLocaleString() || "0"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>{t(`status.${invoice.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(invoice)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <SendDocumentDropdown
                          documentType="invoice"
                          document={invoice}
                          customer={invoice.customer}
                          companyData={companyData}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(invoice)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(invoice)} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRequest(invoice)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">Invoice Details</DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectedInvoice && handlePrint(selectedInvoice)}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6 p-6 bg-background">
              {/* Company Header with Logo */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-primary">
                <div className="flex items-start gap-6">
                  {companyData?.logo_url && (
                    <img 
                      src={companyData.logo_url} 
                      alt={companyData.name} 
                      className="h-20 w-20 object-contain"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">{companyData?.name || "Company Name"}</div>
                    {companyData?.address && (
                      <div className="text-sm text-muted-foreground">{companyData.address}</div>
                    )}
                    <div className="text-sm text-muted-foreground space-x-4">
                      {companyData?.phone && <span>Tel: {companyData.phone}</span>}
                      {companyData?.email && <span>Email: {companyData.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary mb-2">INVOICE</div>
                  <div className="text-lg font-semibold">#{selectedInvoice.invoice_no}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  </div>
                  {selectedInvoice.due_date && (
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(selectedInvoice.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To Section */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div className="text-sm font-semibold text-primary mb-3">BILL TO:</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{selectedInvoice.customer?.name || "N/A"}</div>
                    {selectedInvoice.customer?.area && (
                      <div className="text-sm text-muted-foreground">{selectedInvoice.customer.area}</div>
                    )}
                    {selectedInvoice.customer?.phone && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Tel:</span>
                        <span className="font-medium">{selectedInvoice.customer.phone}</span>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-border">
                      <Badge className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-primary mb-2">PAYMENT INFORMATION:</div>
                  <div className="space-y-1">
                    {(() => {
                      try {
                        const terms = selectedInvoice.terms;
                        if (!terms) return <div className="text-sm">Payment Method: Not specified</div>;
                        
                        // Try to parse as JSON (for cheque payments)
                        const parsed = typeof terms === 'string' && terms.startsWith('{') 
                          ? JSON.parse(terms) 
                          : null;
                        
                        if (parsed?.payment_method === 'cheque') {
                          return (
                            <div className="space-y-2">
                              <div className="font-semibold">Payment Method: Cheque</div>
                              {parsed.cheques && parsed.cheques.length > 0 && (
                                <div className="space-y-1 text-sm">
                                  <div className="font-medium">Cheque Details:</div>
                                  {parsed.cheques.map((cheque: any, idx: number) => (
                                    <div key={idx} className="pl-2 border-l-2 border-primary/30">
                                      <div>Cheque No: {cheque.cheque_no}</div>
                                      <div>Date: {new Date(cheque.cheque_date).toLocaleDateString()}</div>
                                      <div>Amount: {Number(cheque.cheque_amount).toLocaleString()}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        // Simple payment method (cash/credit)
                        const method = parsed?.payment_method || terms;
                        return (
                          <div className="font-semibold">
                            Payment Method: {method.charAt(0).toUpperCase() + method.slice(1)}
                          </div>
                        );
                      } catch (e) {
                        return <div className="text-sm">Payment Method: {selectedInvoice.terms}</div>;
                      }
                    })()}
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-primary mb-2">GOODS ISSUE BY:</div>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedInvoice.stock_type === 'store' ? (
                      <>
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Warehouse className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Warehouse</div>
                          <div className="text-xs text-muted-foreground">Store Inventory</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Lorry</div>
                          <div className="text-xs text-muted-foreground">Mobile Inventory</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="text-sm font-semibold text-primary mb-3">INVOICE ITEMS</div>
                <div className="overflow-hidden rounded-lg border-2 border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="w-20 font-bold border-r">Art No</TableHead>
                        <TableHead className="min-w-[200px] font-bold border-r">Description</TableHead>
                        <TableHead className="w-20 text-center font-bold border-r">Color</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">39</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">40</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">41</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">42</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">43</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">44</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">45</TableHead>
                        <TableHead className="w-24 text-center font-bold border-r">Total Pairs</TableHead>
                        <TableHead className="w-28 text-right font-bold border-r">Unit Price</TableHead>
                        <TableHead className="w-32 text-right font-bold">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group lines by Art No and Color
                        const groupedLines = invoiceLines.reduce((acc, line) => {
                          const parts = (line.description || "").split(" - ");
                          const artNo = parts[0] || "-";
                          const color = parts[1] || "-";
                          
                          const key = `${artNo}|||${color}`;
                          
                          if (!acc[key]) {
                            acc[key] = {
                              artNo,
                              color,
                              description: line.description,
                              size_39: 0,
                              size_40: 0,
                              size_41: 0,
                              size_42: 0,
                              size_43: 0,
                              size_44: 0,
                              size_45: 0,
                              unitPrice: line.unit_price,
                              totalPairs: 0,
                              lineTotal: 0
                            };
                          }
                          
                          acc[key].size_39 += line.size_39 || 0;
                          acc[key].size_40 += line.size_40 || 0;
                          acc[key].size_41 += line.size_41 || 0;
                          acc[key].size_42 += line.size_42 || 0;
                          acc[key].size_43 += line.size_43 || 0;
                          acc[key].size_44 += line.size_44 || 0;
                          acc[key].size_45 += line.size_45 || 0;
                          // Calculate totalPairs from sizes
                          acc[key].totalPairs = acc[key].size_39 + acc[key].size_40 + acc[key].size_41 + acc[key].size_42 + acc[key].size_43 + acc[key].size_44 + acc[key].size_45;
                          acc[key].lineTotal += line.line_total || 0;
                          
                          return acc;
                        }, {} as Record<string, any>);

                        const groupedArray = Object.values(groupedLines) as any[];
                        
                        // Calculate grand totals
                        const grandTotals = groupedArray.reduce((totals, group) => {
                          const newTotals = {
                            size_39: totals.size_39 + (group.size_39 || 0),
                            size_40: totals.size_40 + (group.size_40 || 0),
                            size_41: totals.size_41 + (group.size_41 || 0),
                            size_42: totals.size_42 + (group.size_42 || 0),
                            size_43: totals.size_43 + (group.size_43 || 0),
                            size_44: totals.size_44 + (group.size_44 || 0),
                            size_45: totals.size_45 + (group.size_45 || 0),
                            totalPairs: 0,
                            lineTotal: totals.lineTotal + (group.lineTotal || 0),
                          };
                          // Calculate totalPairs from size totals
                          newTotals.totalPairs = newTotals.size_39 + newTotals.size_40 + newTotals.size_41 + newTotals.size_42 + newTotals.size_43 + newTotals.size_44 + newTotals.size_45;
                          return newTotals;
                        }, { size_39: 0, size_40: 0, size_41: 0, size_42: 0, size_43: 0, size_44: 0, size_45: 0, totalPairs: 0, lineTotal: 0 });

                        return (
                          <>
                            {groupedArray.map((group: any, idx: number) => (
                              <TableRow key={`${group.artNo}-${group.color}`} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                <TableCell className="font-mono border-r">{group.artNo}</TableCell>
                                <TableCell className="border-r">{group.description}</TableCell>
                                <TableCell className="text-center border-r">{group.color}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_39 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_40 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_41 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_42 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_43 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_44 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_45 || "-"}</TableCell>
                                <TableCell className="text-center font-semibold border-r">{group.totalPairs}</TableCell>
                                <TableCell className="text-right border-r">
                                  {group.unitPrice ? group.unitPrice.toFixed(2) : "0.00"}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {group.lineTotal ? group.lineTotal.toFixed(2) : "0.00"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Totals Row */}
                            <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                              <TableCell className="border-r" colSpan={3}>
                                <span className="text-primary text-base">TOTAL</span>
                              </TableCell>
                              <TableCell className="bg-primary/15 text-center border-r text-primary">{grandTotals.size_39 || "-"}</TableCell>
                              <TableCell className="text-center border-r text-primary">{grandTotals.size_40 || "-"}</TableCell>
                              <TableCell className="bg-primary/15 text-center border-r text-primary">{grandTotals.size_41 || "-"}</TableCell>
                              <TableCell className="text-center border-r text-primary">{grandTotals.size_42 || "-"}</TableCell>
                              <TableCell className="bg-primary/15 text-center border-r text-primary">{grandTotals.size_43 || "-"}</TableCell>
                              <TableCell className="text-center border-r text-primary">{grandTotals.size_44 || "-"}</TableCell>
                              <TableCell className="bg-primary/15 text-center border-r text-primary">{grandTotals.size_45 || "-"}</TableCell>
                              <TableCell className="text-center border-r">
                                <span className="text-lg text-primary">{grandTotals.totalPairs}</span>
                                <span className="text-xs text-muted-foreground ml-1">pairs</span>
                              </TableCell>
                              <TableCell className="text-right border-r"></TableCell>
                              <TableCell className="text-right">
                                <span className="text-lg text-primary">{grandTotals.lineTotal.toFixed(2)}</span>
                              </TableCell>
                            </TableRow>
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary Section */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 bg-muted/30 rounded-lg p-4 border-2 border-border">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-mono">{selectedInvoice.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tax:</span>
                    <span className="font-mono">{selectedInvoice.tax_total?.toFixed(2) || "0.00"}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span className="font-medium">Discount:</span>
                      <span className="font-mono">-{selectedInvoice.discount?.toFixed(2) || "0.00"}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary pt-2 mt-2"></div>
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono">{selectedInvoice.grand_total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedInvoice.notes && (
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-primary mb-2">NOTES:</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="flex justify-between mt-24 pt-12">
                <div className="flex-1 text-center px-4">
                  <div className="border-b border-foreground w-4/5 mx-auto mb-2"></div>
                  <div className="text-sm text-muted-foreground">Customer Signature</div>
                </div>
                <div className="flex-1 text-center px-4">
                  <div className="border-b border-foreground w-4/5 mx-auto mb-2"></div>
                  <div className="text-sm text-muted-foreground">Sales Rep Signature</div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                Thank you for your business!
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Are you sure you want to delete invoice {invoiceToDelete?.invoice_no}?</p>
                
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <Label className="text-sm font-medium text-foreground mb-3 block">
                    Where should the stock be restored to?
                  </Label>
                  <RadioGroup 
                    value={stockRestoreType} 
                    onValueChange={(value: 'lorry' | 'store' | 'bin') => setStockRestoreType(value)}
                    className="grid grid-cols-3 gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lorry" id="restore-lorry" />
                      <Label 
                        htmlFor="restore-lorry" 
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Truck className="h-4 w-4 text-blue-500" />
                        <span>Lorry Stock</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="store" id="restore-store" />
                      <Label 
                        htmlFor="restore-store" 
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Warehouse className="h-4 w-4 text-emerald-500" />
                        <span>Warehouse</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bin" id="restore-bin" />
                      <Label 
                        htmlFor="restore-bin" 
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                        <span>Bin</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stockRestoreType === 'bin' 
                      ? 'Stock will be discarded and NOT restored to any inventory.'
                      : 'Main stock will also be updated automatically.'}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setInvoiceToDelete(null);
              setStockRestoreType('lorry');
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Delete Invoice"
        description="Please enter the action password to delete this invoice."
      />
    </div>
  );
}
