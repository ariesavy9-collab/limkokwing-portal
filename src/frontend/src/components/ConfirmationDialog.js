import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [pending, setPending] = useState(null);
  const resolveConfirmation = useRef(null);
  const previousFocus = useRef(null);
  const confirmButton = useRef(null);
  const cancelButton = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolveConfirmation.current?.(false);
    resolveConfirmation.current = resolve;
    previousFocus.current = document.activeElement;
    setPending({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Go back',
      destructive: Boolean(options.destructive),
    });
  }), []);

  const finish = useCallback((confirmed) => {
    resolveConfirmation.current?.(confirmed);
    resolveConfirmation.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    if (pending) {
      confirmButton.current?.focus();
    } else if (previousFocus.current?.isConnected) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [pending, confirmButton]);

  useEffect(() => () => resolveConfirmation.current?.(false), []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === cancelButton.current) {
        event.preventDefault();
        confirmButton.current?.focus();
      } else if (!event.shiftKey && document.activeElement === confirmButton.current) {
        event.preventDefault();
        cancelButton.current?.focus();
      }
    }
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {pending && createPortal(
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-message"
            onKeyDown={handleKeyDown}
          >
            <span className={`confirmation-icon${pending.destructive ? ' destructive' : ''}`}>
              <Icon name={pending.destructive ? 'warning' : 'shield'} size={22} />
            </span>
            <h2 id="confirmation-title">{pending.title}</h2>
            <p id="confirmation-message">{pending.message}</p>
            <div className="confirmation-actions">
              <button ref={cancelButton} className="button button-outline" type="button" onClick={() => finish(false)}>
                {pending.cancelLabel}
              </button>
              <button
                ref={confirmButton}
                className={`button ${pending.destructive ? 'button-danger' : 'button-primary'}`}
                type="button"
                onClick={() => finish(true)}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </ConfirmationContext.Provider>
  );
}

export default function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  return confirm || ((options) => Promise.resolve(true));
}
