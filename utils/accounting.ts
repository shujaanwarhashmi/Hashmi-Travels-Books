
import { Voucher, VoucherEntry, Account, GlobalState } from '../types';

export const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const calculateAccountBalance = (accountId: string, vouchers: Voucher[], openingBalance: number = 0, balanceType: 'Debit' | 'Credit' = 'Debit') => {
  let totalDebit = 0;
  let totalCredit = 0;

  vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.accountId === accountId) {
        totalDebit += e.debit;
        totalCredit += e.credit;
      }
    });
  });

  if (balanceType === 'Debit') {
    return openingBalance + totalDebit - totalCredit;
  } else {
    return openingBalance + totalCredit - totalDebit;
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
    if (v.status !== 'Posted') return;
    if (new Date(v.date) < new Date(fromDate)) {
      v.entries.forEach(e => {
        if (e.accountId === accountId) {
          openingDebit += e.debit;
          openingCredit += e.credit;
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
    .filter(v => v.status === 'Posted' && v.date >= fromDate && v.date <= toDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  periodVouchers.forEach(v => {
    v.entries.forEach(e => {
      if (e.accountId === accountId) {
        if (isDebitNormal) {
          runningBalance += e.debit - e.credit;
        } else {
          runningBalance += e.credit - e.debit;
        }
        
        ledgerEntries.push({
          id: v.id,
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: e.description || v.description,
          debit: e.debit,
          credit: e.credit,
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

  let runningBalance = party.openingBalance;
  
  const entries: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: 'Initial balance',
    debit: partyType === 'Customer' && party.openingBalanceType === 'Receivable' ? party.openingBalance : 0,
    credit: partyType === 'Customer' && party.openingBalanceType === 'Payable' ? party.openingBalance : 0,
    balance: runningBalance
  }];

  const partyEntries: any[] = [];

  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      const isMatch = partyType === 'Customer' ? e.customerId === partyId : e.vendorId === partyId;
      if (isMatch) {
        partyEntries.push({
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: v.description,
          debit: e.debit,
          credit: e.credit,
          roe: v.roe,
          currency: v.currency
        });
      }
    });
  });

  partyEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  partyEntries.forEach(ent => {
    if (partyType === 'Customer') {
      runningBalance += ent.debit - ent.credit;
    } else {
      runningBalance += ent.credit - ent.debit;
    }
    entries.push({ ...ent, balance: runningBalance });
  });

  return entries;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
