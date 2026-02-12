import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { formatCurrency } from '../utils/accounting';

const VoucherList: React.FC = () => {
  const { state, deleteVoucher } = useApp();
  const navigate = useNavigate();

  const getVoucherMetadata = (v: any) => {
    if (v.type === 'Hotel') {
      return `${v.rooms || 1}R x ${v.checkIn && v.checkOut ? Math.ceil((new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / (1000 * 3600 * 24)) : 1}N • ${v.mealPlan || 'RO'}`;
    }
    if (v.type === 'Ticket') {
      return `${v.airlineName || 'Airline'} • ${v.gdsPnr || 'PNR'}`;
    }
    if (v.type === 'Visa') {
      return `${v.country || 'Country'} • ${v.visaType || 'Type'}`;
    }
    if (v.type === 'Transport') {
      return `${v.transportType} • ${v.route}`;
    }
    return v.description;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Voucher Journal</h1>
          <p className="text-slate-500 text-sm">Full audit trail of all financial and inventory transactions</p>
        </div>
        <button 
          onClick={() => navigate('/vouchers/new')}
          className="bg-[#0B1120] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white px-6 py-3 rounded-xl flex items-center shadow-lg transition-all font-black text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-plus-circle mr-2"></i>
          Post New Voucher
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B1120] dark:bg-slate-800 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-6 py-4">Ref #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">Entity / Party</th>
                <th className="px-6 py-4">Service Detail</th>
                <th className="px-6 py-4 text-right">Functional Total</th>
                <th className="px-6 py-4 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {state.vouchers.map(v => {
                const customer = state.customers.find(c => v.entries.some(e => e.customerId === c.id));
                const vendor = state.vendors.find(vend => v.entries.some(e => e.vendorId === vend.id));

                return (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/vouchers/view/${v.id}`} className="text-xs font-black text-sky-600 dark:text-sky-400 hover:underline">
                        {v.voucherNo}
                      </Link>
                      {v.status === 'Draft' && (
                        <span className="ml-2 bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded">DRAFT</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {new Date(v.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        v.type === 'Transport' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                        v.type === 'Receipt' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        v.type === 'Hotel' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        v.type === 'Ticket' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        v.type === 'Visa' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CUST:</span>
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate max-w-[120px]" title={customer.name}>{customer.name}</span>
                          </div>
                        )}
                        {vendor && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">VEND:</span>
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate max-w-[120px]" title={vendor.name}>{vendor.name}</span>
                          </div>
                        )}
                        {!customer && !vendor && <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 italic">INTERNAL</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate max-w-[200px]">
                         {getVoucherMetadata(v)}
                       </div>
                       <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold truncate max-w-[200px]">
                         {v.passengerName || v.description}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100 text-right">
                      {formatCurrency(v.totalAmount)}
                      {v.currency === 'SAR' && <span className="ml-1 text-[8px] text-slate-400 font-black tracking-tighter">({v.currency})</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/vouchers/view/${v.id}`} className="p-2 text-slate-400 hover:text-sky-600 transition-colors" title="View Detail"><i className="fa-solid fa-eye"></i></Link>
                        <button 
                          onClick={() => navigate(`/vouchers/new?cloneFrom=${v.id}`)}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Clone Record"
                        >
                          <i className="fa-solid fa-copy"></i>
                        </button>
                        <button 
                          onClick={() => navigate(`/vouchers/edit/${v.id}`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          onClick={() => deleteVoucher(v.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {state.vouchers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">
                    No records found in the general ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VoucherList;