
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { Voucher, VoucherType, VoucherEntry } from '../types';
import { generateId, formatCurrency } from '../utils/accounting';

const VoucherEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { state, addVoucher } = useApp();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const cloneId = searchParams.get('cloneFrom');
  const isEdit = !!id;
  const targetId = id || cloneId;
  const sourceVoucher = state.vouchers.find(v => v.id === targetId);

  // Core State
  const [type, setType] = useState<VoucherType>(sourceVoucher?.type || 'Receipt');
  const [currency, setCurrency] = useState<'PKR' | 'SAR'>(sourceVoucher?.currency || 'PKR');
  const [date, setDate] = useState(isEdit ? sourceVoucher?.date || '' : new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState(() => isEdit ? sourceVoucher?.voucherNo || '' : `V-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const [roe, setRoe] = useState(sourceVoucher?.roe || state.settings.defaultRoe);

  // Common Party Logic
  const [entityType, setEntityType] = useState<'Customers' | 'Vendors'>('Customers');
  const [selectedCustomer, setSelectedCustomer] = useState(sourceVoucher?.entries.find(e => e.customerId)?.customerId || '');
  const [selectedVendor, setSelectedVendor] = useState(sourceVoucher?.entries.find(e => e.vendorId)?.vendorId || '');
  const [narration, setNarration] = useState(sourceVoucher?.description || '');

  // Ticket Fields
  const [paxName, setPaxName] = useState(sourceVoucher?.passengerName || '');
  const [airline, setAirline] = useState(sourceVoucher?.airlineName || '');
  const [gdsPnr, setGdsPnr] = useState(sourceVoucher?.gdsPnr || '');
  const [ticketNo, setTicketNo] = useState(sourceVoucher?.ticketNumber || '');
  const [sector, setSector] = useState(sourceVoucher?.route || '');
  const [baseFare, setBaseFare] = useState(sourceVoucher?.baseFare || 0);
  const [taxes, setTaxes] = useState(sourceVoucher?.taxes || 0);
  const [serviceFee, setServiceFee] = useState(sourceVoucher?.serviceFee || 0);
  const [netBuy, setNetBuy] = useState(sourceVoucher?.buyPrice || 0);

  // Receipt Fields
  const [rectAmount, setRectAmount] = useState(sourceVoucher?.totalAmount || 0);
  const [depositAcc, setDepositAcc] = useState(sourceVoucher?.entries.find(e => e.debit > 0)?.accountId || 'acc-1');

  // Visa Fields
  const [passportNo, setPassportNo] = useState(sourceVoucher?.passportNumber || '');
  const [visaStatus, setVisaStatus] = useState(sourceVoucher?.processingStatus || 'Pending');
  const [country, setCountry] = useState(sourceVoucher?.country || '');
  const [visaType, setVisaType] = useState(sourceVoucher?.visaType || 'Visit');
  const [visaSale, setVisaSale] = useState(sourceVoucher?.salePrice || 0);
  const [visaBuy, setVisaBuy] = useState(sourceVoucher?.buyPrice || 0);
  const [expiryDate, setExpiryDate] = useState(sourceVoucher?.expiryDate || '');

  // Hotel Fields
  const [hotelName, setHotelName] = useState(sourceVoucher?.hotelProperty || '');
  const [city, setCity] = useState(sourceVoucher?.city || 'MAKKAH');
  const [checkIn, setCheckIn] = useState(sourceVoucher?.checkIn || '');
  const [checkOut, setCheckOut] = useState(sourceVoucher?.checkOut || '');
  const [mealPlan, setMealPlan] = useState(sourceVoucher?.roomBasis || 'Room Only');
  const [adults, setAdults] = useState(sourceVoucher?.quantity || 2);
  const [childs, setChilds] = useState(0);
  const [rooms, setRooms] = useState(sourceVoucher?.rooms || 1);
  const [roomBasis, setRoomBasis] = useState('TRIPLE');
  const [hSaleSAR, setHSaleSAR] = useState(sourceVoucher?.salePrice || 0);
  const [hBuySAR, setHBuySAR] = useState(sourceVoucher?.buyPrice || 0);

  // Transport Fields
  const [tType, setTType] = useState(sourceVoucher?.transportType || 'H1');
  const [tRoute, setTRoute] = useState(sourceVoucher?.route || '');
  const [vehicleNo, setVehicleNo] = useState(sourceVoucher?.vehicleNo || '');
  const [driverName, setDriverName] = useState(sourceVoucher?.driverName || '');
  const [tSaleSAR, setTSaleSAR] = useState(sourceVoucher?.salePrice || 0);
  const [tBuySAR, setTBuySAR] = useState(sourceVoucher?.buyPrice || 0);

  // JV Dynamic Rows
  const [journalRows, setJournalRows] = useState<VoucherEntry[]>(() => {
    if (sourceVoucher?.type === 'Journal') return sourceVoucher.entries.map(e => ({ ...e, id: generateId() }));
    return [
      { id: generateId(), accountId: '', debit: 0, credit: 0, description: '', currency: 'PKR', roe: 1 },
      { id: generateId(), accountId: '', debit: 0, credit: 0, description: '', currency: 'PKR', roe: 1 }
    ];
  });

  const duration = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [checkIn, checkOut]);

  const totals = useMemo(() => {
    const pkrDebits = journalRows.reduce((sum, r) => sum + (Number(r.debit || 0) * Number(r.roe || 1)), 0);
    const pkrCredits = journalRows.reduce((sum, r) => sum + (Number(r.credit || 0) * Number(r.roe || 1)), 0);
    return { pkrDebits, pkrCredits, diff: Math.abs(pkrDebits - pkrCredits), isBalanced: Math.abs(pkrDebits - pkrCredits) < 0.1 };
  }, [journalRows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherNo.trim()) return alert("Voucher No is required.");

    let finalVoucher: Partial<Voucher> = {
      id: isEdit ? id! : generateId(),
      voucherNo, date, type, roe, currency, status: 'Posted',
      createdAt: new Date().toISOString(),
      description: narration || paxName
    };

    if (type === 'Journal') {
      if (!totals.isBalanced) return alert("Journal is not balanced!");
      finalVoucher.totalAmount = totals.pkrDebits;
      finalVoucher.entries = journalRows.map(r => ({
        ...r, 
        pkrDebit: Number(r.debit) * Number(r.roe), 
        pkrCredit: Number(r.credit) * Number(r.roe)
      }));
    } else if (type === 'Receipt') {
      finalVoucher.totalAmount = rectAmount;
      finalVoucher.entries = [
        { id: generateId(), accountId: depositAcc, debit: rectAmount, credit: 0, currency: 'PKR', roe: 1, pkrDebit: rectAmount, pkrCredit: 0 },
        { id: generateId(), accountId: entityType === 'Customers' ? 'acc-3' : 'acc-5', debit: 0, credit: rectAmount, customerId: selectedCustomer || undefined, vendorId: selectedVendor || undefined, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: rectAmount }
      ];
    } else if (type === 'Ticket') {
      const salePKR = Number(baseFare) + Number(taxes) + Number(serviceFee);
      finalVoucher.totalAmount = salePKR;
      finalVoucher.passengerName = paxName;
      finalVoucher.airlineName = airline;
      finalVoucher.ticketNumber = ticketNo;
      finalVoucher.gdsPnr = gdsPnr;
      finalVoucher.route = sector;
      finalVoucher.baseFare = baseFare;
      finalVoucher.taxes = taxes;
      finalVoucher.serviceFee = serviceFee;
      finalVoucher.buyPrice = netBuy;
      finalVoucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: salePKR, credit: 0, customerId: selectedCustomer, currency: 'PKR', roe: 1, pkrDebit: salePKR, pkrCredit: 0 },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: netBuy, vendorId: selectedVendor, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: netBuy },
        { id: generateId(), accountId: 'acc-11', debit: 0, credit: salePKR - netBuy, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: salePKR - netBuy }
      ];
    } else if (type === 'Visa') {
      finalVoucher.totalAmount = visaSale;
      finalVoucher.passengerName = paxName;
      finalVoucher.passportNumber = passportNo;
      finalVoucher.processingStatus = visaStatus;
      finalVoucher.country = country;
      finalVoucher.visaType = visaType;
      finalVoucher.salePrice = visaSale;
      finalVoucher.buyPrice = visaBuy;
      finalVoucher.expiryDate = expiryDate;
      finalVoucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: visaSale, credit: 0, customerId: selectedCustomer, currency: 'PKR', roe: 1, pkrDebit: visaSale, pkrCredit: 0 },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: visaBuy, vendorId: selectedVendor, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: visaBuy },
        { id: generateId(), accountId: 'acc-12', debit: 0, credit: visaSale - visaBuy, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: visaSale - visaBuy }
      ];
    } else if (type === 'Hotel') {
      const salePKR = hSaleSAR * roe * rooms * duration;
      const buyPKR = hBuySAR * roe * rooms * duration;
      finalVoucher.totalAmount = salePKR;
      finalVoucher.passengerName = paxName;
      finalVoucher.hotelProperty = hotelName;
      finalVoucher.country = 'SAUDI ARABIA';
      finalVoucher.city = city;
      finalVoucher.checkIn = checkIn;
      finalVoucher.checkOut = checkOut;
      finalVoucher.roomBasis = roomBasis;
      finalVoucher.rooms = rooms;
      finalVoucher.quantity = adults;
      finalVoucher.salePrice = hSaleSAR;
      finalVoucher.buyPrice = hBuySAR;
      finalVoucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: salePKR, credit: 0, customerId: selectedCustomer, currency: 'PKR', roe: 1, pkrDebit: salePKR, pkrCredit: 0 },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: buyPKR, vendorId: selectedVendor, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: buyPKR },
        { id: generateId(), accountId: 'acc-7', debit: 0, credit: salePKR - buyPKR, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: salePKR - buyPKR }
      ];
    } else if (type === 'Transport') {
      const salePKR = currency === 'SAR' ? tSaleSAR * roe : tSaleSAR;
      const buyPKR = currency === 'SAR' ? tBuySAR * roe : tBuySAR;
      finalVoucher.totalAmount = salePKR;
      finalVoucher.transportType = tType;
      finalVoucher.route = tRoute;
      finalVoucher.vehicleNo = vehicleNo;
      finalVoucher.driverName = driverName;
      finalVoucher.description = narration;
      finalVoucher.salePrice = tSaleSAR;
      finalVoucher.buyPrice = tBuySAR;
      finalVoucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: salePKR, credit: 0, customerId: selectedCustomer, currency: 'PKR', roe: 1, pkrDebit: salePKR, pkrCredit: 0 },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: buyPKR, vendorId: selectedVendor, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: buyPKR },
        { id: generateId(), accountId: 'acc-6', debit: 0, credit: salePKR - buyPKR, currency: 'PKR', roe: 1, pkrDebit: 0, pkrCredit: salePKR - buyPKR }
      ];
    }

    await addVoucher(finalVoucher as Voucher);
    navigate('/vouchers');
  };

  const currentPartyName = useMemo(() => {
    if (entityType === 'Customers') return state.customers.find(c => c.id === selectedCustomer)?.name || 'Choose Ledger Account...';
    return state.vendors.find(v => v.id === selectedVendor)?.name || 'Choose Vendor Account...';
  }, [selectedCustomer, selectedVendor, entityType, state]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] -mt-8 -mx-8 pb-20">
      {/* HEADER SECTION (DARK THEME) */}
      <div className="bg-[#0B1426] text-white p-8 pb-12 rounded-b-[3rem] shadow-2xl relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                  <i className={`fa-solid ${type === 'Journal' ? 'fa-book' : type === 'Receipt' ? 'fa-receipt' : type === 'Ticket' ? 'fa-plane' : type === 'Visa' ? 'fa-passport' : type === 'Hotel' ? 'fa-hotel' : 'fa-bus'} text-sky-400 text-xl`}></i>
               </div>
               <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">New {type} {type === 'Journal' ? 'Voucher' : type === 'Visa' ? 'Case' : type === 'Ticket' ? 'Entry' : ''}</h1>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Financial Ledger Module</p>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Type Switcher */}
             <div className="flex bg-[#1E293B] p-1.5 rounded-xl border border-slate-800">
                {['Receipt', 'Ticket', 'Visa', 'Hotel', 'Transport', 'Journal'].map(t => (
                  <button key={t} type="button" onClick={() => setType(t as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${type === t ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-400'}`}>{t}</button>
                ))}
             </div>
             
             {/* Currency Toggle */}
             <div className="flex bg-[#1E293B] p-1.5 rounded-xl border border-slate-800">
                {['PKR', 'SAR'].map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currency === c ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}>{c}</button>
                ))}
             </div>

             <div className="bg-[#1E293B] px-6 py-2 rounded-xl border border-slate-800 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Voucher Ref</p>
                <p className="text-xs font-black text-white">{voucherNo}</p>
             </div>

             <div className="bg-[#1E293B] px-6 py-2 rounded-xl border border-slate-800 text-center">
                <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest">Entry Date</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer" />
             </div>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-8 -mt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* MAIN FORM AREA (LEFT) */}
          <div className="lg:col-span-12 space-y-10">
            <div className="bg-white p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-10 min-h-[600px]">
              
              {/* Specialized Forms */}
              {type === 'Receipt' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="lg:col-span-2 space-y-10">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Entity Type</label>
                          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 max-w-sm">
                            <button type="button" onClick={() => setEntityType('Customers')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entityType === 'Customers' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-400'}`}>Customers</button>
                            <button type="button" onClick={() => setEntityType('Vendors')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entityType === 'Vendors' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-400'}`}>Vendors</button>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select {entityType === 'Customers' ? 'Customer' : 'Vendor'} Account</label>
                          <select className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-8 py-5 text-sm font-bold text-slate-600 outline-none appearance-none" value={entityType === 'Customers' ? selectedCustomer : selectedVendor} onChange={e => entityType === 'Customers' ? setSelectedCustomer(e.target.value) : setSelectedVendor(e.target.value)}>
                            <option value="">{currentPartyName}</option>
                            {entityType === 'Customers' ? state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deposit Into (Bank/Cash)</label>
                          <select className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-8 py-5 text-sm font-black text-slate-800 outline-none appearance-none" value={depositAcc} onChange={e => setDepositAcc(e.target.value)}>
                            {state.accounts.filter(a => a.type === 'Cash' || a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                          </select>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Narration</label>
                          <textarea className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-8 text-sm font-bold text-slate-500 outline-none h-44" placeholder="Payment details..." value={narration} onChange={e => setNarration(e.target.value)} />
                      </div>
                   </div>
                   <div className="lg:col-span-1">
                      <div className="bg-[#0B1426] text-white p-10 rounded-[2.5rem] shadow-2xl space-y-10">
                        <div className="space-y-4">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Amount ({currency})</label>
                            <input type="number" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4 text-lg font-black text-sky-400 outline-none" value={rectAmount} onChange={e => setRectAmount(Number(e.target.value))} />
                        </div>
                        <div className="pt-8 border-t border-slate-800 text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-6">Impact on Party Ledger (PKR)</p>
                            <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><i className="fa-solid fa-wallet text-sky-400 text-2xl"></i></div>
                            <h2 className="text-4xl font-black mb-2">Rs. {rectAmount.toLocaleString()}</h2>
                        </div>
                        <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">SAVE & POST RECEIPT</button>
                      </div>
                   </div>
                </div>
              )}

              {type === 'Journal' && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                    <div className="flex items-center gap-3"><i className="fa-solid fa-book text-sky-500"></i><span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Manual Ledger Distribution (Split Entry)</span></div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${totals.isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {totals.isBalanced ? 'Double-Entry Balanced' : `Imbalance: Rs. ${Math.abs(totals.diff).toLocaleString()}`}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                          <th className="pb-4">Account Head</th>
                          <th className="pb-4">Party/Entity (Optional)</th>
                          <th className="pb-4 text-center">Curr</th>
                          <th className="pb-4 text-center">ROE</th>
                          <th className="pb-4 text-right">Debit</th>
                          <th className="pb-4 text-right">Credit</th>
                          <th className="pb-4 text-center">Op</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {journalRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="py-4 pr-4">
                              <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none appearance-none" value={row.accountId} onChange={e => setJournalRows(journalRows.map(r => r.id === row.id ? {...r, accountId: e.target.value} : r))}>
                                <option value="">Select Account</option>
                                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.title}</option>)}
                              </select>
                            </td>
                            <td className="py-4 pr-4">
                              <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none appearance-none" value={row.customerId || row.vendorId || ''} onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                  setJournalRows(journalRows.map(r => r.id === row.id ? {...r, customerId: undefined, vendorId: undefined} : r));
                                  return;
                                }
                                const isC = state.customers.some(c => c.id === val);
                                setJournalRows(journalRows.map(r => r.id === row.id ? {...r, customerId: isC ? val : undefined, vendorId: !isC ? val : undefined} : r));
                              }}>
                                <option value="">No Party</option>
                                <optgroup label="Customers">{state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                                <optgroup label="Vendors">{state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                              </select>
                            </td>
                            <td className="py-4 px-2 text-center">
                              <select className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-black" value={row.currency} onChange={e => setJournalRows(journalRows.map(r => r.id === row.id ? {...r, currency: e.target.value as any} : r))}><option value="PKR">PKR</option><option value="SAR">SAR</option></select>
                            </td>
                            <td className="py-4 px-2 text-center">
                              <input type="number" className="w-16 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-bold text-center" value={row.roe} onChange={e => setJournalRows(journalRows.map(r => r.id === row.id ? {...r, roe: Number(e.target.value)} : r))} />
                            </td>
                            <td className="py-4 pl-4 text-right">
                              <input type="number" className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-black text-right text-emerald-600" value={row.debit || ''} onChange={e => setJournalRows(journalRows.map(r => r.id === row.id ? {...r, debit: Number(e.target.value), credit: 0} : r))} />
                            </td>
                            <td className="py-4 pl-4 text-right">
                              <input type="number" className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-black text-right text-rose-500" value={row.credit || ''} onChange={e => setJournalRows(journalRows.map(r => r.id === row.id ? {...r, credit: Number(e.target.value), debit: 0} : r))} />
                            </td>
                            <td className="py-4 pl-4 text-center">
                              <button type="button" onClick={() => setJournalRows(journalRows.filter(r => r.id !== row.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fa-solid fa-circle-xmark"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-6">
                    <button type="button" onClick={() => setJournalRows([...journalRows, { id: generateId(), accountId: '', debit: 0, credit: 0, description: '', currency: 'PKR', roe: 1 }])} className="bg-slate-50 hover:bg-slate-100 text-sky-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">+ Add New Entry Row</button>
                    <div className="flex gap-8">
                       <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Total Debit (PKR)</p><p className="text-sm font-black text-slate-900">{totals.pkrDebits.toLocaleString()}</p></div>
                       <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Total Credit (PKR)</p><p className="text-sm font-black text-slate-900">{totals.pkrCredits.toLocaleString()}</p></div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-10 border-t border-slate-50">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global JV Narration</label>
                    <textarea className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-8 text-sm font-bold text-slate-500 outline-none h-28" placeholder="Overall reason for this manual journal adjustment..." value={narration} onChange={e => setNarration(e.target.value)} />
                  </div>

                  <div className="flex justify-end pt-10">
                    <button type="submit" disabled={!totals.isBalanced} className="bg-[#0B1426] text-white px-12 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl disabled:opacity-30 hover:bg-slate-800 transition-all">COMMIT MANUAL JOURNAL</button>
                  </div>
                </div>
              )}

              {/* TICKET / HOTEL / VISA / TRANSPORT FORMS */}
              {(type === 'Ticket' || type === 'Hotel' || type === 'Visa' || type === 'Transport') && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                   <div className="lg:col-span-8 space-y-12">
                      {type === 'Ticket' && (
                        <div className="space-y-12">
                          <div className="space-y-6">
                              <div className="flex items-center gap-3"><i className="fa-solid fa-plane text-sky-500"></i><span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Passenger & Airline</span></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Pax Full Name</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="AS PER PASSPORT" value={paxName} onChange={e => setPaxName(e.target.value)} /></div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Airline Name</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" placeholder="e.g. Qatar Airways" value={airline} onChange={e => setAirline(e.target.value)} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">GDS PNR</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-black uppercase" placeholder="XJ92KP" value={gdsPnr} onChange={e => setGdsPnr(e.target.value)} /></div>
                              </div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Ticket Number (E-Ticket)</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" placeholder="157-1234567890" value={ticketNo} onChange={e => setTicketNo(e.target.value)} /></div>
                          </div>
                          <div className="space-y-6 pt-6 border-t border-slate-50">
                              <div className="flex items-center gap-3"><i className="fa-solid fa-route text-emerald-500"></i><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Route Details</span></div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Sector (From-To)</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="KHI-DOH-LHR" value={sector} onChange={e => setSector(e.target.value)} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Travel Date</label><input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={date} onChange={e => setDate(e.target.value)} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Bill to (Customer)</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold appearance-none outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}><option value="">Select Customer</option>{state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Supplier (Consolidator)</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold appearance-none outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}><option value="">Select Vendor</option>{state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                              </div>
                          </div>
                        </div>
                      )}
                      {type === 'Hotel' && (
                        <div className="space-y-12">
                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Customer (Receivable)</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}><option value="">Select Account</option>{state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Supplier (Payable)</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}><option value="">Select Vendor</option>{state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                          </div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Lead Passenger Name</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="FULL NAME AS PER PASSPORT" value={paxName} onChange={e => setPaxName(e.target.value)} /></div>
                          <div className="grid grid-cols-3 gap-6">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Hotel Property</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="TITLE OF PROPERTY" value={hotelName} onChange={e => setHotelName(e.target.value)} /></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Country</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" value="SAUDI ARABIA" readOnly /></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">City</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" value={city} onChange={e => setCity(e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 relative">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Check-In</label><input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Check-Out</label><input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
                              <div className="absolute right-4 top-1/2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{duration} Nights Stay</div>
                          </div>
                        </div>
                      )}
                      {type === 'Visa' && (
                        <div className="space-y-12">
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Passenger Full Name</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="FULL NAME AS PER PASSPORT" value={paxName} onChange={e => setPaxName(e.target.value)} /></div>
                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Passport Number</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="E.G. AB1234567" value={passportNo} onChange={e => setPassportNo(e.target.value)} /></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Processing Status</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold outline-none" value={visaStatus} onChange={e => setVisaStatus(e.target.value)}><option value="Pending">Pending</option><option value="Submitted">Submitted</option><option value="Approved">Approved</option></select></div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Destination Country</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold uppercase" placeholder="E.G. SAUDI ARABIA" value={country} onChange={e => setCountry(e.target.value)} /></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Visa Type</label><input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={visaType} onChange={e => setVisaType(e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                      {type === 'Transport' && (
                        <div className="space-y-12">
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Customer Account (Receivable)</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}><option value="">Select Account</option>{state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Transport Type</label><select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={tType} onChange={e => setTType(e.target.value)}><option value="H1">H1</option><option value="GMC">GMC</option><option value="BUS">BUS</option></select></div>
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Trip Date</label><input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold" value={date} onChange={e => setDate(e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                   </div>
                   <div className="lg:col-span-4">
                      <div className="bg-[#0B1426] text-white p-10 rounded-[2.5rem] shadow-2xl space-y-10 sticky top-8">
                        {type === 'Ticket' && (
                          <div className="space-y-8">
                             <div className="bg-[#1E293B] p-8 rounded-3xl space-y-6">
                                <div className="flex items-center gap-3"><i className="fa-solid fa-calculator text-slate-400"></i><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commercial Breakup (PKR)</span></div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500">Base Fare</label><input type="number" className="w-full bg-[#0B1426] border border-slate-700 rounded-lg p-2.5 text-xs font-black" value={baseFare} onChange={e => setBaseFare(Number(e.target.value))} /></div>
                                  <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500">Taxes</label><input type="number" className="w-full bg-[#0B1426] border border-slate-700 rounded-lg p-2.5 text-xs font-black" value={taxes} onChange={e => setTaxes(Number(e.target.value))} /></div>
                                </div>
                                <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500">Service Fee (Markup)</label><input type="number" className="w-full bg-[#0B1426] border border-slate-700 rounded-lg p-2.5 text-xs font-black text-sky-400" value={serviceFee} onChange={e => setServiceFee(Number(e.target.value))} /></div>
                                <div className="space-y-1 pt-4 border-t border-slate-700"><label className="text-[8px] font-black uppercase text-rose-500">Net Buy Cost</label><input type="number" className="w-full bg-[#0B1426] border border-rose-500/30 rounded-lg p-2.5 text-xs font-black text-rose-500" value={netBuy} onChange={e => setNetBuy(Number(e.target.value))} /></div>
                             </div>
                             <div className="space-y-2"><p className="text-[8px] font-black text-slate-500 uppercase">Gross Receivable</p><h3 className="text-3xl font-black text-emerald-400">Rs. {(Number(baseFare) + Number(taxes) + Number(serviceFee)).toLocaleString()}</h3></div>
                             <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all"><i className="fa-solid fa-check-circle"></i> CONFIRM & POST TICKET</button>
                          </div>
                        )}
                        {type === 'Hotel' && (
                          <div className="space-y-8">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[8px] font-black text-slate-500 uppercase">Sale / Night ({currency})</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-black" value={hSaleSAR} onChange={e => setHSaleSAR(Number(e.target.value))} /></div>
                                <div className="space-y-2"><label className="text-[8px] font-black text-slate-500 uppercase">Buy / Night ({currency})</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-black text-rose-400" value={hBuySAR} onChange={e => setHBuySAR(Number(e.target.value))} /></div>
                             </div>
                             <div className="space-y-2"><p className="text-[8px] font-black text-slate-500 uppercase">Gross Profit (PKR)</p><h3 className="text-3xl font-black text-emerald-400">Rs. {((hSaleSAR - hBuySAR) * roe * rooms * duration).toLocaleString()}</h3></div>
                             <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">CONFIRM & POST HOTEL</button>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              )}

            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default VoucherEntryPage;
