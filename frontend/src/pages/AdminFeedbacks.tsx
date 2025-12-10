import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { FeedbackType, StatisticsResponse } from '../types';
import StatisticsChart from '../components/StatisticsChart';

export default function AdminFeedbacks() {
  const { token } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ unresolved: number; assigned: number; rejected: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'TITLE' | 'STATUS' | 'TYPE' | 'ID'>('UPDATED');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [query, setQuery] = useState('');
  const [assigningDeadline, setAssigningDeadline] = useState<number | null>(null);
  const [deadlineDates, setDeadlineDates] = useState<{ [id: number]: string }>({});
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [expandedPhotos, setExpandedPhotos] = useState<{ [id: number]: boolean }>({});
  const [messageModal, setMessageModal] = useState<{ open: boolean; id: number | null; message: string }>({ open: false, id: null, message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [officerRatings, setOfficerRatings] = useState<{ [email: string]: { averageRating: number | null; totalRatings: number } }>({});

  async function load() {
    if (!token) return;
    try {
      setError(null);
      const [f, o, c, stats] = await Promise.all([
        api.adminFeedbacks(token),
        api.adminOfficers(token),
        api.adminCounts(token),
        api.adminStatistics(token).catch(() => null)
      ]);
      setFeedbacks(f);
      setOfficers(o);
      setCounts(c);
      if (stats) setStatistics(stats);
      
      // Load officer ratings
      const ratings: { [email: string]: { averageRating: number | null; totalRatings: number } } = {};
      for (const officer of o) {
        try {
          const rating = await api.getOfficerRating(officer.email);
          ratings[officer.email] = rating;
        } catch (e) {
          // Ignore errors for individual ratings
        }
      }
      setOfficerRatings(ratings);
    }
    catch (e: any) { setError(e.message || 'Failed to load feedbacks'); }
  }
  useEffect(() => { load(); }, [token]);

  async function handleSendMessage() {
    if (!token || !messageModal.id) return;
    if (!messageModal.message.trim()) {
      setError('Message cannot be empty');
      return;
    }
    setSendingMessage(true);
    setError(null);
    try {
      await api.adminSendMessage(token, messageModal.id, messageModal.message);
      await load();
      setMessageModal({ open: false, id: null, message: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }

  const view = feedbacks
    .filter(f => query.trim() ? String(f.title || '').toLowerCase().includes(query.toLowerCase()) : true)
    .filter(f => statusFilter === 'ALL' ? true : f.status === statusFilter)
    .filter(f => typeFilter === 'ALL' ? true : f.type === typeFilter)
    .slice()
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'UPDATED': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case 'TITLE': cmp = String(a.title).localeCompare(String(b.title)); break;
        case 'STATUS': cmp = String(a.status).localeCompare(String(b.status)); break;
        case 'TYPE': cmp = String(a.type || '').localeCompare(String(b.type || '')); break;
        case 'ID': cmp = Number(a.id) - Number(b.id); break;
      }
      return sortDir === 'ASC' ? cmp : -cmp;
    });

  function toCsv(rows: any[]) {
    const headers = ['ID', 'Title', 'Type', 'Status', 'Category', 'Deadline', 'Updated', 'CitizenName', 'CitizenEmail', 'OfficerName', 'OfficerEmail'];
    const lines = rows.map(r => [
      r.id,
      r.title || '',
      r.submissionType || 'FEEDBACK',
      r.status || '',
      r.type || '',
      r.deadline || '',
      r.updatedAt || '',
      r.citizenName || '',
      r.citizenEmail || '',
      r.officerEmail ? r.officerEmail.split('@')[0] : '',
      r.officerEmail || ''
    ].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','));
    return [headers.join(','), ...lines].join('\n');
  }

  function exportCsv() {
    const csv = toCsv(view);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin-feedbacks.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin · Feedbacks</h2>
        <div className="row small">
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/officers">Officers</Link>
          <Link to="/admin/feedbacks">Feedbacks</Link>
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
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <section>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3>Data Visualization</h3>
          <button className="btn btn-outline" onClick={() => setShowCharts(!showCharts)}>
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </button>
        </div>
        {showCharts && statistics && (
          <StatisticsChart statistics={statistics} title="System-wide Statistics" />
        )}
      </section>

      <section>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3>All Feedbacks ({view.length})</h3>
          <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={load}>Refresh</button>
            <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          marginBottom: '16px',
          padding: '16px',
          background: 'var(--bg-elev-2)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px', flex: '1 1 200px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
            <input 
              placeholder="Search by title..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', flex: '1 1 180px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Filter</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}
            >
              <option value="ALL">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', flex: '1 1 180px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category Filter</span>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value as any)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}
            >
              <option value="ALL">All Categories</option>
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px', flex: '1 1 140px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort By</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}
            >
              <option value="UPDATED">Updated</option>
              <option value="TITLE">Title</option>
              <option value="STATUS">Status</option>
              <option value="TYPE">Category</option>
              <option value="ID">ID</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px', flex: '1 1 120px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order</span>
            <select 
              value={sortDir} 
              onChange={e => setSortDir(e.target.value as any)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </label>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Category</th>
                <th>Deadline</th>
                <th>Updated</th>
                <th>Citizen</th>
                <th>Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.map((f: any) => {
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
                    <td><span className="badge">{f.submissionType || 'FEEDBACK'}</span></td>
                    <td><span className="badge">{f.status}</span></td>
                    <td>{f.type || '-'}</td>
                    <td>
                      {f.deadline ? (
                        <div>
                          <span>{new Date(f.deadline).toLocaleString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          {f.escalationLevel && f.escalationLevel > 0 && (
                            <div className="muted small" style={{ marginTop: '4px' }}>Escalated: {f.escalationLevel}</div>
                          )}
                        </div>
                      ) : f.submissionType === 'GRIEVANCE' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input 
                            type="datetime-local" 
                            style={{ padding: '4px', fontSize: '12px' }}
                            value={deadlineDates[f.id] || ''}
                            onChange={(e) => setDeadlineDates({ ...deadlineDates, [f.id]: e.target.value })}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          <button 
                            className="btn btn-primary"
                            disabled={assigningDeadline === f.id || !deadlineDates[f.id]}
                            onClick={async () => {
                              if (!token) {
                                setError('Please log in to assign deadlines');
                                return;
                              }
                              if (!deadlineDates[f.id]) return;
                              setAssigningDeadline(f.id);
                              setError(null);
                              try {
                                // Send datetime string (YYYY-MM-DDTHH:mm)
                                await api.adminAssignDeadline(token, f.id, deadlineDates[f.id]);
                                await load();
                                setDeadlineDates({ ...deadlineDates, [f.id]: '' });
                              } catch (err: any) {
                                const errorMsg = err.message || 'Failed to assign deadline';
                                setError(errorMsg);
                                // If it's an auth error, suggest re-login
                                if (errorMsg.includes('401') || errorMsg.includes('Authentication')) {
                                  setError(`${errorMsg}. Please try logging out and logging back in.`);
                                }
                              } finally {
                                setAssigningDeadline(null);
                              }
                            }}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            {assigningDeadline === f.id ? 'Setting...' : 'Set Deadline'}
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    <td>{f.updatedAt || ''}</td>
                    <td>
                      <div className="citizen-cell">
                        <span className="name">{f.citizenName || ''}</span>
                        {f.citizenEmail ? <span className="email">{f.citizenEmail}</span> : null}
                      </div>
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
                      {f.officerEmail ? (
                        <div>
                          <div className="citizen-cell">
                            <span className="name">{f.officerEmail.split('@')[0]}</span>
                            <span className="email">{f.officerEmail}</span>
                          </div>
                          {officerRatings[f.officerEmail] && officerRatings[f.officerEmail]?.averageRating !== null && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <strong>Rating:</strong> {officerRatings[f.officerEmail]?.averageRating?.toFixed(1)} ⭐
                              <span style={{ marginLeft: '8px' }}>({officerRatings[f.officerEmail]?.totalRatings} review{officerRatings[f.officerEmail]?.totalRatings !== 1 ? 's' : ''})</span>
                            </div>
                          )}
                        </div>
                      ) : '-' }
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
                          <strong>Message:</strong> {f.adminMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {isEscalated && (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={() => setMessageModal({ open: true, id: f.id, message: '' })}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Take Action
                            </button>
                            {token && (
                              <>
                                <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  const form = e.currentTarget as HTMLFormElement;
                                  const select = form.elements.namedItem('officer') as HTMLSelectElement;
                                  const deadlineInput = form.elements.namedItem('deadline') as HTMLInputElement;
                                  const officerId = Number(select.value);
                                  const deadline = deadlineInput.value;
                                  try {
                                    await api.adminAssignFeedback(token, f.id, officerId);
                                    if (deadline) {
                                      await api.adminAssignDeadline(token, f.id, deadline);
                                    }
                                    await load();
                                    setDeadlineDates({ ...deadlineDates, [f.id]: '' });
                                  } catch (err: any) {
                                    setError(err.message || 'Reassign failed');
                                  }
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                    <select name="officer" defaultValue="" required style={{ fontSize: '12px', padding: '6px' }}>
                                      <option value="" disabled>Reassign officer…</option>
                                      {officers.map(o => (
                                        <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                                      ))}
                                    </select>
                                    <input
                                      type="datetime-local"
                                      name="deadline"
                                      placeholder="New deadline (optional)"
                                      style={{ fontSize: '12px', padding: '6px' }}
                                      min={new Date().toISOString().slice(0, 16)}
                                      value={deadlineDates[f.id] || ''}
                                      onChange={(e) => setDeadlineDates({ ...deadlineDates, [f.id]: e.target.value })}
                                    />
                                    <button className="btn btn-primary" type="submit" style={{ fontSize: '12px', padding: '6px 8px' }}>
                                      Reassign with Deadline
                                    </button>
                                  </div>
                                </form>
                              </>
                            )}
                          </>
                        )}
                        {token && !isEscalated && (
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget as HTMLFormElement;
                            const select = form.elements.namedItem('officer') as HTMLSelectElement;
                            const officerId = Number(select.value);
                            try {
                              await api.adminAssignFeedback(token, f.id, officerId);
                              await load();
                            } catch (err: any) {
                              setError(err.message || 'Assign failed');
                            }
                          }}>
                            <div className="row">
                              <select name="officer" defaultValue="" required style={{ fontSize: '12px' }}>
                                <option value="" disabled>Choose officer…</option>
                                {officers.map(o => (
                                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                                ))}
                              </select>
                              <button className="btn btn-primary" type="submit" style={{ fontSize: '12px', padding: '4px 8px' }}>Assign</button>
                            </div>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {messageModal.open && (() => {
        const feedback = feedbacks.find(f => f.id === messageModal.id);
        const previousMessage = feedback?.adminMessage;
        return (
          <div key="message-modal" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'var(--bg-elev-1)',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid var(--border)'
            }}>
              <h3>Send Message to Officer</h3>
              {previousMessage && (
                <div style={{ 
                  marginTop: '16px', 
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-elev-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Previous Note:
                  </div>
                  <div style={{ 
                    padding: '10px',
                    backgroundColor: 'var(--message-bg)',
                    border: '1px solid var(--message-border)',
                    borderRadius: '6px',
                    color: 'var(--message-text)',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {previousMessage}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <strong>New Message:</strong>
                </label>
                <textarea
                  value={messageModal.message}
                  onChange={(e) => setMessageModal({ ...messageModal, message: e.target.value })}
                  placeholder="Enter your message for the officer..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: 'var(--bg-elev-2)',
                    color: 'var(--text)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setMessageModal({ open: false, id: null, message: '' })}
                  disabled={sendingMessage}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageModal.message.trim()}
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
