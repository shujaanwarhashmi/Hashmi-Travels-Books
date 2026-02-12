
-- ======================================================
-- HASHMI TRAVEL BOOKS - MASTER DATABASE (v15.6)
-- SECURITY HARDENING: FULL RLS & SYSTEM SEEDING
-- ======================================================

-- 0. SCHEMA PERMISSIONS
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO postgres;

-- 1. CLEAN RESTART
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS hotel_vouchers CASCADE;
DROP TABLE IF EXISTS transport_vouchers CASCADE;
DROP TABLE IF EXISTS ticket_vouchers CASCADE;
DROP TABLE IF EXISTS visa_vouchers CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

DROP FUNCTION IF EXISTS process_voucher_ledger_post() CASCADE;
DROP FUNCTION IF EXISTS cleanup_ledger_on_delete() CASCADE;
DROP TYPE IF EXISTS voucher_status CASCADE;
DROP TYPE IF EXISTS account_category CASCADE;

-- 2. ENUMS & CORE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE voucher_status AS ENUM ('Draft', 'Posted', 'Cancelled');
CREATE TYPE account_category AS ENUM ('Asset', 'Liability', 'Income', 'Expense', 'Equity', 'Cash', 'Bank', 'Receivable', 'Payable');

-- 3. MASTER TABLES
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

-- 4. FINANCIAL VOUCHERS
CREATE TABLE hotel_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    hotel_name TEXT,
    passenger_name TEXT,
    check_in DATE,
    check_out DATE,
    rooms INT DEFAULT 1,
    buy_rate_sar DECIMAL(15,2),
    sale_rate_sar DECIMAL(15,2),
    roe DECIMAL(10,4),
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS (sale_rate_sar * roe * rooms * COALESCE(NULLIF(GREATEST(1, check_out - check_in), 0), 1)) STORED,
    total_buy_pkr DECIMAL(15,2) GENERATED ALWAYS AS (buy_rate_sar * roe * rooms * COALESCE(NULLIF(GREATEST(1, check_out - check_in), 0), 1)) STORED,
    remarks TEXT,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE transport_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    route TEXT,
    vehicle_type TEXT,
    amount_sar DECIMAL(15,2),
    roe DECIMAL(10,4),
    amount_pkr DECIMAL(15,2) GENERATED ALWAYS AS (amount_sar * roe) STORED,
    remarks TEXT,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE ticket_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    passenger_name TEXT,
    airline_name TEXT,
    ticket_no TEXT,
    gds_pnr TEXT,
    roe DECIMAL(10,4) DEFAULT 1.0,
    base_fare_pkr DECIMAL(15,2),
    tax_pkr DECIMAL(15,2),
    service_fee_pkr DECIMAL(15,2),
    net_buy_pkr DECIMAL(15,2),
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS (base_fare_pkr + tax_pkr + service_fee_pkr) STORED,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE visa_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    passenger_name TEXT,
    country TEXT,
    visa_type TEXT,
    roe DECIMAL(10,4) DEFAULT 1.0,
    buy_rate_pkr DECIMAL(15,2),
    sale_rate_pkr DECIMAL(15,2),
    expiry_date DATE,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no TEXT UNIQUE NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    deposit_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    roe DECIMAL(10,4) DEFAULT 1.0,
    amount_pkr DECIMAL(15,2) NOT NULL,
    narration TEXT
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

-- 5. TRIGGER FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION cleanup_ledger_on_delete()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
    DELETE FROM ledger_entries WHERE reference_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_voucher_ledger_post()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
    v_ar_id UUID; v_ap_id UUID; v_inc_id UUID; v_narration TEXT;
BEGIN
    SELECT id INTO v_ar_id FROM chart_of_accounts WHERE account_code = '1003' LIMIT 1;
    SELECT id INTO v_ap_id FROM chart_of_accounts WHERE account_code = '2001' LIMIT 1;
    
    DELETE FROM ledger_entries WHERE reference_id = NEW.id;

    IF TG_TABLE_NAME = 'hotel_vouchers' THEN
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4002' LIMIT 1;
        v_narration := 'Hotel: ' || COALESCE(NEW.hotel_name, 'Stay') || ' - ' || COALESCE(NEW.passenger_name, 'Pax');
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.voucher_date, v_ar_id, NEW.customer_id, NEW.id, NEW.voucher_no, NEW.total_sale_pkr, v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.voucher_no, NEW.total_buy_pkr, 'Cost: ' || v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_inc_id, NEW.id, NEW.voucher_no, (NEW.total_sale_pkr - NEW.total_buy_pkr), 'Margin: ' || v_narration);
    
    ELSIF TG_TABLE_NAME = 'transport_vouchers' THEN
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4001' LIMIT 1;
        v_narration := 'Transport: ' || COALESCE(NEW.route, 'Trip');
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.voucher_date, v_ar_id, NEW.customer_id, NEW.id, NEW.voucher_no, NEW.amount_pkr, v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_inc_id, NEW.id, NEW.voucher_no, NEW.amount_pkr, 'Income: ' || v_narration);

    ELSIF TG_TABLE_NAME = 'ticket_vouchers' THEN
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4003' LIMIT 1;
        v_narration := 'Ticket: ' || COALESCE(NEW.airline_name, 'Flight') || ' - ' || COALESCE(NEW.passenger_name, 'Pax');
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.voucher_date, v_ar_id, NEW.customer_id, NEW.id, NEW.voucher_no, NEW.total_sale_pkr, v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.voucher_no, NEW.net_buy_pkr, 'Cost: ' || v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_inc_id, NEW.id, NEW.voucher_no, (NEW.total_sale_pkr - NEW.net_buy_pkr), 'Margin: ' || v_narration);

    ELSIF TG_TABLE_NAME = 'visa_vouchers' THEN
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4004' LIMIT 1;
        v_narration := 'Visa: ' || COALESCE(NEW.visa_type, 'Case') || ' - ' || COALESCE(NEW.passenger_name, 'Pax');
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.voucher_date, v_ar_id, NEW.customer_id, NEW.id, NEW.voucher_no, NEW.sale_rate_pkr, v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.voucher_no, NEW.buy_rate_pkr, 'Cost: ' || v_narration);
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_inc_id, NEW.id, NEW.voucher_no, (NEW.sale_rate_pkr - NEW.buy_rate_pkr), 'Margin: ' || v_narration);

    ELSIF TG_TABLE_NAME = 'receipts' THEN
        v_narration := 'Receipt: ' || COALESCE(NEW.narration, 'Pymt');
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.receipt_date, NEW.deposit_account_id, NEW.id, NEW.receipt_no, NEW.amount_pkr, v_narration);
        IF NEW.customer_id IS NOT NULL THEN
            INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
            VALUES (NEW.receipt_date, v_ar_id, NEW.customer_id, NEW.id, NEW.receipt_no, NEW.amount_pkr, v_narration);
        ELSIF NEW.vendor_id IS NOT NULL THEN
            INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
            VALUES (NEW.receipt_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.receipt_no, NEW.amount_pkr, v_narration);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS
CREATE TRIGGER trg_hotel_cleanup AFTER DELETE ON hotel_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_transport_cleanup AFTER DELETE ON transport_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_ticket_cleanup AFTER DELETE ON ticket_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_visa_cleanup AFTER DELETE ON visa_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_receipt_cleanup AFTER DELETE ON receipts FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();

CREATE TRIGGER trg_hotel_post AFTER INSERT OR UPDATE ON hotel_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_transport_post AFTER INSERT OR UPDATE ON transport_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_ticket_post AFTER INSERT OR UPDATE ON ticket_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_visa_post AFTER INSERT OR UPDATE ON visa_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_receipt_post AFTER INSERT OR UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();

-- 7. SEED DATA (CRITICAL FOR MAPPING)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_generated) VALUES
('1001', 'CASH IN HAND', 'Cash', true),
('1002', 'BANK - MAIN ACCOUNT', 'Bank', true),
('1003', 'ACCOUNTS RECEIVABLE', 'Receivable', true),
('1004', 'ADVANCE TO VENDORS', 'Asset', true),
('2001', 'ACCOUNTS PAYABLE', 'Payable', true),
('4001', 'TRANSPORT INCOME', 'Income', false),
('4002', 'HOTEL SERVICE INCOME', 'Income', false),
('4003', 'AIR TICKET INCOME', 'Income', false),
('4004', 'VISA SERVICE INCOME', 'Income', false),
('5001', 'OFFICE EXPENSES', 'Expense', false),
('3001', 'CAPITAL ACCOUNT', 'Equity', true)
ON CONFLICT (account_code) DO NOTHING;

-- 8. SECURITY
ALTER TABLE hotel_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- 9. PERMISSIVE POLICIES
CREATE POLICY "Public full access to chart_of_accounts" ON chart_of_accounts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to customers" ON customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to vendors" ON vendors FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to hotel_vouchers" ON hotel_vouchers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to transport_vouchers" ON transport_vouchers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to ticket_vouchers" ON ticket_vouchers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to visa_vouchers" ON visa_vouchers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to receipts" ON receipts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to ledger_entries" ON ledger_entries FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. FINAL GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, public;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role, public;

NOTIFY pgrst, 'reload schema';
