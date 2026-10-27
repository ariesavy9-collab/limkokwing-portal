import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import universityLogo from '../logo.png';
import Icon from './Icon';

function SiteLayout({
  children,
  currentPath,
  user,
  isAdmin,
  loading,
  isOnline,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onSignIn,
  onStudentAccess,
  onSignOut,
  notice,
  onDismissNotice,
  navigate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('');
  const helpWidget = useRef(null);
  const accountMenu = useRef(null);
  const accountMenuButton = useRef(null);
  const links = [
    { label: 'Overview', path: '/' },
    { label: 'Browse services', path: '/services' },
    { label: 'New request', path: '/services' },
    { label: 'Requests & tracking', path: '/student', protected: true },
    { label: 'Help & contact', path: '/contact' },
  ];
  const titles = {
    '/': 'Welcome to Student Service Hub',
    '/student': 'Your student overview',
    '/services': 'Browse university services',
    '/courses': 'Courses and programmes',
    '/fees': 'Tuition and fees',
    '/contact': 'Help & support',
    '/staff': 'Staff workspace',
    '/notifications': 'Notifications',
  };
  const activePath = currentPath.startsWith('/request/')
    ? '/services'
    : currentPath.startsWith('/services/')
      ? '/services'
      : currentPath === '/submitted'
        ? '/contact'
        : currentPath;
  const pageTitle = titles[currentPath] || (currentPath.startsWith('/request/') ? 'Submit a service request' : 'Student Service Hub');
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    document.title = `${pageTitle} | Limkokwing Student Service Hub`;
  }, [pageTitle]);

  useEffect(() => {
    if (!helpOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!helpWidget.current?.contains(event.target)) setHelpOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setHelpOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [helpOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!accountMenu.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        accountMenuButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleLink = (link) => {
    setMenuOpen(false);
    setHelpOpen(false);
    if (link.protected) onStudentAccess();
    else navigate(link.path);
  };

  return (
    <div className="portal-shell">
      <aside className={`portal-sidebar${menuOpen ? ' portal-sidebar-open' : ''}`}>
        <Link className="portal-brand" to="/" aria-label="Limkokwing University home" onClick={() => setMenuOpen(false)}>
          <img className="portal-brand-logo" src={universityLogo} alt="Limkokwing University" />
        </Link>
        <div className="portal-nav-group">
          <p className="portal-nav-label">Student portal</p>
          <nav aria-label="Student portal navigation">
            {!user && (
              <button className="portal-nav-link portal-sign-in-link" onClick={() => { setMenuOpen(false); onSignIn(); }}>
                <Icon name="user" size={17} />
                Sign in / Create account
              </button>
            )}
            {links.map((link) => {
              const active = link.label === 'New request'
                ? currentPath.startsWith('/request/')
                : link.label === 'Browse services'
                  ? activePath === '/services' && !currentPath.startsWith('/request/')
                  : activePath === link.path;
              const className = `portal-nav-link${active ? ' active' : ''}`;
              return link.protected ? (
                <button
                  key={`${link.label}-${link.path}`}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => handleLink(link)}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={`${link.label}-${link.path}`}
                  to={link.path}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => { setMenuOpen(false); setHelpOpen(false); }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <p className="portal-nav-label portal-help-label">University information</p>
          <nav aria-label="University information">
            <Link to="/courses" className={`portal-nav-link${currentPath === '/courses' ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
              Courses
            </Link>
            <Link to="/fees" className={`portal-nav-link${currentPath === '/fees' ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
              Tuition & fees
            </Link>
            {isAdmin && (
              <Link to="/staff" className={`portal-nav-link${currentPath === '/staff' ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
                Staff workspace
              </Link>
            )}
          </nav>
        </div>
        <div className="portal-sidebar-bottom">
          <div className="portal-assistance">
            <strong>Need assistance?</strong>
            <p>Contact the Student Affairs office for help with your request.</p>
            <a href="mailto:liteboho.molaoa@limkokwing.ac.ls">Contact support ↗</a>
          </div>
          <small className="portal-version">LIMKOKWING UNIVERSITY · MASERU</small>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div className="portal-heading">
            <div className="portal-breadcrumb">Student portal <span>/</span> {pageTitle}</div>
            <h1>{pageTitle}</h1>
          </div>
          <div className="portal-header-actions">
            {loading ? <span className="header-loading" role="status">Loading account…</span> : user ? (
              <>
                <button
                  type="button"
                  className={`portal-notification-button${currentPath === '/notifications' ? ' active' : ''}`}
                  aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
                  onClick={onOpenNotifications}
                >
                  <Icon name="bell" size={20} />
                  {unreadNotificationCount > 0 && (
                    <span className="portal-notification-count" aria-hidden="true">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
                <div className="portal-account-menu" ref={accountMenu}>
                  <button
                    ref={accountMenuButton}
                    className="portal-account"
                    type="button"
                    aria-label={`Account menu for ${displayName}`}
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    aria-controls="portal-account-dropdown"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                  >
                    <span className="portal-avatar">
                      {user.photoURL && failedPhotoUrl !== user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          onError={() => setFailedPhotoUrl(user.photoURL)}
                        />
                      ) : displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="portal-account-name">{displayName}<small>Account options</small></span>
                  </button>
                  {accountMenuOpen && (
                    <div className="portal-account-dropdown" id="portal-account-dropdown" role="menu">
                      <span className="portal-account-email">{user.email || displayName}</span>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onSignOut();
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button className="button button-primary portal-sign-in" onClick={onSignIn}>
                <Icon name="user" size={17} />
                Sign in
              </button>
            )}
          </div>
        </header>
        {!isOnline && (
          <div className="connection-notice" role="status" aria-live="polite">
            Connection unavailable. Your student data may not load until you reconnect.
          </div>
        )}
        <main id="main-content" className="portal-content" tabIndex="-1">
          {notice && (
            <div className={`notice notice-${notice.type}`} role="status" aria-live="polite">
              <span>{notice.message}</span>
              <button onClick={onDismissNotice} aria-label="Dismiss notification">Dismiss</button>
            </div>
          )}
          {children}
          <footer className="portal-footer">
            <span>Limkokwing University of Creative Technology, Lesotho</span>
            <span>© {new Date().getFullYear()} Limkokwing University</span>
          </footer>
        </main>
      </div>
      <div className="portal-help-widget" ref={helpWidget}>
        {helpOpen && (
          <section className="portal-help-menu" id="portal-help-menu" aria-labelledby="portal-help-title">
            <h2 id="portal-help-title">How can we help?</h2>
            <p>Contact the university team or send us your question.</p>
            <a href="mailto:registry@limkokwing.ac.ls" onClick={() => setHelpOpen(false)}>
              <Icon name="mail" size={18} />
              <span><strong>Email registry</strong><small>registry@limkokwing.ac.ls</small></span>
            </a>
            <a href="tel:+26622313000" onClick={() => setHelpOpen(false)}>
              <Icon name="phone" size={18} />
              <span><strong>Call the campus</strong><small>+266 2231 3000</small></span>
            </a>
            <button type="button" onClick={() => { setHelpOpen(false); navigate('/contact'); }}>
              <Icon name="message" size={18} />
              <span><strong>Send an enquiry</strong><small>Open the contact form</small></span>
            </button>
          </section>
        )}
        <button
          className="portal-help-launcher"
          type="button"
          aria-expanded={helpOpen}
          aria-controls="portal-help-menu"
          onClick={() => setHelpOpen((isOpen) => !isOpen)}
        >
          <Icon name={helpOpen ? 'close' : 'support'} size={20} />
          <span>{helpOpen ? 'Close' : 'Help'}</span>
        </button>
      </div>
      {menuOpen && <button className="portal-sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}

export default SiteLayout;
