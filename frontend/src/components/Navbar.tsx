import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const { mode, toggle } = useTheme();

  return (
    <header className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">SGF</Link>
        <nav className="links">
          {user && hasRole(['CITIZEN']) && (
            <>
              <Link to="/citizen">Dashboard</Link>
              <Link to="/feedback/new">Submit Feedback</Link>
              <Link to="/status">My Status</Link>
            </>
          )}
          {user && hasRole(['OFFICER']) && (
            <Link to="/officer">Officer</Link>
          )}
          {user && hasRole(['ADMIN']) && (
            <Link to="/admin">Admin</Link>
          )}
        </nav>
      </div>
      <div className="nav-right">
        <button 
          className="theme-toggle" 
          aria-label="Toggle theme" 
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          onClick={toggle}
        >
          <span className="theme-icon">{mode === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-text">{mode === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        {!user ? (
          <>
            <Link to="/login" className="btn">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        ) : (
          <>
            <Link to="/profile" className="btn">{user.name}</Link>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </header>
  );
}





