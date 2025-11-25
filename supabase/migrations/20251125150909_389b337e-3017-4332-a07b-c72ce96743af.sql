-- Relax delete policy on chart_of_accounts so any company user can delete their own accounts
ALTER POLICY "Company scoped delete" ON public.chart_of_accounts
USING (company_id = get_user_company(auth.uid()));