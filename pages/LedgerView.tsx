
import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { getLedger, formatCurrency } from '../utils/accounting';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LedgerView: React.FC = () => {
  const { type, id } = useParams<{ type: string, id: string }>();
  const { state } = useApp();
  const navigate = useNavigate();

  const party = useMemo(() => {
    if (type === 'Customer') return state.customers.find(c => c.id === id);
    return state.vendors.find(v => v.id === id);
  }, [state, type, id]);

  const ledgerEntries = useMemo(() => {
    if (!id || !type) return [];
    return getLedger(id, type as 'Customer' | 'Vendor', state);
  }, [state, id, type]);

  const totals = useMemo(() => {
    const debits = ledgerEntries.reduce((sum, e) => sum + (e.date !== 'Opening' ? (e.debit || 0) : 0), 0);
    const credits = ledgerEntries.reduce((sum, e) => sum + (e.date !== 'Opening' ? (e.credit || 0) : 0), 0);
    const transactionCount = ledgerEntries.filter(e => e.date !== 'Opening').length;
    const lastEntry = ledgerEntries[ledgerEntries.length - 1];
    const netBalance = lastEntry ? lastEntry.balance : 0;
    
    return { 
      debits, 
      credits, 
      netBalance,
      transactionCount,
      status: netBalance >= 0 ? (type === 'Customer' ? 'RECEIVABLE' : 'OVERPAID') : (type === 'Customer' ? 'PAYABLE' : 'PAYABLE')
    };
  }, [ledgerEntries, type]);

  const downloadPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(11, 17, 32);
    doc.text(state.settings.companyName.toUpperCase(), 40, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(state.settings.address, 40, 65);
    doc.text(`Contact: ${state.settings.mobile} | Email: ${state.settings.email}`, 40, 78);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 95, pageWidth - 40, 95);

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(11, 17, 32);
    doc.text(`${type.toUpperCase()} LEDGER STATEMENT`, 40, 125);
    
    doc.setFontSize(11);
    doc.text(`Party: ${party?.name} (${party?.code})`, 40, 145);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 160);

    const tableData = ledgerEntries.map(e => [
      e.date === 'Opening' ? '-' : new Date(e.date).toLocaleDateString('en-GB'),
      e.voucherNo,
      e.type,
      e.description,
      e.roe ? e.roe.toString() : '-',
      e.debit ? e.debit.toLocaleString() : '-',
      e.credit ? e.credit.toLocaleString() : '-',
      `${Math.abs(e.balance).toLocaleString()} ${e.balance >= 0 ? 'Dr' : 'Cr'}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Ref #', 'Type', 'Narration', 'ROE', 'Debit', 'Credit', 'Balance']],
      body: tableData,
      startY: 180,
      styles: { fontSize: 8, cellPadding: 8 },
      headStyles: { fillColor: [11, 17, 32], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      margin: { left: 40, right: 40 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    // Summary Section
    doc.setFontSize(12);
    doc.setTextColor(11, 17, 32);
    doc.text('FINANCIAL SUMMARY', 40, finalY);
    
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40, finalY + 10, pageWidth - 80, 80, 10, 10, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total Transactions: ${totals.transactionCount}`, 60, finalY + 35);
    doc.text(`Total Debits: Rs. ${totals.debits.toLocaleString()}`, 60, finalY + 55);
    doc.text(`Total Credits: Rs. ${totals.credits.toLocaleString()}`, 60, finalY + 75);
    
    doc.setFontSize(14);
    doc.setTextColor(11, 17, 32);
    const balText = `Net Balance: Rs. ${Math.abs(totals.netBalance).toLocaleString()} ${totals.netBalance >= 0 ? 'Dr' : 'Cr'}`;
    const textWidth = doc.getTextWidth(balText);
    doc.text(balText, pageWidth - 60 - textWidth, finalY + 55);

    doc.save(`${type}_Ledger_${party?.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!party) return <div>Party not found</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="no-print flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">{party.name}</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Functional PKR Statement</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all"
          >
            <i className="fa-solid fa-file-pdf"></i> Download PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all"
          >
            <i className="fa-solid fa-print"></i> Print Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500">
            <i className="fa-solid fa-arrow-up-right text-2xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period Debits</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Rs. {totals.debits.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
            <i className="fa-solid fa-arrow-down-left text-2xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period Credits</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Rs. {totals.credits.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-[#0B1120] dark:bg-sky-700 p-8 rounded-[2rem] text-white flex items-center gap-6 relative overflow-hidden shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center text-sky-400 relative z-10">
            <i className="fa-solid fa-globe text-2xl"></i>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Functional Balance</p>
            <h3 className="text-2xl font-black">Rs. {Math.abs(totals.netBalance).toLocaleString()}</h3>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${totals.netBalance >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {totals.status}
            </span>
          </div>
          <i className="fa-solid fa-chart-line absolute right-[-20px] bottom-[-20px] text-[150px] text-slate-800 opacity-20 pointer-events-none"></i>
        </div>
      </div>

      <div id="ledger-table" className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B1120] dark:bg-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                <th className="px-8 py-5">Post Date</th>
                <th className="px-8 py-5">Audit Ref</th>
                <th className="px-8 py-5">Description / Narration</th>
                <th className="px-8 py-5 text-center">ROE</th>
                <th className="px-8 py-5 text-right">Debit (+)</th>
                <th className="px-8 py-5 text-right">Credit (-)</th>
                <th className="px-8 py-5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {ledgerEntries.map((ent, i) => (
                <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 ${ent.date === 'Opening' ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}>
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {ent.date === 'Opening' ? '2026-01-01' : ent.date}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       {ent.type !== 'Opening Balance' && (
                         <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">{ent.type}</span>
                       )}
                       {ent.voucherNo !== '-' && (
                         <Link to={`/vouchers/view/${state.vouchers.find(v => v.voucherNo === ent.voucherNo)?.id}`} className="text-[10px] font-black text-sky-600 dark:text-sky-400 hover:underline no-print">
                           {ent.voucherNo}
                         </Link>
                       )}
                       {ent.voucherNo !== '-' && (
                         <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 print-only">{ent.voucherNo}</span>
                       )}
                       {ent.voucherNo === '-' && <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">--</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[300px]" title={ent.description}>
                    {ent.description}
                  </td>
                  <td className="px-8 py-5 text-center">
                    {ent.roe ? (
                      <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg">
                        {ent.roe}
                      </span>
                    ) : (
                      <span className="text-slate-200 dark:text-slate-700">-</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-black text-slate-700 dark:text-slate-300">
                    {ent.debit > 0 ? `Rs. ${ent.debit.toLocaleString()}` : <span className="text-emerald-400">-</span>}
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-black text-slate-700 dark:text-slate-300">
                    {ent.credit > 0 ? `Rs. ${ent.credit.toLocaleString()}` : <span className="text-emerald-400">-</span>}
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-black text-slate-900 dark:text-slate-100">
                    {Math.abs(ent.balance).toLocaleString()} {ent.balance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <td colSpan={4} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Statement Period Totals:
                </td>
                <td className="px-8 py-6 text-right text-xs font-black text-slate-800 dark:text-slate-200">
                   Rs. {totals.debits.toLocaleString()}
                </td>
                <td className="px-8 py-6 text-right text-xs font-black text-slate-800 dark:text-slate-200">
                   Rs. {totals.credits.toLocaleString()}
                </td>
                <td className="px-8 py-6 text-right bg-[#0B1120] dark:bg-sky-700 text-white">
                   <span className="text-xs font-black uppercase">Rs. {Math.abs(totals.netBalance).toLocaleString()} {totals.netBalance >= 0 ? 'Dr' : 'Cr'}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LedgerView;
