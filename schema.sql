
-- ======================================================
-- HASHMI TRAVEL BOOKS - MASTER DATABASE (v16.27)
-- ATOMIC DOUBLE-ENTRY ENGINE & VENDOR CREDIT FIX
-- ======================================================

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

-- 2. CORE TYPES
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
    opening_balance_type TEXT DEFAULT 'Payable' CHECK (opening_balance_type IN ('Payable', 'Advance')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FINANCIAL VOUCHERS
CREATE TABLE hotel_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    hotel_name TEXT,
    passenger_name TEXT,
    check_in DATE,
    check_out DATE,
    rooms INT DEFAULT 1,
    buy_rate_sar DECIMAL(15,2) DEFAULT 0,
    sale_rate_sar DECIMAL(15,2) DEFAULT 0,
    roe DECIMAL(10,4) DEFAULT 1.0,
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(sale_rate_sar, 0) * COALESCE(roe, 1) * COALESCE(rooms, 1) * COALESCE(NULLIF(EXTRACT(DAY FROM (check_out::timestamp - check_in::timestamp))::int, 0), 1)) STORED,
    total_buy_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(buy_rate_sar, 0) * COALESCE(roe, 1) * COALESCE(rooms, 1) * COALESCE(NULLIF(EXTRACT(DAY FROM (check_out::timestamp - check_in::timestamp))::int, 0), 1)) STORED,
    remarks TEXT,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE transport_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    route TEXT,
    vehicle_type TEXT,
    quantity INT DEFAULT 1,
    buy_rate_sar DECIMAL(15,2) DEFAULT 0,
    sale_rate_sar DECIMAL(15,2) DEFAULT 0,
    roe DECIMAL(10,4) DEFAULT 1.0,
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(sale_rate_sar, 0) * COALESCE(roe, 1) * COALESCE(quantity, 1)) STORED,
    total_buy_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(buy_rate_sar, 0) * COALESCE(roe, 1) * COALESCE(quantity, 1)) STORED,
    remarks TEXT,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE ticket_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    passenger_name TEXT,
    airline_name TEXT,
    ticket_no TEXT,
    gds_pnr TEXT,
    roe DECIMAL(10,4) DEFAULT 1.0,
    base_fare_pkr DECIMAL(15,2) DEFAULT 0,
    tax_pkr DECIMAL(15,2) DEFAULT 0,
    service_fee_pkr DECIMAL(15,2) DEFAULT 0,
    net_buy_pkr DECIMAL(15,2) DEFAULT 0,
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS ((COALESCE(base_fare_pkr, 0) + COALESCE(tax_pkr, 0) + COALESCE(service_fee_pkr, 0)) * COALESCE(roe, 1)) STORED,
    total_buy_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(net_buy_pkr, 0) * COALESCE(roe, 1)) STORED,
    remarks TEXT,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE visa_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    passenger_name TEXT,
    country TEXT,
    visa_type TEXT,
    roe DECIMAL(10,4) DEFAULT 1.0,
    buy_rate_pkr DECIMAL(15,2) DEFAULT 0,
    sale_rate_pkr DECIMAL(15,2) DEFAULT 0,
    send_to_embassy TEXT,
    remarks TEXT,
    total_sale_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(sale_rate_pkr, 0) * COALESCE(roe, 1)) STORED,
    total_buy_pkr DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(buy_rate_pkr, 0) * COALESCE(roe, 1)) STORED,
    status voucher_status DEFAULT 'Posted'
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no TEXT UNIQUE NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    party_id UUID, 
    reference_id UUID NOT NULL, 
    reference_no TEXT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    narration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION cleanup_ledger_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM ledger_entries WHERE reference_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. ROBUST DOUBLE-ENTRY POSTING ENGINE
CREATE OR REPLACE FUNCTION process_voucher_ledger_post()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
    v_ar_id UUID; 
    v_ap_id UUID; 
    v_inc_id UUID; 
    v_narration TEXT;
    v_total_sale DECIMAL(15,2) := 0; 
    v_total_buy DECIMAL(15,2) := 0;
    v_roe DECIMAL(10,4);
    v_qty INT;
    v_days INT;
BEGIN
    -- Resolve System Accounts
    SELECT id INTO v_ar_id FROM chart_of_accounts WHERE account_code = '1003' LIMIT 1;
    SELECT id INTO v_ap_id FROM chart_of_accounts WHERE account_code = '2001' LIMIT 1;
    
    IF v_ar_id IS NULL OR v_ap_id IS NULL THEN
        RAISE EXCEPTION 'COA_MISSING: Accounts Receivable (1003) or Payable (2001) not found.';
    END IF;

    -- Standard Ledger Cleanup (for Updates)
    DELETE FROM ledger_entries WHERE reference_id = NEW.id;

    v_roe := COALESCE(NEW.roe, 1.0);

    -- Special Handling for Receipts
    IF TG_TABLE_NAME = 'receipts' THEN
        v_total_sale := COALESCE(NEW.amount_pkr, 0);
        v_narration := COALESCE(NEW.narration, 'Receipt Ref: ' || NEW.receipt_no);
        
        -- Debit Bank/Cash
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.receipt_date, NEW.deposit_account_id, NEW.id, NEW.receipt_no, v_total_sale, v_narration);
        
        -- Credit Party
        IF NEW.customer_id IS NOT NULL THEN
            INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
            VALUES (NEW.receipt_date, v_ar_id, NEW.customer_id, NEW.id, NEW.receipt_no, v_total_sale, v_narration);
        ELSIF NEW.vendor_id IS NOT NULL THEN
            INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
            VALUES (NEW.receipt_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.receipt_no, v_total_sale, v_narration);
        END IF;
        RETURN NEW;
    END IF;

    -- Calculate Totals based on Voucher Type (Manual logic ensures values are never null or zero unexpectedly)
    IF TG_TABLE_NAME = 'hotel_vouchers' THEN
        v_days := COALESCE(NULLIF(EXTRACT(DAY FROM (NEW.check_out::timestamp - NEW.check_in::timestamp))::int, 0), 1);
        v_qty := COALESCE(NEW.rooms, 1);
        v_total_sale := COALESCE(NEW.sale_rate_sar, 0) * v_roe * v_qty * v_days;
        v_total_buy := COALESCE(NEW.buy_rate_sar, 0) * v_roe * v_qty * v_days;
        v_narration := 'Hotel: ' || COALESCE(NEW.hotel_name, 'Stay');
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4002' LIMIT 1;
        
    ELSIF TG_TABLE_NAME = 'transport_vouchers' THEN
        v_qty := COALESCE(NEW.quantity, 1);
        v_total_sale := COALESCE(NEW.sale_rate_sar, 0) * v_roe * v_qty;
        v_total_buy := COALESCE(NEW.buy_rate_sar, 0) * v_roe * v_qty;
        v_narration := 'Transport: ' || COALESCE(NEW.route, 'Trip');
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4001' LIMIT 1;
        
    ELSIF TG_TABLE_NAME = 'ticket_vouchers' THEN
        v_total_sale := (COALESCE(NEW.base_fare_pkr, 0) + COALESCE(NEW.tax_pkr, 0) + COALESCE(NEW.service_fee_pkr, 0)) * v_roe;
        v_total_buy := COALESCE(NEW.net_buy_pkr, 0) * v_roe;
        v_narration := 'Ticket: ' || COALESCE(NEW.airline_name, 'Air Travel');
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4003' LIMIT 1;
        
    ELSIF TG_TABLE_NAME = 'visa_vouchers' THEN
        v_total_sale := COALESCE(NEW.sale_rate_pkr, 0) * v_roe;
        v_total_buy := COALESCE(NEW.buy_rate_pkr, 0) * v_roe;
        v_narration := 'Visa: ' || COALESCE(NEW.visa_type, 'Service');
        SELECT id INTO v_inc_id FROM chart_of_accounts WHERE account_code = '4004' LIMIT 1;
    END IF;

    -- 1. DEBIT CUSTOMER (Accounts Receivable)
    IF NEW.customer_id IS NOT NULL THEN
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, debit, narration)
        VALUES (NEW.voucher_date, v_ar_id, NEW.customer_id, NEW.id, NEW.voucher_no, v_total_sale, 'Sale: ' || v_narration);
    END IF;
    
    -- 2. CREDIT VENDOR (Accounts Payable)
    IF NEW.vendor_id IS NOT NULL THEN
        INSERT INTO ledger_entries(entry_date, account_id, party_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_ap_id, NEW.vendor_id, NEW.id, NEW.voucher_no, v_total_buy, 'Cost: ' || v_narration);
    END IF;

    -- 3. CREDIT INCOME (Markup)
    IF v_inc_id IS NOT NULL AND (v_total_sale - v_total_buy) <> 0 THEN
        INSERT INTO ledger_entries(entry_date, account_id, reference_id, reference_no, credit, narration)
        VALUES (NEW.voucher_date, v_inc_id, NEW.id, NEW.voucher_no, (v_total_sale - v_total_buy), 'Margin: ' || v_narration);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER REGISTRY
CREATE TRIGGER trg_hotel_post AFTER INSERT OR UPDATE ON hotel_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_transport_post AFTER INSERT OR UPDATE ON transport_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_ticket_post AFTER INSERT OR UPDATE ON ticket_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_visa_post AFTER INSERT OR UPDATE ON visa_vouchers FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();
CREATE TRIGGER trg_receipt_post AFTER INSERT OR UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION process_voucher_ledger_post();

CREATE TRIGGER trg_hotel_del AFTER DELETE ON hotel_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_transport_del AFTER DELETE ON transport_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_ticket_del AFTER DELETE ON ticket_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_visa_del AFTER DELETE ON visa_vouchers FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();
CREATE TRIGGER trg_receipt_del AFTER DELETE ON receipts FOR EACH ROW EXECUTE FUNCTION cleanup_ledger_on_delete();

-- 8. INITIALIZE ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_generated) VALUES
('1001', 'CASH IN HAND', 'Cash', true),
('1002', 'BANK ACCOUNT', 'Bank', true),
('1003', 'ACCOUNTS RECEIVABLE', 'Receivable', true),
('2001', 'ACCOUNTS PAYABLE', 'Payable', true),
('4001', 'TRANSPORT INCOME', 'Income', false),
('4002', 'HOTEL SERVICE INCOME', 'Income', false),
('4003', 'AIR TICKET INCOME', 'Income', false),
('4004', 'VISA SERVICE INCOME', 'Income', false)
ON CONFLICT (account_code) DO NOTHING;
