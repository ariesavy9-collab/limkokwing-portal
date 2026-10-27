import { useEffect, useRef, useState } from 'react';
import {
  finishPhoneLogin,
  getAuthErrorMessage,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  resetPassword,
  startPhoneLogin,
} from '../models/authRepository';
import { handleFormInput, sanitizeFieldInput, validateForm } from '../models/formValidation';
import Icon from './Icon';
import ValidationErrors, { FieldValidationError } from './ValidationErrors';

function AuthDialog({ initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState('number');
  const recaptchaContainer = useRef(null);
  const recaptchaVerifier = useRef(null);
  const closeButton = useRef(null);
  const emailInput = useRef(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
    };
  }, [onClose]);

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    setValidationErrors(errors);
    if (errors.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    const values = new FormData(event.currentTarget);

    try {
      if (mode === 'register') {
        await registerWithEmail({
          name: values.get('name'),
          studentId: values.get('studentId'),
          phone: values.get('phone'),
          email: values.get('email'),
          password: values.get('password'),
        });
      } else {
        await loginWithEmail(values.get('email'), values.get('password'));
      }
      await onSuccess();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await loginWithGoogle();
      await onSuccess();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const handlePhoneSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    setValidationErrors(errors);
    if (errors.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await startPhoneLogin(phone, recaptchaContainer.current);
      recaptchaVerifier.current = result.verifier;
      setConfirmation(result.confirmation);
      setPhoneStep('code');
      setMessage('A verification code has been sent. Check your phone.');
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleCodeSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    setValidationErrors(errors);
    if (errors.length) return;
    setBusy(true);
    setError('');
    try {
      await finishPhoneLogin(confirmation, new FormData(event.currentTarget).get('verificationCode'));
      await onSuccess();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    const email = emailInput.current?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.current?.setAttribute('aria-invalid', 'true');
      setValidationErrors([{
        fieldId: 'auth-email',
        message: 'Enter a valid email address to receive the reset link.',
      }]);
      setError('');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await resetPassword(email);
      setMessage('Password reset instructions have been sent to your email.');
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode) => {
    if (recaptchaVerifier.current) {
      recaptchaVerifier.current.clear();
      recaptchaVerifier.current = null;
    }
    setMode(nextMode);
    setError('');
    setMessage('');
    setValidationErrors([]);
    setPhoneStep('number');
    setConfirmation(null);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" ref={closeButton} onClick={onClose} aria-label="Close sign-in dialog">×</button>
        <span className="eyebrow"><Icon name="shield" size={14} /> SECURE UNIVERSITY ACCESS</span>
        <h2 id="auth-title">{mode === 'register' ? 'Create your account' : mode === 'phone' ? 'Sign in with your phone' : 'Welcome back'}</h2>
        <p className="auth-intro">
          {mode === 'register'
            ? 'Set up your student account to submit and follow university service requests.'
            : 'Sign in to access your student portal or, if authorized, the university staff workspace.'}
        </p>

        {mode !== 'phone' && (
          <>
            <button className="button google-button" onClick={handleGoogle} disabled={busy} type="button">
              <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M12 12a17 17 0 0 1 24 0" fill="none" stroke="#ea4335" strokeWidth="8" />
                <path d="M36 12a17 17 0 0 1 0 24" fill="none" stroke="#4285f4" strokeWidth="8" />
                <path d="M36 36a17 17 0 0 1-24 0" fill="none" stroke="#34a853" strokeWidth="8" />
                <path d="M12 36a17 17 0 0 1 0-24" fill="none" stroke="#fbbc05" strokeWidth="8" />
                <path d="M24 24h16" fill="none" stroke="#4285f4" strokeWidth="8" />
              </svg>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or use your email</span></div>
            <form className="auth-form" noValidate onSubmit={handleEmailSubmit} onChange={(event) => handleFormInput(event, setValidationErrors)}>
              {mode === 'register' && (
                <>
                  <label htmlFor="auth-name">Full name</label>
                  <input id="auth-name" name="name" autoComplete="name" placeholder="Your name as registered" required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" />
                  <FieldValidationError fieldId="auth-name" errors={validationErrors} />
                  <label htmlFor="auth-student-id">Student number</label>
                  <input id="auth-student-id" name="studentId" autoComplete="off" inputMode="numeric" pattern="[0-9]{9}" data-validation-type="studentId" data-validation-message="Student number must contain exactly 9 digits, for example 901019217." placeholder="e.g. 901019217" required maxLength="9" />
                  <FieldValidationError fieldId="auth-student-id" errors={validationErrors} />
                  <label htmlFor="auth-phone">Mobile number</label>
                  <input id="auth-phone" name="phone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" placeholder="+266 5XXXXXXX" required maxLength="16" />
                  <FieldValidationError fieldId="auth-phone" errors={validationErrors} />
                </>
              )}
              <label htmlFor="auth-email">Email address</label>
              <input ref={emailInput} id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength="254" />
              <FieldValidationError fieldId="auth-email" errors={validationErrors} />
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                minLength={mode === 'register' ? 8 : 6}
                maxLength="128"
                required
              />
              <FieldValidationError fieldId="auth-password" errors={validationErrors} />
              {mode === 'login' && (
                <button type="button" className="text-button reset-button" onClick={handleResetPassword}>
                  Forgot password?
                </button>
              )}
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'register' ? 'Create student account' : 'Sign in with email'}
              </button>
            </form>
            <button className="text-button phone-switch" type="button" onClick={() => switchMode('phone')}>
              Sign in with a mobile verification code
            </button>
            <p className="auth-switch">
              {mode === 'register' ? 'Already have an account?' : 'New to the student portal?'}
              <button className="text-button" type="button" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </>
        )}

        {mode === 'phone' && (
          <form
            className="auth-form phone-form"
            noValidate
            onChange={(event) => handleFormInput(event, setValidationErrors)}
            onSubmit={phoneStep === 'number' ? handlePhoneSubmit : handleCodeSubmit}
          >
            {phoneStep === 'number' ? (
              <>
                <label htmlFor="auth-phone-number">Mobile number</label>
                <input
                  id="auth-phone-number"
                  value={phone}
                  onChange={(event) => {
                    sanitizeFieldInput(event.target);
                    setPhone(event.target.value);
                  }}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+266 5XXX XXXX"
                  pattern="[+]?[0-9]{8,15}"
                  data-validation-type="phone"
                  data-validation-message="Enter a phone number using digits only, with an optional leading +."
                  aria-describedby="phone-number-help"
                  required
                />
                <FieldValidationError fieldId="auth-phone-number" errors={validationErrors} />
                <p className="field-hint" id="phone-number-help">Include your country code, for example +266.</p>
                <div className="recaptcha-container" ref={recaptchaContainer} />
                <button className="button button-primary auth-submit" disabled={busy} type="submit">
                  {busy ? 'Sending code…' : 'Send verification code'}
                </button>
              </>
            ) : (
              <>
                <label htmlFor="auth-verification-code">Verification code</label>
                <input id="auth-verification-code" name="verificationCode" inputMode="numeric" pattern="[0-9]{6}" data-validation-message="Enter the 6-digit verification code." autoComplete="one-time-code" placeholder="Enter the 6-digit code" required maxLength="6" />
                <FieldValidationError fieldId="auth-verification-code" errors={validationErrors} />
                <button className="button button-primary auth-submit" disabled={busy} type="submit">
                  {busy ? 'Verifying…' : 'Verify and continue'}
                </button>
                <button className="text-button phone-switch" type="button" onClick={() => switchMode('phone')}>
                  Use a different number
                </button>
              </>
            )}
            <button className="text-button phone-switch" type="button" onClick={() => switchMode('login')}>
              Back to email sign in
            </button>
          </form>
        )}
        <ValidationErrors errors={validationErrors} />
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        {message && <p className="form-alert form-alert-success" role="status">{message}</p>}
        <p className="auth-privacy">Your account information is used only to provide university services.</p>
      </section>
    </div>
  );
}

export default AuthDialog;
