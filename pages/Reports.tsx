
import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { calculateAccountBalance, formatCurrency, getAccountLedger } from '../utils/accounting';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('Trial Balance');

  // General Ledger States
  const [glAccountId, setGlAccountId] = useState(state.accounts[0]?.id || '');
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const tabs = [
    { id: 'General Ledger', label: 'General Ledger', icon: 'fa-book' },
    { id: 'Trial Balance', label: 'Trial Balance', icon: 'fa-file-waveform' },
    { id: 'Profit & Loss', label: 'Profit & Loss', icon: 'fa-chart-line' },
    { id: 'Balance Sheet', label: 'Balance Sheet', icon: 'fa-balance-scale' }
  ];

  const trialBalance = useMemo(() => {
    return state.accounts.map(acc => {
      const debit = calculateAccountBalance(acc.id, state.vouchers, 0, 'Debit');
      const credit = calculateAccountBalance(acc.id, state.vouchers, 0, 'Credit');
      return { ...acc, debit: debit > 0 ? debit : 0, credit: credit > 0 ? credit : 0 };
    });
  }, [state]);

  const plReport = useMemo(() => {
    const income = state.accounts.filter(a => a.type === 'Income').map(a => ({
      title: a.title,
      amount: calculateAccountBalance(a.id, state.vouchers, 0, 'Credit')
    }));
    const expenses = state.accounts.filter(a => a.type === 'Expense').map(a => ({
      title: a.title,
      amount: calculateAccountBalance(a.id, state.vouchers, 0, 'Debit')
    }));
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { income, expenses, totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }, [state]);

  const balanceSheet = useMemo(() => {
    const assets = state.accounts.filter(a => a.type === 'Asset' || a.type === 'Cash' || a.type === 'Bank' || a.type === 'Receivable').map(a => ({
      title: a.title,
      amount: calculateAccountBalance(a.id, state.vouchers, 0, 'Debit')
    }));
    const liabilities = state.accounts.filter(a => a.type === 'Liability' || a.type === 'Payable').map(a => ({
      title: a.title,
      amount: calculateAccountBalance(a.id, state.vouchers, 0, 'Credit')
    }));
    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
    return { assets, liabilities, totalAssets, totalLiabilities };
  }, [state]);

  const glData = useMemo(() => {
    if (activeTab !== 'General Ledger' || !glAccountId) return [];
    return getAccountLedger(glAccountId, fromDate, toDate, state);
  }, [activeTab, glAccountId, fromDate, toDate, state]);

  const selectedAccount = state.accounts.find(a => a.id === glAccountId);

  const addHeaderToDoc = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setTextColor(11, 17, 32);
    doc.text(state.settings.companyName.toUpperCase(), 40, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(state.settings.address, 40, 65);
    doc.text(`Contact: ${state.settings.mobile} | Email: ${state.settings.email}`, 40, 78);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 95, pageWidth - 40, 95);

    doc.setFontSize(16);
    doc.setTextColor(11, 17, 32);
    doc.text(title.toUpperCase(), 40, 125);
    
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 140);
    return 160;
  };

  const downloadTrialBalancePDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const startY = addHeaderToDoc(doc, 'Trial Balance Report');

    const tableData = trialBalance.map(acc => [
      acc.code,
      acc.title,
      acc.type,
      acc.debit > 0 ? acc.debit.toLocaleString() : '-',
      acc.credit > 0 ? acc.credit.toLocaleString() : '-'
    ]);

    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

    autoTable(doc, {
      head: [['Code', 'Account', 'Type', 'Debit (PKR)', 'Credit (PKR)']],
      body: tableData,
      startY,
      styles: { fontSize: 8, cellPadding: 6 },
      headStyles: { fillColor: [11, 17, 32], fontStyle: 'bold' },
      margin: { left: 40, right: 40 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.setTextColor(11, 17, 32);
    doc.text('REPORT SUMMARY', 40, finalY);
    doc.setFontSize(9);
    doc.text(`Accounts Count: ${trialBalance.length}`, 40, finalY + 20);
    doc.text(`Total Debit Sum: Rs. ${totalDebit.toLocaleString()}`, 40, finalY + 35);
    doc.text(`Total Credit Sum: Rs. ${totalCredit.toLocaleString()}`, 40, finalY + 50);
    
    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      doc.setTextColor(16, 185, 129);
      doc.text('STATUS: BALANCED', 40, finalY + 70);
    } else {
      doc.setTextColor(244, 63, 94);
      doc.text(`STATUS: IMBALANCE DETECTED (Diff: Rs. ${Math.abs(totalDebit - totalCredit).toLocaleString()})`, 40, finalY + 70);
    }

    doc.save(`Trial_Balance_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadPLPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const startY = addHeaderToDoc(doc, 'Profit & Loss Statement');

    const incomeData = plReport.income.map(i => [i.title, i.amount.toLocaleString()]);
    const expenseData = plReport.expenses.map(e => [e.title, e.amount.toLocaleString()]);

    autoTable(doc, {
      head: [['Revenue Accounts', 'Amount (PKR)']],
      body: [...incomeData, [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }, { content: plReport.totalIncome.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }]],
      startY,
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 40, right: 40 }
    });

    autoTable(doc, {
      head: [['Expense Accounts', 'Amount (PKR)']],
      body: [...expenseData, [{ content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }, { content: plReport.totalExpense.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }]],
      startY: (doc as any).lastAutoTable.finalY + 30,
      headStyles: { fillColor: [244, 63, 94] },
      margin: { left: 40, right: 40 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 40;
    doc.setFontSize(16);
    doc.setTextColor(plReport.netProfit >= 0 ? 16 : 244, plReport.netProfit >= 0 ? 185 : 63, plReport.netProfit >= 0 ? 129 : 94);
    doc.text(`NET PERFORMANCE: Rs. ${plReport.netProfit.toLocaleString()}`, 40, finalY);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Revenue Heads: ${plReport.income.length}`, 40, finalY + 20);
    doc.text(`Expense Heads: ${plReport.expenses.length}`, 40, finalY + 35);

    doc.save(`Profit_Loss_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadGLPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const startY = addHeaderToDoc(doc, `General Ledger: ${selectedAccount?.title}`);
    
    doc.setFontSize(10);
    doc.setTextColor(11, 17, 32);
    doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 40, startY - 5);

    const tableData = glData.map(e => [
      e.date === 'Opening' ? '-' : new Date(e.date).toLocaleDateString('en-GB'),
      e.voucherNo,
      e.type,
      e.description,
      e.debit ? e.debit.toLocaleString() : '-',
      e.credit ? e.credit.toLocaleString() : '-',
      `${Math.abs(e.balance).toLocaleString()} ${e.balance >= 0 ? (e.isDebit ? 'Dr' : 'Cr') : (e.isDebit ? 'Cr' : 'Dr')}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Ref #', 'Type', 'Narration', 'Debit', 'Credit', 'Balance']],
      body: tableData,
      startY: startY + 15,
      styles: { fontSize: 7, cellPadding: 5 },
      headStyles: { fillColor: [11, 17, 32], fontStyle: 'bold' },
      margin: { left: 40, right: 40 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    const debits = glData.reduce((s, e) => s + (e.date !== 'Opening' ? (e.debit || 0) : 0), 0);
    const credits = glData.reduce((s, e) => s + (e.date !== 'Opening' ? (e.credit || 0) : 0), 0);
    const lastEntry = glData[glData.length - 1];
    const closingBalance = lastEntry ? lastEntry.balance : 0;

    doc.setFontSize(11);
    doc.text('ACCOUNT SUMMARY', 40, finalY);
    doc.setFontSize(9);
    doc.text(`Total Period Transactions: ${glData.length - 1}`, 40, finalY + 20);
    doc.text(`Movement - Total Debit: Rs. ${debits.toLocaleString()}`, 40, finalY + 35);
    doc.text(`Movement - Total Credit: Rs. ${credits.toLocaleString()}`, 40, finalY + 50);
    doc.setFontSize(12);
    doc.text(`CLOSING LEDGER BALANCE: Rs. ${Math.abs(closingBalance).toLocaleString()} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`, 40, finalY + 75);

    doc.save(`GL_${selectedAccount?.title}_${fromDate}_to_${toDate}.pdf`);
  };

  const downloadBSPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const startY = addHeaderToDoc(doc, 'Balance Sheet Statement');

    const assetData = balanceSheet.assets.map(a => [a.title, a.amount.toLocaleString()]);
    const liabilityData = balanceSheet.liabilities.map(l => [l.title, l.amount.toLocaleString()]);

    autoTable(doc, {
      head: [['Assets', 'Value (PKR)']],
      body: [...assetData, [{ content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', fillColor: [240, 249, 255] } }, { content: balanceSheet.totalAssets.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 249, 255] } }]],
      startY,
      headStyles: { fillColor: [14, 165, 233] },
      margin: { left: 40, right: 40 }
    });

    autoTable(doc, {
      head: [['Liabilities & Equity', 'Value (PKR)']],
      body: [...liabilityData, 
        ['Retained Earnings (Period)', plReport.netProfit.toLocaleString()],
        [{ content: 'TOTAL LIABILITIES & EQUITY', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: (balanceSheet.totalLiabilities + plReport.netProfit).toLocaleString(), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }]
      ],
      startY: (doc as any).lastAutoTable.finalY + 30,
      headStyles: { fillColor: [11, 17, 32] },
      margin: { left: 40, right: 40 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 40;
    doc.setFontSize(10);
    doc.setTextColor(11, 17, 32);
    doc.text('FINANCIAL POSITION SUMMARY', 40, finalY);
    doc.setFontSize(9);
    doc.text(`Total Assets: Rs. ${balanceSheet.totalAssets.toLocaleString()}`, 40, finalY + 20);
    doc.text(`Total Liabilities & Equity: Rs. ${(balanceSheet.totalLiabilities + plReport.netProfit).toLocaleString()}`, 40, finalY + 35);
    
    doc.setTextColor(16, 185, 129);
    doc.text(`EQUILIBRIUM STATUS: VERIFIED`, 40, finalY + 55);

    doc.save(`Balance_Sheet_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getExportAction = () => {
    switch(activeTab) {
      case 'General Ledger': return downloadGLPDF;
      case 'Trial Balance': return downloadTrialBalancePDF;
      case 'Profit & Loss': return downloadPLPDF;
      case 'Balance Sheet': return downloadBSPDF;
      default: return () => {};
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
         <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-[#0B1120] dark:bg-sky-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
         </div>
         <div className="flex gap-2">
            <button onClick={getExportAction()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
               <i className="fa-solid fa-file-pdf"></i> PDF
            </button>
            <button onClick={() => window.print()} className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
               <i className="fa-solid fa-print"></i> Print
            </button>
         </div>
      </div>

      {activeTab === 'General Ledger' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Account Head</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                value={glAccountId}
                onChange={e => setGlAccountId(e.target.value)}
              >
                {state.accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          <div id="gl-report-table" className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800">
             <table className="w-full text-left">
                <thead className="bg-[#0B1120] dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Ref #</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5">Narration</th>
                    <th className="px-8 py-5 text-right">Debit</th>
                    <th className="px-8 py-5 text-right">Credit</th>
                    <th className="px-8 py-5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {glData.map((ent, i) => (
                    <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${ent.date === 'Opening' ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}>
                      <td className="px-8 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {ent.date === 'Opening' ? '-' : new Date(ent.date).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-xs font-black text-sky-600 dark:text-sky-400">
                        {ent.voucherNo !== '-' ? (
                          <Link to={`/vouchers/view/${ent.id}`} className="hover:underline">{ent.voucherNo}</Link>
                        ) : '-'}
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded uppercase">{ent.type}</span>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={ent.description}>
                        {ent.description}
                      </td>
                      <td className="px-8 py-4 text-right text-xs font-black text-slate-700 dark:text-slate-200">
                        {ent.debit > 0 ? ent.debit.toLocaleString() : '-'}
                      </td>
                      <td className="px-8 py-4 text-right text-xs font-black text-slate-700 dark:text-slate-200">
                        {ent.credit > 0 ? ent.credit.toLocaleString() : '-'}
                      </td>
                      <td className="px-8 py-4 text-right text-xs font-black text-slate-900 dark:text-slate-100">
                        {Math.abs(ent.balance).toLocaleString()} {ent.balance >= 0 ? (ent.isDebit ? 'Dr' : 'Cr') : (ent.isDebit ? 'Cr' : 'Dr')}
                      </td>
                    </tr>
                  ))}
                  {glData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">No transactions found for this period</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'Trial Balance' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-12 bg-[#0B1120] dark:bg-slate-800 py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <div className="col-span-4">Ledger Account</div>
            <div className="col-span-2 text-center">Type</div>
            <div className="col-span-3 text-right">Debit (PKR)</div>
            <div className="col-span-3 text-right">Credit (PKR)</div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {trialBalance.map(acc => (
              <div key={acc.id} className="grid grid-cols-12 py-5 px-10 items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{acc.title}</span>
                </div>
                <div className="col-span-2 text-center">
                   <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded uppercase">{acc.type}</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</span>
                </div>
                <div className="col-span-3 text-right">
                   <span className="text-xs font-bold text-rose-500 dark:text-rose-400">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#0B1120] dark:bg-slate-800 py-8 px-10 flex justify-between items-center text-white border-t border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Statement Totals ({trialBalance.length} Accounts)</span>
            <div className="flex gap-16">
              <span className="text-xl font-black">Rs. {trialBalance.reduce((s, a) => s + a.debit, 0).toLocaleString()}</span>
              <span className="text-xl font-black">Rs. {trialBalance.reduce((s, a) => s + a.credit, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Profit & Loss' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-16">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-emerald-50 dark:border-emerald-900/20 pb-4">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Revenue Streams</span>
                </div>
                {plReport.income.map((i, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{i.title}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">Rs. {i.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-10">
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Gross Sales Margin</span>
                   <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">Rs. {plReport.totalIncome.toLocaleString()}</span>
                </div>
             </div>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-rose-50 dark:border-rose-900/20 pb-4">
                   <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Operational Overhead</span>
                </div>
                {plReport.expenses.map((e, idx) => (
                   <div key={idx} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{e.title}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">Rs. {e.amount.toLocaleString()}</span>
                   </div>
                ))}
                <div className="flex flex-col items-end gap-2 pt-10">
                   <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Period Expenses</span>
                   <span className="text-3xl font-black text-rose-500 dark:text-rose-400 text-right">Rs. {plReport.totalExpense.toLocaleString()}</span>
                </div>
             </div>
           </div>

           <div className="bg-[#0B1120] dark:bg-slate-800 rounded-[3rem] p-16 text-center text-white relative overflow-hidden">
              <i className="fa-solid fa-chart-line absolute left-[-40px] top-[-40px] text-[300px] text-slate-800 dark:text-slate-700 opacity-20 pointer-events-none"></i>
              <div className="relative z-10 space-y-4">
                 <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">Bottom Line Performance</p>
                 <h2 className="text-xl font-black uppercase tracking-tighter">Net Profit for Period</h2>
                 <div className="text-7xl font-black text-emerald-400">Rs. {plReport.netProfit.toLocaleString()}</div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'Balance Sheet' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-12">
          <div className="space-y-8">
             <div className="bg-[#0B1120] dark:bg-slate-800 text-white px-8 py-3 rounded-xl inline-block text-[10px] font-black uppercase tracking-widest">Current Assets</div>
             <div className="space-y-6 max-w-4xl mx-auto">
                {balanceSheet.assets.map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/50 pb-3">
                     <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{a.title}</span>
                     <span className="text-sm font-black text-slate-900 dark:text-slate-100">Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-8">
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Asset Liquidity</span>
                   <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400">Rs. {balanceSheet.totalAssets.toLocaleString()}</span>
                </div>
             </div>
          </div>

          <div className="space-y-8 pt-8">
             <div className="bg-[#0B1120] dark:bg-slate-800 text-white px-8 py-3 rounded-xl inline-block text-[10px] font-black uppercase tracking-widest">Liabilities & Ownership</div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-20 max-w-4xl mx-auto">
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">External Liabilities</p>
                   {balanceSheet.liabilities.map((l, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{l.title}</span>
                         <span className="text-sm font-black text-slate-900 dark:text-slate-100">Rs. {l.amount.toLocaleString()}</span>
                      </div>
                   ))}
                   <div className="flex justify-between items-center pt-10 border-t border-slate-50 dark:border-slate-800/50">
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Total Debt Position</span>
                      <span className="text-sm font-black text-rose-500 dark:text-rose-400">Rs. {balanceSheet.totalLiabilities.toLocaleString()}</span>
                   </div>
                </div>
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Retained Equity</p>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Capital Account</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">Rs. 0</span>
                   </div>
                   <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl flex justify-between items-center">
                      <span className="text-xs font-black italic text-emerald-700 dark:text-emerald-400">Net Period Earnings</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">Rs. {plReport.netProfit.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center pt-4">
                      <span className="text-[8px] font-black text-sky-500 uppercase tracking-widest">Total Shareholder Value</span>
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400">Rs. {plReport.netProfit.toLocaleString()}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-[#0B1120] dark:bg-slate-800 rounded-[2rem] p-10 flex flex-col sm:flex-row items-center justify-between text-white mt-12 gap-6">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center border border-slate-700 dark:border-slate-600">
                   <i className="fa-solid fa-check-shield text-2xl text-sky-400"></i>
                </div>
                <div>
                   <h4 className="text-xl font-black uppercase tracking-tighter">EQUILIBRIUM</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ASSETS = L + E</p>
                </div>
             </div>
             <div className="text-center sm:text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Functional Total</p>
                <div className="text-4xl font-black text-emerald-400">Rs. {balanceSheet.totalAssets.toLocaleString()}</div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
