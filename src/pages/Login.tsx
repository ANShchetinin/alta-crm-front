import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, Globe, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { loginCall } from '../api/auth';
import '../styles/login.css';

const Login = () => {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { setToken } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = await loginCall(email, password);
      setToken(token);
      navigate('/kanban');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="theme-lang-controls" style={{position: 'absolute', top: 24, right: 24, display: 'flex', gap: 12}}>
         <button className="btn-icon" onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')} style={{color: 'var(--text-primary)'}}>
            <Globe size={20} /> <span style={{fontSize: '12px', marginLeft: 4, fontWeight: 'bold'}}>{language.toUpperCase()}</span>
         </button>
         <button className="btn-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{color: 'var(--text-primary)'}}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>
      <div className="glass-panel login-card">
        <div className="login-header">
          <div className="logo-wrapper">
            <span className="logo-icon">▲</span>
          </div>
          <h1>{t('app.name')}</h1>
          <p>{t('login.title')}</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {errorMsg && <div className="error-message" style={{color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center'}}>{errorMsg}</div>}
          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              className="input-field with-icon"
              placeholder={t('login.email')}
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
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : <><LogIn size={18} /> {t('login.button')}</>}
          </button>
        </form>
        
        <div className="login-footer">
          <p>{t('login.noAccount')} <a href="#">{t('login.requestAccess')}</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
