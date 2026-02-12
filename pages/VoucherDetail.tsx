
import React, { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { formatCurrency } from '../utils/accounting';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const VoucherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state, deleteVoucher } = useApp();
  const navigate = useNavigate();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  const [activeView, setActiveView] = useState<'PKR' | 'SERVICE' | 'SAR'>('PKR');
  const [isGenerating, setIsGenerating] = useState(false);

  const voucher = state.vouchers.find(v => v.id === id);
  
  const downloadPDF = async () => {
    if (!voucherRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(voucherRef.current, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Voucher_${voucher?.voucherNo}_${activeView}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const accountName = useMemo(() => {
    if (!voucher) return '---';
    const entry = voucher.entries.find(e => e.customerId || e.vendorId);
    if (!entry) return 'CASH ACCOUNT';
    const party = state.customers.find(c => c.id === entry.customerId) || state.vendors.find(v => v.id === entry.vendorId);
    return party?.name || '---';
  }, [voucher, state]);

  if (!voucher) return <div className="p-12 text-center font-black uppercase text-slate-400">Voucher not found</div>;

  return (
    <div className="space-y-8 pb-20 no-print">
      {/* VOUCHER INSPECTOR TOP BAR */}
      <div className="bg-[#0B1426] p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
         <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
            <i className="fa-solid fa-fingerprint text-[180px]"></i>
         </div>
         
         <div className="flex items-center gap-6 relative z-10">
            <button onClick={() => navigate('/vouchers')} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
               <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div>
               <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Voucher Inspector</h1>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audit Ref: {voucher.voucherNo}</p>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-4 relative z-10">
            {/* View Switcher */}
            <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700">
               {['PKR', 'SERVICE', 'SAR'].map(v => (
                 <button 
                  key={v} 
                  onClick={() => setActiveView(v as any)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeView === v ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
                 >
                   {v} View
                 </button>
               ))}
            </div>

            <button onClick={downloadPDF} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
               {isGenerating ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-export"></i>} Export PDF
            </button>
            
            <button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
               <i className="fa-solid fa-print"></i> Print
            </button>

            <button onClick={() => navigate(`/vouchers/edit/${voucher.id}`)} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-700">
               <i className="fa-solid fa-pen"></i> Edit
            </button>

            <button onClick={() => { if(window.confirm('Delete this voucher permanently?')) deleteVoucher(voucher.id).then(() => navigate('/vouchers')); }} className="bg-rose-900 text-rose-400 hover:bg-rose-800 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-rose-800/50">
               <i className="fa-solid fa-trash"></i> Delete
            </button>
         </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER */}
      <div className="bg-slate-100/50 p-12 rounded-[3rem] border border-slate-200/50">
        <div ref={voucherRef} className="bg-white p-12 rounded-[0.5rem] shadow-sm max-w-5xl mx-auto min-h-[1100px] text-slate-900 flex flex-col font-sans">
           
           {activeView === 'PKR' && (
             <div className="flex-1 flex flex-col">
                {/* INVOICE HEADER */}
                <div className="flex justify-between items-start mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-sky-600 flex items-center justify-center rounded-xl text-white font-black text-xs uppercase tracking-widest">Logo</div>
                      <div>
                         <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">TRAVELLEDGER</h1>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Agency Accounting Core</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <h2 className="text-rose-600 font-black text-sm uppercase tracking-widest">{state.settings.legalTitle}</h2>
                   </div>
                </div>

                {/* INVOICE BOX */}
                <div className="flex justify-end mb-10">
                   <div className="border-[1.5px] border-slate-900 rounded-2xl p-6 min-w-[280px] text-center">
                      <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-1">PKR Invoice : {voucher.voucherNo}</p>
                      <div className="h-[1px] bg-slate-200 w-full my-3"></div>
                      <h3 className="text-3xl font-black tracking-tighter">PKR {voucher.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 1 })}</h3>
                   </div>
                </div>

                {/* ADDRESS & DETAILS */}
                <div className="text-[10px] font-bold text-slate-500 space-y-1 mb-10 uppercase leading-relaxed">
                   <p>{state.settings.address}</p>
                   <p>Cell : {state.settings.mobile} - Phone : {state.settings.phone} - Email : {state.settings.email}</p>
                   <p className="text-slate-900">Status: Definite PKR Invoice</p>
                </div>

                {/* DETAILS TABLE UPPER */}
                <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                   <table className="w-full text-center text-[10px] font-black uppercase">
                      <thead className="bg-sky-700 text-white">
                         <tr>
                            <th className="py-3 border-r border-sky-800">Account Name:</th>
                            <th className="py-3 border-r border-sky-800">Date</th>
                            <th className="py-3 border-r border-sky-800">Option Date</th>
                            <th className="py-3">Country</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr className="text-slate-700">
                            <td className="py-4 border-r border-slate-200">{accountName}</td>
                            <td className="py-4 border-r border-slate-200">{new Date(voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="py-4 border-r border-slate-200">---</td>
                            <td className="py-4">{voucher.country || '-'}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                {/* SERVICE TABLE LOWER */}
                <div className="mb-10 border border-slate-200 rounded-lg overflow-hidden flex-1">
                   <table className="w-full text-center text-[10px] font-black uppercase">
                      <thead className="bg-sky-700 text-white">
                         <tr>
                            <th className="py-3 border-r border-sky-800 px-2">Pax Name</th>
                            <th className="py-3 border-r border-sky-800 px-2">Service / Description</th>
                            <th className="py-3 border-r border-sky-800 px-2">Units / Basis</th>
                            <th className="py-3 border-r border-sky-800 px-2">Remarks</th>
                            <th className="py-3 border-r border-sky-800 px-2">City</th>
                            <th className="py-3 border-r border-sky-800 px-2">Timeline</th>
                            <th className="py-3 px-2">Amount (PKR)</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         <tr className="text-slate-700">
                            <td className="py-8 border-r border-slate-200 px-2">{voucher.passengerName || '---'}</td>
                            <td className="py-8 border-r border-slate-200 px-2">{voucher.type === 'Receipt' ? 'Ledger Receipt' : voucher.type}</td>
                            <td className="py-8 border-r border-slate-200 px-2 uppercase">{voucher.rooms ? `${voucher.rooms}R` : 'Undefined (1R)'}</td>
                            <td className="py-8 border-r border-slate-200 px-2">---</td>
                            <td className="py-8 border-r border-slate-200 px-2">{voucher.city || '---'}</td>
                            <td className="py-8 border-r border-slate-200 px-2">
                               <p>---</p>
                               <p className="text-sky-600 text-[8px]">(1N)</p>
                            </td>
                            <td className="py-8 px-2 font-black">{voucher.totalAmount.toLocaleString()}</td>
                         </tr>
                         {/* Fillers */}
                         {[...Array(3)].map((_, i) => (
                           <tr key={i} className="text-slate-100"><td colSpan={7} className="py-4">&nbsp;</td></tr>
                         ))}
                      </tbody>
                      <tfoot className="border-t-[1.5px] border-slate-900 bg-slate-50">
                         <tr>
                            <td colSpan={6} className="py-4 text-right pr-6 border-r border-slate-200">Net Receivable:</td>
                            <td className="py-4 font-black">Rs. {voucher.totalAmount.toLocaleString()}</td>
                         </tr>
                      </tfoot>
                   </table>
                </div>

                {/* FOOTER */}
                <div className="space-y-16">
                   <p className="text-[10px] font-black uppercase text-slate-800">In Words: Pakistani Rupees Only</p>
                   
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-[9px] italic text-slate-400 font-bold">For and on behalf of</p>
                         <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{state.settings.legalTitle}</p>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeView === 'SAR' && (
             <div className="flex-1 flex flex-col">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">NT</div>
                   <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">NEEM TREE</h1>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Travel Services</p>
                </div>

                <div className="text-center mb-12">
                   <h2 className="text-rose-600 font-black text-xs uppercase tracking-[0.3em]">Official SAR Confirmation Voucher</h2>
                </div>

                <div className="grid grid-cols-2 gap-y-6 mb-12 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 pb-10">
                   <div className="flex gap-4"><span className="text-slate-400 w-24">Account:</span><span className="text-slate-900">{accountName}</span></div>
                   <div className="flex gap-4 justify-end"><span className="text-slate-400">HVI #:</span><span className="text-sky-600">{voucher.voucherNo.toLowerCase()}</span></div>
                   <div className="flex gap-4"><span className="text-slate-400 w-24">Date:</span><span className="text-slate-900">{voucher.date}</span></div>
                   <div className="flex gap-4 justify-end"><span className="text-slate-400">ROE (SAR):</span><span className="text-emerald-600">{voucher.roe} PKR</span></div>
                </div>

                <div className="mb-12">
                   <div className="bg-[#0B1426] text-white px-6 py-2 rounded-lg inline-block text-[9px] font-black uppercase tracking-widest mb-6">Reservation Details</div>
                   <table className="w-full text-center text-[9px] font-black uppercase">
                      <thead className="bg-slate-50 border-y border-slate-100 text-slate-400">
                         <tr>
                            <th className="py-4">Pax Name</th>
                            <th className="py-4">Service Title</th>
                            <th className="py-4">Units</th>
                            <th className="py-4">Duration</th>
                            <th className="py-4">Basis</th>
                            <th className="py-4">Meal Plan</th>
                            <th className="py-4">SAR Rate</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         <tr className="text-slate-700">
                            <td className="py-10 text-slate-300">---</td>
                            <td className="py-10">{voucher.type}</td>
                            <td className="py-10 font-black">1</td>
                            <td className="py-10 text-slate-300">---</td>
                            <td className="py-10">STD</td>
                            <td className="py-10 text-slate-300">---</td>
                            <td className="py-10 font-black">SAR {voucher.salePrice || 0}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-auto">
                   <div className="space-y-6">
                      <div className="bg-slate-50 px-6 py-2 rounded-lg inline-block text-[9px] font-black uppercase tracking-widest text-slate-400">Stay Timeline</div>
                      <div className="border border-slate-100 rounded-3xl p-8 space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-slate-400">Check-in</span><span className="text-slate-300">---</span></div>
                         <div className="h-[1px] bg-slate-50"></div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-slate-400">Check-out</span><span className="text-slate-300">---</span></div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="bg-slate-50 px-6 py-2 rounded-lg inline-block text-[9px] font-black uppercase tracking-widest text-slate-400">Financial Position</div>
                      <div className="border border-slate-100 rounded-3xl p-8 flex justify-between items-center bg-slate-50/30">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Functional Equiv (PKR)</p>
                            <p className="text-[7px] italic text-slate-300 uppercase">Calculated at {voucher.roe} PKR/SAR</p>
                         </div>
                         <h4 className="text-2xl font-black text-emerald-600">Rs. {voucher.totalAmount.toLocaleString()}</h4>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeView === 'SERVICE' && (
             <div className="flex-1">
                <div className="flex justify-between items-center mb-12 border-b border-slate-100 pb-8">
                   <div>
                      <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">System Audit Log</h1>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Classification: {voucher.type} Voucher</p>
                   </div>
                   <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Functional Value</p>
                      <p className="text-xl font-black">Rs. {voucher.totalAmount.toLocaleString()}</p>
                   </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-12">
                   <table className="w-full text-left text-[10px] font-bold">
                      <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest">
                         <tr>
                            <th className="px-8 py-4">Account Distrubution</th>
                            <th className="px-8 py-4 text-center">Curr/ROE</th>
                            <th className="px-8 py-4 text-right">Debit (PKR)</th>
                            <th className="px-8 py-4 text-right">Credit (PKR)</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {voucher.entries.map((e, idx) => {
                            const acc = state.accounts.find(a => a.id === e.accountId || a.dbId === e.accountId);
                            const party = state.customers.find(c => c.id === e.customerId) || state.vendors.find(v => v.id === e.vendorId);
                            return (
                               <tr key={idx}>
                                  <td className="px-8 py-6">
                                     <p className="font-black text-slate-900 uppercase">{acc?.title || 'Unknown'}</p>
                                     {party && <p className="text-[8px] text-sky-600 font-black mt-1 uppercase">Party: {party.name}</p>}
                                  </td>
                                  <td className="px-8 py-6 text-center text-slate-400">{e.currency || 'PKR'} / {e.roe || 1}</td>
                                  <td className="px-8 py-6 text-right font-black">{e.debit > 0 ? (e.debit * (e.roe || 1)).toLocaleString() : '-'}</td>
                                  <td className="px-8 py-6 text-right font-black">{e.credit > 0 ? (e.credit * (e.roe || 1)).toLocaleString() : '-'}</td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>

                <div className="bg-slate-50 rounded-2xl p-8">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal Narration / Remarks</p>
                   <p className="text-xs font-bold text-slate-700 italic">"{voucher.description}"</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default VoucherDetail;
