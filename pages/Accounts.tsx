
import React, { useState } from 'react';
import { useApp } from '../App';
import { calculateAccountBalance, formatCurrency } from '../utils/accounting';
import { Account, AccountType } from '../types';

const Accounts: React.FC = () => {
  const { state, upsertAccount, deleteAccount } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);

  const filteredAccounts = state.accounts.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.type.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cash':
      case 'Bank': return 'bg-blue-600';
      case 'Income': return 'bg-purple-600';
      case 'Expense': return 'bg-rose-500';
      case 'Receivable': return 'bg-emerald-500';
      case 'Payable': return 'bg-rose-500';
      case 'Equity': return 'bg-indigo-500';
      default: return 'bg-slate-400';
    }
  };

  const getBalanceDisplay = (accId: string) => {
    const net = calculateAccountBalance(accId, state);
    if (net === 0) return <span className="text-slate-200">---</span>;
    const absVal = Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 0 });
    const label = net > 0 ? 'DR' : 'CR';
    const isCreditLabel = label === 'CR';

    return (
      <div className="flex items-center justify-center gap-1.5 font-black text-xs">
        <span className="text-slate-400">Rs.</span>
        <span className={isCreditLabel ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}>{absVal}</span>
        <span className={`text-[9px] uppercase tracking-tighter ${isCreditLabel ? 'text-rose-300' : 'text-slate-400'}`}>{label}</span>
      </div>
    );
  };

  const handleSave = async () => {
    if (!editingAccount?.title || !editingAccount?.code || !editingAccount?.type) {
        return alert("Please fill all required fields.");
    }
    await upsertAccount(editingAccount);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="relative flex-1 w-full max-w-sm">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input 
            type="text"
            placeholder="Search registry by title or classification..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setEditingAccount({ title: '', code: '', type: 'Asset' }); setShowModal(true); }}
          className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl transition-all w-full md:w-auto justify-center"
        >
          <i className="fa-solid fa-plus text-xs"></i> New Account Head
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-50 dark:border-slate-800">
        <div className="grid grid-cols-12 bg-[#0B1120] dark:bg-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 py-5 px-10">
          <div className="col-span-4">Account Hierarchy & Title</div>
          <div className="col-span-2 text-center">Classification</div>
          <div className="col-span-4 text-center">Functional Net Balance</div>
          <div className="col-span-2 text-right pr-4">Registry Operations</div>
        </div>
        
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {filteredAccounts.map(acc => (
            <div key={acc.id} className="grid grid-cols-12 py-5 px-10 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-200 group">
              <div className="col-span-4 flex items-center gap-6">
                <div className={`w-[3px] h-10 rounded-full ${getTypeColor(acc.type)} shadow-sm`}></div>
                <div>
                  <h4 className="font-black text-[13px] uppercase tracking-tighter text-slate-800 dark:text-slate-200 leading-none mb-1">{acc.title}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID REF: {acc.code}</span>
                </div>
              </div>
              <div className="col-span-2 flex justify-center">
                <span className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border border-slate-100/50 dark:border-slate-700">
                  {acc.type}
                </span>
              </div>
              <div className="col-span-4 text-center">
                {getBalanceDisplay(acc.id)}
              </div>
              <div className="col-span-2 text-right opacity-0 group-hover:opacity-100 transition-all duration-200 pr-2">
                <button 
                    onClick={() => { setEditingAccount(acc); setShowModal(true); }}
                    className="text-slate-300 hover:text-sky-600 p-2.5 transition-colors" title="Edit Account"
                >
                  <i className="fa-solid fa-pen-to-square text-sm"></i>
                </button>
                {!acc.isSystem && (
                  <button 
                    onClick={() => { if(confirm('Delete account?')) deleteAccount(acc.id); }}
                    className="text-slate-300 hover:text-rose-500 p-2.5 transition-colors" 
                    title="Delete Account"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1120]/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="bg-[#0B1120] text-white p-8 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg uppercase tracking-tighter">Account Registry</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define New Ledger Head</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Title *</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none uppercase" 
                  value={editingAccount?.title || ''} 
                  onChange={e => setEditingAccount({...editingAccount, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Code *</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none" 
                    placeholder="e.g. 5003"
                    value={editingAccount?.code || ''} 
                    onChange={e => setEditingAccount({...editingAccount, code: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification *</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none"
                    value={editingAccount?.type || 'Asset'}
                    onChange={e => setEditingAccount({...editingAccount, type: e.target.value as any})}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Receivable">Receivable</option>
                    <option value="Payable">Payable</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-100"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-1 bg-sky-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all hover:bg-sky-500"
                >
                  <i className="fa-solid fa-save"></i> COMMIT ACCOUNT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
