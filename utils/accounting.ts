
import { Voucher, VoucherEntry, Account, GlobalState, Customer, Vendor } from '../types';

export const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculates the net balance (Debit - Credit) for an account.
 * For control accounts (acc-3, acc-5), it aggregates all individual party opening balances.
 */
export const calculateAccountBalance = (
  accountId: string, 
  state: GlobalState,
  partyId?: string
) => {
  let totalDebit = 0;
  let totalCredit = 0;

  // 1. Calculate base opening balance from the registry
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
    // Aggregation for control accounts (AR / AP)
    if (accountId === 'acc-3' || accountId === '1003') {
      state.customers.forEach(c => {
        if (c.openingBalanceType === 'Receivable') totalDebit += Number(c.openingBalance);
        else totalCredit += Number(c.openingBalance);
      });
    } else if (accountId === 'acc-5' || accountId === '2001') {
      state.vendors.forEach(v => {
        if (v.openingBalanceType === 'Advance') totalDebit += Number(v.openingBalance);
        else totalCredit += Number(v.openingBalance);
      });
    }
  }

  // 2. Aggregate all Posted ledger entries from vouchers
  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    
    v.entries.forEach(e => {
      // Handle both local ID and DB UUID mapping
      const account = state.accounts.find(a => a.id === accountId || a.dbId === accountId || a.code === accountId);
      if (!account) return;

      if (e.accountId === account.id || e.accountId === account.dbId) {
        if (partyId) {
          if (e.customerId !== partyId && e.vendorId !== partyId) return;
        }
        
        totalDebit += Number(e.debit || 0);
        totalCredit += Number(e.credit || 0);
      }
    });
  });

  return totalDebit - totalCredit;
};

export const getAccountLedger = (accountId: string, fromDate: string, toDate: string, state: GlobalState) => {
  const account = state.accounts.find(a => a.id === accountId || a.dbId === accountId || a.code === accountId);
  if (!account) return [];

  let totalDebitBefore = 0;
  let totalCreditBefore = 0;

  // Add Party Openings if this is a control account
  if (account.id === 'acc-3' || account.code === '1003') {
    state.customers.forEach(c => {
      if (c.openingBalanceType === 'Receivable') totalDebitBefore += Number(c.openingBalance);
      else totalCreditBefore += Number(c.openingBalance);
    });
  } else if (account.id === 'acc-5' || account.code === '2001') {
    state.vendors.forEach(v => {
      if (v.openingBalanceType === 'Advance') totalDebitBefore += Number(v.openingBalance);
      else totalCreditBefore += Number(v.openingBalance);
    });
  }

  // Calculate voucher movement before period
  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    if (new Date(v.date) < new Date(fromDate)) {
      v.entries.forEach(e => {
        if (e.accountId === account.id || e.accountId === account.dbId) {
          totalDebitBefore += Number(e.debit || 0);
          totalCreditBefore += Number(e.credit || 0);
        }
      });
    }
  });

  const openingNet = totalDebitBefore - totalCreditBefore;
  let runningBalance = openingNet;

  const ledgerEntries: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: `Balance as of ${new Date(fromDate).toLocaleDateString()}`,
    debit: 0,
    credit: 0,
    balance: openingNet,
    isDebit: true
  }];

  const periodVouchers = state.vouchers
    .filter(v => (!v.status || v.status === 'Posted') && v.date >= fromDate && v.date <= toDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  periodVouchers.forEach(v => {
    v.entries.forEach(e => {
      if (e.accountId === account.id || e.accountId === account.dbId) {
        const entryDebit = Number(e.debit || 0);
        const entryCredit = Number(e.credit || 0);
        
        runningBalance += (entryDebit - entryCredit);
        
        ledgerEntries.push({
          id: v.id,
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: e.description || v.description,
          debit: entryDebit,
          credit: entryCredit,
          balance: runningBalance,
          isDebit: true
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

  const entries: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: 'Initial balance',
    debit: totalDebit,
    credit: totalCredit,
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
        });
      }
    });
  });

  partyEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  partyEntries.forEach(ent => {
    runningBalance += (ent.debit - ent.credit);
    entries.push({ ...ent, balance: runningBalance });
  });

  return entries;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
