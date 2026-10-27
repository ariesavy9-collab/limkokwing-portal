import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import SiteLayout from './components/SiteLayout';
import {
  AdminDashboard,
  CoursesPage,
  ContactPage,
  FeesPage,
  HomePage,
  NotificationsPage,
  RequestPage,
  ServicesPage,
  StudentDashboard,
  SubmissionConfirmationPage,
} from './pages/PortalPages';
import { services } from './models/services';
import { validateForm } from './models/formValidation';

test('form validation distinguishes personal names from other fields containing "name"', () => {
  const form = document.createElement('form');
  form.innerHTML = `
    <label for="person-name">Full name</label>
    <input id="person-name" name="contactName" required>
    <label for="service-name">Service name</label>
    <input id="service-name" name="serviceName" required>
    <label for="student-id">Student number</label>
    <input id="student-id" name="studentId" required>
    <label for="phone">Mobile number</label>
    <input id="phone" name="phone" type="tel" required>
  `;
  form.elements.contactName.value = "O'Connor-Jones";
  form.elements.serviceName.value = 'Registry & Admissions 2026';
  form.elements.studentId.value = '12345ABCD';
  form.elements.phone.value = '+266ABC12345';

  expect(validateForm(form)).toEqual([
    { fieldId: 'student-id', message: 'Student number must contain exactly 9 digits.' },
    { fieldId: 'phone', message: 'Mobile number must be a valid phone number.' },
  ]);
});

test('form validation rejects short names, malformed email, and whitespace-only required text', () => {
  const form = document.createElement('form');
  form.innerHTML = `
    <label for="full-name">Full name</label>
    <input id="full-name" name="fullName" required minLength="2" maxLength="20" data-validation-type="name">
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" required maxLength="254">
    <label for="message">Message</label>
    <textarea id="message" name="message" required minLength="10"></textarea>
  `;
  form.elements.fullName.value = 'A';
  form.elements.email.value = 'student@@example';
  form.elements.message.value = '     ';

  expect(validateForm(form)).toEqual([
    { fieldId: 'full-name', message: 'Full name must be at least 2 characters.' },
    { fieldId: 'email', message: 'Email address must be a valid email address.' },
    { fieldId: 'message', message: 'Message is required.' },
  ]);
});

test('account menu shows the Google profile photo and signs out from its menu', () => {
  const onSignOut = jest.fn();
  const onOpenNotifications = jest.fn();
  const { container } = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteLayout
        currentPath="/"
        user={{
          displayName: 'Google Student',
          email: 'student@example.com',
          photoURL: 'https://example.com/google-photo.jpg',
        }}
        isAdmin={false}
        loading={false}
        isOnline
        onSignIn={jest.fn()}
        onStudentAccess={jest.fn()}
        onSignOut={onSignOut}
        onOpenNotifications={onOpenNotifications}
        unreadNotificationCount={2}
        navigate={jest.fn()}
      >
        <div>Portal content</div>
      </SiteLayout>
    </MemoryRouter>,
  );

  expect(container.querySelector('.portal-avatar img')).toHaveAttribute('src', 'https://example.com/google-photo.jpg');
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }));
  expect(onOpenNotifications).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Account menu for Google Student' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

  expect(onSignOut).toHaveBeenCalledTimes(1);
});

test('contact form blocks digits in names and letters in phone numbers', async () => {
  const onSubmit = jest.fn();
  render(<ContactPage onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Visitor 7' } });
  expect(screen.getByLabelText('Your name')).toHaveValue('Visitor ');
  expect(screen.queryByText(/your name can only contain letters/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+266ABC12' } });
  expect(screen.getByLabelText('Mobile number')).toHaveValue('+26612');
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please send me the course and fee information.' } });
  fireEvent.submit(screen.getByRole('button', { name: /send enquiry/i }).closest('form'));

  expect(screen.getByRole('alert')).toHaveTextContent(/enter a phone number using digits only/i);
  expect(onSubmit).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+26650123456' } });
  fireEvent.submit(screen.getByRole('button', { name: /send enquiry/i }).closest('form'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
});

test('account menu falls back to the user initial when the profile photo cannot load', () => {
  const { container } = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteLayout
        currentPath="/"
        user={{ displayName: 'Google Student', photoURL: 'https://example.com/broken-photo.jpg' }}
        isAdmin={false}
        loading={false}
        isOnline
        onSignIn={jest.fn()}
        onStudentAccess={jest.fn()}
        onSignOut={jest.fn()}
        navigate={jest.fn()}
      >
        <div>Portal content</div>
      </SiteLayout>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Account menu for Google Student' }));
  fireEvent.error(container.querySelector('.portal-avatar img'));

  expect(screen.getByText('G')).toBeInTheDocument();
});

test('notification page shows request approval updates and allows marking them read', async () => {
  const onMarkRead = jest.fn().mockResolvedValue(undefined);
  render(
    <NotificationsPage
      notifications={[{
        id: 'notification-1',
        title: 'Request approved',
        message: 'Your transcript request has been approved.',
        type: 'request',
        read: false,
      }]}
      error=""
      onMarkRead={onMarkRead}
      onMarkAllRead={jest.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Request approved' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(onMarkRead).toHaveBeenCalledWith('notification-1'));
});

jest.mock('./controllers/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: null,
    profile: null,
    isAdmin: false,
    loading: false,
    isOnline: true,
    authError: '',
  }),
}));

jest.mock('./controllers/useServices', () => ({
  __esModule: true,
  default: () => ({ services: [], error: '' }),
}));

jest.mock('./models/portalRepository', () => ({
  cancelStudentRequest: jest.fn(),
  createPublicInquiry: jest.fn(),
  createService: jest.fn(),
  createStudentRequest: jest.fn(),
  deleteInquiry: jest.fn(),
  deleteRequest: jest.fn(),
  ensureUserProfile: jest.fn(),
  saveStudentProfile: jest.fn(),
  setInquiryStatus: jest.fn(),
  setRequestStatus: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  subscribeToNotifications: (uid, callback) => {
    callback([]);
    return () => {};
  },
  subscribeToAllStudentRequests: (callback) => {
    callback([{
      id: 'request-1',
      service: 'Academic transcript',
      studentName: 'Student Example',
      studentId: 'LIM2025-0001',
      email: 'student@example.com',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Pending',
    }]);
    return () => {};
  },
  subscribeToPublicInquiries: () => () => {},
  subscribeToStudentRequests: (uid, callback) => {
    callback([{
      id: 'REQ-2001',
      serviceId: 'transcript',
      service: 'Academic transcript',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Accepted',
    }]);
    return () => {};
  },
}));

test('home page explains student access and public services', () => {
  render(<HomePage navigate={jest.fn()} user={null} services={services} onStudentAccess={jest.fn()} />);

  expect(screen.getByRole('heading', { name: /your university services, simplified/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /student sign in/i })).toBeInTheDocument();
  expect(screen.getByText(/public enquiries welcome/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'General enquiry' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Academic transcript' })).not.toBeInTheDocument();
});

test('service directory shows visitor-accessible services and filters them by name', () => {
  render(<ServicesPage navigate={jest.fn()} user={null} services={services} />);

  expect(screen.getByText('2 services')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Academic transcript' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'General enquiry' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: /search university services/i }), {
    target: { value: 'technical' },
  });

  expect(screen.getByText('1 service')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Technical support' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'General enquiry' })).not.toBeInTheDocument();
  expect(screen.queryByText('Students')).not.toBeInTheDocument();
});

test('signed-in students see all service categories without the student callout', () => {
  const user = { uid: 'student-1' };
  render(<HomePage navigate={jest.fn()} user={user} services={services} onStudentAccess={jest.fn()} />);

  expect(screen.getByRole('heading', { name: 'Academic transcript' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Student portal' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /your requests, all in one place/i })).not.toBeInTheDocument();
});

test('signed-in students can access the complete service directory', () => {
  render(<ServicesPage navigate={jest.fn()} user={{ uid: 'student-1' }} services={services} />);

  expect(screen.getByText('6 services')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Academic transcript' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'General enquiry' })).toBeInTheDocument();
});

test('public courses page lists its course catalogue and supports search', () => {
  render(
    <CoursesPage
      courses={[
        { id: 'course-a', name: 'Programme A', faculty: 'Faculty A', award: 'Bachelor degree' },
        { id: 'course-b', name: 'Programme B', faculty: 'Faculty B', award: 'Diploma' },
      ]}
      navigate={jest.fn()}
    />,
  );

  expect(screen.getByText('2 courses')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Programme A' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: /search courses and faculties/i }), {
    target: { value: 'Faculty B' },
  });
  expect(screen.getByText('1 course')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Programme B' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Programme A' })).not.toBeInTheDocument();
});

test('fees page directs visitors to verified fee information without showing invented prices', () => {
  const navigate = jest.fn();
  render(<FeesPage navigate={navigate} />);

  expect(screen.getByRole('heading', { name: 'Contact the university for current fees' })).toBeInTheDocument();
  expect(screen.getByText('Academic transcript')).toBeInTheDocument();
  expect(screen.getByText('M100')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /ask about fees/i }));
  expect(navigate).toHaveBeenCalledWith('/contact');
});

test('contact form sends public enquiries and displays the Firestore reference', async () => {
  const onSubmit = jest.fn().mockResolvedValue('inquiry-reference-123');
  render(<ContactPage onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Visitor Example' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+26651234567' } });
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please send me the current course and fee information.' } });
  fireEvent.submit(screen.getByRole('button', { name: /send enquiry/i }).closest('form'));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Visitor Example',
    serviceId: 'enquiry',
    service: 'General enquiry',
    message: 'Please send me the current course and fee information.',
  })));
  expect(await screen.findByRole('status')).toHaveTextContent('Reference: inquiry-reference-123');
});

test('contact form rejects an email address without a valid @ format', () => {
  const onSubmit = jest.fn();
  render(<ContactPage onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Visitor' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid-email' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+26651234567' } });
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please send me the course and fee information.' } });
  fireEvent.submit(screen.getByRole('button', { name: /send enquiry/i }).closest('form'));

  expect(screen.getByRole('alert')).toHaveTextContent(/email address must be a valid email address/i);
  expect(onSubmit).not.toHaveBeenCalled();
});

test('courses route displays the locally maintained course catalogue', () => {
  window.location.hash = '/courses';
  render(<App />);

  expect(screen.getByText('29 courses')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Diploma in Film Production' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('nested service route displays details for the selected service', () => {
  window.location.hash = '/services/tech-support';
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Technical support' })).toBeInTheDocument();
  expect(screen.getByText('IT services')).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('React Router navigation links switch pages without a browser refresh', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('link', { name: 'Browse services' }));

  expect(screen.getByRole('heading', { name: 'University services' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/services');
});

test('unknown route renders a not-found page with a route back to home', () => {
  window.location.hash = '/not-a-page';
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('request submission routes to a confirmation page with the submitted details', async () => {
  const { createPublicInquiry } = require('./models/portalRepository');
  createPublicInquiry.mockResolvedValueOnce('inquiry-reference-456');
  window.location.hash = '/request/enquiry';
  render(<App />);

  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Visitor Example' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+26651234567' } });
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help me with a general university enquiry.' } });
  fireEvent.submit(screen.getByRole('button', { name: /send enquiry/i }).closest('form'));

  expect(await screen.findByRole('heading', { name: 'Submission received' })).toBeInTheDocument();
  expect(screen.getByText('inquiry-reference-456')).toBeInTheDocument();
  expect(screen.getByText('General enquiry')).toBeInTheDocument();
  expect(screen.getByText('Visitor Example')).toBeInTheDocument();
  expect(screen.getByText('visitor@example.com')).toBeInTheDocument();
  expect(screen.getByText('Please help me with a general university enquiry.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back to services' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('confirmation route without navigation state does not claim a submission succeeded', () => {
  const navigate = jest.fn();
  render(<SubmissionConfirmationPage submission={null} navigate={navigate} />);

  expect(screen.getByRole('heading', { name: 'No submission details available' })).toBeInTheDocument();
  expect(screen.getByText(/confirmation is shown after a request or enquiry is successfully submitted/i)).toBeInTheDocument();
});

test('request form saves successfully, reports a reference, and clears entered values', async () => {
  const onStudentSubmit = jest.fn().mockResolvedValue('request-reference-123');
  render(
    <RequestPage
      service={services[0]}
      user={{ uid: 'student-1', email: 'student@example.com' }}
      profile={{ name: '', studentId: '', phone: '' }}
      onStudentSubmit={onStudentSubmit}
      onPublicSubmit={jest.fn()}
      navigate={jest.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Student Example' } });
  fireEvent.change(screen.getByLabelText('Student number'), { target: { value: '901019217' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+26651234567' } });
  fireEvent.change(screen.getByLabelText('Reason for your request'), { target: { value: 'Please provide my academic transcript.' } });
  fireEvent.submit(screen.getByRole('button', { name: /submit request/i }).closest('form'));

  await waitFor(() => expect(onStudentSubmit).toHaveBeenCalledWith(expect.objectContaining({
    studentName: 'Student Example',
    studentId: '901019217',
    serviceId: 'transcript',
  })));
  expect(await screen.findByRole('status')).toHaveTextContent('Reference: request-reference-123');
  expect(screen.getByLabelText('Full name')).toHaveValue('');
  expect(screen.getByLabelText('Student number')).toHaveValue('');
  expect(screen.getByLabelText('Reason for your request')).toHaveValue('');
});

test('request validation shows red errors and blocks incomplete submissions', () => {
  const onStudentSubmit = jest.fn();
  render(
    <RequestPage
      service={services[0]}
      user={{ uid: 'student-1', email: 'student@example.com' }}
      profile={{ name: '', studentId: '', phone: '' }}
      onStudentSubmit={onStudentSubmit}
      onPublicSubmit={jest.fn()}
      navigate={jest.fn()}
    />,
  );

  fireEvent.submit(screen.getByRole('button', { name: /submit request/i }).closest('form'));

  expect(screen.getByRole('alert')).toHaveTextContent(/full name is required/i);
  expect(screen.getByRole('alert')).toHaveTextContent(/student number is required/i);
  expect(onStudentSubmit).not.toHaveBeenCalled();
});

test('request validation rejects overlong names and non-numeric student and phone numbers', () => {
  const onStudentSubmit = jest.fn();
  render(
    <RequestPage
      service={services[0]}
      user={{ uid: 'student-1', email: 'student@example.com' }}
      profile={{ name: '', studentId: '', phone: '' }}
      onStudentSubmit={onStudentSubmit}
      onPublicSubmit={jest.fn()}
      navigate={jest.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'A name longer than twenty chars' } });
  fireEvent.change(screen.getByLabelText('Student number'), { target: { value: '90101ABCD' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: 'letters123' } });
  fireEvent.change(screen.getByLabelText('Reason for your request'), { target: { value: 'Please provide my academic transcript.' } });
  fireEvent.submit(screen.getByRole('button', { name: /submit request/i }).closest('form'));

  expect(screen.getByRole('alert')).toHaveTextContent(/full name must be no more than 20 characters/i);
  expect(screen.getByRole('alert')).toHaveTextContent(/student number must contain exactly 9 digits/i);
  expect(screen.getByRole('alert')).toHaveTextContent(/phone number using digits only/i);
  expect(onStudentSubmit).not.toHaveBeenCalled();
});

test('requests page displays the current requests from its Firestore subscription', () => {
  render(
    <StudentDashboard
      user={{ uid: 'student-1', displayName: 'Student Example', email: 'student@example.com' }}
      profile={{ name: 'Student Example', studentId: '901019217' }}
      profileError=""
      onSaveProfile={jest.fn()}
      onCancelRequest={jest.fn()}
      navigate={jest.fn()}
    />,
  );

  expect(screen.getByText('REFERENCE · REQ-2001')).toBeInTheDocument();
  expect(screen.getByText('Please provide my official transcript.')).toBeInTheDocument();
  expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
});

test('staff can accept a pending request', async () => {
  const onUpdateStatus = jest.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={onUpdateStatus}
      onDeleteRequest={jest.fn()}
      onCreateStaffAccount={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /accept request/i }));

  await waitFor(() => expect(onUpdateStatus).toHaveBeenCalledWith('request-1', 'Accepted'));
});

test('staff account form provisions an account through its protected callback', async () => {
  const onCreateStaffAccount = jest.fn().mockResolvedValue({ email: 'staff@example.com' });
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStaffAccount={onCreateStaffAccount}
      initialSection="staff"
    />,
  );

  fireEvent.change(screen.getByLabelText("Staff member's full name"), { target: { value: 'Staff Member' } });
  fireEvent.change(screen.getByLabelText('Work email address'), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'a-long-secure-password' } });
  fireEvent.submit(screen.getByRole('button', { name: /create staff account/i }).closest('form'));

  await waitFor(() => expect(onCreateStaffAccount).toHaveBeenCalledWith({
    name: 'Staff Member',
    email: 'staff@example.com',
    password: 'a-long-secure-password',
  }));
  expect(await screen.findByRole('status')).toHaveTextContent(/staff account created for staff@example.com/i);
});

test('a visitor can submit a public enquiry without signing in', () => {
  window.location.hash = '/request/enquiry';
  render(<App />);

  expect(screen.getByRole('heading', { name: 'How can we help?' })).toBeInTheDocument();
  expect(screen.getByText('PUBLIC ENQUIRY')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('a student request asks an unauthenticated visitor to sign in', () => {
  window.location.hash = '/request/transcript';
  render(<App />);

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('the student dashboard route waits for authentication before rendering', async () => {
  window.location.hash = '/student';
  render(<App />);

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});
