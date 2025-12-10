import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardCitizen() {
  const { user } = useAuth();
  return (
    <div className="card">
      <h2>Citizen Dashboard</h2>
      <p>Welcome, {user?.name}!</p>
      <div className="grid">
        <Link to="/feedback/new" className="tile">Submit Feedback</Link>
        <Link to="/status" className="tile">Track Status</Link>
        <Link to="/profile" className="tile">Profile</Link>
      </div>
    </div>
  );
}











