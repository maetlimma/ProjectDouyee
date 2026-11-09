import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Check, KeyRound, LoaderCircle, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';

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
      if (data.devOtp || data.testOtp) {
        setOtpCode(data.devOtp || data.testOtp);
      }
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
    <div className="ac-login-screen">
      <section className="ac-login-card">
        <aside className="ac-login-brand-panel">
          <div className="ac-login-brand-mark">DY</div>
          <span className="ac-eyebrow">DOUYEE · PRODUCT OPERATIONS</span>
          <h1>{lang === 'en' ? 'A clear view of your product catalog.' : 'จัดการข้อมูลสินค้าได้ในที่เดียว'}</h1>
          <p>{lang === 'en' ? 'Manage products, series, certificates and product files in one workspace.' : 'ดูแลสินค้า ซีรีส์ ใบรับรอง และไฟล์ประกอบในพื้นที่ทำงานเดียว'}</p>
          <div className="ac-login-steps"><span className={!challengeToken ? 'current' : 'complete'}><i>{challengeToken ? '✓' : '1'}</i>Credentials</span><b /><span className={challengeToken ? 'current' : ''}><i>2</i>OTP verification</span></div>
        </aside>
        <section className="ac-login-form-panel">
          <div className="ac-login-form-heading"><span className="ac-login-key-icon">{challengeToken ? <Sparkles size={18} /> : <KeyRound size={18} />}</span><div><div className="ac-eyebrow">ADMIN ACCESS</div><h2>{challengeToken ? 'Verify your sign-in' : 'Welcome back'}</h2><p>{challengeToken ? 'Enter the six-digit code from the server console.' : 'Sign in to continue to the admin workspace.'}</p></div></div>
          {error && <div className="ac-login-error"><span>!</span>{error}</div>}
          {!challengeToken ? (
            <form className="ac-login-form" onSubmit={handleCredentialsSubmit}>
              <label className="ac-login-field"><span>Corporate email</span><div><Mail size={16} /><input type="email" required autoComplete="username" placeholder="admin@douyee.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label>
              <label className="ac-login-field"><span>Password</span><div><Lock size={16} /><input type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /></div></label>
              <button type="submit" className="ac-button ac-button-primary ac-login-submit" disabled={loading}>{loading ? <LoaderCircle size={15} className="ac-spin" /> : <ShieldCheck size={15} />}{loading ? 'Checking credentials…' : 'Continue securely'}</button>
            </form>
          ) : (
            <form className="ac-login-form" onSubmit={handleOtpSubmit}>
              <label className="ac-login-field"><span>6-digit one-time code</span><div className="ac-otp-input"><Sparkles size={16} /><input type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} /></div></label>
              <div className="ac-login-tip"><ShieldCheck size={15} /><span>{otpCode ? 'Development mode: OTP code has been auto-filled.' : 'For local development, find the one-time code in the backend server console.'}</span></div>
              <button type="submit" className="ac-button ac-button-primary ac-login-submit" disabled={loading}>{loading ? <LoaderCircle size={15} className="ac-spin" /> : <Check size={15} />}{loading ? 'Verifying…' : 'Verify and open workspace'}</button>
              <button type="button" className="ac-login-back" onClick={() => { setChallengeToken(null); setOtpCode(''); setError(null); }}>← Back to credentials</button>
            </form>
          )}
          <div className="ac-login-form-footer"><span>Protected admin workspace</span><span>Dou Yee</span></div>
        </section>
      </section>
    </div>
  );
};

export default LoginView;
