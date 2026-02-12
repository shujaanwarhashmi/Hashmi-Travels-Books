
import { Voucher, VoucherEntry, Account, GlobalState, Customer, Vendor } from '../types';

export const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const calculateAccountBalance = (
  accountId: string, 
  state: GlobalState,
  partyId?: string
) => {
  let totalDebit = 0;
  let totalCredit = 0;

  const account = state.accounts.find(a => a.id === accountId || a.dbId === accountId || a.code === accountId);
  const isAR = account?.code === '1003';
  const isAP = account?.code === '2001';
  const isEquityOffset = account?.code === '3999';

  // 1. Initial Master Data Openings
  if (partyId) {
    const cust = state.customers.find(c => c.id === partyId);
    const vend = state.vendors.find(v => v.id === partyId);
    if (cust) {
      if (cust.openingBalanceType === 'Receivable') totalDebit += Number(cust.openingBalance);
      else totalCredit += Number(cust.openingBalance);
    } else if (vend) {
      if (vend.openingBalanceType === 'Advance') totalDebit += Number(vend.openingBalance);
      else totalCredit += Number(vend.openingBalance);
    }
  } else {
    if (isAR) {
      state.customers.forEach(c => {
        if (c.openingBalanceType === 'Receivable') totalDebit += Number(c.openingBalance);
        else totalCredit += Number(c.openingBalance);
      });
    } else if (isAP) {
      state.vendors.forEach(v => {
        if (v.openingBalanceType === 'Advance') totalDebit += Number(v.openingBalance);
        else totalCredit += Number(v.openingBalance);
      });
    } else if (isEquityOffset) {
       // Offset of all registry openings to keep Trial Balance in check
       state.customers.forEach(c => {
         const val = Number(c.openingBalance);
         if (c.openingBalanceType === 'Receivable') totalCredit += val;
         else totalDebit += val;
       });
       state.vendors.forEach(v => {
         const val = Number(v.openingBalance);
         if (v.openingBalanceType === 'Advance') totalCredit += val;
         else totalDebit += val;
       });
    }
  }

  // 2. Ledger Posting Summation
  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      const matchAcc = e.accountId === accountId || (account && (e.accountId === account.id || e.accountId === account.dbId || e.accountId === account.code));
      if (matchAcc) {
        if (partyId) {
          if (e.customerId !== partyId && e.vendorId !== partyId) return;
        }
        totalDebit += (e.pkrDebit || (e.debit * (e.roe || 1)));
        totalCredit += (e.pkrCredit || (e.credit * (e.roe || 1)));
      }
    });
  });

  return totalDebit - totalCredit;
};

export const getAccountLedger = (accountId: string, fromDate: string, toDate: string, state: GlobalState) => {
  const account = state.accounts.find(a => a.id === accountId || a.dbId === accountId || a.code === accountId);
  if (!account) return [];

  let runningBalance = 0;
  // This logic should ideally calculate opening balance at fromDate, but for simplicity we show all
  const entries: any[] = [];
  
  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.accountId === account.id || e.accountId === account.dbId || e.accountId === account.code) {
        const dr = e.pkrDebit || (e.debit * (e.roe || 1));
        const cr = e.pkrCredit || (e.credit * (e.roe || 1));
        runningBalance += (dr - cr);
        entries.push({ date: v.date, voucherNo: v.voucherNo, type: v.type, description: e.description || v.description, debit: dr, credit: cr, balance: runningBalance });
      }
    });
  });
  return entries.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getLedger = (partyId: string, partyType: 'Customer' | 'Vendor', state: GlobalState) => {
  const party = partyType === 'Customer' ? state.customers.find(c => c.id === partyId) : state.vendors.find(v => v.id === partyId);
  if (!party) return [];

  let totalDebit = 0;
  let totalCredit = 0;
  if (partyType === 'Customer') {
    if (party.openingBalanceType === 'Receivable') totalDebit = Number(party.openingBalance);
    else totalCredit = Number(party.openingBalance);
  } else {
    if (party.openingBalanceType === 'Advance') totalDebit = Number(party.openingBalance);
    else totalCredit = Number(party.openingBalance);
  }

  let runningBalance = totalDebit - totalCredit;
  const entries: any[] = [{ date: 'Opening', voucherNo: '-', type: 'Opening Balance', description: 'Snapshot from Registry', debit: totalDebit, credit: totalCredit, balance: runningBalance }];

  const moves: any[] = [];
  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.customerId === partyId || e.vendorId === partyId) {
        moves.push({ date: v.date, voucherNo: v.voucherNo, type: v.type, description: e.description || v.description, debit: e.pkrDebit || (e.debit * (e.roe || 1)), credit: e.pkrCredit || (e.credit * (e.roe || 1)) });
      }
    });
  });

  moves.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(m => {
    runningBalance += (m.debit - m.credit);
    entries.push({ ...m, balance: runningBalance });
  });

  return entries;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
