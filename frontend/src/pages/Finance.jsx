import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export default function Finance() {
  const [total, setTotal] = useState(0);
  const [sales, setSales] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_id: '', amount: '', notes: '' });

  const fetchData = async () => {
    const [finRes, projRes] = await Promise.all([api.get('/finance/sales'), api.get('/projects')]);
    setTotal(finRes.data.total);
    setSales(finRes.data.sales);
    setProjects(projRes.data);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/finance/sales', { ...form, amount: parseFloat(form.amount), project_id: parseInt(form.project_id) });
    setForm({ project_id: '', amount: '', notes: '' });
    setShowForm(false);
    fetchData();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-6 border-t-4 border-t-green-500">
        <p className="text-gray-400">Total Revenue</p>
        <p className="text-4xl font-bold mt-1">{formatCurrency(total)}</p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Sales Records</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select required value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" placeholder="Amount" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm" />
          <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-lg text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-400">
              <th className="px-6 py-3">Project</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 hidden sm:table-cell">Notes</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{s.project_name}</td>
                <td className="px-6 py-4">{formatCurrency(s.amount)}</td>
                <td className="px-6 py-4">{new Date(s.sale_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 hidden sm:table-cell text-gray-400">{s.notes || '—'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => { if (confirm('Delete?')) { api.delete(`/finance/sales/${s.id}`).then(fetchData); } }} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
