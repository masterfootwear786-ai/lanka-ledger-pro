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

export const restoreFromBackup = async (backupData: BackupData, companyId: string): Promise<{ success: boolean; message: string }> => {
  // Validation
  if (!backupData.version || !backupData.data) {
    throw new Error('Invalid backup file format');
  }

  try {
    // Restore order matters due to foreign key constraints
    // 1. Colors first (no dependencies)
    if (backupData.data.colors?.length) {
      for (const color of backupData.data.colors) {
        const { id, ...colorData } = color;
        await supabase.from('colors').upsert({ 
          ...colorData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 2. Tax rates
    if (backupData.data.tax_rates?.length) {
      for (const taxRate of backupData.data.tax_rates) {
        const { id, ...taxData } = taxRate;
        await supabase.from('tax_rates').upsert({ 
          ...taxData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 3. Contacts (customers/suppliers)
    if (backupData.data.contacts?.length) {
      for (const contact of backupData.data.contacts) {
        const { id, ...contactData } = contact;
        await supabase.from('contacts').upsert({ 
          ...contactData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 4. Items
    if (backupData.data.items?.length) {
      for (const item of backupData.data.items) {
        const { id, ...itemData } = item;
        await supabase.from('items').upsert({ 
          ...itemData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 5. Stock by size
    if (backupData.data.stock_by_size?.length) {
      for (const stock of backupData.data.stock_by_size) {
        const { id, ...stockData } = stock;
        await supabase.from('stock_by_size').upsert({ 
          ...stockData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 6. Invoices
    if (backupData.data.invoices?.length) {
      for (const invoice of backupData.data.invoices) {
        const { id, ...invoiceData } = invoice;
        await supabase.from('invoices').upsert({ 
          ...invoiceData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 7. Invoice lines
    if (backupData.data.invoice_lines?.length) {
      for (const line of backupData.data.invoice_lines) {
        const { id, ...lineData } = line;
        await supabase.from('invoice_lines').upsert({ 
          ...lineData,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 8. Sales orders
    if (backupData.data.sales_orders?.length) {
      for (const order of backupData.data.sales_orders) {
        const { id, ...orderData } = order;
        await supabase.from('sales_orders').upsert({ 
          ...orderData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 9. Sales order lines
    if (backupData.data.sales_order_lines?.length) {
      for (const line of backupData.data.sales_order_lines) {
        const { id, ...lineData } = line;
        await supabase.from('sales_order_lines').upsert({ 
          ...lineData,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 10. Receipts
    if (backupData.data.receipts?.length) {
      for (const receipt of backupData.data.receipts) {
        const { id, ...receiptData } = receipt;
        await supabase.from('receipts').upsert({ 
          ...receiptData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 11. Bills
    if (backupData.data.bills?.length) {
      for (const bill of backupData.data.bills) {
        const { id, ...billData } = bill;
        await supabase.from('bills').upsert({ 
          ...billData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 12. Bill lines
    if (backupData.data.bill_lines?.length) {
      for (const line of backupData.data.bill_lines) {
        const { id, ...lineData } = line;
        await supabase.from('bill_lines').upsert({ 
          ...lineData,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 13. Bill payments
    if (backupData.data.bill_payments?.length) {
      for (const payment of backupData.data.bill_payments) {
        const { id, ...paymentData } = payment;
        await supabase.from('bill_payments').upsert({ 
          ...paymentData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 14. Payment allocations
    if (backupData.data.payment_allocations?.length) {
      for (const allocation of backupData.data.payment_allocations) {
        const { id, ...allocationData } = allocation;
        await supabase.from('payment_allocations').upsert({ 
          ...allocationData,
          id 
        }, { onConflict: 'id' });
      }
    }

    // 15. Transactions
    if (backupData.data.transactions?.length) {
      for (const transaction of backupData.data.transactions) {
        const { id, ...transactionData } = transaction;
        await supabase.from('transactions').upsert({ 
          ...transactionData, 
          company_id: companyId,
          id 
        }, { onConflict: 'id' });
      }
    }

    return { success: true, message: 'Data restored successfully' };
  } catch (error: any) {
    console.error('Restore error:', error);
    throw new Error(`Failed to restore data: ${error.message}`);
  }
};

export const parseBackupFile = (fileContent: string): BackupData => {
  try {
    const data = JSON.parse(fileContent);
    if (!data.version || !data.data) {
      throw new Error('Invalid backup file structure');
    }
    return data as BackupData;
  } catch (error) {
    throw new Error('Failed to parse backup file. Please ensure it is a valid JSON backup file.');
  }
};
