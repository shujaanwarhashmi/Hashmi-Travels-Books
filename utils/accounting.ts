import { Voucher, VoucherEntry, Account, GlobalState } from '../types';

export const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculates the balance for a specific account, optionally filtered by a specific customer or vendor.
 */
export const calculateAccountBalance = (
  accountId: string, 
  vouchers: Voucher[], 
  openingBalance: number = 0, 
  balanceType: 'Debit' | 'Credit' = 'Debit',
  partyId?: string
) => {
  let totalDebit = 0;
  let totalCredit = 0;

  vouchers.forEach(v => {
    // If status exists and is not Posted, skip. If status is missing (like in receipts), assume Posted.
    if (v.status && v.status !== 'Posted') return;
    
    v.entries.forEach(e => {
      // Check if account matches
      if (e.accountId === accountId) {
        // If partyId is provided, only include entries for that specific party
        if (partyId) {
          if (e.customerId !== partyId && e.vendorId !== partyId) return;
        }
        
        totalDebit += Number(e.debit || 0);
        totalCredit += Number(e.credit || 0);
      }
    });
  });

  if (balanceType === 'Debit') {
    return Number(openingBalance) + totalDebit - totalCredit;
  } else {
    return Number(openingBalance) + totalCredit - totalDebit;
  }
};

export const getAccountLedger = (accountId: string, fromDate: string, toDate: string, state: GlobalState) => {
  const account = state.accounts.find(a => a.id === accountId);
  if (!account) return [];

  const isDebitNormal = ['Asset', 'Cash', 'Bank', 'Receivable', 'Expense'].includes(account.type);
  
  // Calculate Opening Balance (all transactions before fromDate)
  let openingDebit = 0;
  let openingCredit = 0;
  
  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    if (new Date(v.date) < new Date(fromDate)) {
      v.entries.forEach(e => {
        if (e.accountId === accountId) {
          openingDebit += Number(e.debit || 0);
          openingCredit += Number(e.credit || 0);
        }
      });
    }
  });

  const openingBalance = isDebitNormal ? (openingDebit - openingCredit) : (openingCredit - openingDebit);
  let runningBalance = openingBalance;

  const ledgerEntries: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: `Balance as of ${new Date(fromDate).toLocaleDateString()}`,
    debit: 0,
    credit: 0,
    balance: openingBalance,
    isDebit: isDebitNormal
  }];

  const periodVouchers = state.vouchers
    .filter(v => (!v.status || v.status === 'Posted') && v.date >= fromDate && v.date <= toDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  periodVouchers.forEach(v => {
    v.entries.forEach(e => {
      if (e.accountId === accountId) {
        if (isDebitNormal) {
          runningBalance += Number(e.debit || 0) - Number(e.credit || 0);
        } else {
          runningBalance += Number(e.credit || 0) - Number(e.debit || 0);
        }
        
        ledgerEntries.push({
          id: v.id,
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: e.description || v.description,
          debit: Number(e.debit || 0),
          credit: Number(e.credit || 0),
          balance: runningBalance,
          isDebit: isDebitNormal
        });
      }
    });
  });

  return ledgerEntries;
};

export const getLedger = (partyId: string, partyType: 'Customer' | 'Vendor', state: GlobalState) => {
  const party = partyType === 'Customer' 
    ? state.customers.find(c => c.id === partyId) 
    : state.vendors.find(v => v.id === partyId);

  if (!party) return [];

  // Determine if the opening balance is Debit (Receivable/Advance) or Credit (Payable)
  // Customers: 'Receivable' is Debit, 'Payable' is Credit
  // Vendors: 'Advance' is Debit, 'Payable' is Credit
  const isDebitOpening = party.openingBalanceType === 'Receivable' || party.openingBalanceType === 'Advance';
  const isCreditOpening = party.openingBalanceType === 'Payable';

  // For a Customer/Receivable account, Debit increases balance.
  // For a Vendor/Payable account, Credit increases balance.
  const isDebitNormal = partyType === 'Customer';

  let runningBalance = isDebitNormal 
    ? (isDebitOpening ? Number(party.openingBalance) : -Number(party.openingBalance))
    : (isCreditOpening ? Number(party.openingBalance) : -Number(party.openingBalance));

  const entries: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: 'Initial balance',
    debit: isDebitOpening ? Number(party.openingBalance) : 0,
    credit: isCreditOpening ? Number(party.openingBalance) : 0,
    balance: runningBalance
  }];

  const partyEntries: any[] = [];

  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    v.entries.forEach(e => {
      const isMatch = partyType === 'Customer' ? e.customerId === partyId : e.vendorId === partyId;
      if (isMatch) {
        partyEntries.push({
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: e.description || v.description,
          debit: Number(e.debit || 0),
          credit: Number(e.credit || 0),
          roe: v.roe,
          currency: v.currency
        });
      }
    });
  });

  partyEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  partyEntries.forEach(ent => {
    if (isDebitNormal) {
      runningBalance += ent.debit - ent.credit;
    } else {
      runningBalance += ent.credit - ent.debit;
    }
    entries.push({ ...ent, balance: runningBalance });
  });

  return entries;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);