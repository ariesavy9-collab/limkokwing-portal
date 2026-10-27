import { useCallback, useEffect, useState } from 'react';
import {
  HashRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import AuthDialog from './components/AuthDialog';
import SiteLayout from './components/SiteLayout';
import {
  AdminDashboard,
  ContactPage,
  CoursesPage,
  FeesPage,
  HomePage,
  NotificationsPage,
  RequestPage,
  ServiceDetailsPage,
  ServicesPage,
  StudentDashboard,
  SubmissionConfirmationPage,
  SuccessPage,
} from './pages/PortalPages';
import useAuth from './controllers/useAuth';
import useServices from './controllers/useServices';
import { courses, findService as findDefaultService } from './models/services';
import {
  cancelStudentRequest,
  createService,
  createPublicInquiry,
  createStudentRequest,
  deleteRequest,
  markAllNotificationsRead,
  markNotificationRead,
  saveStudentProfile,
  subscribeToNotifications,
  setRequestStatus,
} from './models/portalRepository';
import { createStaffAccount } from './models/staffRepository';
import './App.css';
import './PortalRedesign.css';

function PortalFrame({ layoutProps, authDialog }) {
  return (
    <SiteLayout {...layoutProps}>
      <Outlet />
      {authDialog}
    </SiteLayout>
  );
}

function ServiceRoute({ services, user, navigate, requireStudent }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item.id === serviceId) || findDefaultService(serviceId);

  if (!service) {
    return <SuccessPage navigate={navigate} title="Service not found" message="This service may have moved or is no longer available." />;
  }
  if (service.studentOnly && !user) {
    return (
      <SuccessPage
        navigate={navigate}
        title="Sign in to view this service"
        message="This service is available to registered students. Sign in to see details and submit a request."
        primaryLabel="Student sign in"
        onPrimary={() => requireStudent(`/services/${service.id}`)}
      />
    );
  }

  return (
    <ServiceDetailsPage
      service={service}
      navigate={navigate}
      onRequest={() => service.studentOnly
        ? requireStudent(`/request/${service.id}`)
        : navigate(`/request/${service.id}`)}
    />
  );
}

function RequestRoute({ services, user, profile, navigate, requireStudent, openSignIn }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item.id === serviceId) || findDefaultService(serviceId);
  if (!service) {
    return <SuccessPage navigate={navigate} title="Service not found" message="Choose a service from the service directory to continue." />;
  }
  if (service.studentOnly && !user) {
    return (
      <SuccessPage
        navigate={navigate}
        title="Sign in to submit this request"
        message="This service is for registered students. Sign in to continue with your request."
        primaryLabel="Student sign in"
        onPrimary={() => requireStudent(`/request/${service.id}`)}
      />
    );
  }

  return (
    <RequestPage
      service={service}
      user={user}
      profile={profile}
      onStudentSubmit={(request) => createStudentRequest(user.uid, request)}
      onPublicSubmit={createPublicInquiry}
      onSubmitted={(submission) => navigate('/submitted', { state: { submission } })}
      navigate={navigate}
      onSignIn={openSignIn}
    />
  );
}

function PortalApp() {
  const { user, profile, isAdmin, loading, authError, isOnline } = useAuth();
  const { services, error: servicesError } = useServices();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const path = location.pathname;
  const staffSection = new URLSearchParams(location.search).get('view') === 'accounts' ? 'staff' : 'requests';
  const requestRoute = path.match(/^\/request\/([^/]+)$/);
  const findService = (id) => services.find((service) => service.id === id) || findDefaultService(id);
  const protectedRequest = requestRoute ? findService(requestRoute[1])?.studentOnly : false;
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [pendingPath, setPendingPath] = useState('');
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

  const requireStudent = useCallback((nextPath) => {
    if (!user) {
      setPendingPath(nextPath);
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    navigate(nextPath);
  }, [navigate, user]);

  useEffect(() => {
    if (loading) return;
    if ((path === '/student' || path === '/notifications' || protectedRequest) && !user) {
      setPendingPath(path);
      setAuthMode('login');
      setAuthOpen(true);
      navigate('/');
    } else if (path === '/staff' && !isAdmin) {
      navigate(user ? '/student' : '/');
      setNotice({ type: 'error', message: 'Staff access is restricted to authorized university accounts.' });
    }
  }, [isAdmin, loading, navigate, path, protectedRequest, user]);

  const openSignIn = useCallback(() => {
    setPendingPath('');
    setAuthMode('login');
    setAuthOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    setAuthOpen(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath('');
    } else {
      navigate('/student');
    }
  }, [navigate, pendingPath]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const handleSignOut = useCallback(async () => {
    const { signOutUser } = await import('./models/authRepository');
    try {
      await signOutUser();
      navigate('/');
      setNotice({ type: 'success', message: 'You have been signed out.' });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'You could not be signed out. Please try again.' });
    }
  }, [navigate]);

  const authDialog = authOpen && (
    <AuthDialog
      initialMode={authMode}
      onClose={() => {
        setAuthOpen(false);
        setPendingPath('');
      }}
      onSuccess={handleAuthSuccess}
    />
  );
  const layoutProps = {
    currentPath: path,
    user,
    isAdmin,
    loading,
    isOnline,
    unreadNotificationCount: notifications.filter((item) => !item.read).length,
    onOpenNotifications: () => navigate('/notifications'),
    onSignIn: openSignIn,
    onStudentAccess: () => requireStudent('/student'),
    notice,
    onDismissNotice: dismissNotice,
    onSignOut: handleSignOut,
    navigate,
  };

  return (
    <Routes>
      <Route path="/" element={<PortalFrame layoutProps={layoutProps} authDialog={authDialog} />}>
        <Route index element={(
          <HomePage
            navigate={navigate}
            user={user}
            services={services}
            serviceError={servicesError}
            onStudentAccess={() => requireStudent('/student')}
          />
        )} />
        <Route path="services" element={<ServicesPage navigate={navigate} user={user} services={services} serviceError={servicesError} />} />
        <Route path="services/:serviceId" element={<ServiceRoute services={services} user={user} navigate={navigate} requireStudent={requireStudent} />} />
        <Route path="request/:serviceId" element={<RequestRoute services={services} user={user} profile={profile} navigate={navigate} requireStudent={requireStudent} openSignIn={openSignIn} />} />
        <Route path="courses" element={<CoursesPage courses={courses} navigate={navigate} />} />
        <Route path="fees" element={<FeesPage navigate={navigate} services={services} />} />
        <Route path="student" element={user ? (
          <StudentDashboard
            user={user}
            profile={profile}
            profileError={authError}
            onSaveProfile={async (details) => {
              await saveStudentProfile(user, details);
              setNotice({ type: 'success', message: 'Your student profile has been updated.' });
            }}
            onCancelRequest={async (id) => {
              await cancelStudentRequest(id);
              setNotice({ type: 'success', message: 'The request has been cancelled.' });
            }}
            navigate={navigate}
          />
        ) : <div className="content-wrap" role="status">Checking student access…</div>} />
        <Route path="notifications" element={user ? (
          <NotificationsPage
            notifications={notifications}
            error={notificationError}
            onMarkRead={markNotificationRead}
            onMarkAllRead={() => markAllNotificationsRead(notifications)}
          />
        ) : <div className="content-wrap" role="status">Checking account access…</div>} />
        <Route path="staff" element={isAdmin ? (
          <AdminDashboard
            services={services}
            onCreateService={createService}
            onUpdateStatus={setRequestStatus}
            onDeleteRequest={deleteRequest}
            onCreateStaffAccount={createStaffAccount}
            initialSection={staffSection}
          />
        ) : <div className="content-wrap" role="status">Checking staff access…</div>} />
        <Route path="contact" element={<ContactPage onSubmit={createPublicInquiry} />} />
        <Route path="submitted" element={(
          <SubmissionConfirmationPage submission={location.state?.submission} navigate={navigate} />
        )} />
        <Route path="*" element={(
          <SuccessPage
            navigate={navigate}
            title="Page not found"
            message="The page you were looking for could not be found."
            primaryLabel="Return to home"
            primaryPath="/"
          />
        )} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PortalApp />
    </HashRouter>
  );
}
