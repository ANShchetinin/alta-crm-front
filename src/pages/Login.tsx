import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail } from 'lucide-react';
import '../styles/login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock login logic for now
    setTimeout(() => {
      setIsLoading(false);
      navigate('/kanban');
    }, 1000);
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="glass-panel login-card">
        <div className="login-header">
          <div className="logo-wrapper">
            <span className="logo-icon">▲</span>
          </div>
          <h1>AltaCRM</h1>
          <p>Sign in to your workspace</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              className="input-field with-icon"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Key className="input-icon" size={18} />
            <input
              type="password"
              className="input-field with-icon"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Don't have an account? <a href="#">Request access</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
