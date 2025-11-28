import { supabase } from '@/integrations/supabase/client';
import { exportToExcelMultiSheet } from './export';

export interface BackupData {
  version: string;
  timestamp: string;
  company_id: string;
  data: {
    invoices?: any[];
    invoice_lines?: any[];
    sales_orders?: any[];
    sales_order_lines?: any[];
    receipts?: any[];
    bills?: any[];
    bill_lines?: any[];
    bill_payments?: any[];
    payment_allocations?: any[];
    contacts?: any[];
    items?: any[];
    stock_by_size?: any[];
    transactions?: any[];
    tax_rates?: any[];
    colors?: any[];
    companies?: any[];
    profiles?: any[];
  };
}

export const createBackup = async (companyId: string): Promise<BackupData> => {
  const timestamp = new Date().toISOString();
  
  // Fetch all data in parallel
  const [
    invoices,
    invoiceLines,
    salesOrders,
    salesOrderLines,
    receipts,
    bills,
    billLines,
    billPayments,
    paymentAllocations,
    contacts,
    items,
    stockBySize,
    transactions,
    taxRates,
    colors,
    companies,
    profiles
  ] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('invoice_lines').select('*').is('deleted_at', null),
    supabase.from('sales_orders').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('sales_order_lines').select('*'),
    supabase.from('receipts').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('bills').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('bill_lines').select('*'),
    supabase.from('bill_payments').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('payment_allocations').select('*'),
    supabase.from('contacts').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('items').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('stock_by_size').select('*').eq('company_id', companyId),
    supabase.from('transactions').select('*').eq('company_id', companyId),
    supabase.from('tax_rates').select('*').eq('company_id', companyId).is('deleted_at', null),
    supabase.from('colors').select('*').eq('company_id', companyId),
    supabase.from('companies').select('*').eq('id', companyId),
    supabase.from('profiles').select('*').eq('company_id', companyId)
  ]);

  return {
    version: '1.0.0',
    timestamp,
    company_id: companyId,
    data: {
      invoices: invoices.data || [],
      invoice_lines: invoiceLines.data || [],
      sales_orders: salesOrders.data || [],
      sales_order_lines: salesOrderLines.data || [],
      receipts: receipts.data || [],
      bills: bills.data || [],
      bill_lines: billLines.data || [],
      bill_payments: billPayments.data || [],
      payment_allocations: paymentAllocations.data || [],
      contacts: contacts.data || [],
      items: items.data || [],
      stock_by_size: stockBySize.data || [],
      transactions: transactions.data || [],
      tax_rates: taxRates.data || [],
      colors: colors.data || [],
      companies: companies.data || [],
      profiles: profiles.data || []
    }
  };
};

export const exportBackupAsJSON = (backupData: BackupData) => {
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-${backupData.timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportBackupAsExcel = (backupData: BackupData) => {
  const sheets = [
    { name: 'Invoices', data: backupData.data.invoices || [] },
    { name: 'Invoice Lines', data: backupData.data.invoice_lines || [] },
    { name: 'Orders', data: backupData.data.sales_orders || [] },
    { name: 'Order Lines', data: backupData.data.sales_order_lines || [] },
    { name: 'Receipts', data: backupData.data.receipts || [] },
    { name: 'Bills', data: backupData.data.bills || [] },
    { name: 'Bill Lines', data: backupData.data.bill_lines || [] },
    { name: 'Payments', data: backupData.data.bill_payments || [] },
    { name: 'Contacts', data: backupData.data.contacts || [] },
    { name: 'Items', data: backupData.data.items || [] },
    { name: 'Stock', data: backupData.data.stock_by_size || [] },
    { name: 'Transactions', data: backupData.data.transactions || [] },
    { name: 'Tax Rates', data: backupData.data.tax_rates || [] },
    { name: 'Colors', data: backupData.data.colors || [] }
  ].filter(sheet => sheet.data.length > 0);

  exportToExcelMultiSheet(`backup-${backupData.timestamp}`, sheets);
};

export const restoreFromBackup = async (backupData: BackupData) => {
  // Validation
  if (!backupData.version || !backupData.company_id) {
    throw new Error('Invalid backup file format');
  }

  // This is a simplified restore - in production you'd want more sophisticated logic
  console.log('Restore functionality - would restore data:', backupData);
  throw new Error('Restore functionality requires careful implementation to avoid data conflicts');
};
