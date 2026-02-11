
import React, { useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, calculateAccountBalance, generateId } from '../utils/accounting';
import { Customer } from '../types';

const CustomerList: React.FC = () => {
  const { state, setState, cloneCustomer, deleteCustomer } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { compactView } = state.settings;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    status: 'Active & Visible' as const,
    openingBalance: 0,
    side: 'Receivable' as 'Receivable' | 'Payable'
  });

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      status: 'Active & Visible',
      openingBalance: 0,
      side: 'Receivable'
    });
    setShowModal(true);
  };

  const handleEdit = (cust: Customer) => {
    setEditingId(cust.id);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email,
      city: cust.city,
      address: cust.address,
      status: cust.status as any,
      openingBalance: cust.openingBalance,
      side: cust.openingBalanceType as any
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name) return alert("Customer name is required.");

    if (editingId) {
      setState(prev => ({
        ...prev,
        customers: prev.customers.map(c => c.id === editingId ? {
          ...c,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          openingBalance: formData.openingBalance,
          openingBalanceType: formData.side,
          isActive: formData.status === 'Active & Visible',
          status: formData.status
        } : c)
      }));
    } else {
      const newCust: Customer = {
        id: generateId(),
        code: `C-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        openingBalance: formData.openingBalance,
        openingBalanceType: formData.side,
        isActive: formData.status === 'Active & Visible',
        status: formData.status
      };
      setState(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
    }
    setShowModal(false);
  };

  const filteredCustomers = state.customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">Customer Master</h1>
          <p className="text-slate-500 text-sm mt-1">Directory of sub-agents and direct travel clients</p>
        </div>
        <button 
          onClick={handleAdd}
          className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white px-6 py-3 rounded-xl flex items-center shadow-lg transition-all font-black text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-user-plus mr-2"></i>
          Register New Client
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
            <thead className="bg-[#0B1120] dark:bg-slate-800 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Contact Detail</th>
                <th className="px-6 py-4 text-right">Net Balance (PKR)</th>
                <th className="px-6 py-4 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map(c => {
                const balance = calculateAccountBalance('acc-3', state.vouchers, c.openingBalanceType === 'Receivable' ? c.openingBalance : -c.openingBalance, 'Debit');
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-black text-sky-500">{c.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-black text-xs uppercase text-slate-800 dark:text-slate-200">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.city}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-bold">{c.phone || c.email || 'N/A'}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {formatCurrency(Math.abs(balance))} {balance >= 0 ? 'DR' : 'CR'}
                    </td>
                    <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => navigate(`/ledger/Customer/${c.id}`)}
                            className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                            title="View Statement"
                          >
                            <i className="fa-solid fa-book-open"></i>
                          </button>
                          <button 
                            onClick={() => cloneCustomer(c.id)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <i className="fa-solid fa-copy"></i>
                          </button>
                          <button 
                            onClick={() => handleEdit(c)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Modify"
                          >
                            <i className="fa-solid fa-user-pen"></i>
                          </button>
                          <button 
                            onClick={() => deleteCustomer(c.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <i className="fa-solid fa-user-minus"></i>
                          </button>
                        </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                    No matching clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1120]/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="bg-[#0B1120] text-white p-8 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg uppercase tracking-tighter">{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Master Registry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name / Agent Title *</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 transition-all"
                  placeholder="e.g. Dream Travel Agency"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold dark:text-slate-200 outline-none" placeholder="Mobile #" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold dark:text-slate-200 outline-none" placeholder="info@travel.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location / City</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold dark:text-slate-200 outline-none uppercase" placeholder="e.g. Karachi" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold outline-none dark:text-slate-200" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option>Active & Visible</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                   <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800"><i className="fa-solid fa-wallet"></i></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Accounting Opening Setup</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Balance</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black dark:text-slate-200" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Nature</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none dark:text-slate-200" value={formData.side} onChange={e => setFormData({...formData, side: e.target.value as any})}>
                      <option value="Receivable">Receivable (Dr)</option>
                      <option value="Payable">Payable (Cr)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex-1 bg-[#0B1120] dark:bg-sky-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg">
                  <i className="fa-solid fa-save"></i> {editingId ? 'Update Client' : 'Add Client'}
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
