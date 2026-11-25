import { useCallback, useEffect, useState } from 'react';
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import AuthDialog from './components/AuthDialog';
import useConfirmation, { ConfirmationProvider } from './components/ConfirmationDialog';
import SiteLayout from './components/SiteLayout';
import {
  AdminDashboard,
  ChatPage,
  NotificationsPage,
  RequestPage,
  ServiceDetailsPage,
  ServicesPage,
  StudentLettersPage,
  StudentDashboard,
  SubmissionConfirmationPage,
  SuccessPage,
} from './pages/PortalPages';
import useAuth from './controllers/useAuth';
import useServices from './controllers/useServices';
import { findService as findDefaultService } from './models/services';
import {
  cancelStudentRequest,
  createService,
  saveAcademicOptions,
  createStudentRecord,
  createStudentRequest,
  deleteStudentRequest,
  deleteStudentLetter,
  deleteRequest,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToStudentLetters,
  subscribeToNotifications,
  subscribeToAcademicOptions,
  setRequestFeeStatus,
  setRequestStatus,
  sendStudentLetterAndAcceptRequest,
  updateStudentRecord,
  updateStudentRequest,
} from './models/portalRepository';
import { grantAdminAccess, removeStudent } from './models/staffRepository';
import './App.css';
import './PortalRedesign.css';
import './PortalExperience.css';

function PortalFrame({ layoutProps }) {
  return (
    <SiteLayout {...layoutProps}>
      <Outlet />
    </SiteLayout>
  );
}

function ServiceRoute({ services, navigate }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item.id === serviceId) || findDefaultService(serviceId);

  if (!service) {
    return <SuccessPage navigate={navigate} title="Service not found" message="This service may have moved or is no longer available." />;
  }
  if (!service.studentOnly) {
    return <SuccessPage navigate={navigate} title="Service unavailable" message="This service is not available in the student portal." primaryLabel="Back to student services" primaryPath="/services" />;
  }

  return (
    <ServiceDetailsPage
      service={service}
      navigate={navigate}
      onRequest={() => navigate(service.id === 'enquiry' ? '/chat' : `/request/${service.id}`)}
    />
  );
}

function RequestRoute({ services, user, profile, navigate }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item.id === serviceId) || findDefaultService(serviceId);
  if (!service) {
    return <SuccessPage navigate={navigate} title="Service not found" message="Choose a service from the service directory to continue." />;
  }
  if (!service.studentOnly) {
    return <SuccessPage navigate={navigate} title="Service unavailable" message="This service is not available in the student portal." primaryLabel="Back to student services" primaryPath="/services" />;
  }

  return (
    <RequestPage
      service={service}
      user={user}
      profile={profile}
      onStudentSubmit={(request) => createStudentRequest(user, request)}
      onSubmitted={(submission) => navigate('/submitted', { state: { submission } })}
      navigate={navigate}
    />
  );
}

function PortalApp() {
  const confirm = useConfirmation();
  const { user, profile, isAdmin, loading, authError, isOnline } = useAuth();
  const { services, error: servicesError } = useServices(Boolean(user && !loading));
  const location = useLocation();
  const routerNavigate = useNavigate();
  const path = location.pathname;
  const requestedStaffSection = new URLSearchParams(location.search).get('view');
  const staffSection = requestedStaffSection === 'accounts'
    ? 'staff'
    : ['requests', 'inquiries', 'chat', 'students', 'finance', 'services', 'staff', 'academics'].includes(requestedStaffSection)
      ? requestedStaffSection
      : 'requests';
  const [notice, setNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const userId = user?.uid;

  const navigate = useCallback((nextPath, options) => {
    routerNavigate(nextPath, options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [routerNavigate]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setNotificationError('');
      return undefined;
    }
    return subscribeToNotifications(userId, (items) => {
      setNotifications(items);
      setNotificationError('');
    }, (error) => {
      setNotificationError(error.message || 'Notifications could not be loaded.');
    });
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    if (!user && path !== '/') {
      navigate('/');
    } else if (path === '/' && user) {
      navigate(isAdmin ? '/staff' : '/student');
    } else if (path === '/student' && isAdmin && user) {
      navigate('/staff');
    } else if (path === '/staff' && !isAdmin) {
      navigate('/student');
      setNotice({ type: 'error', message: 'Staff access is restricted to authorized university accounts.' });
    }
  }, [isAdmin, loading, navigate, path, user]);

  const handleAuthSuccess = useCallback(async (account) => {
    setNotice(null);
    navigate(account?.isAdmin ? '/staff' : '/student');
  }, [navigate]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const handleSignOut = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Sign out of the student portal?',
      message: 'You will need to sign in again to view your student or administration workspace.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!confirmed) return;
    const { signOutUser } = await import('./models/authRepository');
    try {
      await signOutUser();
      setNotice(null);
      navigate('/');
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'You could not be signed out. Please try again.' });
    }
  }, [confirm, navigate]);

  const layoutProps = {
    currentPath: path,
    currentSection: staffSection,
    user,
    profile,
    isAdmin,
    loading,
    isOnline,
    unreadNotificationCount: notifications.filter((item) => !item.read).length,
    onOpenNotifications: () => navigate('/notifications'),
    notice,
    onDismissNotice: dismissNotice,
    onSignOut: handleSignOut,
  };
  const rootElement = user
    ? <PortalFrame layoutProps={layoutProps} />
    : loading
      ? <div className="auth-loading" role="status">Checking your portal access…</div>
      : <AuthDialog fullPage onSuccess={handleAuthSuccess} />;

  return (
    <Routes>
      <Route path="/" element={rootElement}>
        <Route index element={loading
          ? <div className="content-wrap" role="status">Checking your account…</div>
          : <Navigate to={isAdmin ? '/staff' : '/student'} replace />} />
        <Route path="services" element={<ServicesPage navigate={navigate} services={services} serviceError={servicesError} />} />
        <Route path="services/:serviceId" element={<ServiceRoute services={services} navigate={navigate} />} />
        <Route path="chat" element={loading || !user
          ? <div className="content-wrap" role="status">Checking student access…</div>
          : isAdmin
            ? <Navigate to="/staff?view=chat" replace />
            : <ChatPage user={user} />} />
        <Route path="request/:serviceId" element={<RequestRoute services={services} user={user} profile={profile} navigate={navigate} />} />
        <Route path="student" element={user ? (
          <StudentDashboard
            user={user}
            profile={profile}
            profileError={authError}
            onCancelRequest={async (id) => {
              await cancelStudentRequest(id);
              setNotice({ type: 'success', message: 'The request has been cancelled.' });
            }}
            onUpdateRequest={updateStudentRequest}
            onDeleteRequest={deleteStudentRequest}
            navigate={navigate}
          />
        ) : <div className="content-wrap" role="status">Checking student access…</div>} />
        <Route path="letters" element={loading || !user
          ? <div className="content-wrap" role="status">Checking student access…</div>
          : isAdmin
            ? <Navigate to="/staff" replace />
            : <StudentLettersPage
              user={user}
              onSubscribeToLetters={subscribeToStudentLetters}
              onDeleteLetter={async (id) => {
                await deleteStudentLetter(id);
                setNotice({ type: 'success', message: 'The letter has been deleted.' });
              }}
            />} />
        <Route path="notifications" element={user ? (
          <NotificationsPage
            notifications={notifications}
            error={notificationError}
            navigate={navigate}
            isAdmin={isAdmin}
            onMarkRead={markNotificationRead}
            onMarkAllRead={() => markAllNotificationsRead(notifications)}
          />
        ) : <div className="content-wrap" role="status">Checking account access…</div>} />
        <Route path="staff" element={isAdmin ? (
          <AdminDashboard
            services={services}
            adminEmail={user.email}
            staffUser={user}
            onCreateService={createService}
            onUpdateStatus={setRequestStatus}
            onDeleteRequest={deleteRequest}
            onCreateStudent={createStudentRecord}
            onSendLetterAndAcceptRequest={sendStudentLetterAndAcceptRequest}
            onGrantAdminAccess={grantAdminAccess}
            onSetFeeStatus={setRequestFeeStatus}
            onDeleteStudent={removeStudent}
            onUpdateStudent={updateStudentRecord}
            onSubscribeToAcademicOptions={subscribeToAcademicOptions}
            onSaveAcademicOptions={saveAcademicOptions}
            initialSection={staffSection}
            navigate={navigate}
          />
        ) : <div className="content-wrap" role="status">Checking staff access…</div>} />
        <Route path="submitted" element={(
          <SubmissionConfirmationPage submission={location.state?.submission} navigate={navigate} />
        )} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfirmationProvider>
        <PortalApp />
      </ConfirmationProvider>
    </HashRouter>
  );
}
