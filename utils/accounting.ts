
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
  if (!account) return 0;

  const isAR = account.code === '1003';
  const isAP = account.code === '2001';
  const isEquityOffset = account.code === '3999';

  // 1. Initial Master Data Openings
  if (partyId) {
    const cust = state.customers.find(c => c.id === partyId);
    const vend = state.vendors.find(v => v.id === partyId);
    if (cust && isAR) {
      if (cust.openingBalanceType === 'Receivable') totalDebit += Number(cust.openingBalance);
      else totalCredit += Number(cust.openingBalance);
    } else if (vend && isAP) {
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
       // Equity offset for all opening balances in the system
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
      // Check if entry account matches target account
      const matchAcc = e.accountId === account.id || e.accountId === account.dbId || e.accountId === account.code;
      
      if (matchAcc) {
        // If we are filtering by a specific party (e.g. Lead Passenger or Sub-Agent)
        if (partyId) {
          if (e.customerId !== partyId && e.vendorId !== partyId) return;
        }

        totalDebit += (e.pkrDebit || (Number(e.debit || 0) * Number(e.roe || 1)));
        totalCredit += (e.pkrCredit || (Number(e.credit || 0) * Number(e.roe || 1)));
      }
    });
  });

  return totalDebit - totalCredit;
};

export const getAccountLedger = (accountId: string, fromDate: string, toDate: string, state: GlobalState) => {
  const account = state.accounts.find(a => a.id === accountId || a.dbId === accountId || a.code === accountId);
  if (!account) return [];

  let runningBalance = 0;
  const entries: any[] = [];
  
  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.accountId === account.id || e.accountId === account.dbId || e.accountId === account.code) {
        const dr = e.pkrDebit || (Number(e.debit || 0) * Number(e.roe || 1));
        const cr = e.pkrCredit || (Number(e.credit || 0) * Number(e.roe || 1));
        
        entries.push({ 
          date: v.date, 
          voucherNo: v.voucherNo, 
          type: v.type, 
          description: e.description || v.description, 
          debit: dr, 
          credit: cr 
        });
      }
    });
  });

  return entries
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => {
       runningBalance += (e.debit - e.credit);
       return { ...e, balance: runningBalance };
    });
};

export const getLedger = (partyId: string, partyType: 'Customer' | 'Vendor', state: GlobalState) => {
  const party = partyType === 'Customer' ? state.customers.find(c => c.id === partyId) : state.vendors.find(v => v.id === partyId);
  if (!party) return [];

  let totalDebit = 0;
  let totalCredit = 0;
  
  // Starting Balance from Master Registry
  if (partyType === 'Customer') {
    if (party.openingBalanceType === 'Receivable') totalDebit = Number(party.openingBalance);
    else totalCredit = Number(party.openingBalance);
  } else {
    if (party.openingBalanceType === 'Advance') totalDebit = Number(party.openingBalance);
    else totalCredit = Number(party.openingBalance);
  }

  let runningBalance = totalDebit - totalCredit;
  const entries: any[] = [{ date: 'Opening', voucherNo: '-', type: 'Opening Balance', description: 'Initial balance from registry', debit: totalDebit, credit: totalCredit, balance: runningBalance }];

  const moves: any[] = [];
  state.vouchers.forEach(v => {
    if (v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.customerId === partyId || e.vendorId === partyId) {
        moves.push({ 
          date: v.date, 
          voucherNo: v.voucherNo, 
          type: v.type, 
          description: e.description || v.description, 
          debit: e.pkrDebit || (Number(e.debit || 0) * Number(e.roe || 1)), 
          credit: e.pkrCredit || (Number(e.credit || 0) * Number(e.roe || 1)) 
        });
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
