import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { KeyRound, Mail, Lock, Sparkles } from 'lucide-react';

const LoginView: React.FC = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      setChallengeToken(data.challengeToken);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code');
      }
      // Save JWT token in local storage
      localStorage.setItem('douyee_admin_token', data.token);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', width: '3rem', height: '3rem', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <KeyRound size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {lang === 'en' ? 'Corporate Portal' : '都宜企业后台'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {challengeToken 
              ? (lang === 'en' ? 'Two-Factor Authentication' : '双因素身份验证') 
              : (lang === 'en' ? 'Provide security credentials' : '提供安全访问凭证')}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {!challengeToken ? (
          /* Step 1: Username & Password */
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Corporate Email' : '公司邮箱'}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={16} />
                </span>
                <input 
                  type="email" 
                  className="form-input" 
                  required
                  placeholder="admin@douyee.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Password' : '账户密码'}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={16} />
                </span>
                <input 
                  type="password" 
                  className="form-input" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (lang === 'en' ? 'Checking...' : '验证中...') : (lang === 'en' ? 'Proceed to verification' : '验证密码')}
            </button>
          </form>
        ) : (
          /* Step 2: 6-digit OTP code challenge */
          <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Enter 6-Digit OTP Code' : '输入6位动态验证码'}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Sparkles size={16} />
                </span>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  style={{ paddingLeft: '2.5rem', letterSpacing: '0.25em', fontWeight: 'bold', fontSize: '1.125rem' }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.7rem', lineHeight: '1.4' }}>
              <strong>{lang === 'en' ? 'Note for testing:' : '测试说明:'}</strong><br />
              {lang === 'en' 
                ? 'Check the backend server command terminal window to copy the generated 6-digit OTP code.'
                : '请检查后端服务器的控制台命令行窗口，以复制生成的6位动态验证码。'}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (lang === 'en' ? 'Validating...' : '核对中...') : (lang === 'en' ? 'Confirm OTP & Access' : '确认验证码并登录')}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setChallengeToken(null)}
              style={{ width: '100%' }}
            >
              {lang === 'en' ? '← Back to credentials' : '← 返回输入密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginView;
