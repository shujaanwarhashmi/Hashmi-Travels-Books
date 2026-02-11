
import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { GlobalState } from '../types';

const Settings: React.FC = () => {
  const { state, setState } = useApp();
  const [activeTab, setActiveTab] = useState('Branding');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'Branding', label: 'Branding & Logo', icon: 'fa-image' },
    { id: 'Office', label: 'Office Details', icon: 'fa-location-dot' },
    { id: 'Financial', label: 'Financial Config', icon: 'fa-university' },
    { id: 'Disaster', label: 'Backup & Disaster', icon: 'fa-shield-heart' },
    { id: 'Login', label: 'Login & Password', icon: 'fa-shield-halved' }
  ];

  // DISASTER MANAGEMENT LOGIC
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `TravelLedger_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportCSV = (table: 'vouchers' | 'customers' | 'vendors') => {
    const data = state[table];
    if (!data || data.length === 0) return alert(`The ${table} master is currently empty. Nothing to export.`);

    // Flat CSV export for simple headers
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || "")).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TravelLedger_Export_${table}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target?.result as string) as GlobalState;
        
        // Sanity Check
        if (!importedState.vouchers || !importedState.customers || !importedState.accounts) {
          throw new Error("Invalid format. The backup file is missing core accounting structures.");
        }

        if (window.confirm("CRITICAL WARNING: This will overwrite ALL current agency data with the backup file. This cannot be undone. Do you wish to proceed with the System Restore?")) {
          setState(importedState);
          alert("System Restore Completed. The ledger has been synchronized with the backup file.");
          window.location.reload();
        }
      } catch (error) {
        alert("Restore Aborted: The selected file is either corrupt or not a compatible TravelLedger backup snapshot.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#0B1120] dark:bg-sky-700 rounded-3xl p-8 text-white flex items-center justify-between shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
               <i className="fa-solid fa-cog text-2xl"></i>
            </div>
            <div>
               <h1 className="text-xl font-black uppercase tracking-tighter">System Control Panel</h1>
               <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Global Settings & Disaster Management</p>
            </div>
         </div>
         <button className="bg-emerald-500 hover:bg-emerald-600 text-[#0B1120] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
            <i className="fa-solid fa-save"></i> Save Global Changes
         </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         <div className="w-full lg:w-72 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-sky-600 text-white shadow-xl shadow-sky-900/20' 
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent dark:border-slate-800'
                }`}
              >
                <i className={`fa-solid ${tab.icon} w-6 text-center`}></i>
                {tab.label}
              </button>
            ))}
         </div>

         <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-sm">
            {activeTab === 'Branding' && (
              <div className="space-y-12">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Global Identity</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Logo, Name, and Slogan Settings</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Application Display Name</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.companyName} onChange={e => setState({...state, settings: {...state.settings, companyName: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice Legal Title</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.legalTitle} onChange={e => setState({...state, settings: {...state.settings, legalTitle: e.target.value}})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tagline / Sub-heading</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.tagline} onChange={e => setState({...state, settings: {...state.settings, tagline: e.target.value}})} />
                </div>
              </div>
            )}

            {activeTab === 'Disaster' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Disaster Management Center</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ensure Data Survivability and Portable Exports</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Backup */}
                    <div className="bg-[#0B1120] dark:bg-slate-800 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
                       <i className="fa-solid fa-cloud-arrow-down absolute right-[-20px] bottom-[-20px] text-[100px] text-slate-800 dark:text-slate-700 opacity-20 group-hover:scale-110 transition-transform"></i>
                       <div className="relative z-10 space-y-6">
                          <div>
                             <h4 className="text-sm font-black uppercase tracking-widest text-sky-400">Secure JSON Snapshot</h4>
                             <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">THE ONLY FOOLPROOF FULL-STATE RECOVERY FORMAT</p>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">Downloads every voucher, customer, vendor, and account head into an encrypted single-file structure. Highly recommended before clearing browser data.</p>
                          <button onClick={handleExportJSON} className="bg-sky-500 hover:bg-sky-400 text-slate-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
                             <i className="fa-solid fa-download"></i> Download Full Backup
                          </button>
                       </div>
                    </div>

                    {/* Restoration Engine */}
                    <div className="bg-emerald-900 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
                       <i className="fa-solid fa-rotate-left absolute right-[-20px] bottom-[-20px] text-[100px] text-emerald-800 opacity-30 group-hover:scale-110 transition-transform"></i>
                       <div className="relative z-10 space-y-6">
                          <div>
                             <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Emergency Restore System</h4>
                             <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">UPLOAD PREVIOUSLY DOWNLOADED SNAPSHOTS</p>
                          </div>
                          <p className="text-xs text-emerald-100/60 leading-relaxed">Restore your entire agency database from a JSON file. Use this if you cleared browser history or moved to a new workstation.</p>
                          <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
                          <button onClick={() => fileInputRef.current?.click()} className="bg-white hover:bg-emerald-50 text-emerald-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
                             <i className="fa-solid fa-upload"></i> Initialize Restore Engine
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="h-[2px] w-8 bg-slate-200 dark:bg-slate-700"></div>
                       <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Portable Excel Exports (Audit Ready)</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <button onClick={() => handleExportCSV('vouchers')} className="bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 hover:border-emerald-500 p-6 rounded-2xl text-left transition-all group shadow-sm">
                          <i className="fa-solid fa-file-excel text-emerald-500 text-2xl mb-4"></i>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">General Ledger</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Export All Vouchers</p>
                       </button>
                       <button onClick={() => handleExportCSV('customers')} className="bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 hover:border-emerald-500 p-6 rounded-2xl text-left transition-all group shadow-sm">
                          <i className="fa-solid fa-file-excel text-emerald-500 text-2xl mb-4"></i>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Client Base</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Customer Master</p>
                       </button>
                       <button onClick={() => handleExportCSV('vendors')} className="bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 hover:border-emerald-500 p-6 rounded-2xl text-left transition-all group shadow-sm">
                          <i className="fa-solid fa-file-excel text-emerald-500 text-2xl mb-4"></i>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Vendor Registry</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Supplier Master</p>
                       </button>
                    </div>
                 </div>

                 <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-triangle-exclamation"></i></div>
                    <div>
                       <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Risk & Safety Warning</p>
                       <p className="text-[10px] font-bold text-rose-500/80 dark:text-rose-400/60 leading-relaxed">The browser cache (Local Storage) is not a permanent cloud database. If you clear "Cookies & Site Data", all accounting records will be permanently erased. Please maintain a weekly offline backup to prevent data loss.</p>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'Office' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Office & Communication</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Public Details used on Financial Documents</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registered Physical Address</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.address} onChange={e => setState({...state, settings: {...state.settings, address: e.target.value}})} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Primary Phone</label>
                       <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.phone} onChange={e => setState({...state, settings: {...state.settings, phone: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mobile / WhatsApp</label>
                       <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200" value={state.settings.mobile} onChange={e => setState({...state, settings: {...state.settings, mobile: e.target.value}})} />
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'Financial' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Financial Configuration</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Engine Defaults and Bank Records</p>
                 </div>
                 
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-university"></i></div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Default Bank for Vouchers</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Bank Name</label>
                          <input className="w-full bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-lg px-4 py-2 text-xs font-bold outline-none text-slate-800 dark:text-slate-200" value={state.settings.bankName} onChange={e => setState({...state, settings: {...state.settings, bankName: e.target.value}})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Account Title</label>
                          <input className="w-full bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-lg px-4 py-2 text-xs font-bold outline-none text-slate-800 dark:text-slate-200" value={state.settings.bankAccountTitle} onChange={e => setState({...state, settings: {...state.settings, bankAccountTitle: e.target.value}})} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">IBAN / Account Number</label>
                       <input className="w-full bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-lg px-4 py-2 text-[10px] font-black text-sky-600 tracking-widest uppercase outline-none" value={state.settings.iban} onChange={e => setState({...state, settings: {...state.settings, iban: e.target.value}})} />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Standard ROE (SAR/PKR)</label>
                    <div className="relative max-w-[240px]">
                       <i className="fa-solid fa-hashtag absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"></i>
                       <input type="number" step="0.1" className="w-full bg-slate-50 dark:bg-slate-800 border border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none" value={state.settings.defaultRoe} onChange={e => setState({...state, settings: {...state.settings, defaultRoe: Number(e.target.value)}})} />
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'Login' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Security Credentials</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manage Access Keys and Operator Accounts</p>
                 </div>
                 
                 <div className="bg-[#0B1120] dark:bg-slate-800 rounded-[2.5rem] p-12 text-white space-y-10 relative overflow-hidden shadow-2xl">
                    <i className="fa-solid fa-key absolute right-[-20px] bottom-[-20px] text-[200px] text-slate-800 dark:text-slate-700 opacity-20 pointer-events-none"></i>
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-emerald-400">
                          <i className="fa-solid fa-lock text-3xl"></i>
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-widest">Administrator Vault</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Change your master password</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Password</label>
                          <div className="relative">
                            <input type="password" placeholder="Min 6 chars" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500" />
                            <i className="fa-solid fa-eye absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirm Pass</label>
                          <input type="password" placeholder="Repeat exactly" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500" />
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t border-slate-800 relative z-10">
                       <span className="text-[8px] font-black text-slate-500 uppercase">Role: <span className="text-emerald-400">SUPER_ADMIN</span></span>
                       <button className="bg-sky-600 border border-sky-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-sky-500 transition-all shadow-lg">
                          <i className="fa-solid fa-shield-check"></i> Update Keys
                       </button>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Settings;
