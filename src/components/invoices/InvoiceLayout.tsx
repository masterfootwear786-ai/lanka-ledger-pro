import React from "react";

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
}

interface InvoiceLayoutProps {
  invoice: InvoiceData;
  items: InvoiceItem[];
}

const InvoiceLayout: React.FC<InvoiceLayoutProps> = ({ invoice, items }) => {
  return (
    <div className="w-[210mm] min-h-[297mm] bg-white mx-auto p-8 text-xs text-gray-800 font-sans">
      {/* Header */}
      <header className="flex justify-between items-start border-b pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-wide">Lanka Ledger Pro</h1>
          <p className="text-[11px] text-gray-600">Master Footwear · Galle, Sri Lanka</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-600">INVOICE</p>
          <p className="text-[11px]">Invoice No: {invoice.invoiceNumber}</p>
          <p className="text-[11px]">Date: {invoice.date}</p>
        </div>
      </header>

      {/* Customer info */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold text-gray-700 mb-1">Bill To</p>
          <p className="text-[11px] font-medium">{invoice.customerName}</p>
          {invoice.customerPhone && <p className="text-[11px] text-gray-700">Phone: {invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-[11px] text-gray-700">Address: {invoice.customerAddress}</p>}
        </div>

        <div className="text-right text-[11px]">
          <p className="font-semibold text-gray-700 mb-1">From</p>
          <p>Master Footwear / Lanka Ledger</p>
          <p>Tel: 07X-XXXXXXX</p>
        </div>
      </section>

      {/* Items table */}
      <section className="mb-6">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-semibold">Item</th>
              <th className="py-2 text-right font-semibold w-16">Qty</th>
              <th className="py-2 text-right font-semibold w-20">Price</th>
              <th className="py-2 text-right font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx} className="border-b last:border-b-0">
                <td className="py-1 pr-2">{i.name}</td>
                <td className="py-1 text-right">{i.qty}</td>
                <td className="py-1 text-right">
                  {i.price.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="py-1 text-right font-medium">
                  {i.total.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals section */}
      <section className="flex justify-end mb-10">
        <div className="w-64 text-[11px]">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>
              {invoice.subtotal.toLocaleString("en-LK", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          {typeof invoice.discount === "number" && invoice.discount !== 0 && (
            <div className="flex justify-between py-1">
              <span>Discount</span>
              <span>
                -{" "}
                {invoice.discount.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          {typeof invoice.tax === "number" && invoice.tax !== 0 && (
            <div className="flex justify-between py-1">
              <span>Tax</span>
              <span>
                {invoice.tax.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t mt-2">
            <span className="font-semibold text-[12px]">Grand Total</span>
            <span className="font-bold text-[13px]">
              {invoice.total.toLocaleString("en-LK", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </section>

      {/* Footer + signatures */}
      <section className="mt-auto">
        <p className="text-[10px] text-gray-500 mb-6">Thank you for your business!</p>

        <div className="grid grid-cols-2 gap-10 mt-8">
          {/* Customer signature */}
          <div>
            <p className="uppercase text-[10px] font-semibold tracking-wide text-gray-600">Customer Signature</p>
            <div className="mt-6 h-[1px] bg-gray-400 w-full"></div>
          </div>

          {/* Sales rep signature */}
          <div className="text-right">
            <p className="uppercase text-[10px] font-semibold tracking-wide text-gray-600">Sales Rep Signature</p>
            <div className="mt-6 h-[1px] bg-gray-400 w-full"></div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InvoiceLayout;
