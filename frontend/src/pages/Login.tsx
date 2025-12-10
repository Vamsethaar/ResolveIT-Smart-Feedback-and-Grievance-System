import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      const role = res.user.role;
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'OFFICER') navigate('/officer');
      else navigate('/citizen');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="form">
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p className="muted">No account? <Link to="/register">Register as Citizen</Link></p>
    </div>
  );
}


