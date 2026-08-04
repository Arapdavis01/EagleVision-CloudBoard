import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Card, Title, Metric, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, TextInput, Button } from '@tremor/react';
import { Plus, Trash2 } from 'lucide-react';

export default function Finance() {
  const [total, setTotal] = useState(0);
  const [sales, setSales] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_id: '', amount: '', notes: '' });

  const fetchData = async () => {
    const [financeRes, projRes] = await Promise.all([
      api.get('/finance/sales'),
      api.get('/projects'),
    ]);
    setTotal(financeRes.data.total);
    setSales(financeRes.data.sales);
    setProjects(projRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/finance/sales', {
      project_id: parseInt(form.project_id),
      amount: parseFloat(form.amount),
      notes: form.notes,
    });
    setForm({ project_id: '', amount: '', notes: '' });
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sale record?')) return;
    await api.delete(`/finance/sales/${id}`);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <Card decoration="top" decorationColor="green">
        <Title>Total Revenue</Title>
        <Metric>{formatCurrency(total)}</Metric>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Sales Records</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <select
            required
            value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}
            className="col-span-1 bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="number"
            required
            placeholder="Amount (KES)"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className="col-span-1 bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
          />
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="col-span-1 bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Project</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.map(s => (
            <TableRow key={s.id}>
              <TableCell>{s.project_name}</TableCell>
              <TableCell>{formatCurrency(s.amount)}</TableCell>
              <TableCell>{new Date(s.sale_date).toLocaleDateString()}</TableCell>
              <TableCell className="text-gray-400">{s.notes || '—'}</TableCell>
              <TableCell>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </TableCell>
            </TableRow>
          ))}
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500 py-8">No sales recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
