-- Remove the duplicate trigger that deducts stock when invoice is posted
-- Stock should only be deducted once - when invoice lines are inserted
-- The adjust_stock_on_invoice_line_change trigger already handles this

DROP TRIGGER IF EXISTS reduce_stock_on_invoice_post ON invoices;

-- Also drop the related restore trigger for consistency since we only use line-level triggers
DROP TRIGGER IF EXISTS restore_stock_on_invoice_soft_delete ON invoices;