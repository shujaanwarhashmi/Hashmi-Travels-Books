import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { Voucher, VoucherType, VoucherEntry } from '../types';
import { generateId, formatCurrency } from '../utils/accounting';

const TRANSPORT_TYPES = ["Bus", "Coaster", "Hiace", "Car", "Van", "GMC", "SUV", "H1", "Train", "Airport Transfer"];

const SECTOR_RATES = [
  { sector: "Makkah → Jeddah", vehicle: "H1", rate: 200 },
  { sector: "Makkah → Jeddah", vehicle: "Car", rate: 150 },
  { sector: "Makkah → Madinah → Makkah", vehicle: "H1", rate: 400 },
  { sector: "Makkah → Madinah → Makkah", vehicle: "Car", rate: 350 },
  { sector: "Madinah Hotel → Madinah Airport", vehicle: "H1 / Car", rate: 100 },
];

const POPULAR_HOTELS = [
  "Makkah Clock Royal Tower (Fairmont)", "Swissotel Makkah", "Swissotel Al Maqam Makkah",
  "Pullman ZamZam Makkah", "Raffles Makkah Palace", "Hilton Suites Makkah",
  "Conrad Makkah", "Anjum Makkah Hotel", "Shaza Makkah", "Hyatt Regency Makkah Jabal Omar",
  "Jabal Omar Marriott Hotel", "Movenpick Hotel & Residence Hajar Tower",
  "Dar Al Tawhid InterContinental", "Pullman ZamZam Madina", "Anwar Al Madinah Movenpick",
  "Madinah Hilton", "Dar Al Taqwa Hotel", "Shaza Al Madina", "Frontel Al Harithia Hotel",
  "Emaar Royal Hotel", "Al Aqeeq Madinah Hotel", "Crowne Plaza Madinah", "Millennium Taiba Hotel Madinah"
];

const VoucherEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { state, addVoucher, setState } = useApp();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const cloneId = searchParams.get('cloneFrom');
  const isEdit = !!id;
  const isClone = !!cloneId;
  const targetId = id || cloneId;
  const sourceVoucher = state.vouchers.find(v => v.id === targetId);

  const [type, setType] = useState<VoucherType>(sourceVoucher?.type || 'Ticket');
  const [date, setDate] = useState(isEdit ? sourceVoucher?.date || '' : new Date().toISOString().split('T')[0]);
  
  const [voucherNo, setVoucherNo] = useState(() => {
    if (isEdit) return sourceVoucher?.voucherNo || '';
    if (isClone) return `CLONE-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    return `V-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  });
  
  const [currency, setCurrency] = useState<'SAR' | 'PKR'>(sourceVoucher?.currency || 'PKR');
  const [roe, setRoe] = useState(sourceVoucher?.roe || state.settings.defaultRoe);

  // Core Account Selection
  const [selectedCustomer, setSelectedCustomer] = useState(sourceVoucher?.entries.find(e => e.customerId)?.customerId || '');
  const [selectedVendor, setSelectedVendor] = useState(sourceVoucher?.entries.find(e => e.vendorId)?.vendorId || '');
  const [depositAccount, setDepositAccount] = useState(sourceVoucher?.entries.find(e => !e.customerId && !e.vendorId && e.debit > 0)?.accountId || 'acc-1');

  // Shared Details
  const [passenger, setPassenger] = useState(sourceVoucher?.passengerName || '');
  const [narration, setNarration] = useState(sourceVoucher?.description || '');

  // Ticket Specific
  const [airline, setAirline] = useState(sourceVoucher?.airlineName || '');
  const [gdsPnr, setGdsPnr] = useState(sourceVoucher?.gdsPnr || '');
  const [ticketNo, setTicketNo] = useState(sourceVoucher?.ticketNumber || '');
  const [sector, setSector] = useState(sourceVoucher?.route || '');
  const [baseFare, setBaseFare] = useState(sourceVoucher?.baseFare || 0);
  const [taxes, setTaxes] = useState(sourceVoucher?.taxes || 0);
  const [serviceFee, setServiceFee] = useState(sourceVoucher?.serviceFee || 0);
  const [netBuyCost, setNetBuyCost] = useState(sourceVoucher?.buyPrice || 0);

  // Visa Specific
  const [passportNo, setPassportNo] = useState(sourceVoucher?.passportNumber || '');
  const [visaType, setVisaType] = useState(sourceVoucher?.visaType || 'Visit');
  const [processingStatus, setProcessingStatus] = useState(sourceVoucher?.processingStatus || 'Pending');
  const [expiryDate, setExpiryDate] = useState(sourceVoucher?.expiryDate || '');
  const [country, setCountry] = useState(sourceVoucher?.country || '');
  
  // Hotel & Transport Details
  const [hotel, setHotel] = useState(sourceVoucher?.hotelProperty || '');
  const [hotelCountry, setHotelCountry] = useState(sourceVoucher?.country || 'SAUDI ARABIA');
  const [hotelCity, setHotelCity] = useState(sourceVoucher?.city || 'MAKKAH');
  const [checkIn, setCheckIn] = useState(sourceVoucher?.checkIn || new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(sourceVoucher?.checkOut || '');
  const [rooms, setRooms] = useState(sourceVoucher?.rooms || 1);
  const [roomBasis, setRoomBasis] = useState(sourceVoucher?.roomBasis || 'TRIPLE');
  
  // Hotel Special Fields
  const [mealPlan, setMealPlan] = useState(sourceVoucher?.mealPlan || 'Room Only');
  const [adults, setAdults] = useState(sourceVoucher?.adults || 2);
  const [children, setChildren] = useState(sourceVoucher?.children || 0);

  const [quantity, setQuantity] = useState(sourceVoucher?.quantity || 1);
  const [route, setRoute] = useState(sourceVoucher?.route || '');
  const [transportType, setTransportType] = useState(sourceVoucher?.transportType || 'H1');
  const [vehicleNo, setVehicleNo] = useState(sourceVoucher?.vehicleNo || '');
  const [driverName, setDriverName] = useState(sourceVoucher?.driverName || '');

  // Commercials
  const [saleRate, setSaleRate] = useState(sourceVoucher?.salePrice || 0);
  const [buyRate, setBuyRate] = useState(sourceVoucher?.buyPrice || 0);
  const [receiptAmount, setReceiptAmount] = useState(sourceVoucher?.totalAmount || 0);
  const [sourceEntityType, setSourceEntityType] = useState<'Customers' | 'Vendors'>(sourceVoucher?.entries.some(e => e.vendorId) ? 'Vendors' : 'Customers');

  const duration = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24));
    return days > 0 ? days : 1;
  }, [checkIn, checkOut]);

  const currencyMultiplier = currency === 'SAR' ? roe : 1;
  
  // Logic Calculations
  const hotelTotalSalePKR = saleRate * rooms * duration * currencyMultiplier;
  const hotelTotalBuyPKR = buyRate * rooms * duration * currencyMultiplier;
  const hotelProfitPKR = hotelTotalSalePKR - hotelTotalBuyPKR;

  const transportTotalSalePKR = saleRate * quantity * currencyMultiplier;
  const transportTotalBuyPKR = buyRate * quantity * currencyMultiplier;
  const transportProfitPKR = transportTotalSalePKR - transportTotalBuyPKR;

  const ticketTotalSalePKR = (baseFare + taxes + serviceFee) * currencyMultiplier;
  const ticketTotalBuyPKR = netBuyCost * currencyMultiplier;
  const ticketProfitPKR = ticketTotalSalePKR - ticketTotalBuyPKR;

  const visaTotalSalePKR = saleRate * currencyMultiplier;
  const visaTotalBuyPKR = buyRate * currencyMultiplier;
  const visaProfitPKR = visaTotalSalePKR - visaTotalBuyPKR;

  const receiptTotalPKR = receiptAmount * currencyMultiplier;

  // Auto-suggest rate based on Sector selection
  useEffect(() => {
    if (type === 'Transport' && currency === 'SAR') {
        const match = SECTOR_RATES.find(s => s.sector === route && (s.vehicle.includes(transportType) || transportType.includes(s.vehicle)));
        if (match) setSaleRate(match.rate);
    }
  }, [route, transportType, type, currency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!voucherNo.trim()) return alert("Voucher Reference is mandatory.");
    const isDuplicate = state.vouchers.some(v => v.voucherNo.toLowerCase() === voucherNo.toLowerCase() && v.id !== id);
    if (isDuplicate) {
      alert(`Voucher Reference "${voucherNo}" already exists.`);
      return;
    }

    let entries: VoucherEntry[] = [];
    let finalAmount = 0;
    let description = narration;

    if (type === 'Hotel') {
      if (!selectedCustomer) return alert("Please select a customer.");
      finalAmount = hotelTotalSalePKR;
      description = `Hotel: ${hotel} - ${passenger} (${rooms} R x ${duration} N)`;
      entries = [
        { id: generateId(), accountId: 'acc-3', debit: hotelTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: hotelTotalBuyPKR, vendorId: selectedVendor || undefined, description: `Hotel Cost: ${hotel}` },
        { id: generateId(), accountId: 'acc-7', debit: 0, credit: hotelProfitPKR, description: `Hotel Margin: ${hotel}` }
      ];
    } else if (type === 'Transport') {
      if (!selectedCustomer) return alert("Please select a customer.");
      finalAmount = transportTotalSalePKR;
      description = `Transport: ${transportType} - ${route}`;
      entries = [
        { id: generateId(), accountId: 'acc-3', debit: transportTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: transportTotalBuyPKR, vendorId: selectedVendor || undefined, description: `Transport Cost: ${transportType}` },
        { id: generateId(), accountId: 'acc-6', debit: 0, credit: transportProfitPKR, description: `Transport Margin: ${route}` }
      ];
    } else if (type === 'Ticket') {
      if (!selectedCustomer) return alert("Please select a customer.");
      finalAmount = ticketTotalSalePKR;
      description = `Ticket: ${airline} - ${passenger} (${ticketNo})`;
      entries = [
        { id: generateId(), accountId: 'acc-3', debit: ticketTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: ticketTotalBuyPKR, vendorId: selectedVendor || undefined, description: `Ticket Net Cost` },
        { id: generateId(), accountId: 'acc-11', debit: 0, credit: ticketProfitPKR, description: `Ticket Margin` }
      ];
    } else if (type === 'Visa') {
      if (!selectedCustomer) return alert("Please select a customer.");
      finalAmount = visaTotalSalePKR;
      description = `Visa: ${visaType} (${country}) - ${passenger}`;
      entries = [
        { id: generateId(), accountId: 'acc-3', debit: visaTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: visaTotalBuyPKR, vendorId: selectedVendor || undefined, description: `Visa Net Cost` },
        { id: generateId(), accountId: 'acc-12', debit: 0, credit: visaProfitPKR, description: `Visa Case Margin` }
      ];
    } else if (type === 'Receipt') {
      const activeId = sourceEntityType === 'Customers' ? selectedCustomer : selectedVendor;
      if (!activeId) return alert("Please select a source account.");
      finalAmount = receiptTotalPKR;
      entries = [
        { id: generateId(), accountId: depositAccount, debit: receiptTotalPKR, credit: 0, description: narration },
        { id: generateId(), accountId: sourceEntityType === 'Customers' ? 'acc-3' : 'acc-5', debit: 0, credit: receiptTotalPKR, customerId: sourceEntityType === 'Customers' ? activeId : undefined, vendorId: sourceEntityType === 'Vendors' ? activeId : undefined, description: narration }
      ];
    }

    const voucher: Voucher = {
      id: isEdit ? id! : generateId(),
      voucherNo, date, type, currency, roe, status: 'Posted', createdAt: new Date().toISOString(),
      description, totalAmount: finalAmount, entries,
      passengerName: passenger, hotelProperty: hotel, country: type === 'Visa' ? country : hotelCountry, city: hotelCity,
      checkIn, checkOut, rooms, roomBasis,
      mealPlan, adults, children,
      transportType, route: type === 'Ticket' ? sector : route, vehicleNo, driverName, quantity,
      salePrice: type === 'Receipt' ? receiptAmount : (type === 'Ticket' ? (baseFare + taxes + serviceFee) : saleRate),
      buyPrice: type === 'Ticket' ? netBuyCost : buyRate,
      airlineName: airline, gdsPnr, ticketNumber: ticketNo, baseFare, taxes, serviceFee,
      passportNumber: passportNo, visaType, processingStatus, expiryDate
    };

    if (isEdit) {
      setState(prev => ({ ...prev, vouchers: prev.vouchers.map(v => v.id === id ? voucher : v) }));
    } else {
      addVoucher(voucher);
    }
    navigate('/vouchers');
  };

  const renderTicketForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-12">
        <div className="space-y-8">
            <div className="flex items-center gap-3 text-sky-500">
               <i className="fa-solid fa-plane-up text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Passenger & Airline</h3>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pax Full Name</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="As per Passport" value={passenger} onChange={e => setPassenger(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Airline Name</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="e.g. Qatar Airways" value={airline} onChange={e => setAirline(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GDS PNR</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="XJ92KP" value={gdsPnr} onChange={e => setGdsPnr(e.target.value)} />
               </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Number (E-Ticket)</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="157-1234567890" value={ticketNo} onChange={e => setTicketNo(e.target.value)} />
            </div>
        </div>

        <div className="space-y-8">
            <div className="flex items-center gap-3 text-emerald-500">
               <i className="fa-solid fa-route text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Route Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector (From-To)</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="KHI-DOH-LHR" value={sector} onChange={e => setSector(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel Date</label>
                 <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={date} onChange={e => setDate(e.target.value)} />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill To (Customer)</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier (Consolidator)</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                    <option value="">Select Vendor</option>
                    {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
               </div>
            </div>
        </div>
      </div>

      <div className="col-span-4 space-y-10">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-8 shadow-sm">
           <div className="flex items-center gap-3 text-slate-500">
             <i className="fa-solid fa-calculator text-sm"></i>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Commercial Breakup ({currency})</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Fare</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={baseFare} onChange={e => setBaseFare(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxes</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={taxes} onChange={e => setTaxes(Number(e.target.value))} />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service Fee (Markup)</label>
              <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none text-sky-600" value={serviceFee} onChange={e => setServiceFee(Number(e.target.value))} />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Buy Cost</label>
              <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none text-rose-500" value={netBuyCost} onChange={e => setNetBuyCost(Number(e.target.value))} />
           </div>
        </div>

        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden">
           <div className="space-y-10 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Receivable</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-400 tracking-tighter">Rs. {Math.round(ticketTotalSalePKR).toLocaleString()}</span>
                 </div>
              </div>
              <div className="space-y-1 pt-6 border-t border-slate-800">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supplier Payable</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-400 tracking-tighter">Rs. {Math.round(ticketTotalBuyPKR).toLocaleString()}</span>
                 </div>
              </div>
              <div className="pt-10 border-t border-slate-800">
                 <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Ticket Profit Margin</p>
                 <h2 className="text-5xl font-black tracking-tighter">Rs. {Math.round(ticketProfitPKR).toLocaleString()}</h2>
              </div>
           </div>
           <button type="submit" onClick={handleSubmit} className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl mt-10">
             <i className="fa-solid fa-save"></i> Confirm & Post Ticket
           </button>
        </div>
      </div>
    </div>
  );

  const renderVisaForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-12">
        <div className="space-y-8">
            <div className="flex items-center gap-3 text-purple-500">
               <i className="fa-solid fa-passport text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Case Identity</h3>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Passenger Full Name</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="Full name as per passport" value={passenger} onChange={e => setPassenger(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passport Number</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="e.g. AB1234567" value={passportNo} onChange={e => setPassportNo(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Status</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={processingStatus} onChange={e => setProcessingStatus(e.target.value)}>
                    <option>Pending</option><option>In Process</option><option>Submitted</option><option>Approved</option><option>Rejected</option>
                 </select>
               </div>
            </div>
        </div>

        <div className="space-y-8">
            <div className="flex items-center gap-3 text-purple-600">
               <i className="fa-solid fa-earth-asia text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Destination & Timeline</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Country</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" placeholder="e.g. Saudi Arabia, UAE" value={country} onChange={e => setCountry(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visa Type</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="Visit" value={visaType} onChange={e => setVisaType(e.target.value)} />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission Date</label>
                 <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold" value={date} onChange={e => setDate(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date (Optional)</label>
                 <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit (Customer)</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit (Vendor/Supplier)</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                    <option value="">Select Vendor</option>
                    {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
               </div>
            </div>
        </div>
      </div>

      <div className="col-span-4 space-y-10">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-8 shadow-sm">
           <div className="flex items-center gap-3 text-purple-500">
             <i className="fa-solid fa-file-invoice-dollar text-sm"></i>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Ledger Values ({currency})</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Sale Price</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={saleRate} onChange={e => setSaleRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplier Net Cost</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
              </div>
           </div>
        </div>

        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden">
           <div className="space-y-10 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Functional Sale</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-400 tracking-tighter">Rs. {Math.round(visaTotalSalePKR).toLocaleString()}</span>
                 </div>
              </div>
              <div className="space-y-1 pt-6 border-t border-slate-800">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Functional Buy Cost</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-400 tracking-tighter">Rs. {Math.round(visaTotalBuyPKR).toLocaleString()}</span>
                 </div>
              </div>
              <div className="pt-10 border-t border-slate-800">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Visa Case Profit</p>
                 <h2 className="text-5xl font-black tracking-tighter">Rs. {Math.round(visaProfitPKR).toLocaleString()}</h2>
              </div>
           </div>
           <button type="submit" onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl mt-10">
             <i className="fa-solid fa-stamp"></i> Confirm & Post Visa
           </button>
        </div>
      </div>
    </div>
  );

  const renderHotelForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-300 dark:text-slate-600">
            <i className="fa-solid fa-building-columns text-sm"></i>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Core Ledger Links</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer (Receivable)</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">Select Account</option>
                {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Supplier (Payable)</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                <option value="">Select Vendor</option>
                {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-300 dark:text-slate-600">
            <i className="fa-solid fa-users-viewfinder text-sm"></i>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Guest & Stay Information</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lead Passenger Name</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase dark:text-slate-200" placeholder="Full Name as per Passport" value={passenger} onChange={e => setPassenger(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hotel Property</label>
                <input list="hlist" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase dark:text-slate-200" placeholder="Title of Property" value={hotel} onChange={e => setHotel(e.target.value)} />
                <datalist id="hlist">{POPULAR_HOTELS.map(h => <option key={h} value={h} />)}</datalist>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Country</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase dark:text-slate-200" value={hotelCountry} onChange={e => setHotelCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">City</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase dark:text-slate-200" value={hotelCity} onChange={e => setHotelCity(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Check-In</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold dark:text-slate-200" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Check-Out</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold dark:text-slate-200" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                   {duration} Nights Stay
                </div>
              </div>
            </div>

            {/* DATA INSET BOX - DARK THEME */}
            <div className="bg-[#2D2D2D] rounded-xl p-6 grid grid-cols-3 gap-6 items-end shadow-inner border border-[#3D3D3D]">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Meal Plan:</label>
                  <select 
                    className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-800 outline-none appearance-none" 
                    value={mealPlan} 
                    onChange={e => setMealPlan(e.target.value)}
                  >
                     <option>Room Only</option>
                     <option>Breakfast</option>
                     <option>Lunch</option>
                     <option>Dinner</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Adults</label>
                  <input 
                    type="number"
                    className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-800 outline-none" 
                    value={adults} 
                    onChange={e => setAdults(Number(e.target.value))} 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Childs</label>
                  <input 
                    type="number"
                    className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-800 outline-none" 
                    value={children} 
                    onChange={e => setChildren(Number(e.target.value))} 
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rooms Count</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold dark:text-slate-200" value={rooms} onChange={e => setRooms(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Room Basis</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold dark:text-slate-200" value={roomBasis} onChange={e => setRoomBasis(e.target.value)}>
                  <option>TRIPLE</option><option>DOUBLE</option><option>SINGLE</option><option>QUAD</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-4 space-y-8">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden">
          <div className="space-y-10 relative z-10">
            <h4 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.2em]">Functional Financial Impacts</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sale / Night ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={saleRate} onChange={e => setSaleRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Buy / Night ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Profit (PKR)</span>
                <span className="text-2xl font-black text-emerald-400">Rs. {Math.round(hotelProfitPKR).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Customer Impact</p>
                  <p className="text-xs font-black">Rs. {Math.round(hotelTotalSalePKR).toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Vendor Impact</p>
                  <p className="text-xs font-black">Rs. {Math.round(hotelTotalBuyPKR).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <button type="submit" onClick={handleSubmit} className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl">
             <i className="fa-solid fa-sync"></i> Confirm & Post to Ledger
          </button>
        </div>
      </div>
    </div>
  );

  const renderTransportForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-10">
        <div className="space-y-8">
            <div className="flex items-center gap-3 text-emerald-500">
               <i className="fa-solid fa-user-check text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Service Information</h3>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Customer Account (Receivable)</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 transition-all appearance-none"
                value={selectedCustomer}
                onChange={e => setSelectedCustomer(e.target.value)}
                required
              >
                <option value="">Select Customer Account</option>
                {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Transport Type</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none dark:text-slate-200" value={transportType} onChange={e => setTransportType(e.target.value)}>
                   {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Trip Date</label>
                <div className="relative">
                  <i className="fa-solid fa-calendar-check absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold dark:text-slate-200" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Route (From - To)</label>
              <div className="relative">
                <i className="fa-solid fa-map-location-dot absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  list="sectors"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold uppercase outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 transition-all dark:text-slate-200" 
                  placeholder="e.g. Airport to Hotel, Makkah to Madinah..." 
                  value={route} 
                  onChange={e => setRoute(e.target.value)} 
                />
                <datalist id="sectors">
                   {SECTOR_RATES.map((s, i) => <option key={i} value={s.sector} />)}
                </datalist>
              </div>
            </div>
        </div>

        <div className="space-y-8">
            <div className="flex items-center gap-3 text-sky-500">
               <i className="fa-solid fa-hashtag text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Vehicle & Driver</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Vehicle No</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none dark:text-slate-200" placeholder="Plate Number" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Driver Name</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none dark:text-slate-200" placeholder="Full Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Trip Narration</label>
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none h-28 resize-none dark:text-slate-200" 
                placeholder="Add additional details about this service..." 
                value={narration} 
                onChange={e => setNarration(e.target.value)}
              />
            </div>
        </div>

        <div className="space-y-8 pt-8 border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-3 text-rose-500">
                <i className="fa-solid fa-cart-shopping text-sm"></i>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Procurement (Buy Cost)</h3>
             </div>
             <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Vendor Account (Payable)</label>
                 <select 
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none"
                   value={selectedVendor}
                   onChange={e => setSelectedVendor(e.target.value)}
                 >
                   <option value="">Select Vendor Partner</option>
                   {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Cost Rate (Per {currency})</label>
                 <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none dark:text-slate-200" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
               </div>
             </div>
        </div>
      </div>

      <div className="col-span-4 space-y-8">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden group">
           <div className="space-y-10 relative z-10">
              <div className="flex justify-between items-start opacity-60">
                 <span className="text-[10px] font-black uppercase tracking-widest">Total ({currency})</span>
                 <span className="text-xl font-black">{ (quantity * saleRate).toLocaleString() } {currency}</span>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Functional Amount</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tighter">Rs. {Math.round(transportTotalSalePKR).toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-500">PKR</span>
                 </div>
              </div>
              <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Margin (PKR)</span>
                 <span className={`text-xl font-black ${transportProfitPKR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Rs. {Math.round(transportProfitPKR).toLocaleString()}
                 </span>
              </div>
           </div>
           <button type="submit" onClick={handleSubmit} className="bg-emerald-500 hover:bg-emerald-400 text-[#0B1120] font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl">
             <i className="fa-solid fa-file-signature text-sm"></i> Post Bill to Ledger
           </button>
        </div>
      </div>
    </div>
  );

  const renderReceiptForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-12">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Source Entity Type</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 max-w-md">
            <button type="button" onClick={() => setSourceEntityType('Customers')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sourceEntityType === 'Customers' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-400'}`}>Customers</button>
            <button type="button" onClick={() => setSourceEntityType('Vendors')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sourceEntityType === 'Vendors' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-400'}`}>Vendors</button>
          </div>
        </div>

        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Select {sourceEntityType.slice(0, -1)} Account</label>
           <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none appearance-none" value={sourceEntityType === 'Customers' ? selectedCustomer : selectedVendor} onChange={e => sourceEntityType === 'Customers' ? setSelectedCustomer(e.target.value) : setSelectedVendor(e.target.value)}>
             <option value="">Choose Ledger Account...</option>
             {(sourceEntityType === 'Customers' ? state.customers : state.vendors).map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
           </select>
        </div>

        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Deposit Into (Bank/Cash)</label>
           <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none appearance-none" value={depositAccount} onChange={e => setDepositAccount(e.target.value)}>
             {state.accounts.filter(a => a.type === 'Cash' || a.type === 'Bank' || a.id === 'acc-1' || a.id === 'acc-2').map(acc => <option key={acc.id} value={acc.id}>{acc.title}</option>)}
           </select>
        </div>

        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Transaction Narration</label>
           <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 text-sm font-bold outline-none h-32 resize-none dark:text-slate-200" placeholder="Payment details, Cheque #, or reference..." value={narration} onChange={e => setNarration(e.target.value)} />
        </div>
      </div>

      <div className="col-span-4">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden">
          <div className="space-y-10 relative z-10">
            <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Amount ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={receiptAmount} onChange={e => setReceiptAmount(Number(e.target.value))} />
            </div>

            <div className="text-center pt-10 border-t border-slate-800 space-y-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Impact on Party Ledger (PKR)</span>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400"><i className="fa-solid fa-wallet text-2xl"></i></div>
                <h3 className="text-4xl font-black">Rs. {Math.round(receiptTotalPKR).toLocaleString()}</h3>
              </div>
              <p className="text-[9px] italic text-slate-400">* BALANCE WILL BE REDUCED (CREDITED) BY THIS AMOUNT.</p>
            </div>
          </div>

          <button type="submit" onClick={handleSubmit} className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl">
            <i className="fa-solid fa-save"></i> Save & Post Receipt
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Universal Form Header */}
      <div className="bg-[#0B1120] rounded-t-3xl p-8 text-white flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <i className="fa-solid fa-arrow-left text-xs"></i>
           </button>
           <div>
              <div className="flex items-center gap-3 mb-1">
                 <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                    <i className={`fa-solid ${
                      type === 'Hotel' ? 'fa-hotel' : 
                      (type === 'Receipt' ? 'fa-receipt' : 
                      (type === 'Ticket' ? 'fa-plane' :
                      (type === 'Visa' ? 'fa-passport' : 'fa-bus-simple')))
                    } text-xl`}></i>
                 </div>
                 <h1 className="text-2xl font-black uppercase tracking-tighter">
                   {isClone ? 'CLONE ' : (isEdit ? 'EDIT ' : 'NEW ')}
                   {type === 'Ticket' ? 'TICKET ENTRY' : (type === 'Visa' ? 'VISA CASE' : type.toUpperCase())}
                 </h1>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-13">
                 {isClone ? 'DUPLICATING RECORD - UPDATE DETAILS' : (type === 'Ticket' ? 'Air Ticketing Repository Core' : (type === 'Visa' ? 'Visa Processing & Compliance Core' : 'Financial Ledger Module'))}
              </p>
           </div>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-6">
           <div className="flex bg-slate-800 p-1 rounded-xl">
              <button type="button" onClick={() => setType('Receipt')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all ${type === 'Receipt' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>Receipt</button>
              <button type="button" onClick={() => setType('Ticket')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all ${type === 'Ticket' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>Ticket</button>
              <button type="button" onClick={() => setType('Visa')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all ${type === 'Visa' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>Visa</button>
              <button type="button" onClick={() => setType('Hotel')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all ${type === 'Hotel' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>Hotel</button>
              <button type="button" onClick={() => setType('Transport')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all ${type === 'Transport' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>Transport</button>
           </div>

           <div className="bg-[#151B2B] p-2 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-2">
              <div className="flex bg-[#0B1120] rounded-xl p-1">
                 <button type="button" onClick={() => setCurrency('PKR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currency === 'PKR' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>PKR</button>
                 <button type="button" onClick={() => setCurrency('SAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currency === 'SAR' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>SAR</button>
              </div>
              {currency === 'SAR' && (
                <div className="flex flex-col gap-0.5 px-2">
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">ROE</span>
                  <input type="number" step="0.1" className="bg-transparent text-xs font-black text-white w-14 outline-none border-b border-slate-700" value={roe} onChange={e => setRoe(Number(e.target.value))} />
                </div>
              )}
           </div>

           <div className="bg-[#151B2B] p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Voucher Ref</p>
                <input type="text" className="bg-transparent text-sm font-black outline-none text-white tracking-widest uppercase w-32" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} />
              </div>
           </div>

           <div className="bg-[#151B2B] p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Entry Date</p>
                <input type="date" className="bg-transparent text-sm font-bold outline-none text-slate-200 cursor-pointer" value={date} onChange={e => setDate(e.target.value)} />
              </div>
           </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-12 rounded-b-3xl shadow-2xl border-x border-b border-slate-100 dark:border-slate-800">
        {type === 'Receipt' ? renderReceiptForm() : 
         (type === 'Hotel' ? renderHotelForm() : 
         (type === 'Ticket' ? renderTicketForm() :
         (type === 'Visa' ? renderVisaForm() : renderTransportForm())))}
      </form>
    </div>
  );
};

export default VoucherEntryPage;