import { useEffect, useRef, useState } from 'react';
import { getAuthErrorMessage, loginWithGoogle } from '../models/authRepository';
import universityLogo from '../logo.png';

const noop = () => {};

function AuthDialog({ onClose = noop, onSuccess, fullPage = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeButton = useRef(null);
  const googleButton = useRef(null);

  useEffect(() => {
    if (fullPage) document.title = 'Portal sign in | Limkokwing Student Service Request System';
    (fullPage ? googleButton.current : closeButton.current)?.focus();
    const handleKeyDown = (event) => {
      if (!fullPage && event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullPage, onClose]);

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
    <div
      className={`modal-backdrop${fullPage ? ' auth-screen' : ''}`}
      onMouseDown={fullPage ? undefined : (event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        {fullPage && (
          <div className="auth-screen-brand">
            <img src={universityLogo} alt="Limkokwing University" />
          </div>
        )}
        {!fullPage && <button className="modal-close" ref={closeButton} onClick={onClose} aria-label="Close sign-in dialog">×</button>}
        <h2 id="auth-title">{fullPage ? 'Login' : 'Sign in to your portal'}</h2>
        <button className="button google-button" ref={googleButton} onClick={handleGoogle} disabled={busy} type="button">
          <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M12 12a17 17 0 0 1 24 0" fill="none" stroke="#ea4335" strokeWidth="8" />
            <path d="M36 12a17 17 0 0 1 0 24" fill="none" stroke="#4285f4" strokeWidth="8" />
            <path d="M36 36a17 17 0 0 1-24 0" fill="none" stroke="#34a853" strokeWidth="8" />
            <path d="M12 36a17 17 0 0 1 0-24" fill="none" stroke="#fbbc05" strokeWidth="8" />
            <path d="M24 24h16" fill="none" stroke="#4285f4" strokeWidth="8" />
          </svg>
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        {fullPage && (
          <>
            <div className="auth-screen-support">
              <span>Need assistance?</span>
              <a href="mailto:registry@limkokwing.ac.ls">Contact Registry</a>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default AuthDialog;