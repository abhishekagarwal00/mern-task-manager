import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', priority: '', sort: '-createdAt' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, task = edit

  // Debounced fetch: waits 300 ms after the last keystroke before calling the API
  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get('/tasks', { params: { ...params, limit: 100 } });
      setTasks(data.tasks);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (values) => {
    if (editing?._id) {
      const { data } = await api.put(`/tasks/${editing._id}`, values);
      setTasks((ts) => ts.map((t) => (t._id === data._id ? data : t)));
    } else {
      const { data } = await api.post('/tasks', values);
      setTasks((ts) => [data, ...ts]);
    }
    setEditing(null);
  };

  // Optimistic update: move the card instantly, roll back if the server rejects it
  const move = async (task, status) => {
    const previous = tasks;
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status } : t)));
    try {
      await api.put(`/tasks/${task._id}`, { status });
    } catch (err) {
      setTasks(previous);
      setError(errorMessage(err));
    }
  };

  const remove = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((ts) => ts.filter((t) => t._id !== task._id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const setFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">TaskFlow</strong>
        <div className="who">
          <span>{user.name}</span>
          <button className="btn small" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="container">
        <section className="progress" aria-label="Progress">
          <div>
            <h1>{total === 0 ? 'Your board is empty' : `${done} of ${total} tasks done`}</h1>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button className="btn primary" onClick={() => setEditing({})}>Add task</button>
        </section>

        <section className="filters" aria-label="Filters">
          <input name="search" placeholder="Search by title" value={filters.search} onChange={setFilter} />
          <select name="priority" value={filters.priority} onChange={setFilter} aria-label="Priority">
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select name="sort" value={filters.sort} onChange={setFilter} aria-label="Sort">
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="dueDate">Due date: soonest</option>
            <option value="-dueDate">Due date: latest</option>
          </select>
        </section>

        {error && <div className="alert" role="alert">{error}</div>}

        {loading ? (
          <p className="center-note">Loading tasks…</p>
        ) : (
          <div className="board">
            {COLUMNS.map((col) => {
              const items = tasks.filter((t) => t.status === col.key);
              return (
                <section className="column" key={col.key} aria-label={col.label}>
                  <h2>
                    {col.label} <span className="count">{items.length}</span>
                  </h2>
                  {items.length === 0 && (
                    <p className="empty">{col.key === 'todo' ? 'Nothing waiting. Add a task to get started.' : 'No tasks here yet.'}</p>
                  )}
                  {items.map((t) => (
                    <TaskCard key={t._id} task={t} onMove={move} onEdit={setEditing} onDelete={remove} />
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {editing && <TaskForm task={editing._id ? editing : null} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
