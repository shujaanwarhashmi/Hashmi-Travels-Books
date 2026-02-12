
import { Account, GlobalState, Customer, Vendor } from './types';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', code: '1001', title: 'CASH IN HAND', type: 'Cash', isSystem: true },
  { id: 'acc-2', code: '1002', title: 'MEEZAN BANK LTD', type: 'Bank' },
  { id: 'acc-3', code: '1003', title: 'ACCOUNTS RECEIVABLE', type: 'Receivable', isSystem: true },
  { id: 'acc-4', code: '1004', title: 'ADVANCE TO VENDORS', type: 'Asset' },
  { id: 'acc-5', code: '2001', title: 'ACCOUNTS PAYABLE', type: 'Payable', isSystem: true },
  { id: 'acc-6', code: '4001', title: 'TRANSPORT INCOME', type: 'Income' },
  { id: 'acc-7', code: '4002', title: 'HOTEL SERVICE INCOME', type: 'Income' },
  { id: 'acc-8', code: '5001', title: 'OFFICE RENT EXPENSE', type: 'Expense' },
  { id: 'acc-9', code: '5002', title: 'DRIVER EXPENSE', type: 'Expense' },
  { id: 'acc-10', code: '3001', title: 'CAPITAL ACCOUNT', type: 'Equity' },
  { id: 'acc-11', code: '4003', title: 'AIR TICKET INCOME', type: 'Income' },
  { id: 'acc-12', code: '4004', title: 'VISA SERVICE INCOME', type: 'Income' },
  { id: 'acc-13', code: '3002', title: 'GENERAL RESERVE', type: 'Equity' },
  { id: 'acc-14', code: '3999', title: 'OPENING BALANCE EQUITY', type: 'Equity', isSystem: true },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    code: 'C-001',
    name: 'Ahmed Travels',
    phone: '0301-1234567',
    email: 'ahmed@travels.com',
    address: 'Phase 5, DHA',
    city: 'Karachi',
    openingBalance: 50000,
    openingBalanceType: 'Receivable',
    isActive: true,
    status: 'Active & Visible'
  },
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vend-1',
    code: 'V-001',
    name: 'City Transport Services',
    phone: '0333-1112223',
    email: 'contact@citytransport.com',
    address: 'Saddar',
    city: 'Karachi',
    openingBalance: 30000,
    openingBalanceType: 'Payable',
    isActive: true,
    status: 'Active & Visible'
  },
];

export const STORAGE_KEY = 'travel_erp_state_v3';

export const DEFAULT_STATE: GlobalState = {
  accounts: INITIAL_ACCOUNTS,
  customers: INITIAL_CUSTOMERS,
  vendors: INITIAL_VENDORS,
  vouchers: [],
  settings: {
    companyName: 'TravelLedger',
    legalTitle: 'NEEM TREE TRAVEL SERVICES',
    tagline: 'Agency Accounting Core',
    address: 'Shah Faisal Town Malir Halt Karachi',
    phone: '021000000',
    mobile: '0334 3666777',
    email: 'neemtreetravel@gmail.com',
    website: 'www.neemtreetravels.com',
    defaultRoe: 77.5,
    theme: 'light',
    compactView: false,
    bankName: 'Meezan Bank Ltd',
    bankAccountTitle: 'Neem Tree Travels Services',
    iban: 'PK32MEZN001234567890'
  },
};
