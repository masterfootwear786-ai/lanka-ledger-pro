-- Add discount column to sales_order_lines
ALTER TABLE sales_order_lines 
ADD COLUMN discount numeric DEFAULT 0;

-- Add discount column to sales_orders
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- Add discount column to order_template_lines
ALTER TABLE order_template_lines 
ADD COLUMN discount numeric DEFAULT 0;