import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface CustomerData {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  payment_terms?: number;
}

interface StatsData {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
}

interface Transaction {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
}

export interface StatementOptions {
  dateFrom?: Date;
  dateTo?: Date;
  includeInvoices?: boolean;
  includeReceipts?: boolean;
  showRunningBalance?: boolean;
  includeAccountSummary?: boolean;
  notes?: string;
}

export const generateCustomerStatement = (
  customer: CustomerData,
  stats: StatsData,
  transactions: Transaction[],
  options?: StatementOptions
) => {
  // Filter transactions based on options
  let filteredTransactions = transactions;
  
  if (options?.dateFrom || options?.dateTo) {
    filteredTransactions = transactions.filter((txn) => {
      const txnDate = new Date(txn.date);
      if (options.dateFrom && txnDate < options.dateFrom) return false;
      if (options.dateTo && txnDate > options.dateTo) return false;
      return true;
    });
  }

  if (options?.includeInvoices === false) {
    filteredTransactions = filteredTransactions.filter(txn => txn.type !== "Invoice");
  }
  if (options?.includeReceipts === false) {
    filteredTransactions = filteredTransactions.filter(txn => txn.type !== "Receipt");
  }
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER STATEMENT", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Statement Date: ${format(new Date(), "PPP")}`, pageWidth / 2, yPos, { align: "center" });

  // Customer Information
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${customer.name}`, 14, yPos);
  yPos += 6;
  doc.text(`Customer Code: ${customer.code}`, 14, yPos);
  
  if (customer.email) {
    yPos += 6;
    doc.text(`Email: ${customer.email}`, 14, yPos);
  }
  
  if (customer.phone) {
    yPos += 6;
    doc.text(`Phone: ${customer.phone}`, 14, yPos);
  }
  
  if (customer.address) {
    yPos += 6;
    doc.text(`Address: ${customer.address}`, 14, yPos);
  }

  // Account Summary (optional)
  if (options?.includeAccountSummary !== false) {
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Account Summary", 14, yPos);
    
    yPos += 8;
    autoTable(doc, {
      startY: yPos,
      head: [["Description", "Amount"]],
      body: [
        ["Total Invoiced", stats.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })],
        ["Total Paid", stats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })],
        ["Outstanding Balance", stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ],
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: "right", cellWidth: 80 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    yPos += 12;
  }

  // Transaction History
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction History", 14, yPos);

  // Prepare transaction data with running balance
  let runningBalance = 0;
  const showBalance = options?.showRunningBalance !== false;
  const transactionRows = filteredTransactions.map((txn) => {
    runningBalance += txn.debit - txn.credit;
    const row = [
      format(new Date(txn.date), "dd/MM/yyyy"),
      txn.type,
      txn.reference,
      txn.debit > 0 ? txn.debit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-",
      txn.credit > 0 ? txn.credit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-",
    ];
    if (showBalance) {
      row.push(runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }));
    }
    return row;
  });

  yPos += 8;
  const headers = showBalance 
    ? [["Date", "Type", "Reference", "Debit", "Credit", "Balance"]]
    : [["Date", "Type", "Reference", "Debit", "Credit"]];
  
  const emptyRow = showBalance
    ? [["No transactions found", "", "", "", "", ""]]
    : [["No transactions found", "", "", "", ""]];

  autoTable(doc, {
    startY: yPos,
    head: headers,
    body: transactionRows.length > 0 ? transactionRows : emptyRow,
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 9 },
    columnStyles: showBalance ? {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
      5: { halign: "right", cellWidth: 30 },
    } : {
      0: { cellWidth: 30 },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
      4: { halign: "right", cellWidth: 40 },
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    },
  });

  // Payment Terms Note and Custom Notes
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < doc.internal.pageSize.getHeight() - 40) {
    let notesY = finalY;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    
    if (customer.payment_terms) {
      doc.text(
        `Payment Terms: ${customer.payment_terms} days`,
        14,
        notesY
      );
      notesY += 5;
    }
    if (customer.credit_limit) {
      doc.text(
        `Credit Limit: ${customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        14,
        notesY
      );
      notesY += 5;
    }
    
    if (options?.notes) {
      notesY += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Notes: ${options.notes}`, 14, notesY);
    }
  }

  // Save the PDF
  const fileName = `Customer_Statement_${customer.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
