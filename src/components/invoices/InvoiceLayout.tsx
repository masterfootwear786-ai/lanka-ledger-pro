import React from "react";

export default function InvoiceLayout({ invoice, items }) {
  return (
    <div className="p-6 text-sm text-gray-800 font-sans">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">INVOICE</h1>
        <p className="text-gray-600">Invoice No: {invoice.id}</p>
        <p className="text-gray-600">Date: {invoice.date}</p>
      </div>

      {/* Customer Info */}
      <div className="mb-4">
        <h2 className="font-semibold">Customer Details</h2>
        <p>{invoice.customerName}</p>
        <p>{invoice.customerPhone}</p>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="border-b">
              <td>{i.name}</td>
              <td className="text-right">{i.qty}</td>
              <td className="text-right">{i.price}</td>
              <td className="text-right">{i.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="text-right mb-10">
        <p>Subtotal: {invoice.subtotal}</p>
        <p>Discount: {invoice.discount}</p>
        <p className="font-bold text-lg">Grand Total: {invoice.total}</p>
      </div>

      {/* Signature Section */}
      <div className="mt-12 grid grid-cols-2 gap-10">

        <div>
          <p className="uppercase text-xs font-semibold tracking-wide text-gray-600">
            Customer Signature
          </p>
          <div className="mt-6 h-0.5 bg-gray-400 w-full"></div>
        </div>

        <div className="text-right">
          <p className="uppercase text-xs font-semibold tracking-wide text-gray-600">
            Sales Rep Signature
          </p>
          <div className="mt-6 h-0.5 bg-gray-400 w-full"></div>
        </div>

      </div>

    </div>
  );
}

