
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense' | 'Cash' | 'Bank' | 'Receivable' | 'Payable';
export type VoucherType = 'Cash' | 'Bank' | 'Sales' | 'Purchase' | 'Journal' | 'Transport' | 'Receipt' | 'Hotel' | 'Ticket' | 'Visa';

export interface Account {
  id: string;
  title: string;
  type: AccountType;
  code: string;
  isSystem?: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  openingBalance: number;
  openingBalanceType: 'Receivable' | 'Payable';
  isActive: boolean;
  status: 'Active & Visible' | 'Inactive';
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  openingBalance: number;
  openingBalanceType: 'Payable' | 'Advance';
  isActive: boolean;
  status: 'Active & Visible' | 'Inactive';
}

export interface VoucherEntry {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  customerId?: string;
  vendorId?: string;
  description?: string;
}

export interface Voucher {
  id: string;
  voucherNo: string;
  date: string;
  type: VoucherType;
  description: string;
  currency: 'SAR' | 'PKR';
  roe: number;
  totalAmount: number;
  entries: VoucherEntry[];
  status: 'Draft' | 'Posted';
  createdAt: string;
  // Transport specific
  transportType?: string;
  route?: string;
  vehicleNo?: string;
  driverName?: string;
  quantity?: number;
  rate?: number;
  // Hotel specific
  passengerName?: string;
  hotelProperty?: string;
  country?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  roomBasis?: string;
  salePrice?: number;
  buyPrice?: number;
  roomType?: string;
  mealPlan?: string;
  adults?: number;
  children?: number;
  // Air Ticket specific
  airlineName?: string;
  gdsPnr?: string;
  ticketNumber?: string;
  baseFare?: number;
  taxes?: number;
  serviceFee?: number;
  // Visa specific
  passportNumber?: string;
  processingStatus?: string;
  visaType?: string;
  expiryDate?: string;
}

export interface GlobalState {
  accounts: Account[];
  customers: Customer[];
  vendors: Vendor[];
  vouchers: Voucher[];
  settings: {
    companyName: string;
    legalTitle: string;
    tagline: string;
    address: string;
    phone: string;
    mobile: string;
    email: string;
    website: string;
    defaultRoe: number;
    theme: 'light' | 'dark';
    compactView: boolean;
    bankName: string;
    bankAccountTitle: string;
    iban: string;
  };
}
