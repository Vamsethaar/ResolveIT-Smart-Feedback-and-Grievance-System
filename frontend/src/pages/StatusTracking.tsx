import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { FeedbackStatusItem } from '../types';

export default function StatusTracking() {
  const { token } = useAuth();
  const [items, setItems] = useState<FeedbackStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escalatingId, setEscalatingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.myFeedback(token);
        if (mounted) setItems(res);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [token]);

  async function handleEscalate(id: number) {
    if (!token || !token.trim()) {
      setError('Please log in to escalate grievances');
      return;
    }
    if (!confirm('Are you sure you want to escalate this grievance to the Admin?')) return;
    setEscalatingId(id);
    setError(null);
    try {
      await api.escalateGrievance(token, id);
      // Reload items to show updated status
      const res = await api.myFeedback(token);
      setItems(res);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to escalate';
      setError(errorMsg);
      // If it's an auth error, suggest re-login
      if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('Authentication') || errorMsg.includes('Unauthorized')) {
        setError('Your session has expired. Please log out and log back in, then try again.');
      }
    } finally {
      setEscalatingId(null);
    }
  }

  function canEscalate(item: FeedbackStatusItem): boolean {
    if (item.submissionType !== 'GRIEVANCE') return false;
    if (item.status === 'RESOLVED' || item.status === 'ESCALATED') return false;
    if (!item.deadline) return false;
    const deadline = new Date(item.deadline);
    const now = new Date();
    return deadline.getTime() < now.getTime();
  }

  async function handleSubmitRating(id: number) {
    if (!token || rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }
    setError(null);
    try {
      await api.submitRating(token, id, rating, ratingComment);
      const res = await api.myFeedback(token);
      setItems(res);
      setRatingId(null);
      setRating(0);
      setRatingComment('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    }
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  return (
    <div className="card">
      <h2>My Feedback / Grievance Status</h2>
      {loading && <div className="muted">Loading...</div>}
      {error && <div className="error">{error}</div>}
      <div className="list">
        {items.map((it) => {
          const canEscalateItem = canEscalate(it);
          const isEscalated = it.status === 'ESCALATED';
          return (
            <div 
              key={it.id} 
              className="list-item"
              style={isEscalated ? { 
                backgroundColor: 'var(--escalated-bg)', 
                borderLeft: '4px solid var(--escalated-border)',
                padding: '12px',
                marginBottom: '12px',
                color: 'var(--escalated-text)'
              } : {}}
            >
              <div className="list-main">
                <div>
                  <div className="title">{it.title}</div>
                  {it.type && (
                    <div className="muted small">
                      Category: {it.type || 'N/A'}
                    </div>
                  )}
                  {it.description && (
                    <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                      {it.description}
                    </div>
                  )}
                  <div className="muted small">
                    Type: {it.submissionType || 'FEEDBACK'} • 
                    Status: <span className={`badge status-${it.status.toLowerCase()}`}>{it.status}</span>
                  </div>
                  {it.deadline && (
                    <div className="muted small">
                      Deadline: {new Date(it.deadline).toLocaleString()}
                      {it.escalationLevel && it.escalationLevel > 0 && (
                        <span> • Escalation Level: {it.escalationLevel}</span>
                      )}
                    </div>
                  )}
                  {it.adminMessage && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '10px 14px', 
                      backgroundColor: 'var(--message-bg)', 
                      border: '1px solid var(--message-border)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--message-text)'
                    }}>
                      <strong>Admin Message:</strong> {it.adminMessage}
                    </div>
                  )}
                  {it.officerName && it.officerEmail && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      <strong>Handled By:</strong> {it.officerName} ({it.officerEmail})
                    </div>
                  )}
                  {it.status === 'RESOLVED' && !it.rating && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      backgroundColor: 'var(--bg-elev-2)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ marginBottom: '8px', fontWeight: 600 }}>Rate the Service</div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '24px',
                              cursor: 'pointer',
                              color: rating >= star ? '#fbbf24' : '#d1d5db',
                              padding: 0,
                              lineHeight: 1
                            }}
                          >
                            ★
                          </button>
                        ))}
                        {rating > 0 && <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>{rating} star{rating !== 1 ? 's' : ''}</span>}
                      </div>
                      <textarea
                        placeholder="Add a comment about the service (optional)"
                        value={ratingComment}
                        onChange={e => setRatingComment(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          background: 'var(--bg-elev-1)',
                          color: 'var(--text)',
                          marginBottom: '8px'
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSubmitRating(Number(it.id))}
                        disabled={rating < 1 || rating > 5}
                        style={{ fontSize: '14px' }}
                      >
                        Submit Rating
                      </button>
                    </div>
                  )}
                  {it.status === 'RESOLVED' && it.rating && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      backgroundColor: 'var(--bg-elev-2)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Your Rating</div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span
                            key={star}
                            style={{
                              fontSize: '20px',
                              color: it.rating && it.rating >= star ? '#fbbf24' : '#d1d5db'
                            }}
                          >
                            ★
                          </span>
                        ))}
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>{it.rating} star{it.rating !== 1 ? 's' : ''}</span>
                      </div>
                      {it.ratingComment && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                          <strong>Comment:</strong> {it.ratingComment}
                        </div>
                      )}
                    </div>
                  )}
                  {it.photoUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={it.photoUrl.startsWith('http') ? it.photoUrl : `${API_BASE_URL.replace('/api', '')}${it.photoUrl}`} 
                        alt="Grievance photo" 
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  {canEscalateItem && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEscalate(Number(it.id))}
                      disabled={escalatingId === Number(it.id)}
                    >
                      {escalatingId === Number(it.id) ? 'Escalating...' : 'Escalate to Admin'}
                    </button>
                  )}
                </div>
              </div>
              <div className="muted small">Created: {new Date(it.createdAt).toLocaleString()} • Updated: {new Date(it.lastUpdatedAt).toLocaleString()}</div>
            </div>
          );
        })}
        {!loading && !error && items.length === 0 && (
          <div className="muted">No submissions yet.</div>
        )}
      </div>
    </div>
  );
}


