import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User, OfficerRating } from '../types';

interface OfficerProfileProps {
  officerEmail: string;
  onClose: () => void;
}

export default function OfficerProfile({ officerEmail, onClose }: OfficerProfileProps) {
  const { token } = useAuth();
  const [officer, setOfficer] = useState<User | null>(null);
  const [rating, setRating] = useState<OfficerRating | null>(null);
  const [casesHandled, setCasesHandled] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      
      // Always set a fallback officer first
      const fallbackOfficer: User = { 
        id: '', 
        name: officerEmail.split('@')[0], 
        email: officerEmail, 
        role: 'OFFICER' 
      } as User;
      setOfficer(fallbackOfficer);
      
      try {
        // Get rating (public endpoint - doesn't require auth)
        try {
          const ratingData = await api.getOfficerRating(officerEmail);
          setRating(ratingData);
          // Use rating count as fallback for cases handled
          setCasesHandled(ratingData.totalRatings);
        } catch (ratingErr: any) {
          // Rating endpoint failed, but continue with fallback
          setRating({ officerEmail, averageRating: null, totalRatings: 0 });
          setCasesHandled(0);
        }

        // Try to get officer info and cases handled (admin only)
        if (token) {
          try {
            const officers = await api.adminOfficers(token);
            const foundOfficer = officers.find((o: User) => o.email === officerEmail);
            if (foundOfficer) {
              setOfficer(foundOfficer);
            }

            // Get cases handled (resolved feedbacks) - admin only
            try {
              const feedbacks = await api.adminFeedbacks(token);
              const handled = feedbacks.filter((f: any) => 
                f.officerEmail === officerEmail && f.status === 'RESOLVED'
              ).length;
              setCasesHandled(handled);
            } catch (e) {
              // If adminFeedbacks fails, keep the rating-based count
            }
          } catch (e) {
            // If not admin or admin endpoints fail, use fallback
            // Officer already set above
          }
        }
      } catch (err: any) {
        // Only set error if it's a critical failure
        // Don't show error if we have fallback data
        if (!officer) {
          setError(err.message || 'Failed to load officer profile');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [officerEmail, token]);

  if (loading) {
    return (
      <div style={{
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
          maxWidth: '500px',
          width: '90%',
          border: '1px solid var(--border)'
        }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Only show error if we truly can't display anything
  if (error && !officer) {
    return (
      <div style={{
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
          maxWidth: '500px',
          width: '90%',
          border: '1px solid var(--border)'
        }}>
          <div className="error">{error || 'Officer not found'}</div>
          <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
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
        padding: '28px',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Officer Profile</h2>
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-elev-2)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
              {officer.name}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {officer.email}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-elev-2)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cases Handled
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--brand)' }}>
              {casesHandled}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Resolved grievances
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-elev-2)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Average Rating
            </div>
            {rating && rating.averageRating !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--brand)' }}>
                    {rating.averageRating.toFixed(1)}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        style={{
                          fontSize: '24px',
                          color: rating.averageRating && rating.averageRating >= star ? '#fbbf24' : '#d1d5db'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Based on {rating.totalRatings} review{rating.totalRatings !== 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                No ratings yet
              </div>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{ marginTop: '24px', width: '100%' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

