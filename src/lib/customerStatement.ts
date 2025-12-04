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
  pendingCheques?: number;
  outstanding: number;
  toCollect?: number;
  totalReturns?: number;
}

interface Transaction {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  status?: string | null;
  details?: any;
  pendingAmount?: number;
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
    filteredTransactions = filteredTransactions.filter(txn => 
      !txn.type.includes("Cheque") && txn.type !== "Cash Payment" && txn.type !== "Receipt"
    );
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Header with border
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(14, yPos - 5, pageWidth - 14, yPos - 5);
  
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("CUSTOMER STATEMENT", pageWidth / 2, yPos + 5, { align: "center" });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Date: ${format(new Date(), "PPP")}`, pageWidth / 2, yPos, { align: "center" });
  
  if (options?.dateFrom && options?.dateTo) {
    yPos += 5;
    doc.text(`Period: ${format(options.dateFrom, "PPP")} - ${format(options.dateTo, "PPP")}`, pageWidth / 2, yPos, { align: "center" });
  }
  
  doc.line(14, yPos + 5, pageWidth - 14, yPos + 5);

  // Customer Information Box
  yPos += 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 2, 2, 'F');
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Customer Information", 18, yPos);
  
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  
  const leftCol = 18;
  const rightCol = pageWidth / 2 + 10;
  
  doc.text(`Customer Name: ${customer.name}`, leftCol, yPos);
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, rightCol, yPos);
  }
  
  yPos += 6;
  doc.text(`Customer Code: ${customer.code}`, leftCol, yPos);
  if (customer.address) {
    doc.text(`Address: ${customer.address}`, rightCol, yPos);
  }

  // Account Summary (optional)
  if (options?.includeAccountSummary !== false) {
    yPos += 20;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Account Summary", 14, yPos);
    
    yPos += 5;
    
    const summaryData = [
      ["Total Invoiced", stats.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ["Total Returns (Credit)", (stats.totalReturns || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ["Total Paid (Cash + Cleared Cheques)", stats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ["Pending Cheques", (stats.pendingCheques || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ["Outstanding Balance", stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })],
      ["To Collect (Cash/Cheque)", (stats.toCollect || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [["Description", "Amount (LKR)"]],
      body: summaryData,
      theme: "plain",
      headStyles: { 
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: "right", cellWidth: 60, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Highlight returns row (purple)
        if (data.row.index === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [243, 232, 255];
          data.cell.styles.textColor = [126, 34, 206];
        }
        // Highlight paid row
        if (data.row.index === 2 && data.section === 'body') {
          data.cell.styles.fillColor = [240, 253, 244];
          data.cell.styles.textColor = [22, 101, 52];
        }
        // Highlight pending cheques row
        if (data.row.index === 3 && data.section === 'body') {
          data.cell.styles.fillColor = [255, 247, 237];
          data.cell.styles.textColor = [194, 65, 12];
        }
        // Highlight outstanding row
        if (data.row.index === 4 && data.section === 'body') {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
        // Highlight to collect row
        if (data.row.index === 5 && data.section === 'body') {
          data.cell.styles.fillColor = [243, 232, 255];
          data.cell.styles.textColor = [126, 34, 206];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    yPos += 15;
  }

  // Pending Cheques Section
  const pendingCheques = filteredTransactions.filter(
    txn => txn.type === "Cheque (Pending)" && txn.pendingAmount && txn.pendingAmount > 0
  );
  
  if (pendingCheques.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(194, 65, 12);
    doc.text(`Pending Cheques (${pendingCheques.length})`, 14, yPos);
    
    yPos += 5;
    const pendingData = pendingCheques.map(txn => [
      txn.details?.chequeNo || '-',
      txn.details?.date ? format(new Date(txn.details.date), "dd/MM/yyyy") : '-',
      `${txn.details?.bank || ''} - ${txn.details?.branch || ''}`,
      txn.details?.holder || '-',
      txn.pendingAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || '0.00',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Cheque No", "Date", "Bank / Branch", "Holder", "Amount"]],
      body: pendingData,
      theme: "plain",
      headStyles: { 
        fillColor: [255, 237, 213],
        textColor: [154, 52, 18],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 50 },
        3: { cellWidth: 40 },
        4: { halign: "right", cellWidth: 35, fontStyle: 'bold', textColor: [194, 65, 12] },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Transaction History
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Transaction History", 14, yPos);

  // Prepare transaction data with running balance
  let runningBalance = 0;
  const showBalance = options?.showRunningBalance !== false;
  const transactionRows = filteredTransactions.map((txn) => {
    // Only add to running balance if it's an actual transaction (not pending)
    if (txn.type !== "Cheque (Pending)") {
      runningBalance += txn.debit - txn.credit;
    }
    
    const row = [
      format(new Date(txn.date), "dd/MM/yyyy"),
      txn.type,
      txn.reference,
      txn.debit > 0 ? txn.debit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-",
      txn.credit > 0 ? txn.credit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : 
        (txn.type === "Cheque (Pending)" ? `(${txn.pendingAmount?.toLocaleString()})` : "-"),
    ];
    if (showBalance) {
      row.push(txn.type !== "Cheque (Pending)" ? runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-");
    }
    return row;
  });

  yPos += 5;
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
    headStyles: { 
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: showBalance ? {
      0: { cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28, fontStyle: 'bold' },
    } : {
      0: { cellWidth: 28 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowData = transactionRows[data.row.index];
        if (rowData) {
          const type = rowData[1];
          // Color code different transaction types
          if (type === "Invoice" && data.column.index === 3) {
            data.cell.styles.textColor = [185, 28, 28];
          }
          if ((type === "Cash Payment" || type === "Cheque (Cleared)") && data.column.index === 4) {
            data.cell.styles.textColor = [22, 101, 52];
          }
          // Return Note styling - purple background with purple text for credit column
          if (type === "Return Note") {
            data.cell.styles.fillColor = [243, 232, 255];
            if (data.column.index === 4) {
              data.cell.styles.textColor = [126, 34, 206];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (type === "Cheque (Pending)") {
            data.cell.styles.fillColor = [255, 251, 235];
            if (data.column.index === 4) {
              data.cell.styles.textColor = [194, 65, 12];
            }
          }
          if (type === "Cheque (Returned)") {
            data.cell.styles.fillColor = [254, 242, 242];
            if (data.column.index === 3) {
              data.cell.styles.textColor = [185, 28, 28];
            }
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
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
  if (finalY < doc.internal.pageSize.getHeight() - 50) {
    let notesY = finalY;
    
    // Draw a separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, notesY - 3, pageWidth - 14, notesY - 3);
    
    notesY += 5;
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    
    if (customer.payment_terms) {
      doc.setFont("helvetica", "normal");
      doc.text(`Payment Terms: `, 14, notesY);
      doc.setFont("helvetica", "bold");
      doc.text(`${customer.payment_terms} days`, 45, notesY);
      notesY += 5;
    }
    if (customer.credit_limit) {
      doc.setFont("helvetica", "normal");
      doc.text(`Credit Limit: `, 14, notesY);
      doc.setFont("helvetica", "bold");
      doc.text(`${customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 40, notesY);
      notesY += 5;
    }
    
    if (options?.notes) {
      notesY += 3;
      doc.setFont("helvetica", "normal");
      doc.text(`Notes: ${options.notes}`, 14, notesY);
    }
    
    // Footer message
    notesY += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated statement. Please contact us if you have any queries.", pageWidth / 2, notesY, { align: "center" });
  }

  // Save the PDF
  const fileName = `Customer_Statement_${customer.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};