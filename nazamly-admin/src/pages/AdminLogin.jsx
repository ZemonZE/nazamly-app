import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, API_URL } from '../firebase';
import { IconEmail, IconLock, IconBrain, IconEyeOpen, IconEyeClose } from '../Icons/Icons';
import '../CSS/AdminLogin.css';

function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (cooldownTime > 0) {
      setError(`Please wait ${cooldownTime} seconds before trying again`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const token = await user.getIdToken(true);
      
      // Verify admin role with backend
      const response = await fetch(`${API_URL}/api/auth/verify-admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Log detailed error for debugging but throw generic error for security
        console.error('Admin verification failed:', errorData.message);
        throw new Error('Invalid credentials');
      }

      const { user: dbUser } = await response.json();
      
      setFailedAttempts(0);
      
      const userData = {
        user: {
          uid: user.uid,
          email: user.email,
          name: dbUser.name || user.displayName || 'Admin User',
          admin: true
        },
        token
      };

      onLoginSuccess(userData);
    } catch (err) {
      console.error('Login error:', err);
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      if (newFailedAttempts >= 3) {
        setCooldownTime(30);
        setFailedAttempts(0);
        setError('Too many failed attempts. Please wait 30 seconds before trying again');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    // Handle specific system errors that don't reveal user information
    switch (error.code) {
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        // Generic message for all authentication failures (security best practice)
        return 'Invalid credentials';
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <IconBrain />
          </div>
          <h1>نظملي</h1>
          <h2>Admin Dashboard</h2>
          <p>Sign in to manage your platform</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="login-form">
          <div className="input-group">
            <div className="input-icon">
              <IconEmail />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <div className="input-icon">
              <IconLock />
            </div>
            <div className="input-icon-right">
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOpen /> : <IconEyeClose />}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading || cooldownTime > 0}>
            {cooldownTime > 0 
              ? `Wait ${cooldownTime}s` 
              : loading 
                ? 'Signing in...' 
                : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Admin access only</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
