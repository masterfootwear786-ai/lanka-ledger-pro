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
  totalCredited: number;
  outstanding: number;
}

interface Transaction {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
}

export const generateCustomerStatement = (
  customer: CustomerData,
  stats: StatsData,
  transactions: Transaction[]
) => {
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

  // Account Summary
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
      ["Total Credited", stats.totalCredited.toLocaleString("en-US", { minimumFractionDigits: 2 })],
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

  // Transaction History
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction History", 14, yPos);

  // Prepare transaction data with running balance
  let runningBalance = 0;
  const transactionRows = transactions.map((txn) => {
    runningBalance += txn.debit - txn.credit;
    return [
      format(new Date(txn.date), "dd/MM/yyyy"),
      txn.type,
      txn.reference,
      txn.debit > 0 ? txn.debit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-",
      txn.credit > 0 ? txn.credit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-",
      runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }),
    ];
  });

  yPos += 8;
  autoTable(doc, {
    startY: yPos,
    head: [["Date", "Type", "Reference", "Debit", "Credit", "Balance"]],
    body: transactionRows.length > 0 ? transactionRows : [["No transactions found", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
      5: { halign: "right", cellWidth: 30 },
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

  // Payment Terms Note
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < doc.internal.pageSize.getHeight() - 30) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    if (customer.payment_terms) {
      doc.text(
        `Payment Terms: ${customer.payment_terms} days`,
        14,
        finalY
      );
    }
    if (customer.credit_limit) {
      doc.text(
        `Credit Limit: ${customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        14,
        finalY + 5
      );
    }
  }

  // Save the PDF
  const fileName = `Customer_Statement_${customer.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
