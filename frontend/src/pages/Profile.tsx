import type { FormEvent } from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Profile() {
  const { user, token } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    setLoading(true);
    try {
      await api.updateProfile(token, name, password || undefined);
      setPassword('');
      setMessage('Profile updated');
    } catch (err: any) {
      setMessage(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>Profile</h2>
      <div className="muted">Email cannot be changed.</div>
      <form onSubmit={onSubmit} className="form">
        <label>
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          <span>New Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep" />
        </label>
        {message && <div className="info">{message}</div>}
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  );
}


