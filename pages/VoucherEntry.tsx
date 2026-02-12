
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { Voucher, VoucherType, VoucherEntry } from '../types';
import { generateId } from '../utils/accounting';

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
  const { state, addVoucher } = useApp();
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

  const [selectedCustomer, setSelectedCustomer] = useState(sourceVoucher?.entries.find(e => e.customerId)?.customerId || '');
  const [selectedVendor, setSelectedVendor] = useState(sourceVoucher?.entries.find(e => e.vendorId)?.vendorId || '');
  const [depositAccount, setDepositAccount] = useState(sourceVoucher?.entries.find(e => !e.customerId && !e.vendorId && e.debit > 0)?.accountId || 'acc-1');

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
  
  const [mealPlan, setMealPlan] = useState(sourceVoucher?.mealPlan || 'Room Only');
  const [adults, setAdults] = useState(sourceVoucher?.adults || 2);
  const [children, setChildren] = useState(sourceVoucher?.children || 0);

  const [quantity, setQuantity] = useState(sourceVoucher?.quantity || 1);
  const [route, setRoute] = useState(sourceVoucher?.route || '');
  const [transportType, setTransportType] = useState(sourceVoucher?.transportType || 'H1');
  const [vehicleNo, setVehicleNo] = useState(sourceVoucher?.vehicleNo || '');
  const [driverName, setDriverName] = useState(sourceVoucher?.driverName || '');

  const [saleRate, setSaleRate] = useState(sourceVoucher?.salePrice || 0);
  const [buyRate, setBuyRate] = useState(sourceVoucher?.buyPrice || 0);
  const [receiptAmount, setReceiptAmount] = useState(sourceVoucher?.totalAmount || 0);
  const [sourceEntityType, setSourceEntityType] = useState<'Customers' | 'Vendors'>(sourceVoucher?.entries.some(e => e.vendorId) ? 'Vendors' : 'Customers');

  const duration = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24));
    return days > 0 ? days : 1;
  }, [checkIn, checkOut]);

  const activeRoe = currency === 'PKR' ? 1 : roe;
  const currencyMultiplier = activeRoe;
  
  const hotelTotalSalePKR = saleRate * rooms * duration * currencyMultiplier;
  const hotelTotalBuyPKR = buyRate * rooms * duration * currencyMultiplier;
  const hotelProfitPKR = hotelTotalSalePKR - hotelTotalBuyPKR;

  const transportTotalSalePKR = saleRate * quantity * currencyMultiplier;
  const transportTotalBuyPKR = buyRate * quantity * currencyMultiplier;

  const ticketTotalSalePKR = (baseFare + taxes + serviceFee) * currencyMultiplier;
  const ticketTotalBuyPKR = netBuyCost * currencyMultiplier;
  const ticketProfitPKR = ticketTotalSalePKR - ticketTotalBuyPKR;

  const visaTotalSalePKR = saleRate * currencyMultiplier;
  const visaTotalBuyPKR = buyRate * currencyMultiplier;
  const visaProfitPKR = visaTotalSalePKR - visaTotalBuyPKR;

  const receiptTotalPKR = receiptAmount * currencyMultiplier;

  useEffect(() => {
    if (type === 'Transport' && currency === 'SAR') {
        const match = SECTOR_RATES.find(s => s.sector === route && (s.vehicle.includes(transportType) || transportType.includes(s.vehicle)));
        if (match) setSaleRate(match.rate);
    }
  }, [route, transportType, type, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voucherNo.trim()) return alert("Voucher Reference is mandatory.");

    let entries: VoucherEntry[] = [];
    let finalAmount = 0;
    let description = narration;

    if (type !== 'Receipt') {
        if (!selectedCustomer) return alert("CUSTOMER SELECTION IS REQUIRED.");
        if (!selectedVendor) return alert("VENDOR / SUPPLIER SELECTION IS REQUIRED.");
    }

    if (type === 'Hotel') {
      finalAmount = hotelTotalSalePKR;
    } else if (type === 'Transport') {
      finalAmount = transportTotalSalePKR;
    } else if (type === 'Ticket') {
      finalAmount = ticketTotalSalePKR;
    } else if (type === 'Visa') {
      finalAmount = visaTotalSalePKR;
    } else if (type === 'Receipt') {
      finalAmount = receiptTotalPKR;
    }

    const voucher: Voucher = {
      id: isEdit ? id! : generateId(),
      voucherNo, date, type, currency, 
      roe: Number(activeRoe || 1), 
      status: 'Posted', createdAt: new Date().toISOString(),
      description, totalAmount: finalAmount, entries: [],
      passengerName: passenger, hotelProperty: hotel, country: type === 'Visa' ? country : hotelCountry, city: hotelCity,
      checkIn, checkOut, rooms, roomBasis,
      mealPlan, adults, children,
      transportType, route: type === 'Ticket' ? sector : route, vehicleNo, driverName, quantity: Number(quantity || 1),
      salePrice: type === 'Receipt' ? receiptAmount : (type === 'Ticket' ? (baseFare + taxes + serviceFee) : saleRate),
      buyPrice: type === 'Transport' ? buyRate : (type === 'Ticket' ? netBuyCost : buyRate),
      airlineName: airline, gdsPnr, ticketNumber: ticketNo, baseFare, taxes, serviceFee,
      passportNumber: passportNo, visaType, processingStatus, expiryDate
    };

    // Prepare entries to help frontend display and trigger correct accounting
    if (type === 'Hotel') {
      voucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: hotelTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: hotelTotalBuyPKR, vendorId: selectedVendor, description }
      ];
    } else if (type === 'Transport') {
       voucher.entries = [
        { id: generateId(), accountId: 'acc-3', debit: transportTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
        { id: generateId(), accountId: 'acc-5', debit: 0, credit: transportTotalBuyPKR, vendorId: selectedVendor, description }
      ];
    } else if (type === 'Ticket') {
        voucher.entries = [
         { id: generateId(), accountId: 'acc-3', debit: ticketTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
         { id: generateId(), accountId: 'acc-5', debit: 0, credit: ticketTotalBuyPKR, vendorId: selectedVendor, description }
       ];
    } else if (type === 'Visa') {
        voucher.entries = [
         { id: generateId(), accountId: 'acc-3', debit: visaTotalSalePKR, credit: 0, customerId: selectedCustomer, description },
         { id: generateId(), accountId: 'acc-5', debit: 0, credit: visaTotalBuyPKR, vendorId: selectedVendor, description }
       ];
    } else if (type === 'Receipt') {
       voucher.entries = [
        { id: generateId(), accountId: depositAccount, debit: receiptTotalPKR, credit: 0, description: narration },
        { id: generateId(), accountId: sourceEntityType === 'Customers' ? 'acc-3' : 'acc-5', debit: 0, credit: receiptTotalPKR, customerId: sourceEntityType === 'Customers' ? (selectedCustomer || undefined) : undefined, vendorId: sourceEntityType === 'Vendors' ? (selectedVendor || undefined) : undefined, description: narration }
      ];
    }

    await addVoucher(voucher);
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
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill To (Customer) <span className="text-rose-500 font-black">*</span></label>
                 <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier (Consolidator) <span className="text-rose-500 font-black">*</span></label>
                 <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-rose-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
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
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={baseFare} onChange={e => setBaseFare(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxes</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={taxes} onChange={e => setTaxes(Number(e.target.value))} />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service Fee (Markup)</label>
              <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={serviceFee} onChange={e => setServiceFee(Number(e.target.value))} />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Buy Cost</label>
              <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={netBuyCost} onChange={e => setNetBuyCost(Number(e.target.value))} />
           </div>
        </div>

        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden">
           <div className="space-y-10 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Receivable</p>
                 <span className="text-4xl font-black text-emerald-400 tracking-tighter">Rs. {Math.round(ticketTotalSalePKR).toLocaleString()}</span>
              </div>
              <div className="pt-10 border-t border-slate-800">
                 <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Ticket Profit Margin</p>
                 <h2 className="text-5xl font-black tracking-tighter">Rs. {Math.round(ticketProfitPKR).toLocaleString()}</h2>
              </div>
           </div>
           <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 transition-all relative z-10 shadow-xl mt-10">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pax Full Name</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" value={passenger} onChange={e => setPassenger(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passport Number</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none" value={passportNo} onChange={e => setPassportNo(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Status</label>
                 <select className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={processingStatus} onChange={e => setProcessingStatus(e.target.value)}>
                    <option>Pending</option><option>In Process</option><option>Submitted</option><option>Approved</option>
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
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={country} onChange={e => setCountry(e.target.value)} />
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visa Type</label>
                 <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold" value={visaType} onChange={e => setVisaType(e.target.value)} />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit (Customer) *</label>
                 <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl px-6 py-4 text-sm font-bold" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit (Vendor/Supplier) *</label>
                 <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-rose-500/20 rounded-2xl px-6 py-4 text-sm font-bold" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
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
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={saleRate} onChange={e => setSaleRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplier Net Cost</label>
                 <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm font-bold" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
              </div>
           </div>
        </div>

        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden">
           <div className="space-y-10 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Functional Sale</p>
                 <span className="text-4xl font-black text-emerald-400">Rs. {Math.round(visaTotalSalePKR).toLocaleString()}</span>
              </div>
              <div className="pt-10 border-t border-slate-800 text-center">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Visa Case Profit</p>
                 <h2 className="text-5xl font-black tracking-tighter">Rs. {Math.round(visaProfitPKR).toLocaleString()}</h2>
              </div>
           </div>
           <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl w-full flex items-center justify-center gap-3 mt-10 shadow-xl">
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
          <div className="flex items-center gap-3 text-slate-600">
            <i className="fa-solid fa-building-columns text-sm"></i>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Core Ledger Links</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer (Receivable) *</label>
              <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl px-6 py-4 text-sm font-bold" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">Select Account</option>
                {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier (Payable) *</label>
              <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-rose-500/20 rounded-2xl px-6 py-4 text-sm font-bold" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                <option value="">Select Vendor</option>
                {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-600">
            <i className="fa-solid fa-users-viewfinder text-sm"></i>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Guest & Stay Information</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Passenger Name</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={passenger} onChange={e => setPassenger(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hotel Property</label>
                <input list="hlist" className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={hotel} onChange={e => setHotel(e.target.value)} />
                <datalist id="hlist">{POPULAR_HOTELS.map(h => <option key={h} value={h} />)}</datalist>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={hotelCountry} onChange={e => setHotelCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={hotelCity} onChange={e => setHotelCity(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-In</label>
                <input type="date" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-Out</label>
                <input type="date" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                   {duration} Nights Stay
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rooms Count</label>
                <input type="number" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={rooms} onChange={e => setRooms(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Basis</label>
                <select className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={roomBasis} onChange={e => setRoomBasis(e.target.value)}>
                  <option>TRIPLE</option><option>DOUBLE</option><option>SINGLE</option><option>QUAD</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Additional Details</label>
              <textarea className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold h-24" placeholder="Any special instructions or remarks..." value={narration} onChange={e => setNarration(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-4 space-y-8">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden">
          <div className="space-y-10 relative z-10">
            <h4 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.2em]">Financial Impacts</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sale / Night ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" value={saleRate} onChange={e => setSaleRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Buy / Night ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Profit (PKR)</span>
                <span className="text-2xl font-black text-emerald-400">Rs. {Math.round(hotelProfitPKR).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase py-5 rounded-2xl w-full shadow-xl">
             <i className="fa-solid fa-sync mr-2"></i> Confirm & Post
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
               <i className="fa-solid fa-bus text-sm"></i>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Transport Details</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Customer (Receivable) *</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} required>
                  <option value="">Select Customer Account</option>
                  {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vendor (Payable) *</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-rose-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} required>
                  <option value="">Select Service Provider</option>
                  {state.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vehicle Type</label>
                <select className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={transportType} onChange={e => setTransportType(e.target.value)}>
                   {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trip Date</label>
                <input type="date" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Route</label>
              <input list="sectors" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold uppercase" value={route} onChange={e => setRoute(e.target.value)} />
              <datalist id="sectors">{SECTOR_RATES.map((s, i) => <option key={i} value={s.sector} />)}</datalist>
            </div>
            
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sale Rate ({currency})</label>
                <input type="number" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={saleRate} onChange={e => setSaleRate(Number(e.target.value))} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Buy Rate ({currency})</label>
                <input type="number" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={buyRate} onChange={e => setBuyRate(Number(e.target.value))} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantity</label>
                <input type="number" min="1" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trip / Voucher Details</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-bold h-32 outline-none focus:border-sky-500 transition-all" 
                placeholder="Enter specific trip details, driver notes, or additional services here..." 
                value={narration} 
                onChange={e => setNarration(e.target.value)} 
              />
              <p className="text-[9px] text-slate-400 font-bold italic">* This content will be printed on the invoice and saved in the ledger.</p>
            </div>
        </div>
      </div>

      <div className="col-span-4 space-y-8">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[400px] shadow-2xl relative overflow-hidden">
           <div className="space-y-10 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Customer Total (PKR)</p>
                 <span className="text-4xl font-black tracking-tighter">Rs. {Math.round(transportTotalSalePKR).toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Supplier Total (PKR)</p>
                 <span className="text-2xl font-black tracking-tighter">Rs. {Math.round(transportTotalBuyPKR).toLocaleString()}</span>
              </div>
           </div>
           <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-[#0B1120] font-black text-xs uppercase py-5 rounded-2xl w-full shadow-xl transition-all">
             <i className="fa-solid fa-file-signature mr-2"></i> Post Bill
           </button>
        </div>
      </div>
    </div>
  );

  const renderReceiptForm = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-8 space-y-12">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Source Entity Type</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 max-w-md">
            <button type="button" onClick={() => setSourceEntityType('Customers')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${sourceEntityType === 'Customers' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}>Customers</button>
            <button type="button" onClick={() => setSourceEntityType('Vendors')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${sourceEntityType === 'Vendors' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}>Vendors</button>
          </div>
        </div>
        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Select Account *</label>
           <select required className="w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl px-6 py-5 text-sm font-bold" value={sourceEntityType === 'Customers' ? selectedCustomer : selectedVendor} onChange={e => sourceEntityType === 'Customers' ? setSelectedCustomer(e.target.value) : setSelectedVendor(e.target.value)}>
             <option value="">Choose Ledger...</option>
             {(sourceEntityType === 'Customers' ? state.customers : state.vendors).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
        </div>
        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Narration</label>
           <textarea className="w-full bg-slate-50 border rounded-2xl px-6 py-5 text-sm font-bold h-32" value={narration} onChange={e => setNarration(e.target.value)} />
        </div>
      </div>
      <div className="col-span-4">
        <div className="bg-[#0B1120] rounded-[2.5rem] p-10 text-white flex flex-col justify-between min-h-[500px] shadow-2xl overflow-hidden relative">
          <div className="space-y-10 relative z-10">
            <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Amount ({currency})</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={receiptAmount} onChange={e => setReceiptAmount(Number(e.target.value))} />
            </div>
            <div className="text-center pt-10 border-t border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase">Party Ledger Impact</span>
              <h3 className="text-4xl font-black mt-4">Rs. {Math.round(receiptTotalPKR).toLocaleString()}</h3>
            </div>
          </div>
          <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-[#0B1120] font-black text-xs uppercase py-5 rounded-2xl w-full shadow-xl mt-10">
            <i className="fa-solid fa-save mr-2"></i> Save & Post
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-[#0B1120] rounded-t-3xl p-8 text-white flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <i className="fa-solid fa-arrow-left text-xs"></i>
           </button>
           <h1 className="text-2xl font-black uppercase tracking-tighter">
             {isEdit ? 'EDIT' : 'NEW'} {type.toUpperCase()} VOUCHER
           </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex bg-slate-800 p-1 rounded-xl">
              {['Receipt', 'Ticket', 'Visa', 'Hotel', 'Transport'].map(t => (
                <button key={t} type="button" onClick={() => setType(t as VoucherType)} className={`text-[9px] font-black uppercase px-4 py-2.5 rounded-lg transition-all ${type === t ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>{t}</button>
              ))}
           </div>
           <div className="bg-[#151B2B] p-2 rounded-2xl border border-slate-800 flex items-center gap-2 shadow-xl">
              <div className="flex bg-[#0B1120] rounded-xl p-1">
                 <button type="button" onClick={() => setCurrency('PKR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${currency === 'PKR' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>PKR</button>
                 <button type="button" onClick={() => setCurrency('SAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${currency === 'SAR' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>SAR</button>
              </div>
              {currency === 'SAR' && <input type="number" step="0.1" className="bg-transparent text-xs font-black text-white w-14 outline-none border-b border-slate-700 text-center" value={roe} onChange={e => setRoe(Number(e.target.value))} />}
           </div>
           <div className="bg-[#151B2B] p-4 rounded-2xl border border-slate-800 flex items-center gap-2">
              <input type="text" className="bg-transparent text-sm font-black outline-none text-white tracking-widest uppercase w-32" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} placeholder="Ref #" />
              <input type="date" className="bg-transparent text-sm font-bold outline-none text-slate-200" value={date} onChange={e => setDate(e.target.value)} />
           </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-12 rounded-b-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
        {type === 'Receipt' ? renderReceiptForm() : 
         (type === 'Hotel' ? renderHotelForm() : 
         (type === 'Ticket' ? renderTicketForm() :
         (type === 'Visa' ? renderVisaForm() : renderTransportForm())))}
      </form>
    </div>
  );
};

export default VoucherEntryPage;
