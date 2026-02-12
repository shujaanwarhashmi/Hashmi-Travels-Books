import React, { useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, calculateAccountBalance, generateId } from '../utils/accounting';
import { Customer } from '../types';

const CustomerList: React.FC = () => {
  const { state, upsertCustomer, deleteCustomer } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', city: '', address: '', status: 'Active & Visible' as const, openingBalance: 0, side: 'Receivable' as 'Receivable' | 'Payable'
  });

  const handleEdit = (cust: Customer) => {
    setEditingId(cust.id);
    setFormData({
      name: cust.name, phone: cust.phone, email: cust.email, city: cust.city, address: cust.address, status: cust.status as any, openingBalance: cust.openingBalance, side: cust.openingBalanceType as any
    });
    setShowModal(true);
  };

  const handleClone = (cust: Customer) => {
    setEditingId(null);
    setFormData({
      name: `${cust.name} (CLONE)`, phone: cust.phone, email: cust.email, city: cust.city, address: cust.address, status: 'Active & Visible', openingBalance: 0, side: cust.openingBalanceType as any
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) return alert("Customer name is required.");
    const existingCust = editingId ? state.customers.find(c => c.id === editingId) : null;
    const customerCode = existingCust ? existingCust.code : `C-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const customerData: Partial<Customer> = {
      id: editingId || undefined, code: customerCode, name: formData.name, phone: formData.phone, email: formData.email, address: formData.address, city: formData.city, 
      openingBalance: Number(formData.openingBalance), openingBalanceType: formData.side, isActive: formData.status === 'Active & Visible', status: formData.status
    };
    await upsertCustomer(customerData);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Customer Master</h1>
          <p className="text-slate-500 text-sm mt-1">Directory of sub-agents and direct travel clients</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({name: '', phone: '', email: '', city: '', address: '', status: 'Active & Visible', openingBalance: 0, side: 'Receivable'}); setShowModal(true); }} className="bg-[#0B1120] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all hover:bg-slate-800">
          <i className="fa-solid fa-user-plus mr-2"></i> Register New Client
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search by client name or code..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-bold text-slate-600 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B1120] text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4 text-right">Net Balance (PKR)</th>
                <th className="px-6 py-4 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {state.customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => {
                const net = calculateAccountBalance('acc-3', state, c.id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-sky-500">{c.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-black text-xs uppercase text-slate-800 dark:text-slate-200">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.city}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-black ${net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {formatCurrency(Math.abs(net))}
                      </div>
                      <div className="text-[8px] font-black uppercase tracking-widest opacity-50">
                        {net >= 0 ? 'DR (Receivable)' : 'CR (Payable)'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => navigate(`/ledger/Customer/${c.id}`)} className="text-slate-400 hover:text-sky-600 p-2"><i className="fa-solid fa-book-open"></i></button>
                          <button onClick={() => handleClone(c)} className="text-slate-400 hover:text-emerald-600 p-2"><i className="fa-solid fa-copy"></i></button>
                          <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-indigo-600 p-2"><i className="fa-solid fa-user-pen"></i></button>
                          <button onClick={() => deleteCustomer(c.id)} className="text-slate-400 hover:text-rose-600 p-2"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1120]/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="bg-[#0B1120] text-white p-8 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg uppercase tracking-tighter">CLIENT REGISTRY</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MASTER ACCOUNT DEFINITION</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FULL NAME / AGENT TITLE *</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none uppercase" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PRIMARY CONTACT</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LOCATION / CITY</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold uppercase outline-none" 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                   <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                     <i className="fa-solid fa-wallet"></i>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest">OPENING SETUP</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BALANCE</label>
                    <input 
                      type="number" 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none" 
                      value={formData.openingBalance} 
                      onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NATURE</label>
                    <select 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none appearance-none" 
                      value={formData.side} 
                      onChange={e => setFormData({...formData, side: e.target.value as any})}
                    >
                      <option value="Receivable">Receivable (Dr)</option>
                      <option value="Payable">Payable (Cr)</option>
                    </select>
                  </div>
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
                  className="flex-1 bg-[#0B1120] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all hover:bg-slate-800"
                >
                  <i className="fa-solid fa-save"></i> COMMIT RECORD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;