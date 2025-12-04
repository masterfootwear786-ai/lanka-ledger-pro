import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TrashPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: string;
  itemName: string;
}

export function TrashPreviewDialog({ open, onOpenChange, itemId, itemType, itemName }: TrashPreviewDialogProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      fetchData();
    }
  }, [open, itemId, itemType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (itemType) {
        case 'invoice':
          await fetchInvoice();
          break;
        case 'order':
          await fetchOrder();
          break;
        case 'bill':
          await fetchBill();
          break;
        case 'receipt':
          await fetchReceipt();
          break;
        case 'payment':
          await fetchPayment();
          break;
        case 'return_note':
          await fetchReturnNote();
          break;
        case 'customer':
        case 'supplier':
          await fetchContact();
          break;
        case 'item':
          await fetchItem();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoice = async () => {
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        contacts:customer_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (invoice) {
      const { data: lines } = await supabase
        .from('invoice_lines')
        .select(`*, items:item_id (name, code, color)`)
        .eq('invoice_id', itemId);
      setData({ ...invoice, lines });
    }
  };

  const fetchOrder = async () => {
    const { data: order } = await supabase
      .from('sales_orders')
      .select(`
        *,
        contacts:customer_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (order) {
      const { data: lines } = await supabase
        .from('sales_order_lines')
        .select(`*, items:item_id (name, code, color)`)
        .eq('order_id', itemId);
      setData({ ...order, lines });
    }
  };

  const fetchBill = async () => {
    const { data: bill } = await supabase
      .from('bills')
      .select(`
        *,
        contacts:supplier_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (bill) {
      const { data: lines } = await supabase
        .from('bill_lines')
        .select(`*, items:item_id (name, code, color)`)
        .eq('bill_id', itemId);
      setData({ ...bill, lines });
    }
  };

  const fetchReceipt = async () => {
    const { data: receipt } = await supabase
      .from('receipts')
      .select(`
        *,
        contacts:customer_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();
    setData(receipt);
  };

  const fetchPayment = async () => {
    const { data: payment } = await supabase
      .from('bill_payments')
      .select(`
        *,
        contacts:supplier_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();
    setData(payment);
  };

  const fetchReturnNote = async () => {
    const { data: returnNote } = await supabase
      .from('return_notes')
      .select(`
        *,
        contacts:customer_id (name, phone, address)
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (returnNote) {
      const { data: lines } = await supabase
        .from('return_note_lines')
        .select(`*, items:item_id (name, code, color)`)
        .eq('return_note_id', itemId);
      setData({ ...returnNote, lines });
    }
  };

  const fetchContact = async () => {
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();
    setData(contact);
  };

  const fetchItem = async () => {
    const { data: item } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();
    setData(item);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      invoice: 'Invoice Details',
      order: 'Order Details',
      bill: 'Bill Details',
      receipt: 'Receipt Details',
      payment: 'Payment Details',
      return_note: 'Return Note Details',
      customer: 'Customer Details',
      supplier: 'Supplier Details',
      item: 'Item Details',
    };
    return titles[itemType] || 'Details';
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    if (!data) {
      return <div className="text-center py-8 text-muted-foreground">No data found</div>;
    }

    switch (itemType) {
      case 'invoice':
        return renderInvoice();
      case 'order':
        return renderOrder();
      case 'bill':
        return renderBill();
      case 'receipt':
        return renderReceipt();
      case 'payment':
        return renderPayment();
      case 'return_note':
        return renderReturnNote();
      case 'customer':
      case 'supplier':
        return renderContact();
      case 'item':
        return renderItem();
      default:
        return <div>Unknown type</div>;
    }
  };

  const renderInvoice = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Invoice No</p>
          <p className="font-semibold">{data.invoice_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.invoice_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={data.status === 'paid' ? 'default' : 'secondary'}>{data.status}</Badge>
        </div>
      </div>
      <Separator />
      {data.lines && data.lines.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Line Items</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Art No</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{line.items?.code || line.description}</TableCell>
                  <TableCell>{line.items?.color || '-'}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-xl font-bold">{formatCurrency(data.grand_total)}</p>
        </div>
      </div>
    </div>
  );

  const renderOrder = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Order No</p>
          <p className="font-semibold">{data.order_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.order_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge>{data.status}</Badge>
        </div>
      </div>
      <Separator />
      {data.lines && data.lines.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Line Items</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Art No</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{line.items?.code || line.description}</TableCell>
                  <TableCell>{line.items?.color || '-'}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-xl font-bold">{formatCurrency(data.grand_total)}</p>
        </div>
      </div>
    </div>
  );

  const renderBill = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bill No</p>
          <p className="font-semibold">{data.bill_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.bill_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Supplier</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge>{data.status}</Badge>
        </div>
      </div>
      <Separator />
      {data.lines && data.lines.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Line Items</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-xl font-bold">{formatCurrency(data.grand_total)}</p>
        </div>
      </div>
    </div>
  );

  const renderReceipt = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Receipt No</p>
          <p className="font-semibold">{data.receipt_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.receipt_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Reference</p>
          <p className="font-semibold">{data.reference || '-'}</p>
        </div>
      </div>
      <Separator />
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-xl font-bold">{formatCurrency(data.amount)}</p>
        </div>
      </div>
      {data.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p>{data.notes}</p>
        </div>
      )}
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Payment No</p>
          <p className="font-semibold">{data.payment_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.payment_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Supplier</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Reference</p>
          <p className="font-semibold">{data.reference || '-'}</p>
        </div>
      </div>
      <Separator />
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-xl font-bold">{formatCurrency(data.amount)}</p>
        </div>
      </div>
      {data.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p>{data.notes}</p>
        </div>
      )}
    </div>
  );

  const renderReturnNote = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Return Note No</p>
          <p className="font-semibold">{data.return_note_no}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(data.return_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-semibold">{data.contacts?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge>{data.status}</Badge>
        </div>
      </div>
      {data.reason && (
        <div>
          <p className="text-sm text-muted-foreground">Reason</p>
          <p>{data.reason}</p>
        </div>
      )}
      <Separator />
      {data.lines && data.lines.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Line Items</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Art No</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{line.items?.code || line.description}</TableCell>
                  <TableCell>{line.items?.color || '-'}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-xl font-bold">{formatCurrency(data.grand_total)}</p>
        </div>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Code</p>
          <p className="font-semibold">{data.code}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-semibold">{data.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-semibold">{data.phone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">WhatsApp</p>
          <p className="font-semibold">{data.whatsapp || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-semibold">{data.email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Area</p>
          <p className="font-semibold">{data.area || '-'}</p>
        </div>
      </div>
      <Separator />
      <div>
        <p className="text-sm text-muted-foreground">Address</p>
        <p>{data.address || '-'}</p>
      </div>
      {data.owner_name && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Owner Name</p>
            <p className="font-semibold">{data.owner_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Owner ID</p>
            <p className="font-semibold">{data.owner_id || '-'}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Credit Limit</p>
          <p className="font-semibold">{formatCurrency(data.credit_limit || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Payment Terms</p>
          <p className="font-semibold">{data.payment_terms ? `${data.payment_terms} days` : '-'}</p>
        </div>
      </div>
    </div>
  );

  const renderItem = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Code / Art No</p>
          <p className="font-semibold">{data.code}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-semibold">{data.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Color</p>
          <p className="font-semibold">{data.color || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Unit of Measure</p>
          <p className="font-semibold">{data.uom || 'Pairs'}</p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Purchase Price</p>
          <p className="font-semibold">{formatCurrency(data.purchase_price || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sale Price</p>
          <p className="font-semibold">{formatCurrency(data.sale_price || 0)}</p>
        </div>
      </div>
      {data.description && (
        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p>{data.description}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Badge variant={data.active ? 'default' : 'secondary'}>
          {data.active ? 'Active' : 'Inactive'}
        </Badge>
        {data.track_inventory && (
          <Badge variant="outline">Tracks Inventory</Badge>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTitle()}
            <Badge variant="destructive">Deleted</Badge>
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
