import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, FileText, Printer, Truck, Warehouse, Download, Send, CheckSquare, FileSpreadsheet } from "lucide-react";
import { SendDocumentDropdown } from "@/components/documents/SendDocumentDropdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import { exportToExcel } from "@/lib/export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MergedLineItem {
  artNo: string;
  color: string;
  sizes: { [key: number]: number };
  totalPairs: number;
  unitPrice: number;
  lineTotal: number;
  orders: string[];
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [orderToConvert, setOrderToConvert] = useState<any>(null);
  const [convertOrderLines, setConvertOrderLines] = useState<any[]>([]);
  const [convertStockType, setConvertStockType] = useState<'lorry' | 'store'>('lorry');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  
  // Merged orders preview state
  const [mergedPreviewOpen, setMergedPreviewOpen] = useState(false);
  const [mergedData, setMergedData] = useState<MergedLineItem[]>([]);
  const [mergedOrdersInfo, setMergedOrdersInfo] = useState<any[]>([]);
  const [showPriceTotal, setShowPriceTotal] = useState(true);
  
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('orders');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profileData?.company_id) {
        toast.error("Company not found");
        return;
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:contacts(id, code, name, area, district, email, whatsapp, phone)
        `)
        .eq('company_id', profileData.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);

      // Fetch company data for SendDocumentDropdown
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .single();
      setCompanyData(company);
    } catch (error: any) {
      toast.error("Error fetching orders: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (order: any) => {
    try {
      const { data: lines, error } = await supabase
        .from("sales_order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("line_no", { ascending: true });

      if (error) throw error;

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
        .single();

      if (companyError) throw companyError;

      setSelectedOrder(order);
      setOrderLines(lines || []);
      setCompanyData(company);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast.error("Error loading order details: " + error.message);
    }
  };

  const handleEdit = (order: any) => {
    navigate(`/sales/orders/edit/${order.id}`);
  };

  const handlePrint = async (order: any) => {
    try {
      const { data: lines } = await supabase
        .from("sales_order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("line_no", { ascending: true});

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
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
            <title>Order ${order.order_no}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .company-info { flex: 1; }
              .company-logo { width: 120px; height: auto; }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .company-details { font-size: 12px; color: #666; }
              .order-title { text-align: center; font-size: 28px; font-weight: bold; margin: 20px 0; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail-item { margin-bottom: 10px; }
              .detail-label { font-size: 12px; color: #666; }
              .detail-value { font-weight: 600; }
              .line-items { margin: 30px 0; }
              table { width: 100%; border-collapse: collapse; }
              th { background: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
              td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
              .size-col { text-align: center; width: 50px; }
              .total-section { margin-top: 30px; float: right; width: 300px; }
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .total-row.grand { font-weight: bold; font-size: 16px; border-top: 2px solid #333; margin-top: 10px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-info">
                ${company?.logo_url ? `<img src="${company.logo_url}" class="company-logo" />` : ''}
                <div class="company-name">${company?.name || ''}</div>
                <div class="company-details">
                  ${company?.address || ''}<br/>
                  ${company?.phone || ''} | ${company?.email || ''}
                </div>
              </div>
            </div>
            
            <div class="order-title">SALES ORDER</div>
            
            <div class="details-grid">
              <div>
                <div class="detail-item">
                  <div class="detail-label">Order No</div>
                  <div class="detail-value">${order.order_no}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Order Date</div>
                  <div class="detail-value">${new Date(order.order_date).toLocaleDateString()}</div>
                </div>
                ${order.delivery_date ? `
                  <div class="detail-item">
                    <div class="detail-label">Delivery Date</div>
                    <div class="detail-value">${new Date(order.delivery_date).toLocaleDateString()}</div>
                  </div>
                ` : ''}
              </div>
              <div>
                <div class="detail-item">
                  <div class="detail-label">Customer</div>
                  <div class="detail-value">${order.customer?.name || ''}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Status</div>
                  <div class="detail-value">${order.status || 'draft'}</div>
                </div>
              </div>
            </div>

            <div class="line-items">
              <table>
                <thead>
                  <tr>
                    <th>Art No / Color</th>
                    <th class="size-col">39</th>
                    <th class="size-col">40</th>
                    <th class="size-col">41</th>
                    <th class="size-col">42</th>
                    <th class="size-col">43</th>
                    <th class="size-col">44</th>
                    <th class="size-col">45</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.values(groupedLines).map((line: any) => `
                    <tr>
                      <td>${line.description}</td>
                      <td class="size-col">${line.sizes[39] || '-'}</td>
                      <td class="size-col">${line.sizes[40] || '-'}</td>
                      <td class="size-col">${line.sizes[41] || '-'}</td>
                      <td class="size-col">${line.sizes[42] || '-'}</td>
                      <td class="size-col">${line.sizes[43] || '-'}</td>
                      <td class="size-col">${line.sizes[44] || '-'}</td>
                      <td class="size-col">${line.sizes[45] || '-'}</td>
                      <td>${line.unit_price?.toFixed(2)}</td>
                      <td>${line.line_total?.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              ${order.discount ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>${order.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${order.tax_total ? `
                <div class="total-row">
                  <span>Tax:</span>
                  <span>${order.tax_total.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>${(order.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div style="clear: both; margin-top: 100px; display: flex; justify-content: space-between;">
              <div style="flex: 1; text-align: center; padding: 0 20px;">
                <div style="border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px auto;"></div>
                <div style="font-size: 12px; color: #666;">Customer Signature</div>
              </div>
              <div style="flex: 1; text-align: center; padding: 0 20px;">
                <div style="border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px auto;"></div>
                <div style="font-size: 12px; color: #666;">Sales Rep Signature</div>
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
      toast.error("Error printing order: " + error.message);
    }
  };

  const handleDownloadPDF = async (order: any) => {
    try {
      const { data: lines } = await supabase
        .from("sales_order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("line_no", { ascending: true });

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
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
      doc.text("SALES ORDER", pageWidth - 14, 20, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Order No: ${order.order_no}`, pageWidth - 14, 27, { align: "right" });
      doc.text(`Date: ${new Date(order.order_date).toLocaleDateString()}`, pageWidth - 14, 32, { align: "right" });

      // Line under header
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      // Customer & Order info
      doc.setFontSize(10);
      doc.text(`Customer: ${order.customer?.name || ""}`, 14, 48);
      doc.text(`City: ${order.customer?.area || order.customer?.district || "-"}`, 14, 54);
      doc.text(`Status: ${order.status || "draft"}`, 14, 60);

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
        startY: 68,
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
      doc.text(`Grand Total: ${(order.grand_total || 0).toFixed(2)}`, pageWidth - 14, finalY, { align: "right" });

      // Create filename with shop name, city, and order number
      const shopName = (order.customer?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const cityName = (order.customer?.area || order.customer?.district || 'City').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const fileName = `${shopName}_${cityName}_${order.order_no}.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      toast.error("Error downloading PDF: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;

    requirePassword(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('sales_orders')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id
          })
          .eq('id', orderToDelete.id);

        if (error) throw error;

        toast.success("Order moved to trash");
        fetchOrders();
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
      } catch (error: any) {
        toast.error("Error deleting order: " + error.message);
      }
    });
  };

  const handleConvertToInvoice = async (order: any) => {
    try {
      // Fetch order lines
      const { data: orderLines, error: linesError } = await supabase
        .from('sales_order_lines')
        .select('*')
        .eq('order_id', order.id)
        .order('line_no', { ascending: true });

      if (linesError) throw linesError;
      if (!orderLines || orderLines.length === 0) {
        toast.error("Cannot convert order with no line items");
        return;
      }

      // Fetch company data for preview
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
        .single();

      if (companyError) throw companyError;

      setOrderToConvert(order);
      setConvertOrderLines(orderLines);
      setCompanyData(company);
      setConvertDialogOpen(true);
    } catch (error: any) {
      toast.error("Error loading order: " + error.message);
    }
  };

  const confirmConvertToInvoice = async () => {
    if (!orderToConvert) return;

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate invoice number
      const invoice_no = `INV-${Date.now()}`;

      // Create invoice with stock_type
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: orderToConvert.company_id,
          customer_id: orderToConvert.customer_id,
          invoice_no,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: orderToConvert.delivery_date,
          notes: orderToConvert.notes ? `Converted from Order ${orderToConvert.order_no}\n${orderToConvert.notes}` : `Converted from Order ${orderToConvert.order_no}`,
          subtotal: orderToConvert.subtotal,
          tax_total: orderToConvert.tax_total,
          discount: orderToConvert.discount,
          grand_total: orderToConvert.grand_total,
          status: 'draft',
          posted: false,
          stock_type: convertStockType,
          terms: orderToConvert.terms,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines from order lines with stock_type
      const invoiceLines = convertOrderLines.map((line: any) => ({
        invoice_id: newInvoice.id,
        item_id: line.item_id,
        line_no: line.line_no,
        description: line.description,
        quantity: line.quantity,
        size_39: line.size_39,
        size_40: line.size_40,
        size_41: line.size_41,
        size_42: line.size_42,
        size_43: line.size_43,
        size_44: line.size_44,
        size_45: line.size_45,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        tax_amount: line.tax_amount,
        line_total: line.line_total,
        account_id: line.account_id,
        stock_type: convertStockType,
      }));

      const { error: invoiceLinesError } = await supabase
        .from('invoice_lines')
        .insert(invoiceLines);

      if (invoiceLinesError) throw invoiceLinesError;

      // Post the invoice to trigger stock deduction
      const { error: postError } = await supabase
        .from('invoices')
        .update({
          posted: true,
          posted_at: new Date().toISOString(),
          posted_by: user.id,
          status: 'approved',
        })
        .eq('id', newInvoice.id);

      if (postError) throw postError;

      toast.success(`Order ${orderToConvert.order_no} converted to Invoice ${invoice_no}. Stock deducted from ${convertStockType === 'lorry' ? 'Lorry' : 'Warehouse'}.`);
      
      // Update order status
      await supabase
        .from('sales_orders')
        .update({ status: 'delivered' })
        .eq('id', orderToConvert.id);

      setConvertDialogOpen(false);
      setOrderToConvert(null);
      setConvertOrderLines([]);
      setConvertStockType('lorry');
      fetchOrders();
    } catch (error: any) {
      toast.error("Error converting to invoice: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: "secondary",
      confirmed: "default",
      processing: "outline",
      ready: "default",
      delivered: "default",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const filteredOrders = orders.filter((order) =>
    order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter pending orders only
  const pendingOrders = filteredOrders.filter(order => order.status === 'pending');

  // Check if all pending orders are selected
  const allPendingSelected = pendingOrders.length > 0 && pendingOrders.every(order => selectedOrderIds.has(order.id));

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedOrderIds);
      pendingOrders.forEach(order => newSelected.add(order.id));
      setSelectedOrderIds(newSelected);
    } else {
      const newSelected = new Set(selectedOrderIds);
      pendingOrders.forEach(order => newSelected.delete(order.id));
      setSelectedOrderIds(newSelected);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const handleMergePreview = async () => {
    if (selectedOrderIds.size === 0) {
      toast.error("Please select at least one pending order");
      return;
    }

    try {
      // Get all selected orders with their lines
      const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
      
      // Fetch all order lines for selected orders
      const { data: allLines, error } = await supabase
        .from("sales_order_lines")
        .select("*")
        .in("order_id", Array.from(selectedOrderIds))
        .order("line_no", { ascending: true });

      if (error) throw error;

      // Group by Art No (Design Number)
      const groupedByDesign: { [key: string]: MergedLineItem } = {};
      
      selectedOrders.forEach(order => {
        const orderLines = allLines?.filter(line => line.order_id === order.id) || [];
        
        orderLines.forEach(line => {
          const parts = (line.description || "").split(" - ");
          const artNo = parts[0]?.trim() || "-";
          const color = parts[1]?.trim() || "-";
          const key = `${artNo}|||${color}`;
          
          if (!groupedByDesign[key]) {
            groupedByDesign[key] = {
              artNo,
              color,
              sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
              totalPairs: 0,
              unitPrice: line.unit_price || 0,
              lineTotal: 0,
              orders: []
            };
          }
          
          groupedByDesign[key].sizes[39] += line.size_39 || 0;
          groupedByDesign[key].sizes[40] += line.size_40 || 0;
          groupedByDesign[key].sizes[41] += line.size_41 || 0;
          groupedByDesign[key].sizes[42] += line.size_42 || 0;
          groupedByDesign[key].sizes[43] += line.size_43 || 0;
          groupedByDesign[key].sizes[44] += line.size_44 || 0;
          groupedByDesign[key].sizes[45] += line.size_45 || 0;
          groupedByDesign[key].lineTotal += line.line_total || 0;
          
          if (!groupedByDesign[key].orders.includes(order.order_no)) {
            groupedByDesign[key].orders.push(order.order_no);
          }
        });
      });

      // Convert to array and sort by Art No
      const mergedItems = Object.values(groupedByDesign)
        .map(item => ({
          ...item,
          totalPairs: Object.values(item.sizes).reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => a.artNo.localeCompare(b.artNo));

      setMergedData(mergedItems);
      setMergedOrdersInfo(selectedOrders);
      setMergedPreviewOpen(true);
    } catch (error: any) {
      toast.error("Error loading orders: " + error.message);
    }
  };

  const handleExportMergedExcel = () => {
    const exportData: any[] = mergedData.map(item => {
      const row: any = {
        "Art No": item.artNo,
        "Color": item.color,
        "Size 39": item.sizes[39] || 0,
        "Size 40": item.sizes[40] || 0,
        "Size 41": item.sizes[41] || 0,
        "Size 42": item.sizes[42] || 0,
        "Size 43": item.sizes[43] || 0,
        "Size 44": item.sizes[44] || 0,
        "Size 45": item.sizes[45] || 0,
        "Total Pairs": item.totalPairs,
      };
      if (showPriceTotal) {
        row["Unit Price"] = item.unitPrice;
        row["Line Total"] = item.lineTotal;
      }
      row["Orders"] = item.orders.join(", ");
      return row;
    });

    // Add summary row
    const totalPairs = mergedData.reduce((sum, item) => sum + item.totalPairs, 0);
    const grandTotal = mergedData.reduce((sum, item) => sum + item.lineTotal, 0);
    
    const summaryRow: any = {
      "Art No": "",
      "Color": "GRAND TOTAL",
      "Size 39": mergedData.reduce((sum, item) => sum + (item.sizes[39] || 0), 0),
      "Size 40": mergedData.reduce((sum, item) => sum + (item.sizes[40] || 0), 0),
      "Size 41": mergedData.reduce((sum, item) => sum + (item.sizes[41] || 0), 0),
      "Size 42": mergedData.reduce((sum, item) => sum + (item.sizes[42] || 0), 0),
      "Size 43": mergedData.reduce((sum, item) => sum + (item.sizes[43] || 0), 0),
      "Size 44": mergedData.reduce((sum, item) => sum + (item.sizes[44] || 0), 0),
      "Size 45": mergedData.reduce((sum, item) => sum + (item.sizes[45] || 0), 0),
      "Total Pairs": totalPairs,
    };
    if (showPriceTotal) {
      summaryRow["Unit Price"] = "";
      summaryRow["Line Total"] = grandTotal;
    }
    summaryRow["Orders"] = "";
    exportData.push(summaryRow);

    exportToExcel(`pending-orders-merged-${new Date().toISOString().split('T')[0]}`, exportData, "Pending Orders");
    toast.success(`Exported ${selectedOrderIds.size} pending orders to Excel`);
  };

  const handleExportMergedPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyData?.name || "Company", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyData?.address || "", 14, 27);
    doc.text(`Tel: ${companyData?.phone || ""} | Email: ${companyData?.email || ""}`, 14, 32);

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MERGED PENDING ORDERS", pageWidth / 2, 45, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Orders: ${mergedOrdersInfo.map(o => o.order_no).join(", ")}`, pageWidth - 14, 27, { align: "right" });

    // Table
    const tableData = mergedData.map(item => {
      const row: any[] = [
        item.artNo,
        item.color,
        item.sizes[39] || "-",
        item.sizes[40] || "-",
        item.sizes[41] || "-",
        item.sizes[42] || "-",
        item.sizes[43] || "-",
        item.sizes[44] || "-",
        item.sizes[45] || "-",
        item.totalPairs,
      ];
      if (showPriceTotal) {
        row.push(item.unitPrice.toFixed(2));
        row.push(item.lineTotal.toFixed(2));
      }
      return row;
    });

    // Add totals row
    const totalPairs = mergedData.reduce((sum, item) => sum + item.totalPairs, 0);
    const grandTotal = mergedData.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalsRow: any[] = [
      "",
      "GRAND TOTAL",
      mergedData.reduce((sum, item) => sum + (item.sizes[39] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[40] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[41] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[42] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[43] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[44] || 0), 0),
      mergedData.reduce((sum, item) => sum + (item.sizes[45] || 0), 0),
      totalPairs,
    ];
    if (showPriceTotal) {
      totalsRow.push("");
      totalsRow.push(grandTotal.toFixed(2));
    }
    tableData.push(totalsRow);

    const headers = showPriceTotal 
      ? [["Art No", "Color", "39", "40", "41", "42", "43", "44", "45", "Pairs", "Price", "Total"]]
      : [["Art No", "Color", "39", "40", "41", "42", "43", "44", "45", "Pairs"]];

    const columnStyles: any = {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      9: { halign: "center", fontStyle: "bold" },
    };
    if (showPriceTotal) {
      columnStyles[10] = { halign: "right" };
      columnStyles[11] = { halign: "right" };
    }

    autoTable(doc, {
      startY: 55,
      head: headers,
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles,
      didParseCell: function(data) {
        // Bold the totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`pending-orders-merged-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF downloaded successfully");
  };

  const handlePrintMerged = () => {
    const totalPairs = mergedData.reduce((sum, item) => sum + item.totalPairs, 0);
    const grandTotal = mergedData.reduce((sum, item) => sum + item.lineTotal, 0);

    const priceHeaders = showPriceTotal ? `
                <th>Price</th>
                <th>Total</th>` : '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Merged Pending Orders</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-info { flex: 1; }
            .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 11px; color: #666; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0; }
            .info { font-size: 11px; color: #666; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 10px; }
            td { padding: 6px; border: 1px solid #ddd; font-size: 11px; }
            .size-col { text-align: center; width: 45px; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div class="company-name">${companyData?.name || ''}</div>
              <div class="company-details">
                ${companyData?.address || ''}<br/>
                ${companyData?.phone || ''} | ${companyData?.email || ''}
              </div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Orders: ${mergedOrdersInfo.length}</div>
            </div>
          </div>
          
          <div class="title">MERGED PENDING ORDERS</div>
          <div class="info">Orders: ${mergedOrdersInfo.map(o => o.order_no).join(", ")}</div>

          <table>
            <thead>
              <tr>
                <th>Art No</th>
                <th>Color</th>
                <th class="size-col">39</th>
                <th class="size-col">40</th>
                <th class="size-col">41</th>
                <th class="size-col">42</th>
                <th class="size-col">43</th>
                <th class="size-col">44</th>
                <th class="size-col">45</th>
                <th class="size-col">Pairs</th>
                ${priceHeaders}
              </tr>
            </thead>
            <tbody>
              ${mergedData.map(item => `
                <tr>
                  <td>${item.artNo}</td>
                  <td>${item.color}</td>
                  <td class="size-col">${item.sizes[39] || '-'}</td>
                  <td class="size-col">${item.sizes[40] || '-'}</td>
                  <td class="size-col">${item.sizes[41] || '-'}</td>
                  <td class="size-col">${item.sizes[42] || '-'}</td>
                  <td class="size-col">${item.sizes[43] || '-'}</td>
                  <td class="size-col">${item.sizes[44] || '-'}</td>
                  <td class="size-col">${item.sizes[45] || '-'}</td>
                  <td class="size-col" style="font-weight: bold;">${item.totalPairs}</td>
                  ${showPriceTotal ? `<td style="text-align: right;">${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right;">${item.lineTotal.toFixed(2)}</td>` : ''}
                </tr>
              `).join('')}
              <tr class="total-row">
                <td></td>
                <td>GRAND TOTAL</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[39] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[40] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[41] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[42] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[43] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[44] || 0), 0)}</td>
                <td class="size-col">${mergedData.reduce((sum, item) => sum + (item.sizes[45] || 0), 0)}</td>
                <td class="size-col">${totalPairs}</td>
                ${showPriceTotal ? `<td></td>
                <td style="text-align: right;">${grandTotal.toFixed(2)}</td>` : ''}
              </tr>
            </tbody>
          </table>
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
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <Button asChild>
          <Link to="/sales/invoices/create">
            <Plus className="h-4 w-4 mr-2" />
            Add Order
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        {selectedOrderIds.size > 0 && (
          <Button onClick={handleMergePreview} className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Preview & Export ({selectedOrderIds.size})
          </Button>
        )}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={handleSelectAllPending}
                      title="Select all pending orders"
                    />
                  </div>
                </TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {order.status === 'pending' ? (
                        <Checkbox
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{order.order_no}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{order.customer?.code ? `${order.customer.code} - ${order.customer.name}` : order.customer?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{order.customer?.area || order.customer?.district || '-'}</TableCell>
                    <TableCell>
                      {order.delivery_date 
                        ? new Date(order.delivery_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {order.currency_code} {Number(order.grand_total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(order)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(order)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(order)}
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <SendDocumentDropdown
                          documentType="order"
                          document={order}
                          customer={order.customer}
                          companyData={companyData}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(order)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConvertToInvoice(order)}
                          title="Convert to Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setOrderToDelete(order);
                            setDeleteDialogOpen(true);
                          }}
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
        </div>
      )}


      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectedOrder && handlePrint(selectedOrder)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectedOrder && handleDownloadPDF(selectedOrder)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedOrder && (
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
                  <div className="text-3xl font-bold text-primary mb-2">SALES ORDER</div>
                  <div className="text-lg font-semibold">#{selectedOrder.order_no}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Date: {new Date(selectedOrder.order_date).toLocaleDateString()}
                  </div>
                  {selectedOrder.delivery_date && (
                    <div className="text-sm text-muted-foreground">
                      Delivery: {new Date(selectedOrder.delivery_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Grid - 3 columns like Invoice */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div className="text-sm font-semibold text-primary mb-3">ORDER FOR:</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{selectedOrder.customer?.name || "N/A"}</div>
                    {selectedOrder.customer?.area && (
                      <div className="text-sm text-muted-foreground">{selectedOrder.customer.area}</div>
                    )}
                    {selectedOrder.customer?.phone && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Tel:</span>
                        <span className="font-medium">{selectedOrder.customer.phone}</span>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-border">
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-primary mb-2">ORDER INFORMATION:</div>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Order Date:</span>{" "}
                      <span className="font-medium">{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                    </div>
                    {selectedOrder.delivery_date && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Delivery Date:</span>{" "}
                        <span className="font-medium">{new Date(selectedOrder.delivery_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-primary mb-2">TERMS:</div>
                  <div className="text-sm">
                    {selectedOrder.terms || "Standard terms"}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="text-sm font-semibold text-primary mb-3">ORDER ITEMS</div>
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
                        const groupedLines = orderLines.reduce((acc, line) => {
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
                          acc[key].totalPairs += line.quantity || 0;
                          acc[key].lineTotal += line.line_total || 0;
                          
                          return acc;
                        }, {} as Record<string, any>);

                        return Object.values(groupedLines).map((group: any, idx: number) => (
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
                        ));
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
                    <span className="font-mono">{selectedOrder.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tax:</span>
                    <span className="font-mono">{selectedOrder.tax_total?.toFixed(2) || "0.00"}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span className="font-medium">Discount:</span>
                      <span className="font-mono">-{selectedOrder.discount?.toFixed(2) || "0.00"}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary pt-2 mt-2"></div>
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono">{selectedOrder.grand_total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedOrder.notes && (
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-primary mb-2">NOTES:</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {orderToDelete?.order_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Delete Order"
        description="Please enter the action password to delete this order."
      />

      {/* Convert to Invoice Confirmation Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convert Order to Invoice</DialogTitle>
          </DialogHeader>

          {orderToConvert && (
            <div className="space-y-6">
              {/* Stock Type Selection */}
              <div className="bg-muted/50 rounded-lg p-4 border">
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Stock to Deduct From:
                </Label>
                <RadioGroup 
                  value={convertStockType} 
                  onValueChange={(value: 'lorry' | 'store') => setConvertStockType(value)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lorry" id="convert-lorry" />
                    <Label 
                      htmlFor="convert-lorry" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span>Lorry Stock</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="store" id="convert-store" />
                    <Label 
                      htmlFor="convert-store" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Warehouse className="h-4 w-4 text-emerald-500" />
                      <span>Warehouse</span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  Select which stock location to deduct from when converting to invoice.
                </p>
              </div>

              {/* Warning Message */}
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-primary">Convert to Invoice Preview</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Order <span className="font-mono font-bold">{orderToConvert.order_no}</span> will be converted to a new invoice.
                      Stock will be deducted from <span className="font-semibold">{convertStockType === 'lorry' ? 'Lorry Stock' : 'Warehouse'}</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border-2">
                {/* Company Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div className="flex items-start gap-4">
                    {companyData?.logo_url && (
                      <img 
                        src={companyData.logo_url} 
                        alt={companyData.name} 
                        className="h-16 w-16 object-contain"
                      />
                    )}
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-primary">{companyData?.name || "Company Name"}</div>
                      {companyData?.address && (
                        <div className="text-xs text-muted-foreground">{companyData.address}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">INVOICE</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Date: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Customer Section */}
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs font-semibold text-primary mb-1">BILL TO:</div>
                  <div className="font-semibold">{orderToConvert.customer?.name || "N/A"}</div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead className="text-xs font-bold">Art No</TableHead>
                        <TableHead className="text-xs font-bold">Description</TableHead>
                        <TableHead className="text-xs text-center font-bold">Color</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">39</TableHead>
                        <TableHead className="text-xs text-center font-bold">40</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">41</TableHead>
                        <TableHead className="text-xs text-center font-bold">42</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">43</TableHead>
                        <TableHead className="text-xs text-center font-bold">44</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">45</TableHead>
                        <TableHead className="text-xs text-center font-bold">Pairs</TableHead>
                        <TableHead className="text-xs text-right font-bold">Price</TableHead>
                        <TableHead className="text-xs text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group lines by Art No and Color
                        const groupedLines = convertOrderLines.reduce((acc, line) => {
                          const parts = (line.description || "").split(" - ");
                          const artNo = parts[0] || "-";
                          const color = parts[1] || "-";
                          const sizeInfo = parts[2] || "";
                          
                          const key = `${artNo}|||${color}`;
                          
                          if (!acc[key]) {
                            acc[key] = {
                              artNo,
                              color,
                              description: `${artNo} - ${color}`,
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
                          
                          // Check if size columns have data (new format) or parse from description (old format)
                          if (line.size_39 > 0 || line.size_40 > 0 || line.size_41 > 0 || 
                              line.size_42 > 0 || line.size_43 > 0 || line.size_44 > 0 || line.size_45 > 0) {
                            // New format: use size columns
                            acc[key].size_39 += line.size_39 || 0;
                            acc[key].size_40 += line.size_40 || 0;
                            acc[key].size_41 += line.size_41 || 0;
                            acc[key].size_42 += line.size_42 || 0;
                            acc[key].size_43 += line.size_43 || 0;
                            acc[key].size_44 += line.size_44 || 0;
                            acc[key].size_45 += line.size_45 || 0;
                          } else if (sizeInfo) {
                            // Old format: parse size from description
                            const size = sizeInfo.replace("Size ", "").trim();
                            if (size === "39") acc[key].size_39 += line.quantity || 0;
                            else if (size === "40") acc[key].size_40 += line.quantity || 0;
                            else if (size === "41") acc[key].size_41 += line.quantity || 0;
                            else if (size === "42") acc[key].size_42 += line.quantity || 0;
                            else if (size === "43") acc[key].size_43 += line.quantity || 0;
                            else if (size === "44") acc[key].size_44 += line.quantity || 0;
                            else if (size === "45") acc[key].size_45 += line.quantity || 0;
                          }
                          
                          acc[key].totalPairs += line.quantity || 0;
                          acc[key].lineTotal += line.line_total || 0;
                          
                          return acc;
                        }, {} as Record<string, any>);

                        return Object.values(groupedLines).map((group: any, idx: number) => (
                          <TableRow key={`${group.artNo}-${group.color}`} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <TableCell className="text-xs font-mono">{group.artNo}</TableCell>
                            <TableCell className="text-xs">{group.description}</TableCell>
                            <TableCell className="text-xs text-center">{group.color}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_39 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_40 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_41 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_42 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_43 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_44 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_45 || "-"}</TableCell>
                            <TableCell className="text-xs text-center font-semibold">{group.totalPairs}</TableCell>
                            <TableCell className="text-xs text-right">{group.unitPrice?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell className="text-xs text-right font-semibold">{group.lineTotal?.toFixed(2) || "0.00"}</TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 bg-background rounded-lg p-3 border">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-mono">{orderToConvert.subtotal?.toFixed(2) || "0.00"}</span>
                    </div>
                    {orderToConvert.tax_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span className="font-mono">{orderToConvert.tax_total?.toFixed(2) || "0.00"}</span>
                      </div>
                    )}
                    {orderToConvert.discount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Discount:</span>
                        <span className="font-mono">-{orderToConvert.discount?.toFixed(2) || "0.00"}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2"></div>
                    <div className="flex justify-between font-bold text-primary">
                      <span>Grand Total:</span>
                      <span className="font-mono">{orderToConvert.grand_total?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConvertDialogOpen(false);
                    setOrderToConvert(null);
                    setConvertOrderLines([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmConvertToInvoice}
                  className="bg-primary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Confirm & Convert to Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merged Orders Preview Dialog */}
      <Dialog open={mergedPreviewOpen} onOpenChange={setMergedPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Merged Pending Orders Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Orders Info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Orders:</span>{" "}
                {mergedOrdersInfo.map(o => o.order_no).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Total Items (grouped by Design):</span>{" "}
                {mergedData.length}
              </p>
            </div>

            {/* Show Price/Total Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPriceTotal"
                checked={showPriceTotal}
                onCheckedChange={(checked) => setShowPriceTotal(checked === true)}
              />
              <Label htmlFor="showPriceTotal" className="text-sm cursor-pointer">
                Show Price & Total columns
              </Label>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Art No</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center w-12">39</TableHead>
                    <TableHead className="text-center w-12">40</TableHead>
                    <TableHead className="text-center w-12">41</TableHead>
                    <TableHead className="text-center w-12">42</TableHead>
                    <TableHead className="text-center w-12">43</TableHead>
                    <TableHead className="text-center w-12">44</TableHead>
                    <TableHead className="text-center w-12">45</TableHead>
                    <TableHead className="text-center font-bold">Pairs</TableHead>
                    {showPriceTotal && (
                      <>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.artNo}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell className="text-center">{item.sizes[39] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[40] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[41] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[42] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[43] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[44] || "-"}</TableCell>
                      <TableCell className="text-center">{item.sizes[45] || "-"}</TableCell>
                      <TableCell className="text-center font-bold">{item.totalPairs}</TableCell>
                      {showPriceTotal && (
                        <>
                          <TableCell className="text-right font-mono">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{item.lineTotal.toFixed(2)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>GRAND TOTAL</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[39] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[40] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[41] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[42] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[43] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[44] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + (item.sizes[45] || 0), 0)}</TableCell>
                    <TableCell className="text-center">{mergedData.reduce((sum, item) => sum + item.totalPairs, 0)}</TableCell>
                    {showPriceTotal && (
                      <>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-mono">{mergedData.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={() => setMergedPreviewOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handlePrintMerged}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportMergedExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={handleExportMergedPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
