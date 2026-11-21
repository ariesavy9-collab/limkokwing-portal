import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import universityLogo from '../logo.png';
import Icon from './Icon';
import { subscribeToStudentRecord } from '../models/portalRepository';

function formatProfileDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function SiteLayout({
  children,
  currentPath,
  currentSection = 'requests',
  user,
  profile,
  isAdmin,
  loading,
  isOnline,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onSignOut,
  notice,
  onDismissNotice,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [studentRecord, setStudentRecord] = useState(null);
  const [studentRecordLoading, setStudentRecordLoading] = useState(false);
  const [studentRecordError, setStudentRecordError] = useState('');
  const helpWidget = useRef(null);
  const accountMenu = useRef(null);
  const accountMenuButton = useRef(null);
  const googlePhotoUrl = user?.photoURL || user?.providerData?.find((provider) => provider.providerId === 'google.com')?.photoURL;
  const studentSections = [
    {
      title: 'Student space',
      label: 'Student navigation',
      links: [
        { label: 'Student home', path: '/student', icon: 'user' },
        { label: 'Browse services', path: '/services', icon: 'grid' },
        { label: 'Letters', path: '/letters', icon: 'document' },
        { label: 'Notifications', path: '/notifications', icon: 'bell' },
      ],
    },
  ];
  const adminSections = [
    {
      title: 'Administration',
      label: 'Administration navigation',
      links: [
        { label: 'Request queue', path: '/staff?view=requests', section: 'requests', icon: 'document' },
        { label: 'Public enquiries', path: '/staff?view=inquiries', section: 'inquiries', icon: 'message' },
        { label: 'Finance & fees', path: '/staff?view=finance', section: 'finance', icon: 'chart' },
        { label: 'Student directory', path: '/staff?view=students', section: 'students', icon: 'id' },
        { label: 'Service setup', path: '/staff?view=services', section: 'services', icon: 'grid' },
        { label: 'Staff access', path: '/staff?view=staff', section: 'staff', icon: 'shield' },
        { label: 'Academic options', path: '/staff?view=academics', section: 'academics', icon: 'university' },
      ],
    },
  ];
  const navigationSections = isAdmin ? adminSections : studentSections;
  const titles = {
    '/': 'University home',
    '/student': 'Student home',
    '/letters': 'Letters',
    '/services': 'Services',
    '/courses': 'Courses and programmes',
    '/fees': 'Tuition and fees',
    '/contact': 'Help & support',
    '/staff': {
      requests: 'Request queue',
      inquiries: 'Public enquiries',
      finance: 'Finance & fees',
      students: 'Student directory',
      services: 'Service setup',
      staff: 'Staff access',
      academics: 'Academic options',
    }[currentSection],
    '/notifications': 'Notifications',
  };
  const activePath = currentPath.startsWith('/request/')
    ? '/services'
    : currentPath.startsWith('/services/')
      ? '/services'
      : currentPath === '/submitted'
        ? '/contact'
        : currentPath;
  const pageTitle = titles[currentPath] || (currentPath.startsWith('/request/') ? 'Submit a service request' : 'University home');
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const mobileLinks = isAdmin
    ? adminSections[0].links.slice(0, 4)
    : studentSections[0].links;
  const profileDetails = { ...profile, ...studentRecord };
  const isVerifiedStudent = Boolean(studentRecord) && [
    'name',
    'email',
    'studentId',
    'dateOfBirth',
    'birthPlace',
    'phone',
    'address',
    'faculty',
    'course',
  ].every((field) => typeof studentRecord[field] === 'string' && studentRecord[field].trim());

  useEffect(() => {
    setFailedPhotoUrl('');
  }, [googlePhotoUrl]);

  useEffect(() => {
    if (!profileOpen || !user?.email) return undefined;
    setStudentRecord(null);
    setStudentRecordLoading(true);
    setStudentRecordError('');
    return subscribeToStudentRecord(user.email, (record) => {
      setStudentRecord(record);
      setStudentRecordLoading(false);
    }, (error) => {
      setStudentRecordLoading(false);
      setStudentRecordError(error.message || 'Your university profile could not be loaded.');
    });
  }, [profileOpen, user?.email]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [profileOpen]);

  const isActiveLink = (link) => link.section
    ? currentPath === '/staff' && currentSection === link.section
    : activePath === link.path;

  useEffect(() => {
    document.title = `${pageTitle} | Limkokwing Student Service Request System`;
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

  return (
    <div className="portal-shell">
      <aside className={`portal-sidebar${menuOpen ? ' portal-sidebar-open' : ''}`}>
        <Link className="portal-brand" to="/" aria-label="Limkokwing University home" onClick={() => setMenuOpen(false)}>
          <img className="portal-brand-logo" src={universityLogo} alt="Limkokwing University" />
        </Link>
        <div className="portal-nav-group">
          {navigationSections.map((section) => (
            <section className="portal-nav-section" key={section.title}>
              <p className="portal-nav-label">{section.title}</p>
              <nav aria-label={section.label}>
                {section.links.map((link) => {
                  const active = isActiveLink(link);
                  return (
                    <Link
                      key={`${link.label}-${link.path}`}
                      to={link.path}
                      className={`portal-nav-link${active ? ' active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => { setMenuOpen(false); setHelpOpen(false); }}
                    >
                      <Icon name={link.icon} size={17} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>
        <div className="portal-sidebar-bottom">
          {!isAdmin && <div className="portal-assistance">
            <strong>Need assistance?</strong>
            <p>Contact the Student Affairs office for help with your request.</p>
            <a href="mailto:liteboho.molaoa@limkokwing.ac.ls">Contact support</a>
          </div>}
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
            {loading ? <span className="header-loading" role="status">Loading account…</span> : (
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
                      {googlePhotoUrl && failedPhotoUrl !== googlePhotoUrl ? (
                        <img
                          src={googlePhotoUrl}
                          alt=""
                          onError={() => setFailedPhotoUrl(googlePhotoUrl)}
                        />
                      ) : displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="portal-account-name">{displayName}<small>Account options</small></span>
                  </button>
                  {accountMenuOpen && (
                    <div className="portal-account-dropdown" id="portal-account-dropdown" role="menu">
                      <span className="portal-account-email">{user.email || displayName}</span>
                      <button
                        className="portal-account-view-profile"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setProfileOpen(true);
                        }}
                      >
                        View profile
                      </button>
                      <button
                        className="portal-account-signout"
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
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {mobileLinks.map((link) => {
            const active = isActiveLink(link);
            return (
              <Link
                key={`${link.label}-${link.path}`}
                to={link.path}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={link.icon} size={19} /><span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      {profileOpen && (
        <div className="profile-overlay">
          <section
            className="profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-profile-title"
          >
            <button className="profile-dialog-close" type="button" aria-label="Close profile" onClick={() => setProfileOpen(false)}>×</button>
            <div className="profile-dialog-heading">
              <span className="profile-dialog-photo">
                {googlePhotoUrl && failedPhotoUrl !== googlePhotoUrl
                  ? <img src={googlePhotoUrl} alt="" onError={() => setFailedPhotoUrl(googlePhotoUrl)} />
                  : displayName.charAt(0).toUpperCase()}
              </span>
              <div>
                <span className="eyebrow">ACCOUNT PROFILE</span>
                <div className="profile-name-row">
                  <h2 id="account-profile-title">{profileDetails.name || user?.displayName || displayName}</h2>
                  {isVerifiedStudent && (
                    <span className="profile-verified-badge" role="img" aria-label="Verified student" title="Verified student">
                      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3.2 3.2L15.5 6" /></svg>
                    </span>
                  )}
                </div>
                <p>{profileDetails.email || user?.email || 'Email unavailable'}</p>
              </div>
            </div>
            {studentRecordLoading && <p className="form-intro" role="status">Loading your university details…</p>}
            {studentRecordError && <p className="form-alert form-alert-error" role="alert">{studentRecordError}</p>}
            <dl className="profile-detail-list">
              {[
                ['Student number', profileDetails.studentId],
                ['Faculty', profileDetails.faculty],
                ['Course', profileDetails.course],
                ['Date of birth', formatProfileDate(profileDetails.dateOfBirth)],
                ['Place of birth', profileDetails.birthPlace],
                ['Mobile number', profileDetails.phone],
                ['Home address', profileDetails.address],
              ].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>
              ))}
            </dl>
          </section>
        </div>
      )}
      {!isAdmin && <div className="portal-help-widget" ref={helpWidget}>
        {helpOpen && (
          <section className="portal-help-menu" id="portal-help-menu" aria-labelledby="portal-help-title">
            <h2 id="portal-help-title">How can we help?</h2>
            <p>Contact Student Affairs for help with your student account or service request.</p>
            <a href="mailto:registry@limkokwing.ac.ls" onClick={() => setHelpOpen(false)}>
              <Icon name="mail" size={18} />
              <span><strong>Email registry</strong><small>registry@limkokwing.ac.ls</small></span>
            </a>
            <a href="tel:+26622313000" onClick={() => setHelpOpen(false)}>
              <Icon name="phone" size={18} />
              <span><strong>Call the campus</strong><small>+266 2231 3000</small></span>
            </a>
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
      </div>}
      {menuOpen && <button className="portal-sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}

export default SiteLayout;
