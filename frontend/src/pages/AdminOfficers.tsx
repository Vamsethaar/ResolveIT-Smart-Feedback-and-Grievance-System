import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminOfficers() {
  const { token } = useAuth();
  const [officers, setOfficers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try { setError(null); setOfficers(await api.adminOfficers(token)); }
    catch (e: any) { setError(e.message || 'Failed to load officers'); }
  }
  useEffect(() => { load(); }, [token]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin · Officers</h2>
        <div className="row small">
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/officers">Officers</Link>
          <Link to="/admin/feedbacks">Feedbacks</Link>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <section>
        <h3>Officers ({officers.length})</h3>
        <ul>
          {officers.map(o => (
            <li key={o.id}>{o.name} · {o.email}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}







