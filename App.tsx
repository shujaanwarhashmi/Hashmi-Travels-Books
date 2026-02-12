
import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GlobalState, Voucher, Customer, Vendor, Account, VoucherEntry } from './types';
import { DEFAULT_STATE } from './constants';
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
import { supabase } from './lib/supabase';

interface AppContextType {
  state: GlobalState;
  setState: React.Dispatch<React.SetStateAction<GlobalState>>;
  session: any | null;
  loading: boolean;
  dbStatus: 'connecting' | 'connected' | 'error' | 'empty' | 'missing_tables';
  missingTables: string[];
  logout: () => void;
  refreshData: () => Promise<void>;
  addVoucher: (v: Voucher) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
  upsertCustomer: (c: Partial<Customer>) => Promise<void>;
  upsertVendor: (v: Partial<Vendor>) => Promise<void>;
  upsertAccount: (a: Partial<Account>) => Promise<void>;
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
    { to: '/accounts', label: 'Accounts Registry', icon: 'fa-university' },
    { to: '/customers', label: 'Customer Master', icon: 'fa-users' },
    { to: '/vendors', label: 'Vendor Master', icon: 'fa-truck' },
    { to: '/vouchers', label: 'Financial Journal', icon: 'fa-file-invoice-dollar' },
    { to: '/reports', label: 'Accounting Reports', icon: 'fa-file-alt' },
    { to: '/settings', label: 'System Settings', icon: 'fa-cogs' },
  ];

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] text-white border-r border-slate-800 transition-transform md:translate-x-0">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-20 border-b border-slate-800 px-6">
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-sky-400">HASHMI<span className="text-white">LEDGER</span></span>
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest text-center">Core v17.2</span>
          </div>
        </div>
        <nav className="flex-1 mt-8 px-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = link.to === '/' ? currentPath === '/' : currentPath.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center px-4 py-3.5 rounded-xl transition-all ${
                  isActive ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className={`fa-solid ${link.icon} w-6 text-center mr-3`}></i>
                <span className="font-bold text-sm tracking-tight">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

const Topbar = () => {
  const { state, toggleTheme, toggleCompact, logout, refreshData, loading, dbStatus } = useApp();
  const navigate = useNavigate();

  return (
    <header className="no-print sticky top-0 z-40 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">
          {state.settings.legalTitle}
        </h2>
        {dbStatus === 'missing_tables' && (
          <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">SCHEMA MISMATCH</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={toggleCompact} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${state.settings.compactView ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-400'}`}><i className="fa-solid fa-compress-arrows-alt text-xs"></i></button>
          <button onClick={toggleTheme} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${state.settings.theme === 'dark' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-400'}`}><i className={`fa-solid ${state.settings.theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs`}></i></button>
          <button onClick={() => refreshData()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500"><i className={`fa-solid fa-sync ${loading ? 'animate-spin' : ''}`}></i></button>
        </div>
        <button onClick={() => navigate('/vouchers/new')} className="bg-[#0B1120] text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">New Entry</button>
        <button onClick={logout} className="text-slate-400 hover:text-rose-500"><i className="fa-solid fa-power-off"></i></button>
      </div>
    </header>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();
  return (
    <div className={`min-h-screen flex transition-colors ${state.settings.theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <Topbar />
        <main className={`flex-1 ${state.settings.compactView ? 'p-4' : 'p-8'}`}>
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'empty' | 'missing_tables'>('connecting');
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [state, setState] = useState<GlobalState>(DEFAULT_STATE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const tablesToFetch = [
      { name: 'customers', table: 'customers' },
      { name: 'vendors', table: 'vendors' },
      { name: 'chart_of_accounts', table: 'chart_of_accounts' },
      { name: 'hotel_vouchers', table: 'hotel_vouchers' },
      { name: 'transport_vouchers', table: 'transport_vouchers' },
      { name: 'ticket_vouchers', table: 'ticket_vouchers' },
      { name: 'visa_vouchers', table: 'visa_vouchers' },
      { name: 'receipts', table: 'receipts' },
      { name: 'journal_vouchers', table: 'journal_vouchers' },
      { name: 'journal_voucher_entries', table: 'journal_voucher_entries' },
      { name: 'ledger_entries', table: 'ledger_entries' }
    ];

    try {
      const results = await Promise.all(tablesToFetch.map(t => supabase.from(t.table).select('*')));
      
      const foundMissing: string[] = [];
      results.forEach((res, idx) => {
        if (res.error && (res.error.code === 'PGRST204' || res.error.message.includes('not found'))) {
          foundMissing.push(tablesToFetch[idx].table);
        }
      });

      if (foundMissing.length > 0) {
        setMissingTables(foundMissing);
        setDbStatus('missing_tables');
        setLoading(false);
        return;
      }

      const [custs, vends, accounts, hotels, trans, tickets, visas, rects, jvs, jvEntries, ledger] = results;

      const mappedAccounts: Account[] = (accounts.data || []).map((a: any) => ({
        id: a.id,
        code: a.account_code, title: a.account_name, type: a.account_type as any, isSystem: a.is_system_generated, dbId: a.id
      }));

      const transformVoucher = (v: any, type: any): Voucher => {
        const vEntries: VoucherEntry[] = (ledger.data || []).filter((le: any) => le.reference_id === v.id).map((le: any) => ({
          id: le.id, 
          accountId: le.account_id,
          debit: Number(le.debit || 0), 
          credit: Number(le.credit || 0),
          customerId: le.party_id && custs.data?.find(c => c.id === le.party_id) ? le.party_id : undefined,
          vendorId: le.party_id && vends.data?.find(vd => vd.id === le.party_id) ? le.party_id : undefined,
          description: le.narration,
          currency: 'PKR',
          roe: 1,
          pkrDebit: Number(le.debit || 0),
          pkrCredit: Number(le.credit || 0)
        }));

        return {
          ...v, 
          id: v.id, 
          voucherNo: v.voucher_no || v.receipt_no, 
          date: v.voucher_date || v.receipt_date, 
          type, 
          status: v.status || 'Posted',
          totalAmount: Number(v.total_sale_pkr || v.amount_pkr || v.total_debit || 0), 
          roe: Number(v.roe || 1), 
          entries: vEntries,
          passengerName: v.passenger_name,
          hotelProperty: v.hotel_name,
          airlineName: v.airline_name,
          ticketNumber: v.ticket_no,
          gdsPnr: v.gds_pnr,
          route: v.route,
          country: v.country,
          visaType: v.visa_type,
          checkIn: v.check_in,
          checkOut: v.check_out,
          rooms: v.rooms,
          passportNumber: v.passport_number,
          processingStatus: v.processing_status,
          expiryDate: v.expiry_date,
          vehicleNo: v.vehicle_no,
          driverName: v.driver_name,
          baseFare: v.base_fare_pkr,
          taxes: v.tax_pkr,
          serviceFee: v.service_fee_pkr,
          buyPrice: v.buy_rate_pkr || v.net_buy_pkr || v.buy_rate_sar,
          salePrice: v.sale_rate_pkr || v.sale_rate_sar || v.amount_sar,
          description: v.narration || v.remarks || v.description || ''
        };
      };

      const allVouchers: Voucher[] = [
        ...(hotels.data || []).map(v => transformVoucher(v, 'Hotel')),
        ...(trans.data || []).map(v => transformVoucher(v, 'Transport')),
        ...(tickets.data || []).map(v => transformVoucher(v, 'Ticket')),
        ...(visas.data || []).map(v => transformVoucher(v, 'Visa')),
        ...(rects.data || []).map(v => transformVoucher(v, 'Receipt')),
        ...(jvs.data || []).map(v => transformVoucher(v, 'Journal'))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setState(prev => ({
        ...prev, 
        accounts: mappedAccounts, 
        vouchers: allVouchers,
        customers: (custs.data || []).map((c: any) => ({ 
          id: c.id, code: c.customer_code, name: c.name, phone: c.phone, city: c.city, 
          openingBalance: Number(c.opening_balance), openingBalanceType: c.opening_balance_type, isActive: c.is_active, status: 'Active & Visible' 
        })),
        vendors: (vends.data || []).map((v: any) => ({ 
          id: v.id, code: v.vendor_code, name: v.vendor_name, phone: v.phone, city: v.city, 
          openingBalance: Number(v.opening_balance), openingBalanceType: v.opening_balance_type, isActive: v.is_active, status: 'Active & Visible' 
        }))
      }));
      setDbStatus('connected');
    } catch (e) { 
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
      const getAccUuid = (id: string) => state.accounts.find(a => a.id === id || a.dbId === id || a.code === id)?.dbId || id;
      const cId = v.entries.find(e => e.customerId)?.customerId || null;
      const vId = v.entries.find(e => e.vendorId)?.vendorId || null;

      if (v.type === 'Journal') {
        const { data: jv, error: jvErr } = await supabase.from('journal_vouchers').insert({ 
           voucher_no: v.voucherNo, voucher_date: v.date, total_debit: v.totalAmount, total_credit: v.totalAmount, narration: v.description 
        }).select().single();
        if (jvErr) throw jvErr;
        const entryPayload = v.entries.map(e => ({
           journal_id: jv.id,
           account_id: getAccUuid(e.accountId),
           party_id: e.customerId || e.vendorId || null,
           debit: e.debit, credit: e.credit, description: e.description,
           currency: e.currency, roe: e.roe
        }));
        await supabase.from('journal_voucher_entries').insert(entryPayload);
      } else if (v.type === 'Hotel') {
        await supabase.from('hotel_vouchers').insert({
          voucher_no: v.voucherNo, voucher_date: v.date, customer_id: cId, vendor_id: vId, roe: v.roe,
          hotel_name: v.hotelProperty, passenger_name: v.passengerName, check_in: v.checkIn, check_out: v.checkOut,
          rooms: v.rooms, buy_rate_sar: v.buyPrice, sale_rate_sar: v.salePrice, remarks: v.description
        });
      } else if (v.type === 'Ticket') {
        await supabase.from('ticket_vouchers').insert({
          voucher_no: v.voucherNo, voucher_date: v.date, customer_id: cId, vendor_id: vId,
          passenger_name: v.passengerName, airline_name: v.airlineName, ticket_no: v.ticketNumber, gds_pnr: v.gdsPnr,
          route: v.route, base_fare_pkr: v.baseFare, tax_pkr: v.taxes, service_fee_pkr: v.serviceFee, net_buy_pkr: v.buyPrice
        });
      } else if (v.type === 'Visa') {
        await supabase.from('visa_vouchers').insert({
          voucher_no: v.voucherNo, voucher_date: v.date, customer_id: cId, vendor_id: vId,
          passenger_name: v.passengerName, country: v.country, visa_type: v.visaType,
          buy_rate_pkr: v.buyPrice, sale_rate_pkr: v.salePrice, expiry_date: v.expiryDate, 
          passport_number: v.passportNumber, processing_status: v.processingStatus
        });
      } else if (v.type === 'Receipt') {
        await supabase.from('receipts').insert({
          receipt_no: v.voucherNo, receipt_date: v.date, customer_id: cId, vendor_id: vId,
          amount_pkr: v.totalAmount, narration: v.description, 
          deposit_account_id: getAccUuid(v.entries[0]?.accountId)
        });
      } else if (v.type === 'Transport') {
        await supabase.from('transport_vouchers').insert({
          voucher_no: v.voucherNo, voucher_date: v.date, customer_id: cId, vendor_id: vId, roe: v.roe,
          route: v.route, vehicle_type: v.transportType, amount_sar: v.salePrice, buy_rate_sar: v.buyPrice, remarks: v.description,
          vehicle_no: v.vehicleNo, driver_name: v.driverName
        });
      }
      await fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const deleteVoucher = async (id: string) => {
    setLoading(true);
    try {
      const v = state.vouchers.find(x => x.id === id);
      const tableMap: any = { Hotel: 'hotel_vouchers', Transport: 'transport_vouchers', Ticket: 'ticket_vouchers', Visa: 'visa_vouchers', Receipt: 'receipts', Journal: 'journal_vouchers' };
      if (v) {
        const { error } = await supabase.from(tableMap[v.type]).delete().eq('id', id);
        if (error) throw error;
      }
      await fetchData();
    } catch (e: any) { 
      alert("Delete failed: " + (e.message || "Unknown database error")); 
    } finally { 
      setLoading(false); 
    }
  };

  const upsertCustomer = async (c: Partial<Customer>) => {
    setLoading(true);
    try {
      const p = { customer_code: c.code, name: c.name, phone: c.phone, opening_balance: c.openingBalance, opening_balance_type: c.openingBalanceType, is_active: c.isActive };
      await supabase.from('customers').upsert({ id: c.id, ...p });
      await fetchData();
    } catch (e) { alert("Failed to save customer"); } finally { setLoading(false); }
  };

  const upsertVendor = async (v: Partial<Vendor>) => {
    setLoading(true);
    try {
      const p = { vendor_code: v.code, vendor_name: v.name, phone: v.phone, opening_balance: v.openingBalance, opening_balance_type: v.openingBalanceType, is_active: v.isActive };
      await supabase.from('vendors').upsert({ id: v.id, ...p });
      await fetchData();
    } catch (e) { alert("Failed to save vendor"); } finally { setLoading(false); }
  };

  const upsertAccount = async (a: Partial<Account>) => {
    setLoading(true);
    try {
      const payload: any = { account_code: a.code, account_name: a.title, account_type: a.type };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = a.id && uuidRegex.test(a.id);
      
      if (isValidUuid) {
        payload.id = a.id;
      }

      const { error } = await supabase.from('chart_of_accounts').upsert(payload);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { 
      alert("Failed to save account: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const value = useMemo(() => ({ 
    state, setState, session, loading, dbStatus, missingTables, logout: () => supabase.auth.signOut(), refreshData: fetchData, addVoucher, deleteVoucher, 
    upsertCustomer, upsertVendor, upsertAccount,
    deleteCustomer: async (id: string) => { await supabase.from('customers').delete().eq('id', id); fetchData(); },
    deleteVendor: async (id: string) => { await supabase.from('vendors').delete().eq('id', id); fetchData(); },
    deleteAccount: async (id: string) => { await supabase.from('chart_of_accounts').delete().eq('id', id); fetchData(); },
    toggleTheme: () => setState(p => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } })),
    toggleCompact: () => setState(p => ({ ...p, settings: { ...p.settings, compactView: !p.settings.compactView } })),
    enterGuestMode: () => setSession({ user: { email: 'demo@hashmi.core' } } as any)
  }), [state, session, loading, dbStatus, missingTables, fetchData]);

  if (initializing) return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-sky-500 font-black uppercase tracking-[0.2em]">Hashmi Core Initializing...</div>;

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
