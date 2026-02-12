import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { formatCurrency } from '../utils/accounting';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const VoucherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { state, deleteVoucher } = useApp();
  const navigate = useNavigate();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  const searchParams = new URLSearchParams(location.search);
  const initialLayout = (searchParams.get('layout') as 'PKR' | 'VOUCHER' | 'SAR') || 'PKR';
  const [activeLayout, setActiveLayout] = useState<'PKR' | 'VOUCHER' | 'SAR'>(initialLayout);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setActiveLayout(initialLayout);
  }, [initialLayout]);

  const voucher = state.vouchers.find(v => v.id === id);
  if (!voucher) return <div className="p-8">Voucher not found</div>;

  const handleDelete = () => {
    if (window.confirm("Delete this voucher? This will remove all ledger entries.")) {
      deleteVoucher(voucher.id);
      navigate('/vouchers');
    }
  };

  const customer = state.customers.find(c => voucher.entries.some(e => e.customerId === c.id));
  const vendor = state.vendors.find(v => voucher.entries.some(e => e.vendorId === v.id));

  const duration = () => {
    if (!voucher.checkIn || !voucher.checkOut) return 1;
    const start = new Date(voucher.checkIn);
    const end = new Date(voucher.checkOut);
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 1;
  };

  const numberToWords = (num: number) => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    
    if (num === 0) return 'ZERO';
    
    const convert = (n: number): string => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
        return '';
    };

    const whole = Math.floor(num);
    const paisas = Math.round((num - whole) * 100);
    
    let result = convert(whole);
    if (paisas > 0) {
        result += ' AND ' + convert(paisas) + ' PAISAS';
    }
    
    return result.toUpperCase() + ' PAKISTANI RUPEES ONLY';
  };

  const downloadPDF = async () => {
    if (!voucherRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeLayout}_${voucher.voucherNo}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getServiceLabel = () => {
    if (voucher.type === 'Hotel') return voucher.hotelProperty;
    if (voucher.type === 'Ticket') return `${voucher.airlineName} (${voucher.ticketNumber})`;
    if (voucher.type === 'Visa') return `Visa: ${voucher.visaType} (${voucher.country})`;
    if (voucher.type === 'Transport') return `${voucher.transportType}: ${voucher.route}`;
    return voucher.description;
  };

  const LayoutPKR = () => (
    <div className="bg-white p-12 max-w-5xl mx-auto shadow-sm print:shadow-none min-h-[850px] flex flex-col border border-slate-50">
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white w-14 h-12 flex items-center justify-center font-black rounded-lg text-[10px] uppercase italic">LOGO</div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">TRAVELLEDGER</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AGENCY ACCOUNTING CORE</p>
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-rose-600 font-black uppercase text-xs tracking-[0.3em] mb-1">{state.settings.legalTitle}</h2>
        </div>
        <div className="border-2 border-slate-800 p-4 rounded-xl min-w-[220px] text-center">
           <p className="text-[9px] font-black uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">PKR INVOICE : {voucher.voucherNo}</p>
           <p className="text-xl font-black text-slate-900">PKR {voucher.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
        </div>
      </div>

      <div className="mb-10 space-y-1 text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
        <p>{state.settings.address}</p>
        <p>CELL : {state.settings.mobile} - PHONE : {state.settings.phone} - EMAIL : {state.settings.email}</p>
        <p>Status: Definite PKR Invoice</p>
      </div>

      <div className="grid grid-cols-4 bg-[#0B5C91] text-white text-[10px] font-black uppercase tracking-[0.2em] text-center">
        <div className="py-2.5 border-r border-[#1a6ea6]">ACCOUNT NAME:</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">DATE</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">OPTION DATE</div>
        <div className="py-2.5">COUNTRY</div>
      </div>
      <div className="grid grid-cols-4 border border-t-0 border-slate-200 text-center mb-8 bg-white shadow-sm">
        <div className="py-3 border-r border-slate-200 text-xs font-black uppercase text-slate-800">{customer?.name || '---'}</div>
        <div className="py-3 border-r border-slate-200 text-xs font-black uppercase text-slate-800">{new Date(voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div className="py-3 border-r border-slate-200 text-xs font-black uppercase text-slate-400">---</div>
        <div className="py-3 text-xs font-black uppercase text-slate-800">{voucher.country || '-'}</div>
      </div>

      <div className="grid grid-cols-7 bg-[#0B5C91] text-white text-[10px] font-black uppercase tracking-[0.2em] text-center">
        <div className="py-2.5 border-r border-[#1a6ea6]">PAX NAME</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">SERVICE / DESCRIPTION</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">UNITS / BASIS</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">REMARKS</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">CITY</div>
        <div className="py-2.5 border-r border-[#1a6ea6]">TIMELINE</div>
        <div className="py-2.5">AMOUNT (PKR)</div>
      </div>
      <div className="grid grid-cols-7 border border-t-0 border-slate-200 text-center flex-1 bg-white">
        <div className="py-8 border-r border-slate-200 text-xs font-black uppercase text-slate-800 px-2 break-words">{voucher.passengerName || 'GROUP / PASSENGER'}</div>
        <div className="py-8 border-r border-slate-200 text-[11px] font-black uppercase text-slate-800 px-2 leading-tight">
          {getServiceLabel()}
          {voucher.type === 'Ticket' && <div className="text-[9px] text-sky-600 mt-1">GDS PNR: {voucher.gdsPnr}</div>}
          {voucher.type === 'Visa' && <div className="text-[9px] text-purple-600 mt-1">PASSPORT: {voucher.passportNumber}</div>}
        </div>
        <div className="py-8 border-r border-slate-200 text-xs font-black uppercase text-slate-800">
           {voucher.type === 'Hotel' ? `${voucher.roomBasis} (${voucher.rooms}R)` : (voucher.quantity || 1)}
        </div>
        <div className="py-8 border-r border-slate-200 text-xs font-black uppercase text-slate-800">{voucher.mealPlan || '---'}</div>
        <div className="py-8 border-r border-slate-200 text-xs font-black uppercase text-slate-800">{voucher.city || '---'}</div>
        <div className="py-8 border-r border-slate-200 text-[9px] font-bold uppercase leading-tight text-slate-600 px-2">
          {voucher.checkIn ? new Date(voucher.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}<br/>
          {voucher.checkOut ? new Date(voucher.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}<br/>
          {voucher.type === 'Hotel' && <span className="text-sky-600 font-black">({duration()}N)</span>}
        </div>
        <div className="py-8 text-xs font-black uppercase text-slate-800">{voucher.totalAmount.toLocaleString()}</div>
      </div>

      <div className="flex border border-t-0 border-slate-200 bg-slate-50/50">
        <div className="flex-1 py-4 px-10 text-right font-black text-xs uppercase tracking-[0.2em] text-slate-900">NET RECEIVABLE:</div>
        <div className="w-[14.28%] py-4 text-center font-black text-xs text-slate-900 bg-white border-l border-slate-200">Rs. {voucher.totalAmount.toLocaleString()}</div>
      </div>

      <div className="mt-10 text-[10px] font-black uppercase tracking-[0.1em] text-slate-900">
        IN WORDS: {numberToWords(voucher.totalAmount)}
      </div>

      <div className="mt-24 flex flex-col items-start gap-1">
         <p className="text-[10px] text-slate-400 font-bold italic">For and on behalf of</p>
         <p className="text-xs font-black text-rose-600 uppercase tracking-tighter">{state.settings.legalTitle}</p>
      </div>
    </div>
  );

  const LayoutVoucher = () => (
    <div className="bg-white p-12 max-w-5xl mx-auto shadow-sm print:shadow-none min-h-[850px] flex flex-col border border-slate-50">
      <div className="flex justify-between items-start mb-16">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
             <i className={`fa-solid ${voucher.type === 'Hotel' ? 'fa-hotel' : (voucher.type === 'Ticket' ? 'fa-plane' : 'fa-receipt')} text-3xl`}></i>
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none">TRAVELLEDGER</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">AGENCY ACCOUNTING CORE</p>
           </div>
        </div>
        <div className="text-right space-y-1">
           <h2 className="text-xl font-black text-sky-600 uppercase leading-none">{voucher.type.toUpperCase()} BOOKING VOUCHER</h2>
           <p className="text-xs font-black text-rose-600 uppercase tracking-tighter">{state.settings.legalTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mb-16">
         <div className="space-y-8">
            <div className="space-y-1">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PRIMARY GUEST / PASSENGER</span>
               <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">{voucher.passengerName || '---'}</h3>
            </div>
            <div className="space-y-1">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">SERVICE DESCRIPTION</span>
               <p className="text-sm font-black uppercase text-slate-600">{getServiceLabel()}</p>
            </div>
         </div>
         <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">VOUCHER REFERENCE</span>
            <h3 className="text-xl font-black text-sky-600 tracking-widest">{voucher.voucherNo}</h3>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
              <span className="text-[9px] font-bold text-slate-400 uppercase">ISSUED: {new Date(voucher.createdAt).toLocaleDateString()}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">POSTED: {new Date(voucher.date).toLocaleDateString()}</span>
            </div>
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-1 overflow-hidden mb-16">
        <table className="w-full text-left">
          <thead className="bg-[#0B1120] text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-4">UNITS</th>
              <th className="px-8 py-4">CLASSIFICATION</th>
              <th className="px-8 py-4">MEAL / STATUS</th>
              <th className="px-8 py-4">TIMELINE / DURATION</th>
              <th className="px-8 py-4 text-right">BOOKING STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-xs font-black text-slate-800 border-b border-slate-50">
               <td className="px-8 py-6">{voucher.type === 'Hotel' ? voucher.rooms : (voucher.quantity || 1)}</td>
               <td className="px-8 py-6 uppercase">{voucher.roomBasis || voucher.transportType || voucher.type}</td>
               <td className="px-8 py-6 uppercase">{voucher.mealPlan || voucher.processingStatus || '---'}</td>
               <td className="px-8 py-6">
                 {voucher.checkIn ? `${new Date(voucher.checkIn).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} - ${new Date(voucher.checkOut).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}` : '---'}
                 {voucher.type === 'Hotel' && <span className="ml-2 text-sky-600">({duration()}N)</span>}
               </td>
               <td className="px-8 py-6 text-right text-emerald-600 italic uppercase">Confirmed</td>
            </tr>
          </tbody>
        </table>
      </div>

      {voucher.type === 'Ticket' && (
        <div className="grid grid-cols-2 gap-10 mb-16">
           <div className="p-8 bg-sky-50 border border-sky-100 rounded-3xl">
              <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block mb-2">AIRLINE LOGISTICS</span>
              <div className="grid grid-cols-2 gap-4">
                 <div><p className="text-[9px] font-bold text-slate-400">AIRLINE</p><p className="text-xs font-black">{voucher.airlineName}</p></div>
                 <div><p className="text-[9px] font-bold text-slate-400">GDS PNR</p><p className="text-xs font-black text-sky-600">{voucher.gdsPnr}</p></div>
                 <div className="col-span-2"><p className="text-[9px] font-bold text-slate-400">TICKET #</p><p className="text-xs font-black">{voucher.ticketNumber}</p></div>
              </div>
           </div>
           <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                Kindly note that passengers are advised to re-confirm their flights 72 hours prior to departure. 
                Checked baggage allowance is as per airline policy.
              </p>
           </div>
        </div>
      )}

      <div className="mt-auto pt-16 border-t border-slate-100 flex justify-between items-end">
         <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized Agency Authentication</h4>
            <div className="w-64 h-24 bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Electronic Stamp Area</div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase italic">For & on behalf of</p>
            <p className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">{state.settings.legalTitle}</p>
            <div className="h-1 w-32 bg-sky-600 ml-auto mt-4"></div>
         </div>
      </div>
    </div>
  );

  const LayoutSAR = () => (
    <div className="bg-white p-12 max-w-5xl mx-auto shadow-sm print:shadow-none min-h-[850px] flex flex-col border border-slate-50">
       <div className="flex flex-col items-center mb-12">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">NT</div>
             <div className="text-left">
                <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">NEEM TREE</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">TRAVEL SERVICES</p>
             </div>
          </div>
          <h2 className="text-rose-600 font-black uppercase text-xs tracking-[0.3em]">OFFICIAL SAR CONFIRMATION VOUCHER</h2>
       </div>

       <div className="grid grid-cols-2 gap-x-20 gap-y-5 mb-16 text-[10px] font-black uppercase tracking-widest text-slate-700">
          <div className="flex justify-between border-b border-slate-100 pb-2">
             <span className="text-slate-400">ACCOUNT:</span>
             <span className="text-slate-900">{customer?.name || '---'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
             <span className="text-slate-400">HVI #:</span>
             <span className="text-sky-600 lowercase">{voucher.voucherNo}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
             <span className="text-slate-400">DATE:</span>
             <span className="text-slate-900">{new Date(voucher.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
             <span className="text-slate-400">ROE (SAR):</span>
             <span className="text-emerald-600">{voucher.roe} PKR</span>
          </div>
       </div>

       <div className="flex-1 space-y-12">
          <div className="space-y-4">
             <div className="bg-[#0B1120] text-white py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] inline-block rounded-lg">Reservation Details</div>
             <div className="grid grid-cols-7 border border-slate-200 text-center font-black uppercase text-[10px] tracking-widest bg-slate-50/50">
                <div className="py-3 border-r border-slate-200">Pax Name</div>
                <div className="py-3 border-r border-slate-200">Service Title</div>
                <div className="py-3 border-r border-slate-200">Units</div>
                <div className="py-3 border-r border-slate-200">Duration</div>
                <div className="py-3 border-r border-slate-200">Basis</div>
                <div className="py-3 border-r border-slate-200">Meal Plan</div>
                <div className="py-3">SAR Rate</div>
             </div>
             <div className="grid grid-cols-7 border border-t-0 border-slate-200 text-center text-xs font-black py-8 text-slate-800">
                <div className="px-2 break-words border-r border-slate-100">{voucher.passengerName || '---'}</div>
                <div className="px-2 border-r border-slate-100">{voucher.hotelProperty || voucher.type}</div>
                <div className="border-r border-slate-100">{voucher.rooms || voucher.quantity || 1}</div>
                <div className="border-r border-slate-100">{voucher.type === 'Hotel' ? `${duration()}N` : '---'}</div>
                <div className="border-r border-slate-100 uppercase">{voucher.roomBasis || 'STD'}</div>
                <div className="border-r border-slate-100 uppercase">{voucher.mealPlan || '---'}</div>
                <div>SAR {(voucher.salePrice || 0).toLocaleString()}</div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
             <div className="space-y-4">
                <div className="bg-slate-100 text-slate-500 py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] inline-block rounded-lg">Stay Timeline</div>
                <div className="space-y-4 border border-slate-100 p-8 rounded-2xl shadow-sm">
                   <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Check-In</span>
                      <span className="text-xs font-black">{voucher.checkIn ? new Date(voucher.checkIn).toLocaleDateString() : '---'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Check-Out</span>
                      <span className="text-xs font-black">{voucher.checkOut ? new Date(voucher.checkOut).toLocaleDateString() : '---'}</span>
                   </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="bg-slate-100 text-slate-500 py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] inline-block rounded-lg">Financial Position</div>
                <div className="space-y-4 border border-slate-100 p-8 rounded-2xl shadow-sm bg-slate-50/20">
                   <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Functional Equiv (PKR)</span>
                      <span className="text-xl font-black text-emerald-600">Rs. {voucher.totalAmount.toLocaleString()}</span>
                   </div>
                   <div className="text-[9px] text-slate-400 uppercase tracking-widest text-center italic">Calculated at {voucher.roe} PKR/SAR</div>
                </div>
             </div>
          </div>
       </div>

       <div className="mt-24 flex justify-between items-end border-t border-slate-100 pt-10">
          <div className="space-y-4">
             <div className="w-32 h-32 border-2 border-slate-100 rounded-2xl flex items-center justify-center text-[9px] font-black text-slate-200 uppercase tracking-widest text-center p-4">SYSTEM QR VERIFICATION</div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase italic">AUTHORIZED AGENCY SIGNATORY</p>
             <div className="w-48 h-[2px] bg-slate-900 mb-1"></div>
             <p className="text-[11px] font-black text-rose-600 uppercase tracking-tighter">{state.settings.legalTitle}</p>
          </div>
       </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0B1120] p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
           <button onClick={() => navigate('/vouchers')} className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
             <i className="fa-solid fa-arrow-left"></i>
           </button>
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Voucher Inspector</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Ref: {voucher.voucherNo}</p>
           </div>
        </div>
        <div className="relative z-10 flex flex-wrap gap-4">
           <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button onClick={() => setActiveLayout('PKR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeLayout === 'PKR' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}>PKR View</button>
              <button onClick={() => setActiveLayout('VOUCHER')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeLayout === 'VOUCHER' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}>Service View</button>
              <button onClick={() => setActiveLayout('SAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeLayout === 'SAR' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}>SAR View</button>
           </div>
           <button onClick={downloadPDF} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-50">
             {isGenerating ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
             Export PDF
           </button>
           <button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl">
             <i className="fa-solid fa-print"></i> Print
           </button>
           <div className="h-12 w-[1px] bg-slate-800 mx-2"></div>
           <button onClick={() => navigate(`/vouchers/edit/${voucher.id}`)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
             <i className="fa-solid fa-pen mr-2"></i> Edit
           </button>
           <button onClick={handleDelete} className="bg-rose-900 hover:bg-rose-800 text-rose-300 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
             <i className="fa-solid fa-trash mr-2"></i> Delete
           </button>
        </div>
        <i className="fa-solid fa-fingerprint absolute right-[-40px] bottom-[-40px] text-[200px] text-slate-800 opacity-20 pointer-events-none"></i>
      </div>

      <div className="bg-slate-100 p-8 sm:p-12 rounded-[3rem] shadow-inner overflow-hidden">
         <div ref={voucherRef} className="print-area">
           {activeLayout === 'PKR' && <LayoutPKR />}
           {activeLayout === 'VOUCHER' && <LayoutVoucher />}
           {activeLayout === 'SAR' && <LayoutSAR />}
         </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
         <i className="fa-solid fa-shield-halved text-emerald-500"></i>
         <span>System Verified Digital Audit Snapshot • {new Date(voucher.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default VoucherDetail;