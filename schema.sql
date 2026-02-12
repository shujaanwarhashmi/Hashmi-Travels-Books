
-- ======================================================
-- HASHMI TRAVEL BOOKS - MASTER DATABASE (v17.2)
-- Support for Multi-Line Journal Vouchers & Party Impact
-- ======================================================

GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO postgres;

DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS journal_voucher_entries CASCADE;
DROP TABLE IF EXISTS journal_vouchers CASCADE;
DROP TABLE IF EXISTS hotel_vouchers CASCADE;
DROP TABLE IF EXISTS transport_vouchers CASCADE;
DROP TABLE IF EXISTS ticket_vouchers CASCADE;
DROP TABLE IF EXISTS visa_vouchers CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE voucher_status AS ENUM ('Draft', 'Posted', 'Cancelled');
CREATE TYPE account_category AS ENUM ('Asset', 'Liability', 'Income', 'Expense', 'Equity', 'Cash', 'Bank', 'Receivable', 'Payable');

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type account_category NOT NULL,
    is_system_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    address TEXT,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    opening_balance_type TEXT DEFAULT 'Receivable',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code TEXT UNIQUE NOT NULL,
    vendor_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    address TEXT,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    opening_balance_type TEXT DEFAULT 'Payable',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    narration TEXT,
    status voucher_status DEFAULT 'Posted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_voucher_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES journal_vouchers(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    party_id UUID,
    currency TEXT DEFAULT 'PKR',
    roe DECIMAL(15,4) DEFAULT 1,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    description TEXT
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    party_id UUID, 
    reference_id UUID NOT NULL, 
    reference_no TEXT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    narration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIVERSAL SYNC FUNCTION FOR JOURNAL VOUCHERS
CREATE OR REPLACE FUNCTION sync_jv_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_jv_id UUID;
    v_date DATE;
    v_no TEXT;
    v_narration TEXT;
BEGIN
    v_jv_id := COALESCE(NEW.journal_id, OLD.journal_id, NEW.id, OLD.id);
    
    -- Get parent info
    SELECT voucher_date, voucher_no, narration INTO v_date, v_no, v_narration 
    FROM journal_vouchers WHERE id = v_jv_id;
    
    -- Clean and Repost
    DELETE FROM ledger_entries WHERE reference_id = v_jv_id;
    
    INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, credit, narration)
    SELECT 
        v_date, account_id, party_id, v_jv_id, v_no, (debit * roe), (credit * roe), COALESCE(description, v_narration)
    FROM journal_voucher_entries 
    WHERE journal_id = v_jv_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for both the parent and the entries to catch all updates
CREATE TRIGGER trg_jv_sync AFTER INSERT OR UPDATE OR DELETE ON journal_vouchers 
FOR EACH ROW EXECUTE FUNCTION sync_jv_to_ledger();

CREATE TRIGGER trg_jv_entries_sync AFTER INSERT OR UPDATE OR DELETE ON journal_voucher_entries 
FOR EACH ROW EXECUTE FUNCTION sync_jv_to_ledger();

-- Add standard accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_generated) VALUES
('1001', 'CASH IN HAND', 'Cash', true),
('1002', 'BANK - MAIN ACCOUNT', 'Bank', true),
('1003', 'ACCOUNTS RECEIVABLE', 'Receivable', true),
('2001', 'ACCOUNTS PAYABLE', 'Payable', true),
('3999', 'OPENING BALANCE EQUITY', 'Equity', true)
ON CONFLICT (account_code) DO NOTHING;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, public;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role, public;
