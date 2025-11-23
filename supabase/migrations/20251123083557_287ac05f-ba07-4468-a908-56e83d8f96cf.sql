-- Add missing UPDATE and DELETE policies for all tables

-- Receipts
CREATE POLICY "Company scoped update" ON public.receipts
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.receipts
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Credit Notes
CREATE POLICY "Company scoped update" ON public.credit_notes
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.credit_notes
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Credit Note Lines
CREATE POLICY "Credit note lines update" ON public.credit_note_lines
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM credit_notes 
  WHERE credit_notes.id = credit_note_lines.credit_note_id 
  AND credit_notes.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Credit note lines delete" ON public.credit_note_lines
FOR DELETE USING (EXISTS (
  SELECT 1 FROM credit_notes 
  WHERE credit_notes.id = credit_note_lines.credit_note_id 
  AND credit_notes.company_id = get_user_company(auth.uid())
));

-- Bill Payments
CREATE POLICY "Company scoped update" ON public.bill_payments
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.bill_payments
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Payment Allocations
CREATE POLICY "Payment allocations update" ON public.payment_allocations
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM bill_payments 
  WHERE bill_payments.id = payment_allocations.payment_id 
  AND bill_payments.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Payment allocations delete" ON public.payment_allocations
FOR DELETE USING (EXISTS (
  SELECT 1 FROM bill_payments 
  WHERE bill_payments.id = payment_allocations.payment_id 
  AND bill_payments.company_id = get_user_company(auth.uid())
));

-- Receipt Allocations
CREATE POLICY "Receipt allocations update" ON public.receipt_allocations
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM receipts 
  WHERE receipts.id = receipt_allocations.receipt_id 
  AND receipts.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Receipt allocations delete" ON public.receipt_allocations
FOR DELETE USING (EXISTS (
  SELECT 1 FROM receipts 
  WHERE receipts.id = receipt_allocations.receipt_id 
  AND receipts.company_id = get_user_company(auth.uid())
));

-- Debit Notes
CREATE POLICY "Company scoped update" ON public.debit_notes
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.debit_notes
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Bank Statements
CREATE POLICY "Company scoped update" ON public.bank_statements
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.bank_statements
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Items
CREATE POLICY "Company scoped delete" ON public.items
FOR DELETE USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Stock Locations
CREATE POLICY "Company scoped update" ON public.stock_locations
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.stock_locations
FOR DELETE USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Stock Movements
CREATE POLICY "Company scoped update" ON public.stock_movements
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.stock_movements
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- FX Rates
CREATE POLICY "Company scoped update" ON public.fx_rates
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.fx_rates
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Custom Field Definitions
CREATE POLICY "Company scoped update" ON public.custom_field_defs
FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.custom_field_defs
FOR DELETE USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Custom Field Values
CREATE POLICY "Company scoped delete" ON public.custom_field_values
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Recurring Templates
CREATE POLICY "Company scoped delete" ON public.recurring_templates
FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Journals
CREATE POLICY "Company scoped delete" ON public.journals
FOR DELETE USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));