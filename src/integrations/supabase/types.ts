export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_statements: {
        Row: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          external_ref: string | null
          id: string
          reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciled_journal_id: string | null
          statement_date: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_ref?: string | null
          id?: string
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_journal_id?: string | null
          statement_date: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_ref?: string | null
          id?: string
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_journal_id?: string | null
          statement_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_reconciled_journal_id_fkey"
            columns: ["reconciled_journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          account_id: string | null
          bill_id: string
          created_at: string | null
          description: string
          id: string
          item_id: string | null
          line_no: number
          line_total: number
          quantity: number
          tax_amount: number | null
          tax_code: string | null
          tax_inclusive: boolean | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          bill_id: string
          created_at?: string | null
          description: string
          id?: string
          item_id?: string | null
          line_no: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          bill_id?: string
          created_at?: string | null
          description?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_date: string
          payment_no: string
          posted: boolean | null
          posted_at: string | null
          reference: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_no: string
          posted?: boolean | null
          posted_at?: string | null
          reference?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_no?: string
          posted?: boolean | null
          posted_at?: string | null
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          bill_no: string
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          discount: number | null
          due_date: string | null
          exchange_rate: number | null
          grand_total: number | null
          id: string
          notes: string | null
          posted: boolean | null
          posted_at: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subtotal: number | null
          supplier_id: string
          supplier_ref: string | null
          tax_total: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bill_date?: string
          bill_no: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          supplier_id: string
          supplier_ref?: string | null
          tax_total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bill_date?: string
          bill_no?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          supplier_id?: string
          supplier_ref?: string | null
          tax_total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          active: boolean | null
          code: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          active?: boolean | null
          code: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          active?: boolean | null
          code?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          action_password: string | null
          active: boolean | null
          address: string | null
          base_currency: string | null
          code: string
          created_at: string | null
          created_by: string | null
          email: string | null
          fiscal_year_end: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          tax_number: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_password?: string | null
          active?: boolean | null
          address?: string | null
          base_currency?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_password?: string | null
          active?: boolean | null
          address?: string | null
          base_currency?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          active: boolean | null
          address: string | null
          area: string | null
          code: string
          company_id: string
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          district: string | null
          email: string | null
          id: string
          name: string
          payment_terms: number | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          area?: string | null
          code: string
          company_id: string
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          district?: string | null
          email?: string | null
          id?: string
          name: string
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          area?: string | null
          code?: string
          company_id?: string
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          district?: string | null
          email?: string | null
          id?: string
          name?: string
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_lines: {
        Row: {
          created_at: string | null
          credit_note_id: string
          description: string
          id: string
          item_id: string | null
          line_no: number
          line_total: number
          quantity: number
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          credit_note_id: string
          description: string
          id?: string
          item_id?: string | null
          line_no: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          credit_note_id?: string
          description?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_lines_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          credit_date: string
          credit_note_no: string
          currency_code: string | null
          customer_id: string
          exchange_rate: number | null
          grand_total: number | null
          id: string
          invoice_id: string | null
          posted: boolean | null
          posted_at: string | null
          reason: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subtotal: number | null
          tax_total: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          credit_date?: string
          credit_note_no: string
          currency_code?: string | null
          customer_id: string
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_id?: string | null
          posted?: boolean | null
          posted_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          credit_date?: string
          credit_note_no?: string
          currency_code?: string | null
          customer_id?: string
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_id?: string | null
          posted?: boolean | null
          posted_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          id: string
          name: string
          symbol: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          id?: string
          name: string
          symbol?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          symbol?: string | null
        }
        Relationships: []
      }
      custom_field_defs: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          entity: string
          field_key: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          label: string
          required: boolean | null
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          entity: string
          field_key: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          label: string
          required?: boolean | null
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          entity?: string
          field_key?: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          label?: string
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_defs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          company_id: string
          created_at: string | null
          entity: string
          entity_id: string
          field_key: string
          id: string
          updated_at: string | null
          value_boolean: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity: string
          entity_id: string
          field_key: string
          id?: string
          updated_at?: string | null
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity?: string
          entity_id?: string
          field_key?: string
          id?: string
          updated_at?: string | null
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          bill_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          debit_date: string
          debit_note_no: string
          exchange_rate: number | null
          grand_total: number | null
          id: string
          posted: boolean | null
          posted_at: string | null
          reason: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subtotal: number | null
          supplier_id: string
          tax_total: number | null
        }
        Insert: {
          bill_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          debit_date?: string
          debit_note_no: string
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          posted?: boolean | null
          posted_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          supplier_id: string
          tax_total?: number | null
        }
        Update: {
          bill_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          debit_date?: string
          debit_note_no?: string
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          posted?: boolean | null
          posted_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          supplier_id?: string
          tax_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string
          id: string
          rate: number
          rate_date: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code: string
          id?: string
          rate: number
          rate_date: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          id?: string
          rate?: number
          rate_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          account_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string
          id: string
          invoice_id: string
          item_id: string | null
          line_no: number
          line_total: number
          quantity: number
          tax_amount: number | null
          tax_code: string | null
          tax_inclusive: boolean | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          invoice_id: string
          item_id?: string | null
          line_no: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          item_id?: string | null
          line_no?: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string
          deleted_at: string | null
          discount: number | null
          due_date: string | null
          exchange_rate: number | null
          grand_total: number | null
          id: string
          invoice_date: string
          invoice_no: string
          notes: string | null
          posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subtotal: number | null
          tax_total: number | null
          terms: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id: string
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_date?: string
          invoice_no: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean | null
          avg_cost: number | null
          code: string
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          purchase_price: number | null
          sale_price: number | null
          tax_code: string | null
          track_inventory: boolean | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          avg_cost?: number | null
          code: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          purchase_price?: number | null
          sale_price?: number | null
          tax_code?: string | null
          track_inventory?: boolean | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          avg_cost?: number | null
          code?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          purchase_price?: number | null
          sale_price?: number | null
          tax_code?: string | null
          track_inventory?: boolean | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          contact_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_id: string
          line_no: number
          tax_amount: number | null
          tax_code: string | null
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id: string
          line_no: number
          tax_amount?: number | null
          tax_code?: string | null
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id?: string
          line_no?: number
          tax_amount?: number | null
          tax_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          journal_date: string
          journal_no: string
          posted: boolean | null
          posted_at: string | null
          ref_id: string | null
          ref_type: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          journal_date?: string
          journal_no: string
          posted?: boolean | null
          posted_at?: string | null
          ref_id?: string | null
          ref_type?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          journal_date?: string
          journal_no?: string
          posted?: boolean | null
          posted_at?: string | null
          ref_id?: string | null
          ref_type?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          bill_id: string
          created_at: string | null
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string | null
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string | null
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "bill_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      period_locks: {
        Row: {
          company_id: string
          id: string
          locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          period_month: number
          period_year: number
        }
        Insert: {
          company_id: string
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          period_month: number
          period_year: number
        }
        Update: {
          company_id?: string
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          period_month?: number
          period_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "period_locks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          language: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          language?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string
          exchange_rate: number | null
          id: string
          notes: string | null
          posted: boolean | null
          posted_at: string | null
          receipt_date: string
          receipt_no: string
          reference: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          receipt_date?: string
          receipt_no: string
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          posted?: boolean | null
          posted_at?: string | null
          receipt_date?: string
          receipt_no?: string
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_templates: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          next_run_date: string
          occurrences_left: number | null
          template_data: Json
          template_name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          next_run_date: string
          occurrences_left?: number | null
          template_data: Json
          template_name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          next_run_date?: string
          occurrences_left?: number | null
          template_data?: Json
          template_name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          active: boolean | null
          address: string | null
          code: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          code: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          location_id: string
          movement_date: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity: number
          ref_id: string | null
          ref_type: Database["public"]["Enums"]["ref_type"] | null
          unit_cost: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          location_id: string
          movement_date?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity: number
          ref_id?: string | null
          ref_type?: Database["public"]["Enums"]["ref_type"] | null
          unit_cost?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          location_id?: string
          movement_date?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity?: number
          ref_id?: string | null
          ref_type?: Database["public"]["Enums"]["ref_type"] | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          active: boolean | null
          code: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_inclusive: boolean | null
          name: string
          rate_percent: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_inclusive?: boolean | null
          name: string
          rate_percent?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_inclusive?: boolean | null
          name?: string
          rate_percent?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      app_role: "admin" | "accountant" | "clerk"
      contact_type: "customer" | "supplier" | "both"
      custom_field_type: "text" | "number" | "date" | "boolean"
      document_status: "draft" | "approved" | "paid" | "void" | "cancelled"
      movement_type: "in" | "out" | "adjustment"
      recurrence_frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
      ref_type:
        | "grn"
        | "delivery"
        | "adjustment"
        | "invoice"
        | "bill"
        | "return"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      app_role: ["admin", "accountant", "clerk"],
      contact_type: ["customer", "supplier", "both"],
      custom_field_type: ["text", "number", "date", "boolean"],
      document_status: ["draft", "approved", "paid", "void", "cancelled"],
      movement_type: ["in", "out", "adjustment"],
      recurrence_frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
      ],
      ref_type: ["grn", "delivery", "adjustment", "invoice", "bill", "return"],
    },
  },
} as const
