
import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { calculateAccountBalance, formatCurrency, getAccountLedger } from '../utils/accounting';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('Trial Balance');

  // General Ledger States
  const [glAccountId, setGlAccountId] = useState(state.accounts[0]?.id || '');
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const tabs = [
    { id: 'General Ledger', label: 'General Ledger', icon: 'fa-book' },
    { id: 'Trial Balance', label: 'Trial Balance', icon: 'fa-file-waveform' },
    { id: 'Profit & Loss', label: 'Profit & Loss', icon: 'fa-chart-line' },
    { id: 'Balance Sheet', label: 'Balance Sheet', icon: 'fa-balance-scale' }
  ];

  const trialBalance = useMemo(() => {
    return state.accounts.map(acc => {
      const net = calculateAccountBalance(acc.id, state);
      return { 
        ...acc, 
        debit: net > 0 ? net : 0, 
        credit: net < 0 ? Math.abs(net) : 0 
      };
    });
  }, [state]);

  const plReport = useMemo(() => {
    const income = state.accounts.filter(a => a.type === 'Income').map(a => {
      const net = calculateAccountBalance(a.id, state);
      return { title: a.title, amount: net < 0 ? Math.abs(net) : 0 };
    });
    
    const expenses = state.accounts.filter(a => a.type === 'Expense').map(a => {
      const net = calculateAccountBalance(a.id, state);
      return { title: a.title, amount: net > 0 ? net : 0 };
    });

    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { income, expenses, totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }, [state]);

  const balanceSheet = useMemo(() => {
    const assetsList: { title: string, amount: number }[] = [];
    const liabilitiesList: { title: string, amount: number }[] = [];

    state.accounts.forEach(acc => {
      if (acc.type === 'Income' || acc.type === 'Expense') return;
      
      const net = calculateAccountBalance(acc.id, state);
      if (net > 0) assetsList.push({ title: acc.title, amount: net });
      else if (net < 0) liabilitiesList.push({ title: acc.title, amount: Math.abs(net) });
    });

    const totalAssets = assetsList.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilitiesList.reduce((s, l) => s + l.amount, 0);
    return { assets: assetsList, liabilities: liabilitiesList, totalAssets, totalLiabilities };
  }, [state]);

  const glData = useMemo(() => {
    if (activeTab !== 'General Ledger' || !glAccountId) return [];
    return getAccountLedger(glAccountId, fromDate, toDate, state);
  }, [activeTab, glAccountId, fromDate, toDate, state]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
         <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-[#0B1120] dark:bg-sky-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
         </div>
      </div>

      {activeTab === 'General Ledger' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Account Head</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={glAccountId} onChange={e => setGlAccountId(e.target.value)}>
                {state.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">From</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">To</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
             <table className="w-full text-left">
                <thead className="bg-[#0B1120] dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Reference</th>
                    <th className="px-8 py-5">Narration</th>
                    <th className="px-8 py-5 text-right">Debit</th>
                    <th className="px-8 py-5 text-right">Credit</th>
                    <th className="px-8 py-5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {glData.map((ent, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-8 py-4 text-xs font-bold text-slate-500">{ent.date === 'Opening' ? '-' : ent.date}</td>
                      <td className="px-8 py-4 text-xs font-black text-sky-600">{ent.voucherNo}</td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-600 truncate max-w-[200px]">{ent.description}</td>
                      <td className="px-8 py-4 text-right text-xs font-black">{ent.debit > 0 ? ent.debit.toLocaleString() : '-'}</td>
                      <td className="px-8 py-4 text-right text-xs font-black">{ent.credit > 0 ? ent.credit.toLocaleString() : '-'}</td>
                      <td className="px-8 py-4 text-right text-xs font-black">
                        {Math.abs(ent.balance).toLocaleString()} {ent.balance >= 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'Trial Balance' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-12 bg-[#0B1120] dark:bg-slate-800 py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <div className="col-span-6">Account Head</div>
            <div className="col-span-3 text-right">Debit (PKR)</div>
            <div className="col-span-3 text-right">Credit (PKR)</div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {trialBalance.map(acc => (
              <div key={acc.id} className="grid grid-cols-12 py-5 px-10 items-center">
                <div className="col-span-6 flex flex-col">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{acc.title}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{acc.code} | {acc.type}</span>
                </div>
                <div className="col-span-3 text-right text-xs font-black">
                  {acc.debit > 0 ? acc.debit.toLocaleString() : '-'}
                </div>
                <div className="col-span-3 text-right text-xs font-black text-rose-500">
                  {acc.credit > 0 ? acc.credit.toLocaleString() : '-'}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#0B1120] py-8 px-10 flex justify-between items-center text-white">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Statement Totals</span>
            <div className="flex gap-16">
              <span className="text-xl font-black">Rs. {trialBalance.reduce((s, a) => s + a.debit, 0).toLocaleString()}</span>
              <span className="text-xl font-black">Rs. {trialBalance.reduce((s, a) => s + a.credit, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Profit & Loss' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
             <div className="space-y-6">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b pb-4">Revenue Streams</p>
                {plReport.income.map((i, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold">
                    <span>{i.title}</span><span>Rs. {i.amount.toLocaleString()}</span>
                  </div>
                ))}
             </div>
             <div className="space-y-6">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest border-b pb-4">Operational Overhead</p>
                {plReport.expenses.map((e, idx) => (
                   <div key={idx} className="flex justify-between items-center text-xs font-bold">
                      <span>{e.title}</span><span>Rs. {e.amount.toLocaleString()}</span>
                   </div>
                ))}
             </div>
           </div>
           <div className="bg-[#0B1120] rounded-[3rem] p-16 text-center text-white relative overflow-hidden">
              <div className="relative z-10">
                 <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-4">Bottom Line Performance</p>
                 <h2 className="text-7xl font-black text-emerald-400 tracking-tighter">Rs. {plReport.netProfit.toLocaleString()}</h2>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'Balance Sheet' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
             <div className="space-y-8">
                <div className="bg-[#0B1120] text-white px-8 py-3 rounded-xl inline-block text-[10px] font-black uppercase tracking-widest mb-6">Current Assets</div>
                {balanceSheet.assets.map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-3 text-xs font-bold">
                     <span>{a.title}</span><span>Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-8 text-2xl font-black text-emerald-500">
                   <span className="text-[10px] uppercase">Total Assets</span><span>Rs. {balanceSheet.totalAssets.toLocaleString()}</span>
                </div>
             </div>
             <div className="space-y-8">
                <div className="bg-[#0B1120] text-white px-8 py-3 rounded-xl inline-block text-[10px] font-black uppercase tracking-widest mb-6">Liabilities & Equity</div>
                {balanceSheet.liabilities.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-3 text-xs font-bold">
                     <span>{l.title}</span><span>Rs. {l.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-b pb-3 text-xs font-bold text-emerald-500">
                   <span>Retained Period Earnings</span><span>Rs. {plReport.netProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-8 text-2xl font-black text-rose-500">
                   <span className="text-[10px] uppercase">Total L & E</span><span>Rs. {(balanceSheet.totalLiabilities + plReport.netProfit).toLocaleString()}</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
