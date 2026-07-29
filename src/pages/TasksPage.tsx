import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { Card, ErrorBox, Loading, PageTitle } from '../components/UI';

type TaskForm = { title: string; subject: string; priority: string; description: string; due_date: string };
const emptyForm: TaskForm = { title: '', subject: '', priority: 'medium', description: '', due_date: '' };

export default function TasksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [form, setForm] = useState<TaskForm>(emptyForm);

  const load = async () => {
    try { setItems(await api<any[]>('tasks')); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  function createModal() { setEditing(null); setForm(emptyForm); setError(''); setOpen(true); }
  function editModal(task: any) {
    setEditing(task);
    setForm({ title: task.title, subject: task.subject || 'General', priority: task.priority || 'medium', description: task.description || '', due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '' });
    setError(''); setOpen(true);
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('A task title is required.');
    setSaving(true); setError('');
    try {
      const payload = { ...form, subject: form.subject.trim() || 'General' };
      if (editing) await api('tasks', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...payload }) });
      else await api('tasks', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false); setEditing(null); setForm(emptyForm);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggle(task: any) {
    setError('');
    try {
      await api('tasks', { method: 'PUT', body: JSON.stringify({ id: task.id, completed: !task.completed }) });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function remove(id: number) {
    setError('');
    try { await api('tasks', { method: 'DELETE', body: JSON.stringify({ id }) }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function generateWeakTasks() {
    setSaving(true); setError('');
    try {
      const profile = await api<any>('profile');
      const weak = (profile.weaknesses || '').split(',').map((x: string) => x.trim()).filter(Boolean);
      if (!weak.length) throw new Error('Add comma-separated areas to improve in your profile first.');
      for (const area of weak.slice(0, 3)) {
        await api('tasks', { method: 'POST', body: JSON.stringify({ title: `Practice and review: ${area}`, subject: area, priority: 'high', description: `AI-recommended practice for your weak area: ${area}. Explain the idea, solve two examples, and note one remaining question.` }) });
      }
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const filtered = items.filter(task => filter === 'all' || (filter === 'todo' ? !task.completed : task.completed));
  const counts = { all: items.length, todo: items.filter(task => !task.completed).length, completed: items.filter(task => task.completed).length };

  if (loading) return <Loading />;
  return <>
    <PageTitle eyebrow="Stay organized" title="Task manager" desc="Tasks are saved to your account and automatically arranged by priority." action={<div className="flex flex-wrap gap-2"><button disabled={saving} onClick={generateWeakTasks} className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"><Sparkles size={16} /> AI suggest tasks</button><button onClick={createModal} className="btn-primary"><Plus size={18} /> Add task</button></div>} />
    {error && <ErrorBox message={error} />}
    <div className="mb-5 flex gap-3 overflow-auto pb-2">{(['all', 'todo', 'completed'] as const).map(tab => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${filter === tab ? 'bg-violet-600 text-white' : 'glass'}`}>{tab === 'todo' ? 'To do' : tab} {counts[tab]}</button>)}</div>
    <div className="grid gap-3">
      {filtered.map(task => <Card key={task.id} className="flex items-start gap-4 !p-4">
        <button onClick={() => toggle(task)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{task.completed && <Check size={16} />}</button>
        <div className="min-w-0 flex-1"><p className={`font-semibold ${task.completed ? 'text-slate-400 line-through' : ''}`}>{task.title}</p>{task.description && <p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p>}<p className="mt-1 text-xs text-slate-500">{task.subject} · {task.due_date ? new Date(task.due_date).toLocaleString() : 'No deadline'}</p></div>
        <span className={`hidden rounded-full px-3 py-1 text-xs font-bold capitalize sm:block ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : task.priority === 'low' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{task.priority}</span>
        <button onClick={() => editModal(task)} className="p-2 text-slate-400 hover:text-violet-500" aria-label={`Edit ${task.title}`}><Pencil size={17} /></button>
        <button onClick={() => remove(task.id)} className="p-2 text-slate-400 hover:text-rose-500" aria-label={`Delete ${task.title}`}><Trash2 size={17} /></button>
      </Card>)}
      {!filtered.length && <Card className="py-20 text-center text-slate-500">{filter === 'all' ? 'Your task list is clear. Add a goal to get started.' : filter === 'todo' ? 'All tasks completed! Great work.' : 'No completed tasks yet.'}</Card>}
    </div>
    {open && <div className="modal"><form onSubmit={saveTask} className="glass w-full max-w-lg rounded-3xl p-6"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{editing ? 'Edit study task' : 'Create a study task'}</h2><button type="button" onClick={() => setOpen(false)}><X /></button></div>{error && <ErrorBox message={error} />}<label>Task title<input required className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Revise organic chemistry" /></label><label className="mt-4 block">Description<textarea className="input min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What exactly needs to be done?" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Subject<input className="input placeholder:text-slate-400 dark:placeholder:text-slate-500" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="General" /></label><label>Priority<select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><label className="mt-4 block">Deadline<input className="input" type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label><button disabled={saving} className="btn-primary mt-6 w-full">{saving ? 'Saving task…' : editing ? 'Save changes' : 'Create task'}</button></form></div>}
  </>;
}
