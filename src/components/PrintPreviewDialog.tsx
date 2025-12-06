import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
  printContent?: string;
  pdfGenerator?: () => jsPDF;
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  children,
  onPrint,
  onDownloadPDF,
  printContent,
  pdfGenerator,
}: PrintPreviewDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }

    if (printContent) {
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
      return;
    }

    // Default print behavior using content
    const printWindow = window.open('', '_blank');
    if (printWindow && contentRef.current) {
      const styles = `
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          @media print { body { padding: 0; } }
        </style>
      `;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${styles}</head><body>${contentRef.current.innerHTML}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownloadPDF = () => {
    if (onDownloadPDF) {
      onDownloadPDF();
      return;
    }

    if (pdfGenerator) {
      const doc = pdfGenerator();
      doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div ref={contentRef} className="print-content">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
