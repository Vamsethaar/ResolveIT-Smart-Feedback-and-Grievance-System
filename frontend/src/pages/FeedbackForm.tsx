import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { FeedbackType, SubmissionType } from '../types';

export default function FeedbackForm() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<FeedbackType>('OTHERS');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('FEEDBACK');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    setLoading(true);
    try {
      let uploadedPhotoUrl = photoUrl;
      // Upload photo if it's a grievance and a file is selected
      if (submissionType === 'GRIEVANCE' && photoFile) {
        uploadedPhotoUrl = await api.uploadPhoto(token, photoFile);
      }
      await api.submitFeedback(token, { 
        title, 
        description, 
        isPublic, 
        isAnonymous, 
        type, 
        submissionType,
        photoUrl: uploadedPhotoUrl
      });
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setIsAnonymous(false);
      setType('OTHERS');
      setSubmissionType('FEEDBACK');
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoUrl(null);
      setMessage('Submitted successfully');
    } catch (err: any) {
      setMessage(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  const canSubmit = useMemo(() => title.trim() && description.trim(), [title, description]);

  return (
    <div className="card form-card">
      <h2>Submit Feedback / Grievance</h2>
      <form onSubmit={onSubmit} className="form">
        <label>
          <span>Submission Type *</span>
          <select 
            value={submissionType} 
            onChange={e => {
              setSubmissionType(e.target.value as SubmissionType);
              if (e.target.value === 'FEEDBACK') {
                setPhotoFile(null);
                setPhotoPreview(null);
                setPhotoUrl(null);
              }
            }} 
            required
          >
            <option value="FEEDBACK">Feedback</option>
            <option value="GRIEVANCE">Grievance</option>
          </select>
        </label>
        <label>
          <span>Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          <span>Category *</span>
          <select value={type} onChange={e => setType(e.target.value as FeedbackType)} required>
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
        <label>
          <span>Description *</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} required />
        </label>
        {submissionType === 'GRIEVANCE' && (
          <label>
            <span>Photo (Optional)</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoChange}
            />
            {photoPreview && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                />
              </div>
            )}
          </label>
        )}
        <div className="row">
          <label className="checkbox">
            <input
              type="radio"
              name="visibility"
              checked={isPublic}
              onChange={() => { setIsPublic(true); setIsAnonymous(false); }}
            />
            <span>Public</span>
          </label>
          <label className="checkbox">
            <input
              type="radio"
              name="visibility"
              checked={isAnonymous}
              onChange={() => { setIsAnonymous(true); setIsPublic(false); }}
            />
            <span>Anonymous</span>
          </label>
        </div>
        {message && <div className={message.includes('success') ? 'info' : 'error'}>{message}</div>}
        <button className="btn btn-primary" disabled={loading || !canSubmit}>{loading ? 'Submitting...' : 'Submit'}</button>
      </form>
    </div>
  );
}


