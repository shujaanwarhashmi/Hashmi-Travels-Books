import React, { useState } from 'react';
import { useApp } from '../App';
import { calculateAccountBalance, formatCurrency } from '../utils/accounting';

const Accounts: React.FC = () => {
  const { state, deleteAccount } = useApp();
  const [search, setSearch] = useState('');

  const filteredAccounts = state.accounts.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.type.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cash':
      case 'Bank':
        return 'bg-blue-600';
      case 'Income':
        return 'bg-purple-600';
      case 'Expense':
        return 'bg-rose-500';
      case 'Receivable':
        return 'bg-emerald-500';
      case 'Payable':
        return 'bg-emerald-500';
      case 'Equity':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getBalanceDisplay = (accId: string, type: string) => {
    const net = calculateAccountBalance(accId, state);
    
    if (net === 0) return <span className="text-slate-200">---</span>;

    const absVal = Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 1 });
    const label = net > 0 ? 'DR' : 'CR';
    const isCreditLabel = label === 'CR';

    return (
      <div className="flex items-center justify-center gap-1.5 font-black text-xs">
        <span className="text-slate-400">Rs.</span>
        <span className={isCreditLabel ? 'text-rose-500' : 'text-slate-800'}>{absVal}</span>
        <span className={`text-[9px] uppercase tracking-tighter ${isCreditLabel ? 'text-rose-300' : 'text-slate-400'}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="relative flex-1 w-full max-w-sm">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input 
            type="text"
            placeholder="Search registry by title or classification..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="bg-[#0B1120] hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl transition-all w-full md:w-auto justify-center">
          <i className="fa-solid fa-plus text-xs"></i> New Account Head
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 border border-slate-50">
        <div className="grid grid-cols-12 bg-[#0B1120] text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 py-5 px-10">
          <div className="col-span-4">Account Hierarchy & Title</div>
          <div className="col-span-2 text-center">Classification</div>
          <div className="col-span-4 text-center">Functional Net Balance</div>
          <div className="col-span-2 text-right pr-4">Registry Operations</div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {filteredAccounts.map(acc => (
            <div key={acc.id} className="grid grid-cols-12 py-5 px-10 items-center hover:bg-slate-50/80 transition-all duration-200 group">
              <div className="col-span-4 flex items-center gap-6">
                <div className={`w-[3px] h-10 rounded-full ${getTypeColor(acc.type)} shadow-sm`}></div>
                <div>
                  <h4 className="font-black text-[13px] uppercase tracking-tighter text-slate-800 leading-none mb-1">{acc.title}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID REF: {acc.code}</span>
                </div>
              </div>
              
              <div className="col-span-2 flex justify-center">
                <span className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border border-slate-100/50">
                  {acc.type}
                </span>
              </div>
              
              <div className="col-span-4 text-center">
                {getBalanceDisplay(acc.id, acc.type)}
              </div>
              
              <div className="col-span-2 text-right opacity-0 group-hover:opacity-100 transition-all duration-200 pr-2">
                <button className="text-slate-300 hover:text-sky-600 p-2.5 transition-colors" title="Edit Account">
                  <i className="fa-solid fa-pen-to-square text-sm"></i>
                </button>
                {!acc.isSystem && (
                  <button 
                    onClick={() => deleteAccount(acc.id)}
                    className="text-slate-300 hover:text-rose-500 p-2.5 transition-colors" 
                    title="Delete Account"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {filteredAccounts.length === 0 && (
            <div className="py-20 text-center space-y-4">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <i className="fa-solid fa-folder-open text-2xl"></i>
               </div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching accounts found in the registry.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between px-10 py-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">
        <span>Total Accounts Registered: {state.accounts.length}</span>
        <span>Operational Standard: Accounting Core V3.1</span>
      </div>
    </div>
  );
};

export default Accounts;