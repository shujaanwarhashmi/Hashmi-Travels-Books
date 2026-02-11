
import React, { useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, calculateAccountBalance, generateId } from '../utils/accounting';
import { Vendor } from '../types';

const VendorList: React.FC = () => {
  const { state, setState, cloneVendor, deleteVendor } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    status: 'Active & Visible',
    openingBalance: 0,
    side: 'Payable'
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
      side: 'Payable'
    });
    setShowModal(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      city: vendor.city,
      address: vendor.address,
      status: vendor.status,
      openingBalance: vendor.openingBalance,
      side: vendor.openingBalanceType
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      setState(prev => ({
        ...prev,
        vendors: prev.vendors.map(v => v.id === editingId ? {
          ...v,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          openingBalance: formData.openingBalance,
          openingBalanceType: formData.side as any,
          isActive: formData.status === 'Active & Visible',
          status: formData.status as any
        } : v)
      }));
    } else {
      const newVend = {
        id: generateId(),
        code: `V-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        openingBalance: formData.openingBalance,
        openingBalanceType: formData.side as any,
        isActive: formData.status === 'Active & Visible',
        status: formData.status as any
      };
      setState(prev => ({ ...prev, vendors: [...prev.vendors, newVend as any] }));
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Vendor Master</h1>
          <p className="text-slate-500 text-sm">Manage transport suppliers and service providers</p>
        </div>
        <button 
          onClick={handleAdd}
          className="bg-[#0B1120] hover:bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center shadow-lg transition-all font-black text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Register New Vendor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search by vendor name or code..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
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
                <th className="px-6 py-4">Vendor Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Payable Balance</th>
                <th className="px-6 py-4 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.vendors.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase())).map(v => {
                const balance = calculateAccountBalance('acc-5', state.vouchers, v.openingBalanceType === 'Payable' ? v.openingBalance : -v.openingBalance, 'Credit');
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-sky-500">{v.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-black text-xs uppercase text-slate-800">{v.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{v.city}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">{v.phone}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(Math.abs(balance))} {balance >= 0 ? 'CR' : 'DR'}
                    </td>
                    <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <button 
                          onClick={() => navigate(`/ledger/Vendor/${v.id}`)}
                          className="p-2 text-slate-400 hover:text-sky-600 rounded-lg"
                          title="View Ledger"
                        >
                          <i className="fa-solid fa-book"></i>
                        </button>
                        <button 
                          onClick={() => cloneVendor(v.id)}
                          className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg"
                          title="Clone"
                        >
                          <i className="fa-solid fa-clone"></i>
                        </button>
                        <button 
                          onClick={() => handleEdit(v)}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          onClick={() => deleteVendor(v.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                    </td>
                  </tr>
                );
              })}
              {state.vendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">
                    No vendors found in the master registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1120]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#0B1120] text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="font-black text-sm uppercase tracking-tighter">{editingId ? 'EDIT VENDOR' : 'ADD VENDOR'}</h2>
                <p className="text-[10px] font-bold text-slate-400">SUPPLIER MASTER REGISTRY</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-times"></i></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Name *</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-sky-500 outline-none transition-all"
                  placeholder="Service Provider Title"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                  <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm" placeholder="Ph" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                  <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm" placeholder="contact@vendor.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                  <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm" placeholder="e.g. Makkah" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option>Active & Visible</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</label>
                <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm" placeholder="Office address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                <div className="flex items-center gap-3 text-emerald-500 mb-2">
                   <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100"><i className="fa-solid fa-coins"></i></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Financial Opening Setup</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Balance (PKR)</label>
                    <input type="number" className="w-full bg-white border border-slate-100 rounded-lg px-4 py-3 text-sm" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Nature</label>
                    <select className="w-full bg-white border border-slate-100 rounded-lg px-4 py-3 text-sm outline-none" value={formData.side} onChange={e => setFormData({...formData, side: e.target.value})}>
                      <option value="Payable">Payable (Liability)</option>
                      <option value="Advance">Advance (Asset)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleSave} className="flex-1 bg-[#0B1120] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <i className="fa-solid fa-save"></i> {editingId ? 'Update Entity' : 'Save Entity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorList;
