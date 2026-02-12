
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
import Login from './pages/Login';
import { generateId } from './utils/accounting';
import { supabase } from './lib/supabase';

interface AppContextType {
  state: GlobalState;
  setState: React.Dispatch<React.SetStateAction<GlobalState>>;
  session: any | null;
  loading: boolean;
  dbStatus: 'connecting' | 'connected' | 'error' | 'empty';
  logout: () => void;
  refreshData: () => Promise<void>;
  addVoucher: (v: Voucher) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
  upsertCustomer: (c: Partial<Customer>) => Promise<void>;
  upsertVendor: (v: Partial<Vendor>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  toggleTheme: () => void;
  toggleCompact: () => void;
  enterGuestMode: () => void;
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
  const { state, toggleTheme, toggleCompact, logout, loading, dbStatus } = useApp();
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

  const getStatusColor = () => {
    if (loading) return 'bg-amber-500 animate-pulse';
    if (dbStatus === 'connected') return 'bg-emerald-500';
    if (dbStatus === 'error') return 'bg-rose-500';
    if (dbStatus === 'empty') return 'bg-sky-500';
    return 'bg-slate-500';
  };

  return (
    <header className="no-print sticky top-0 z-40 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8">
      <div className="flex-1 min-w-0 text-left">
        <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5 uppercase">{getPageTitle()}</h2>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
           <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
             {loading ? 'Syncing...' : dbStatus === 'connected' ? 'Cloud Ledger Online' : dbStatus === 'error' ? 'Sync Failed' : 'Ready'}
           </span>
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
           <button 
             onClick={logout}
             className="w-8 h-8 rounded flex items-center justify-center transition-all text-slate-400 hover:text-rose-500"
             title="Logout"
           >
             <i className="fa-solid fa-power-off text-xs"></i>
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
  const [session, setSession] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'empty'>('connecting');
  const [state, setState] = useState<GlobalState>(DEFAULT_STATE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDbStatus('connecting');
    try {
      const results = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('vendors').select('*').order('vendor_name'),
        supabase.from('chart_of_accounts').select('*').order('account_code'),
        supabase.from('hotel_vouchers').select('*').order('voucher_date', { ascending: false }),
        supabase.from('transport_vouchers').select('*').order('voucher_date', { ascending: false }),
        supabase.from('ticket_vouchers').select('*').order('voucher_date', { ascending: false }),
        supabase.from('visa_vouchers').select('*').order('voucher_date', { ascending: false }),
        supabase.from('receipts').select('*').order('receipt_date', { ascending: false }),
        supabase.from('ledger_entries').select('*').order('entry_date', { ascending: false })
      ]);

      const errorResult = results.find(r => r.error);
      if (errorResult) throw errorResult.error;

      const [custs, vends, accounts, hotels, trans, tickets, visas, rects, ledger] = results;

      const mappedAccounts: Account[] = (accounts.data || []).map((a: any) => ({
        id: a.id, 
        code: a.account_code, 
        title: a.account_name, 
        type: a.account_type as any, 
        isSystem: a.is_system_generated, 
        dbId: a.id
      }));

      const transformVoucher = (v: any, type: any): Voucher => {
        const entries = (ledger.data || [])
          .filter((le: any) => le.reference_id === v.id)
          .map((le: any) => ({
            id: le.id,
            accountId: mappedAccounts.find(ma => ma.dbId === le.account_id)?.id || le.account_id,
            debit: Number(le.debit || 0),
            credit: Number(le.credit || 0),
            customerId: le.party_id && (le.account_id === mappedAccounts.find(m => m.code === '1003')?.dbId) ? le.party_id : undefined,
            vendorId: le.party_id && (le.account_id === mappedAccounts.find(m => m.code === '2001')?.dbId) ? le.party_id : undefined,
            description: le.narration
          }));

        return {
          ...v, 
          id: v.id, 
          voucherNo: v.voucher_no || v.receipt_no, 
          date: v.voucher_date || v.receipt_date, 
          type, 
          status: v.status || 'Posted',
          totalAmount: Number(v.total_sale_pkr || v.amount_pkr || 0), 
          roe: Number(v.roe || 1), 
          buyPrice: Number(v.buy_rate_sar || v.buy_rate_pkr || v.net_buy_pkr || 0), 
          salePrice: Number(v.sale_rate_sar || v.sale_rate_pkr || (v.total_sale_pkr && type !== 'Ticket' ? v.total_sale_pkr : 0)),
          passengerName: v.passenger_name, 
          hotelProperty: v.hotel_name,
          route: v.route,
          transportType: v.vehicle_type,
          quantity: v.quantity,
          airlineName: v.airline_name,
          ticketNumber: v.ticket_no,
          gdsPnr: v.gds_pnr,
          baseFare: Number(v.base_fare_pkr || 0),
          taxes: Number(v.tax_pkr || 0),
          serviceFee: Number(v.service_fee_pkr || 0),
          country: v.country,
          visaType: v.visa_type,
          sendToEmbassy: v.send_to_embassy,
          description: v.remarks || v.narration || '',
          entries: entries,
          customerId: v.customer_id,
          vendorId: v.vendor_id
        };
      };

      const allVouchers: Voucher[] = [
        ...(hotels.data || []).map(v => transformVoucher(v, 'Hotel')),
        ...(trans.data || []).map(v => transformVoucher(v, 'Transport')),
        ...(tickets.data || []).map(v => transformVoucher(v, 'Ticket')),
        ...(visas.data || []).map(v => transformVoucher(v, 'Visa')),
        ...(rects.data || []).map(v => transformVoucher(v, 'Receipt'))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setState(prev => ({
        ...prev, 
        accounts: mappedAccounts, 
        vouchers: allVouchers,
        customers: (custs.data || []).map((c: any) => ({ 
          id: c.id, code: c.customer_code, name: c.name, phone: c.phone, email: c.email || '', 
          address: c.address || '', city: c.city, openingBalance: Number(c.opening_balance), 
          openingBalanceType: (c.opening_balance_type as any) || 'Receivable',
          isActive: c.is_active, status: 'Active & Visible' 
        })),
        vendors: (vends.data || []).map((v: any) => ({ 
          id: v.id, code: v.vendor_code, name: v.vendor_name, phone: v.phone, email: v.email || '', 
          address: v.address || '', city: v.city, openingBalance: Number(v.opening_balance), 
          openingBalanceType: (v.opening_balance_type as any) || 'Payable',
          isActive: v.is_active, status: 'Active & Visible' 
        }))
      }));
      setDbStatus(allVouchers.length === 0 && (custs.data?.length === 0 || !custs.data) ? 'empty' : 'connected');
    } catch (e) { 
      console.error('Fetch Fatal Error:', e);
      setDbStatus('error'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setInitializing(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const addVoucher = async (v: Voucher) => {
    setLoading(true);
    try {
      // FIX: Standardize party IDs to NULL if they are empty strings
      const cId = v.customerId && v.customerId !== '' ? v.customerId : null;
      const vId = v.vendorId && v.vendorId !== '' ? v.vendorId : null;

      if (v.type !== 'Receipt' && (!cId || !vId)) {
        throw new Error(`Data Validation Error: Both Customer and Vendor must be selected for ${v.type} entries.`);
      }

      let table = '';
      let payload: any = { 
        voucher_no: v.voucherNo, 
        voucher_date: v.date, 
        customer_id: cId, 
        vendor_id: vId, 
        roe: Number(v.roe || 1),
        remarks: v.description
      };

      if (v.type === 'Hotel') { 
        table = 'hotel_vouchers'; 
        payload = { ...payload, hotel_name: v.hotelProperty, passenger_name: v.passengerName, check_in: v.checkIn, check_out: v.checkOut, rooms: Number(v.rooms || 1), buy_rate_sar: Number(v.buyPrice || 0), sale_rate_sar: Number(v.salePrice || 0) }; 
      }
      else if (v.type === 'Transport') { 
        table = 'transport_vouchers'; 
        payload = { ...payload, route: v.route, vehicle_type: v.transportType, quantity: Number(v.quantity || 1), buy_rate_sar: Number(v.buyPrice || 0), sale_rate_sar: Number(v.salePrice || 0) }; 
      }
      else if (v.type === 'Ticket') { 
        table = 'ticket_vouchers'; 
        payload = { ...payload, passenger_name: v.passengerName, airline_name: v.airlineName, ticket_no: v.ticketNumber, gds_pnr: v.gdsPnr, base_fare_pkr: Number(v.baseFare || 0), tax_pkr: Number(v.taxes || 0), service_fee_pkr: Number(v.serviceFee || 0), net_buy_pkr: Number(v.buyPrice || 0) }; 
      }
      else if (v.type === 'Visa') { 
        table = 'visa_vouchers'; 
        payload = { ...payload, passenger_name: v.passengerName, country: v.country, visa_type: v.visaType, buy_rate_pkr: Number(v.buyPrice || 0), sale_rate_pkr: Number(v.salePrice || 0), send_to_embassy: v.sendToEmbassy }; 
      }
      else if (v.type === 'Receipt') { 
        table = 'receipts'; 
        const depositAccId = state.accounts.find(a => a.id === v.entries[0]?.accountId)?.dbId || v.entries[0]?.accountId;
        payload = { 
          receipt_no: v.voucherNo, 
          receipt_date: v.date, 
          customer_id: cId, 
          vendor_id: vId, 
          deposit_account_id: depositAccId, 
          amount_pkr: Number(v.totalAmount || 0), 
          narration: v.description, 
          roe: Number(v.roe || 1) 
        }; 
      }

      const { error } = (v.id && v.id.length > 20) 
        ? await supabase.from(table).update(payload).eq('id', v.id) 
        : await supabase.from(table).insert(payload);
        
      if (error) throw error;
      await fetchData();
    } catch (err: any) { 
      console.error('Core Storage Error:', err);
      alert(err.message || "Failed to finalize database commit."); 
    } finally { 
      setLoading(false); 
    }
  };

  const deleteVoucher = async (id: string) => {
    if (!window.confirm("CRITICAL: Permanent delete? This will wipe ledger history for this record.")) return;
    setLoading(true);
    try {
      const v = state.vouchers.find(x => x.id === id);
      const tableMap: any = { Hotel: 'hotel_vouchers', Transport: 'transport_vouchers', Ticket: 'ticket_vouchers', Visa: 'visa_vouchers', Receipt: 'receipts' };
      if (v) {
        const { error } = await supabase.from(tableMap[v.type]).delete().eq('id', id);
        if (error) throw error;
      }
      await fetchData();
    } catch (e: any) { 
      alert(e.message || "Operation failed."); 
    } finally { 
      setLoading(false); 
    }
  };

  const upsertCustomer = async (c: Partial<Customer>) => {
    setLoading(true);
    try {
      const p = { customer_code: c.code, name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', city: c.city, opening_balance: Number(c.openingBalance || 0), opening_balance_type: c.openingBalanceType, is_active: c.isActive };
      const { error } = c.id && c.id.length > 20 ? await supabase.from('customers').update(p).eq('id', c.id) : await supabase.from('customers').insert(p);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const upsertVendor = async (v: Partial<Vendor>) => {
    setLoading(true);
    try {
      const p = { vendor_code: v.code, vendor_name: v.name, phone: v.phone, email: v.email || '', address: v.address || '', city: v.city, opening_balance: Number(v.openingBalance || 0), opening_balance_type: v.openingBalanceType, is_active: v.isActive };
      const { error } = v.id && v.id.length > 20 ? await supabase.from('vendors').update(p).eq('id', v.id) : await supabase.from('vendors').insert(p);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const value = useMemo(() => ({ 
    state, setState, session, loading, dbStatus, logout: () => supabase.auth.signOut(), refreshData: fetchData, addVoucher, deleteVoucher, upsertCustomer, upsertVendor,
    deleteCustomer: async (id: string) => { if(window.confirm("Delete client?")) { await supabase.from('customers').delete().eq('id', id); fetchData(); } },
    deleteVendor: async (id: string) => { if(window.confirm("Delete supplier?")) { await supabase.from('vendors').delete().eq('id', id); fetchData(); } },
    deleteAccount: async (id: string) => { if(window.confirm("Delete account head?")) { await supabase.from('chart_of_accounts').delete().eq('id', id); fetchData(); } },
    toggleTheme: () => setState(p => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } })),
    toggleCompact: () => setState(p => ({ ...p, settings: { ...p.settings, compactView: !p.settings.compactView } })),
    enterGuestMode: () => setSession({ user: { email: 'demo@hashmi.core' } } as any)
  }), [state, session, loading, dbStatus, fetchData]);

  if (initializing) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120]"><div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div></div>;

  return (
    <AppContext.Provider value={value}>
      <HashRouter>
        {!session ? <Routes><Route path="*" element={<Login />} /></Routes> : (
          <Layout>
            <Routes>
              <Route index element={<Dashboard />} />
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
        )}
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
