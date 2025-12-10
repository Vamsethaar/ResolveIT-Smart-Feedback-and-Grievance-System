import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardAdmin() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CITIZEN' });
  const [editing, setEditing] = useState<any | null>(null);

  async function loadAll() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [u, o, f] = await Promise.all([
        api.adminUsers(token),
        api.adminOfficers(token),
        api.adminFeedbacks(token)
      ]);
      setUsers(u);
      setOfficers(o);
      setFeedbacks(f);
    } catch (e: any) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [token]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await api.adminCreateUser(token, newUser as any);
      setNewUser({ name: '', email: '', password: '', role: 'CITIZEN' });
      await loadAll();
    } catch (e: any) { setError(e.message || 'Create failed'); }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editing) return;
    try {
      const { id, name, email, role, password } = editing;
      await api.adminUpdateUser(token, id, { name, email, role, password: password || undefined } as any);
      setEditing(null);
      await loadAll();
    } catch (e: any) { setError(e.message || 'Update failed'); }
  }

  async function deleteUser(id: number) {
    if (!token) return;
    if (!confirm('Delete this user?')) return;
    try {
      await api.adminDeleteUser(token, id);
      await loadAll();
    } catch (e: any) { setError(e.message || 'Delete failed'); }
  }

  if (loading) return <div className="card"><h2>Admin Dashboard</h2><div>Loading...</div></div>;
  if (error) return <div className="card"><h2>Admin Dashboard</h2><div className="error">{error}</div></div>;

  return (
    <div className="card">
      <h2>Admin Dashboard</h2>

      <section>
        <h3>Create User/Officer/Admin</h3>
        <form onSubmit={createUser} className="form">
          <div className="row">
            <input placeholder="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
            <input placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="CITIZEN">CITIZEN</option>
              <option value="OFFICER">OFFICER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button className="btn btn-primary" type="submit">Create</button>
          </div>
        </form>
      </section>

      <section>
        <h3>Users ({users.length})</h3>
        <ul className="list">
          {users.map(u => (
            <li key={u.id} className="list-item">
              <div className="list-main">
                <div>{u.name} · {u.email} · <span className="badge">{u.role}</span></div>
                <div>
                  <button className="btn btn-outline" onClick={() => setEditing({ ...u, password: '' })}>Edit</button>
                  <button className="btn btn-outline" onClick={() => deleteUser(u.id)}>Delete</button>
                </div>
              </div>
              {editing && editing.id === u.id && (
                <form onSubmit={saveEdit} className="form" style={{ marginTop: 12 }}>
                  <div className="row">
                    <input placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
                    <input placeholder="Email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} required />
                    <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                      <option value="CITIZEN">CITIZEN</option>
                      <option value="OFFICER">OFFICER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <input placeholder="New password (optional)" type="password" value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} />
                    <button className="btn btn-primary" type="submit">Save</button>
                    <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Officers ({officers.length})</h3>
        <ul>
          {officers.map(o => (
            <li key={o.id}>{o.name} · {o.email}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>All Feedbacks ({feedbacks.length})</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Citizen</th>
                <th>Officer</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f: any) => {
                const citizen = f.isAnonymous ? 'Anonymous user' : `${f.citizen?.name || ''} · ${f.citizen?.email || ''}`;
                const officer = f.assignedOfficer ? `${f.assignedOfficer.name || ''} · ${f.assignedOfficer.email || ''}` : '-';
                return (
                  <tr key={f.id}>
                    <td>#{f.id}</td>
                    <td>{f.title}</td>
                    <td><span className="badge">{f.status}</span></td>
                    <td>{citizen}</td>
                    <td>{officer}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}




