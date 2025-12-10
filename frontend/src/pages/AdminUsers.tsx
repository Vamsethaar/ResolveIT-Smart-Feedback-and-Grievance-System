import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CITIZEN' });
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    if (!token) return;
    try {
      setError(null);
      const u = await api.adminUsers(token);
      setUsers(u);
    } catch (e: any) { setError(e.message || 'Failed to load users'); }
  }
  useEffect(() => { load(); }, [token]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); if (!token) return;
    try {
      await api.adminCreateUser(token, newUser as any);
      setNewUser({ name: '', email: '', password: '', role: 'CITIZEN' });
      await load();
    } catch (e: any) { setError(e.message || 'Create failed'); }
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); if (!token || !editing) return;
    try {
      const { id, name, email, role, password } = editing;
      await api.adminUpdateUser(token, id, { name, email, role, password: password || undefined } as any);
      setEditing(null);
      await load();
    } catch (e: any) { setError(e.message || 'Update failed'); }
  }
  async function deleteUser(id: number) {
    if (!token) return; if (!confirm('Delete this user?')) return;
    try { await api.adminDeleteUser(token, id); await load(); }
    catch (e: any) { setError(e.message || 'Delete failed'); }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin · Users</h2>
        <div className="row small">
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/officers">Officers</Link>
          <Link to="/admin/feedbacks">Feedbacks</Link>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

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
    </div>
  );
}







