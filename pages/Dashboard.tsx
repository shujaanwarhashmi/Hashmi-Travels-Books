import React, { useMemo } from 'react';
import { useApp } from '../App';
import { formatCurrency, calculateAccountBalance } from '../utils/accounting';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, subValue, icon, color, trend, compact }: { title: string, value: string, subValue?: string, icon: string, color: string, trend?: string, compact?: boolean }) => (
  <div className={`${compact ? 'p-5' : 'p-8'} bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-500`}>
    <div className="flex justify-between items-start relative z-10">
      <div className={`${color} ${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500`}>
        <i className={`fa-solid ${icon} ${compact ? 'text-sm' : 'text-xl'}`}></i>
      </div>
      {trend && !compact && (
        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
          <i className="fa-solid fa-arrow-trend-up mr-1"></i> {trend}
        </span>
      )}
    </div>
    <div className={`${compact ? 'mt-4' : 'mt-8'} relative z-10`}>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className={`${compact ? 'text-xl' : 'text-3xl'} font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none`}>{value}</h3>
      {subValue && !compact && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">{subValue}</p>}
    </div>
    <i className={`fa-solid ${icon} absolute right-[-20px] bottom-[-20px] ${compact ? 'text-[80px]' : 'text-[120px]'} text-slate-50 dark:text-slate-800 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}></i>
  </div>
);

const Dashboard: React.FC = () => {
  const { state, refreshData } = useApp();
  const { compactView } = state.settings;

  const metrics = useMemo(() => {
    const cash = calculateAccountBalance('acc-1', state.vouchers, 0);
    const bank = calculateAccountBalance('acc-2', state.vouchers, 0);
    
    // Correct logic: Calculate balance per customer and sum them up
    let totalReceivables = 0;
    state.customers.forEach(c => {
      const bal = calculateAccountBalance(
        'acc-3', 
        state.vouchers, 
        c.openingBalanceType === 'Receivable' ? c.openingBalance : -c.openingBalance, 
        'Debit',
        c.id // Filter by specific party
      );
      if (bal > 0) totalReceivables += bal;
    });

    let totalPayables = 0;
    state.vendors.forEach(v => {
      const bal = calculateAccountBalance(
        'acc-5', 
        state.vouchers, 
        v.openingBalanceType === 'Payable' ? v.openingBalance : -v.openingBalance, 
        'Credit',
        v.id // Filter by specific party
      );
      if (bal > 0) totalPayables += bal;
    });

    const income = state.accounts.filter(a => a.type === 'Income').reduce((s, a) => s + calculateAccountBalance(a.id, state.vouchers, 0, 'Credit'), 0);
    const expenses = state.accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + calculateAccountBalance(a.id, state.vouchers, 0, 'Debit'), 0);

    return { 
      cashBank: cash + bank, 
      receivables: totalReceivables, 
      payables: totalPayables, 
      income, 
      expenses,
      netProfit: income - expenses
    };
  }, [state.vouchers, state.customers, state.vendors, state.accounts]);

  const isEmpty = state.vouchers.length === 0 && state.customers.length === 0 && state.vendors.length === 0;

  return (
    <div className={`${compactView ? 'space-y-6' : 'space-y-10'} animate-in fade-in duration-700 pb-20`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-[#0B1120] dark:bg-sky-500 text-white dark:text-slate-950 text-[8px] font-black px-2 py-1 rounded tracking-widest uppercase">Master Admin</span>
            <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800"></div>
          </div>
          <h1 className={`${compactView ? 'text-2xl' : 'text-4xl'} font-black text-slate-900 dark:text-slate-100 tracking-tighter uppercase leading-none`}>System Intelligence</h1>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.2em]">Operational Overview • {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Cloud Sync Active</span>
           </div>
           <Link to="/vouchers/new" className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all">
              Quick Transaction
           </Link>
        </div>
      </div>

      {isEmpty && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-[2.5rem] p-12 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600">
              <i className="fa-solid fa-database text-3xl"></i>
           </div>
           <h2 className="text-xl font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter mb-2">Database Empty or Disconnected</h2>
           <p className="text-sm font-bold text-amber-800 dark:text-amber-500/80 max-w-lg mx-auto mb-8 uppercase tracking-widest leading-relaxed">
             No records found in the cloud ledger. Please ensure you have run the <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded">schema.sql</code> script in your Supabase SQL Editor.
           </p>
           <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => refreshData()}
                className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                <i className="fa-solid fa-arrows-rotate mr-2"></i> Retry Sync
              </button>
              <Link to="/settings" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                Check Settings
              </Link>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard compact={compactView} title="Liquid Assets" value={`Rs. ${metrics.cashBank.toLocaleString()}`} subValue="Cash & Bank Balances" icon="fa-wallet" color="bg-emerald-500" trend="+12%" />
        <StatCard compact={compactView} title="Total Receivables" value={`Rs. ${metrics.receivables.toLocaleString()}`} subValue="Customer Outstanding" icon="fa-hand-holding-dollar" color="bg-sky-500" />
        <StatCard compact={compactView} title="Total Payables" value={`Rs. ${metrics.payables.toLocaleString()}`} subValue="Vendor Liabilities" icon="fa-file-invoice" color="bg-rose-500" />
        <StatCard compact={compactView} title="Total Income" value={`Rs. ${metrics.income.toLocaleString()}`} subValue="Gross Service Revenue" icon="fa-chart-pie" color="bg-indigo-600" trend="+5%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
           <div className={`${compactView ? 'p-6' : 'p-10'} bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full`}>
             <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-10">Functional Balance Matrix</h3>
             <div className="space-y-8 flex-1">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-plus"></i></div>
                     <div><p className="text-[10px] font-black text-slate-400 uppercase">Gross Revenue</p><h4 className="text-xl font-black">Rs. {metrics.income.toLocaleString()}</h4></div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-200"></i>
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-minus"></i></div>
                     <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Expenses</p><h4 className="text-xl font-black">Rs. {metrics.expenses.toLocaleString()}</h4></div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-200"></i>
                </div>
                <div className="flex justify-between items-center bg-[#0B1120] p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                     <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Calculated Net Profit</p>
                     <h4 className="text-4xl font-black text-emerald-400">Rs. {metrics.netProfit.toLocaleString()}</h4>
                   </div>
                   <i className="fa-solid fa-star absolute right-[-20px] top-[-20px] text-[100px] text-slate-800 opacity-20"></i>
                </div>
             </div>
           </div>
        </div>

        <div className={`${compactView ? 'p-6' : 'p-10'} bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col`}>
          <div className={`flex items-center justify-between ${compactView ? 'mb-6' : 'mb-10'}`}>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Recent Activity</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Audit Log • Latest Postings</p>
            </div>
            <Link to="/vouchers" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-600 transition-colors">
              <i className="fa-solid fa-arrow-right-long"></i>
            </Link>
          </div>

          <div className="space-y-8 flex-1 overflow-y-auto pr-2">
            {state.vouchers.slice(0, 6).map((v) => (
              <div key={v.id} className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 ${
                  v.type === 'Hotel' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 
                  v.type === 'Receipt' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 
                  v.type === 'Ticket' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                }`}>
                  <i className={`fa-solid ${v.type === 'Hotel' ? 'fa-hotel' : v.type === 'Receipt' ? 'fa-receipt' : v.type === 'Ticket' ? 'fa-plane' : 'fa-file-invoice'} text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                     <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tighter truncate">{v.voucherNo}</h4>
                     <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">Rs. {v.totalAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 truncate">{v.passengerName || v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;