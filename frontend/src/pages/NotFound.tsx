import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card">
      <h2>Page Not Found</h2>
      <p className="muted">The page you are looking for does not exist.</p>
      <Link className="btn btn-primary" to="/">Go Home</Link>
    </div>
  );
}











