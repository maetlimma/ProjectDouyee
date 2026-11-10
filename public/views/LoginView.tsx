import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Inbox, LoaderCircle, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';

const LoginView: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(true);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.otpEnabled === 'boolean') {
          setOtpEnabled(data.otpEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailNotice(null);
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

      // If OTP is disabled in config, token is issued immediately
      if (data.token) {
        localStorage.setItem('douyee_admin_token', data.token);
        navigate('/dashboard');
        return;
      }

      setChallengeToken(data.challengeToken);
      setEmailSent(Boolean(data.emailSent));
      if (data.emailSent) {
        setEmailNotice(`A 6-digit verification code has been sent to ${email}. Please check your inbox.`);
      } else {
        setEmailNotice(`SMTP credentials not configured in .env. OTP was output to server console (or auto-filled below for dev).`);
      }
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
          <div className="ac-login-brand-logo-wrap">
            <img src="/assets/douyee-logo.png" alt="Dou Yee Enterprises" className="ac-login-brand-logo" />
          </div>
          <div className="ac-login-steps">
            <span className="current"><i>✓</i>Password sign-in</span>
          </div>
        </aside>
        <section className="ac-login-form-panel">
          <div className="ac-login-form-heading">
            <h2>{challengeToken ? 'Verify your sign-in' : 'Welcome back'}</h2>
            <p>{challengeToken ? 'Enter the six-digit code sent to your email.' : 'Sign in to continue.'}</p>
          </div>
          {error && <div className="ac-login-error"><span>!</span>{error}</div>}
          {emailNotice && !error && (
            <div className={`ac-notice-apple ${emailSent ? 'ac-notice-apple-info' : 'ac-notice-apple-warning'}`} style={{ marginBottom: 16 }}>
              <Inbox size={16} />
              <span>{emailNotice}</span>
            </div>
          )}
          {!challengeToken ? (
            <form className="ac-login-form" onSubmit={handleCredentialsSubmit}>
              <label className="ac-login-field">
                <span>Corporate email</span>
                <div>
                  <Mail size={16} />
                  <input type="email" required autoComplete="username" placeholder="admin@douyee.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </label>
              <label className="ac-login-field">
                <span>Password</span>
                <div>
                  <Lock size={16} />
                  <input type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </label>
              <button type="submit" className="ac-button ac-button-primary ac-login-submit" disabled={loading}>
                {loading ? <LoaderCircle size={15} className="ac-spin" /> : <ShieldCheck size={15} />}
                {loading ? 'Checking credentials…' : (otpEnabled ? 'Continue securely' : 'Sign in')}
              </button>
            </form>
          ) : (
            <form className="ac-login-form" onSubmit={handleOtpSubmit}>
              <label className="ac-login-field">
                <span>6-digit one-time code</span>
                <div className="ac-otp-input">
                  <Sparkles size={16} />
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                </div>
              </label>
              <div className="ac-login-tip">
                <ShieldCheck size={15} />
                <span>{otpCode ? 'Development mode: OTP code has been auto-filled.' : 'Please check your email inbox for the 6-digit one-time verification code.'}</span>
              </div>
              <button type="submit" className="ac-button ac-button-primary ac-login-submit" disabled={loading}>
                {loading ? <LoaderCircle size={15} className="ac-spin" /> : <Check size={15} />}
                {loading ? 'Verifying…' : 'Verify and open workspace'}
              </button>
              <button type="button" className="ac-login-back" onClick={() => { setChallengeToken(null); setOtpCode(''); setError(null); setEmailNotice(null); }}>
                ← Back to credentials
              </button>
            </form>
          )}
          <div className="ac-login-form-footer">
          </div>
        </section>
      </section>
    </div>
  );
};

export default LoginView;
