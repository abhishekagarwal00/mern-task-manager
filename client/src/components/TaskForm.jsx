import { useState } from 'react';

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Used for both "New task" and "Edit task" (when `task` is passed)
export default function TaskForm({ task, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    dueDate: toInputDate(task?.dueDate),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ ...form, dueDate: form.dueDate || null });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the task');
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={task ? 'Edit task' : 'New task'}>
        <h2>{task ? 'Edit task' : 'New task'}</h2>
        {error && <div className="alert" role="alert">{error}</div>}

        <label>
          Title
          <input name="title" value={form.title} onChange={set} required maxLength={120} autoFocus />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={set} rows={3} maxLength={1000} />
        </label>

        <div className="row">
          <label>
            Status
            <select name="status" value={form.status} onChange={set}>
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label>
            Priority
            <select name="priority" value={form.priority} onChange={set}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Due date
            <input type="date" name="dueDate" value={form.dueDate} onChange={set} />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save task'}</button>
        </div>
      </form>
    </div>
  );
}
