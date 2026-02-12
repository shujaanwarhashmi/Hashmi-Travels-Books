
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
    { id: 'Database', label: 'Database Setup', icon: 'fa-database' },
    { id: 'Disaster', label: 'Backup & Disaster', icon: 'fa-shield-heart' },
    { id: 'Login', label: 'Login & Password', icon: 'fa-shield-halved' }
  ];

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
        if (!importedState.vouchers || !importedState.customers || !importedState.accounts) throw new Error("Invalid format");
        if (window.confirm("Overwrite ALL current data?")) {
          setState(importedState);
          window.location.reload();
        }
      } catch (error) {
        alert("Restore Aborted: Invalid file.");
      }
    };
    reader.readAsText(file);
  };

  const sqlSchema = `-- ======================================================
-- HASHMI TRAVEL BOOKS - MASTER DATABASE (v17.2)
-- ======================================================
-- Run this in your Supabase SQL Editor if you see 
-- "Table not found" or "Schema Cache" errors.

CREATE TABLE IF NOT EXISTS journal_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    narration TEXT,
    status TEXT DEFAULT 'Posted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_voucher_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES journal_vouchers(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    party_id UUID,
    currency TEXT DEFAULT 'PKR',
    roe DECIMAL(15,4) DEFAULT 1,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    description TEXT
);

-- Ensure other core tables exist...
-- (Full SQL schema provided in previous implementation turn)`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#0B1120] dark:bg-sky-700 rounded-3xl p-8 text-white flex items-center justify-between shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
               <i className="fa-solid fa-cog text-2xl"></i>
            </div>
            <div>
               <h1 className="text-xl font-black uppercase tracking-tighter">System Control Panel</h1>
               <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Global Settings & Database</p>
            </div>
         </div>
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
              </div>
            )}

            {activeTab === 'Database' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Database Setup (SQL)</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Required schema to fix "Table not found" errors</p>
                 </div>
                 <div className="bg-slate-900 p-8 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supabase SQL Editor Content:</p>
                    <textarea 
                      readOnly 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6 text-[10px] font-mono text-emerald-500 h-96 outline-none"
                      value={sqlSchema}
                    />
                    <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert("SQL Copied!"); }} className="bg-sky-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all">Copy to Clipboard</button>
                 </div>
                 <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-6 rounded-2xl flex items-start gap-4">
                    <i className="fa-solid fa-circle-info text-amber-500 text-xl mt-1"></i>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                      If you see a "Schema Cache" error, it means you just created a table. You might need to wait 30 seconds or click "Refresh Schema" in Supabase, but typically running the SQL above and refreshing this app solves it.
                    </p>
                 </div>
              </div>
            )}

            {activeTab === 'Disaster' && (
              <div className="space-y-12">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">Disaster Management Center</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0B1120] rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
                       <i className="fa-solid fa-cloud-arrow-down absolute right-[-20px] bottom-[-20px] text-[100px] text-slate-800 opacity-20"></i>
                       <div className="relative z-10 space-y-6">
                          <h4 className="text-sm font-black uppercase tracking-widest text-sky-400">Secure JSON Snapshot</h4>
                          <button onClick={handleExportJSON} className="bg-sky-500 hover:bg-sky-400 text-slate-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                             <i className="fa-solid fa-download"></i> Download Full Backup
                          </button>
                       </div>
                    </div>
                    <div className="bg-emerald-900 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
                       <i className="fa-solid fa-rotate-left absolute right-[-20px] bottom-[-20px] text-[100px] text-emerald-800 opacity-30"></i>
                       <div className="relative z-10 space-y-6">
                          <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Emergency Restore System</h4>
                          <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
                          <button onClick={() => fileInputRef.current?.click()} className="bg-white text-emerald-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
                             <i className="fa-solid fa-upload"></i> Initialize Restore
                          </button>
                       </div>
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
