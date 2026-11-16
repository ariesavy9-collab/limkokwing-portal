import { useEffect, useRef, useState } from 'react';
import { getAuthErrorMessage, loginWithGoogle } from '../models/authRepository';
import Icon from './Icon';

function AuthDialog({ onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeButton = useRef(null);

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      const account = await loginWithGoogle();
      await onSuccess(account);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" ref={closeButton} onClick={onClose} aria-label="Close sign-in dialog">×</button>
        <span className="eyebrow"><Icon name="shield" size={14} /> SECURE UNIVERSITY ACCESS</span>
        <h2 id="auth-title">Sign in to your portal</h2>
        <button className="button google-button" onClick={handleGoogle} disabled={busy} type="button">
          <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M12 12a17 17 0 0 1 24 0" fill="none" stroke="#ea4335" strokeWidth="8" />
            <path d="M36 12a17 17 0 0 1 0 24" fill="none" stroke="#4285f4" strokeWidth="8" />
            <path d="M36 36a17 17 0 0 1-24 0" fill="none" stroke="#34a853" strokeWidth="8" />
            <path d="M12 36a17 17 0 0 1 0-24" fill="none" stroke="#fbbc05" strokeWidth="8" />
            <path d="M24 24h16" fill="none" stroke="#4285f4" strokeWidth="8" />
          </svg>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        <p className="auth-privacy">Need access? Contact Student Affairs to confirm your account is registered.</p>
      </section>
    </div>
  );
}

export default AuthDialog;