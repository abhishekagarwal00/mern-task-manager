import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>TaskFlow</h1>
        <p className="muted">{isLogin ? 'Sign in to see your board.' : 'Create an account to start organising work.'}</p>

        {error && <div className="alert" role="alert">{error}</div>}

        {!isLogin && (
          <label>
            Name
            <input name="name" value={form.name} onChange={set} required autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={set} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={set}
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </label>

        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>

        <p className="muted small">
          {isLogin ? 'New here? ' : 'Already registered? '}
          <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link>
        </p>
      </form>
    </main>
  );
}
