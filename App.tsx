import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GlobalState, Voucher, Customer, Vendor, Account } from './types';
import { DEFAULT_STATE, STORAGE_KEY } from './constants';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import VendorList from './pages/VendorList';
import VoucherList from './pages/VoucherList';
import VoucherEntryPage from './pages/VoucherEntry';
import LedgerView from './pages/LedgerView';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Accounts from './pages/Accounts';
import VoucherDetail from './pages/VoucherDetail';
import { generateId } from './utils/accounting';

interface AppContextType {
  state: GlobalState;
  setState: React.Dispatch<React.SetStateAction<GlobalState>>;
  addVoucher: (v: Voucher) => void;
  deleteVoucher: (id: string) => void;
  cloneVoucher: (id: string) => void;
  cloneCustomer: (id: string) => void;
  cloneVendor: (id: string) => void;
  deleteCustomer: (id: string) => void;
  deleteVendor: (id: string) => void;
  deleteAccount: (id: string) => void;
  toggleTheme: () => void;
  toggleCompact: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname || '/';

  const links = [
    { to: '/', label: 'Dashboard', icon: 'fa-chart-line' },
    { to: '/accounts', label: 'Accounts', icon: 'fa-university' },
    { to: '/customers', label: 'Customers', icon: 'fa-users' },
    { to: '/vendors', label: 'Vendors', icon: 'fa-truck' },
    { to: '/vouchers', label: 'Vouchers', icon: 'fa-file-invoice-dollar' },
    { to: '/reports', label: 'Reports', icon: 'fa-file-alt' },
    { to: '/settings', label: 'Control Panel', icon: 'fa-cogs' },
  ];

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] text-white transition-transform duration-300 transform md:translate-x-0 border-r border-slate-800">
      <div className="flex items-center justify-center h-20 border-b border-slate-800 px-4">
        <div className="flex flex-col items-center">
           <span className="font-black text-xl tracking-tighter text-sky-400">TRAVEL<span className="text-white">LEDGER</span></span>
           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Accounting Core</span>
        </div>
      </div>
      <nav className="mt-8 px-4 space-y-2">
        {links.map((link) => {
          const isActive = link.to === '/' ? currentPath === '/' : currentPath.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <i className={`fa-solid ${link.icon} w-6 text-center mr-3`}></i>
              <span className="font-semibold text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

const Topbar = () => {
  const { state, toggleTheme, toggleCompact } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '' || !path) return 'SYSTEM DASHBOARD';
    if (path.includes('accounts')) return 'ACCOUNTS REGISTRY';
    if (path.includes('customers')) return 'CUSTOMER MASTER';
    if (path.includes('vendors')) return 'VENDOR MASTER';
    if (path.includes('vouchers')) return 'FINANCIAL VOUCHERS';
    if (path.includes('reports')) return 'FINANCIAL REPORTS';
    if (path.includes('settings')) return 'CONTROL PANEL';
    return 'TRAVEL ERP';
  };

  return (
    <header className="no-print sticky top-0 z-40 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8">
      <div className="flex-1 min-w-0">
        <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5 uppercase">{getPageTitle()}</h2>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">System Operational</span>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 justify-center items-center">
        <span className="text-xl font-bold text-slate-800 dark:text-slate-200" dir="rtl">
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </span>
      </div>

      <div className="flex-1 flex justify-end items-center gap-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
           <button 
             onClick={toggleCompact}
             className={`w-8 h-8 rounded flex items-center justify-center transition-all ${state.settings.compactView ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-400'}`}
             title="Toggle Compact View"
           >
             <i className="fa-solid fa-compress-arrows-alt text-xs"></i>
           </button>
           <button 
             onClick={toggleTheme}
             className={`w-8 h-8 rounded flex items-center justify-center transition-all ${state.settings.theme === 'dark' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-400'}`}
             title="Toggle Dark Mode"
           >
             <i className={`fa-solid ${state.settings.theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs`}></i>
           </button>
        </div>
        <button 
          onClick={() => navigate('/vouchers/new')}
          className="bg-[#0B1120] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> New Transaction
        </button>
      </div>
    </header>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();
  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${state.settings.theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <Topbar />
        <main className={`flex-1 transition-all duration-300 ${state.settings.compactView ? 'p-4' : 'p-8'}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<GlobalState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Deep merge saved state with default to ensure new fields are present
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings }
      };
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleTheme = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, theme: prev.settings.theme === 'light' ? 'dark' : 'light' }
    }));
  }, []);

  const toggleCompact = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, compactView: !prev.settings.compactView }
    }));
  }, []);

  const addVoucher = useCallback((v: Voucher) => {
    setState(prev => ({ ...prev, vouchers: [v, ...prev.vouchers] }));
  }, []);

  const deleteVoucher = useCallback((id: string) => {
    if (!window.confirm("Are you sure you want to delete this voucher? This will affect ledgers.")) return;
    setState(prev => ({ ...prev, vouchers: prev.vouchers.filter(v => v.id !== id) }));
  }, []);

  const cloneVoucher = useCallback((id: string) => {
    setState(prev => {
      const original = prev.vouchers.find(v => v.id === id);
      if (!original) return prev;
      const cloned: Voucher = {
        ...original,
        id: generateId(),
        voucherNo: `V-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        createdAt: new Date().toISOString(),
        entries: original.entries.map(e => ({ ...e, id: generateId() }))
      };
      return { ...prev, vouchers: [cloned, ...prev.vouchers] };
    });
  }, []);

  const cloneCustomer = useCallback((id: string) => {
    setState(prev => {
      const original = prev.customers.find(c => c.id === id);
      if (!original) return prev;
      const cloned: Customer = {
        ...original,
        id: generateId(),
        code: `C-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: `${original.name} (Copy)`,
      };
      return { ...prev, customers: [...prev.customers, cloned] };
    });
  }, []);

  const cloneVendor = useCallback((id: string) => {
    setState(prev => {
      const original = prev.vendors.find(v => v.id === id);
      if (!original) return prev;
      const cloned: Vendor = {
        ...original,
        id: generateId(),
        code: `V-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: `${original.name} (Copy)`,
      };
      return { ...prev, vendors: [...prev.vendors, cloned] };
    });
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    if (!window.confirm("Delete this customer? Transactions will still refer to this ID but the customer will be removed from masters.")) return;
    setState(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
  }, []);

  const deleteVendor = useCallback((id: string) => {
    if (!window.confirm("Delete this vendor?")) return;
    setState(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    if (!window.confirm("Delete this account head?")) return;
    setState(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }));
  }, []);

  const value = useMemo(() => ({ 
    state, 
    setState, 
    addVoucher, 
    deleteVoucher, 
    cloneVoucher, 
    cloneCustomer, 
    cloneVendor,
    deleteCustomer,
    deleteVendor,
    deleteAccount,
    toggleTheme,
    toggleCompact
  }), [state, addVoucher, deleteVoucher, cloneVoucher, cloneCustomer, cloneVendor, deleteCustomer, deleteVendor, deleteAccount, toggleTheme, toggleCompact]);

  return (
    <AppContext.Provider value={value}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vouchers" element={<VoucherList />} />
            <Route path="/vouchers/view/:id" element={<VoucherDetail />} />
            <Route path="/vouchers/new" element={<VoucherEntryPage />} />
            <Route path="/vouchers/edit/:id" element={<VoucherEntryPage />} />
            <Route path="/ledger/:type/:id" element={<LedgerView />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;