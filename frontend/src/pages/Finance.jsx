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
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 rounded-xl border-t-4 border-green-500">
        <p className="text-gray-400">Total Revenue</p>
        <p className="text-3xl font-bold">{formatCurrency(total)}</p>
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Sales Records</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded text-sm"><Plus size={16} /> Record Sale</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3">
          <select required value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="bg-gray-700 rounded px-3 py-2">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" placeholder="Amount" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-gray-700 rounded px-3 py-2" />
          <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="bg-gray-700 rounded px-3 py-2" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase"><th className="p-3">Project</th><th className="p-3">Amount</th><th className="p-3">Date</th><th className="p-3">Notes</th><th className="p-3"></th></tr></thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800">
                <td className="p-3">{s.project_name}</td>
                <td className="p-3">{formatCurrency(s.amount)}</td>
                <td className="p-3">{new Date(s.sale_date).toLocaleDateString()}</td>
                <td className="p-3 text-gray-400">{s.notes || '—'}</td>
                <td className="p-3"><button onClick={() => { if (confirm('Delete?')) { api.delete(`/finance/sales/${s.id}`).then(fetchData); } }} className="text-red-400"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
