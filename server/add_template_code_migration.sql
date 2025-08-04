
-- Add template_code column to invoice_templates table
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS template_code VARCHAR(50);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_templates_template_code ON invoice_templates(template_code);
