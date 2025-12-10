import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { FeedbackType, StatisticsResponse } from '../types';
import StatisticsChart from '../components/StatisticsChart';

const STATUSES = ['SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'] as const;

type Status = typeof STATUSES[number];

type RowState = { [id: number]: Status };

export default function DashboardOfficer() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ unresolved: number; assigned: number; rejected: number; total: number } | null>(null);
  const [rowStatus, setRowStatus] = useState<RowState>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'TITLE' | 'STATUS' | 'TYPE'>('UPDATED');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [query, setQuery] = useState('');
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [expandedPhotos, setExpandedPhotos] = useState<{ [id: number]: boolean }>({});
  const [myRating, setMyRating] = useState<{ averageRating: number | null; totalRatings: number } | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [data, c, stats] = await Promise.all([
        api.officerAssigned(token),
        api.officerCounts(token),
        api.officerStatistics(token).catch(() => null)
      ]);
      setItems(data);
      setCounts(c);
      if (stats) setStatistics(stats);
      const initial: RowState = {};
      data.forEach((d: any) => { initial[d.id] = d.status; });
      setRowStatus(initial);
      
      // Load my rating
      if (user?.email) {
        try {
          const rating = await api.getOfficerRating(user.email);
          setMyRating(rating);
        } catch (e) {
          // Ignore rating errors
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load assigned feedback');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => {
    let rows = items.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(it => String(it.title || '').toLowerCase().includes(q));
    }
    if (filter !== 'ALL') rows = rows.filter(it => it.status === filter);
    if (typeFilter !== 'ALL') rows = rows.filter(it => it.type === typeFilter);
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'UPDATED': cmp = (new Date(a.updatedAt).getTime()) - (new Date(b.updatedAt).getTime()); break;
        case 'TITLE': cmp = String(a.title).localeCompare(String(b.title)); break;
        case 'STATUS': cmp = String(a.status).localeCompare(String(b.status)); break;
        case 'TYPE': cmp = String(a.type || '').localeCompare(String(b.type || '')); break;
      }
      return sortDir === 'ASC' ? cmp : -cmp;
    });
    return rows;
  }, [items, query, filter, typeFilter, sortBy, sortDir]);

  async function saveRow(id: number) {
    if (!token) return;
    const status = rowStatus[id];
    try {
      setSavingId(id);
      await api.officerUpdateStatus(token, id, status as Status);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    } finally {
      setSavingId(null);
    }
  }

  function toCsv(rows: any[]) {
    const headers = ['ID','Title','Status','CitizenName','CitizenEmail','UpdatedAt'];
    const lines = rows.map(r => [r.id, r.title, r.status, r.citizenName || '', r.citizenEmail || '', r.updatedAt || ''].map(v => `"${String(v).replaceAll('"','""')}"`).join(','));
    return [headers.join(','), ...lines].join('\n');
  }

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedbacks.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
      <div className="card">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2>Officer Dashboard</h2>
          {myRating && myRating.averageRating !== null && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <strong>Your Rating:</strong> {myRating.averageRating.toFixed(1)} ⭐
              <span style={{ marginLeft: '8px' }}>({myRating.totalRatings} review{myRating.totalRatings !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
        <div className="row" style={{ gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => setShowCharts(!showCharts)}>
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </button>
          <label style={{ marginRight: 12 }}>
            <span style={{ marginRight: 6 }}>Search</span>
            <input placeholder="Search title..." value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <label style={{ marginRight: 12 }}>
            <span style={{ marginRight: 6 }}>Filter</span>
            <select value={filter} onChange={e => setFilter(e.target.value as any)}>
              <option value="ALL">All</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </label>
          <label style={{ marginRight: 12 }}>
            <span style={{ marginRight: 6 }}>Category</span>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
              <option value="ALL">All</option>
              <option value="INFRASTRUCTURE">Infrastructure</option>
              <option value="PUBLIC_SAFETY">Public Safety</option>
              <option value="HEALTH_SANITATION">Health & Sanitation</option>
              <option value="EDUCATION">Education</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="WATER_SUPPLY">Water Supply</option>
              <option value="TRANSPORT">Transport</option>
              <option value="ENVIRONMENT">Environment</option>
              <option value="CORRUPTION_GOVERNANCE">Corruption & Governance</option>
              <option value="SOCIAL_WELFARE">Social Welfare</option>
              <option value="OTHERS">Others</option>
            </select>
          </label>
          <label style={{ marginRight: 12 }}>
            <span style={{ marginRight: 6 }}>Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="UPDATED">Updated</option>
              <option value="TITLE">Title</option>
              <option value="STATUS">Status</option>
              <option value="TYPE">Category</option>
            </select>
            <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} style={{ marginLeft: 8 }}>
              <option value="DESC">Desc</option>
              <option value="ASC">Asc</option>
            </select>
          </label>
          <button className="btn btn-outline" onClick={load}>Refresh</button>
          <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {counts && (
        <div className="row" style={{ gap: 12, margin: '12px 0' }}>
          <div className="stat-card">
            <div className="stat-title">Unresolved</div>
            <div className="stat-value">{counts.unresolved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Assigned</div>
            <div className="stat-value">{counts.assigned}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Rejected</div>
            <div className="stat-value">{counts.rejected}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Total</div>
            <div className="stat-value">{counts.total}</div>
          </div>
        </div>
      )}

      {loading && <div>Loading assigned feedback...</div>}
      {error && <div className="error">{error}</div>}

      {showCharts && statistics && (
        <StatisticsChart statistics={statistics} title="My Assigned Statistics" />
      )}

      {!loading && filtered.length === 0 && (
        <div className="muted">No feedback found.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Category</th>
                <th>Deadline</th>
                <th>Updated</th>
                <th>Citizen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: any) => {
                const isEscalated = f.status === 'ESCALATED';
                return (
                  <tr 
                    key={f.id}
                    style={isEscalated ? { 
                      backgroundColor: 'var(--escalated-bg)',
                      color: 'var(--escalated-text)'
                    } : {}}
                  >
                    <td>#{f.id}</td>
                    <td className="truncate" title={f.title}>{f.title}</td>
                    <td>
                      <select
                        value={rowStatus[f.id] || f.status}
                        onChange={e => setRowStatus(prev => ({ ...prev, [f.id]: e.target.value as Status }))}
                        disabled={isEscalated}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td>{f.type || '-'}</td>
                    <td>
                      {f.deadline ? (
                        <div>
                          <div>{new Date(f.deadline).toLocaleString()}</div>
                          {f.escalationLevel > 0 && (
                            <div className="muted small">Escalated: {f.escalationLevel}</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>{f.updatedAt || ''}</td>
                    <td>
                      <div className="citizen-cell">
                        <span className="name">{f.citizenName || ''}</span>
                        {f.citizenEmail ? <span className="email">{f.citizenEmail}</span> : null}
                      </div>
                      {f.adminMessage && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px 12px', 
                          backgroundColor: 'var(--message-bg)', 
                          border: '1px solid var(--message-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--message-text)'
                        }}>
                          <strong>Admin:</strong> {f.adminMessage}
                        </div>
                      )}
                      {f.rating && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-elev-2)', borderRadius: '6px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Citizen Rating:</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} style={{ fontSize: '16px', color: f.rating >= star ? '#fbbf24' : '#d1d5db' }}>★</span>
                            ))}
                            <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>{f.rating} star{f.rating !== 1 ? 's' : ''}</span>
                          </div>
                          {f.ratingComment && (
                            <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>"{f.ratingComment}"</div>
                          )}
                        </div>
                      )}
                      {f.photoUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: '11px', padding: '2px 6px' }}
                            onClick={() => setExpandedPhotos({ ...expandedPhotos, [f.id]: !expandedPhotos[f.id] })}
                          >
                            {expandedPhotos[f.id] ? 'Hide' : 'Show'} Photo
                          </button>
                          {expandedPhotos[f.id] && (
                            <div style={{ marginTop: '8px' }}>
                              <img 
                                src={f.photoUrl.startsWith('http') ? f.photoUrl : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8080'}${f.photoUrl}`} 
                                alt="Grievance photo" 
                                style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {!isEscalated && (
                        <button className="btn btn-primary" disabled={savingId === f.id} onClick={() => saveRow(f.id)}>
                          {savingId === f.id ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}




