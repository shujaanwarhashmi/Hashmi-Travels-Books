
import { Voucher, VoucherEntry, Account, GlobalState } from '../types';

export const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

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
    if (v.status && v.status !== 'Posted') return;
    v.entries.forEach(e => {
      if (e.accountId === accountId) {
        if (partyId && e.customerId !== partyId && e.vendorId !== partyId) return;
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

/**
 * Generates a detailed ledger for a specific party (Customer or Vendor).
 */
export const getLedger = (partyId: string, partyType: 'Customer' | 'Vendor', state: GlobalState) => {
  const party = partyType === 'Customer' 
    ? state.customers.find(c => c.id === partyId) 
    : state.vendors.find(v => v.id === partyId);

  if (!party) return [];

  const isDebitNormal = partyType === 'Customer';
  const isDebitOpening = party.openingBalanceType === 'Receivable' || party.openingBalanceType === 'Advance';
  const isCreditOpening = party.openingBalanceType === 'Payable';

  // For Customer: Positive is Receivable (Dr). For Vendor: Positive is Payable (Cr).
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
          currency: v.currency,
          createdAt: v.createdAt || new Date().toISOString()
        });
      }
    });
  });

  // CRITICAL: Sort by date, then by creation time to maintain perfect balance sequence
  partyEntries.sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    if (d1 !== d2) return d1 - d2;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

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

/**
 * Generates a general ledger report for a specific account head.
 */
export const getAccountLedger = (accountId: string, fromDate: string, toDate: string, state: GlobalState) => {
  const account = state.accounts.find(a => a.id === accountId);
  if (!account) return [];

  const isDebitNormal = ['Asset', 'Cash', 'Bank', 'Receivable', 'Expense'].includes(account.type);

  let runningBalance = 0;
  const fromTime = new Date(fromDate).getTime();
  const toTime = new Date(toDate).getTime();

  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    if (new Date(v.date).getTime() < fromTime) {
      v.entries.forEach(e => {
        if (e.accountId === accountId) {
          if (isDebitNormal) {
            runningBalance += (Number(e.debit || 0) - Number(e.credit || 0));
          } else {
            runningBalance += (Number(e.credit || 0) - Number(e.debit || 0));
          }
        }
      });
    }
  });

  const result: any[] = [{
    date: 'Opening',
    voucherNo: '-',
    type: 'Opening Balance',
    description: `Balance before ${new Date(fromDate).toLocaleDateString()}`,
    debit: 0,
    credit: 0,
    balance: runningBalance,
    isDebit: isDebitNormal
  }];

  const periodEntries: any[] = [];
  state.vouchers.forEach(v => {
    if (v.status && v.status !== 'Posted') return;
    const vTime = new Date(v.date).getTime();
    if (vTime >= fromTime && vTime <= toTime) {
      v.entries.forEach(e => {
        if (e.accountId === accountId) {
          periodEntries.push({
            id: v.id,
            date: v.date,
            voucherNo: v.voucherNo,
            type: v.type,
            description: e.description || v.description,
            debit: Number(e.debit || 0),
            credit: Number(e.credit || 0),
            createdAt: v.createdAt || new Date().toISOString()
          });
        }
      });
    }
  });

  periodEntries.sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    if (d1 !== d2) return d1 - d2;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  periodEntries.forEach(ent => {
    if (isDebitNormal) {
      runningBalance += ent.debit - ent.credit;
    } else {
      runningBalance += ent.credit - ent.debit;
    }
    result.push({ ...ent, balance: runningBalance, isDebit: isDebitNormal });
  });

  return result;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
