import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const subscribeToAcademicOptions = (callback) => {
  callback({
    faculties: [
      'Faculty of Information & Communication Technology',
      'Faculty of Business Management and Globalisation',
    ],
    courses: [
      { faculty: 'Faculty of Information & Communication Technology', name: 'Diploma in Information Technology' },
      { faculty: 'Faculty of Business Management and Globalisation', name: 'Diploma in Marketing' },
    ],
  });
  return () => {};
};

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
    { fieldId: 'student-id', message: 'Student number must contain 9 digits and start with 90.' },
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

test('admin navigation hides public university links and help content', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteLayout
        currentPath="/staff"
        currentSection="requests"
        user={{ displayName: 'Portal Admin', email: 'admin@example.com' }}
        isAdmin
        loading={false}
        isOnline
        onSignIn={jest.fn()}
        onSignOut={jest.fn()}
        onOpenNotifications={jest.fn()}
        navigate={jest.fn()}
      >
        <div>Portal content</div>
      </SiteLayout>
    </MemoryRouter>,
  );

  const adminNavigation = screen.getByRole('navigation', { name: 'Administration navigation' });
  expect(adminNavigation).toBeInTheDocument();
  expect(within(adminNavigation).getByRole('link', { name: /request queue/i })).toBeInTheDocument();
  expect(within(adminNavigation).getByRole('link', { name: 'Academic options' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'University information' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Public services' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Tuition & fees' })).not.toBeInTheDocument();
  expect(screen.queryByText('Need assistance?')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Help' })).not.toBeInTheDocument();
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
  createStudentRecord: jest.fn(),
  createStudentRequest: jest.fn(),
  deleteStudentRequest: jest.fn(),
  deleteInquiry: jest.fn(),
  deleteRequest: jest.fn(),
  ensureUserProfile: jest.fn(),
  sendStudentLetterAndAcceptRequest: jest.fn(),
  setInquiryStatus: jest.fn(),
  setRequestStatus: jest.fn(),
  setRequestFeeStatus: jest.fn(),
  updateStudentRequest: jest.fn(),
  saveAcademicOptions: jest.fn(),
  subscribeToAcademicOptions: jest.fn((callback) => {
    callback({
      faculties: [
        'Faculty of Information & Communication Technology',
        'Faculty of Business Management and Globalisation',
      ],
      courses: [
        { faculty: 'Faculty of Information & Communication Technology', name: 'Diploma in Information Technology' },
        { faculty: 'Faculty of Business Management and Globalisation', name: 'Diploma in Marketing' },
      ],
    });
    return () => {};
  }),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  subscribeToNotifications: (uid, callback) => {
    callback([]);
    return () => {};
  },
  subscribeToAllStudentRequests: jest.fn((callback) => {
    callback([{
      id: 'request-1',
      service: 'Academic transcript',
      fee: 'M100',
      feeAmount: 100,
      feeStatus: 'Unpaid',
      studentName: 'Student Example',
      studentId: 'LIM2025-0001',
      email: 'student@example.com',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Pending',
    }]);
    return () => {};
  }),
  subscribeToPublicInquiries: () => () => {},
  subscribeToStudentRecords: jest.fn((callback) => {
    callback([]);
    return () => {};
  }),
  subscribeToStudentRecord: jest.fn((email, callback) => {
    callback(null);
    return () => {};
  }),
  updateStudentRecord: jest.fn(),
  subscribeToStudentLetters: (email, callback) => {
    callback([]);
    return () => {};
  },
  subscribeToStudentRequests: jest.fn((uid, callback) => {
    callback([{
      id: 'REQ-2001',
      serviceId: 'transcript',
      service: 'Academic transcript',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Accepted',
    }]);
    return () => {};
  }),
}));

test('home page explains student access and public services', () => {
  render(<HomePage navigate={jest.fn()} user={null} services={services} onStudentAccess={jest.fn()} />);

  expect(screen.getByRole('heading', { name: /your one-stop student services portal/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /student sign in/i })).toBeInTheDocument();
  expect(screen.queryByLabelText('Portal highlights')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'General enquiry' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Academic transcript' })).toBeInTheDocument();
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

  fireEvent.click(screen.getAllByRole('link', { name: 'Services' })[0]);

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
    fee: 'M100',
    feeAmount: 100,
  })));
  expect(await screen.findByRole('status')).toHaveTextContent('Reference: request-reference-123');
  expect(screen.getByLabelText('Full name')).toHaveValue('');
  expect(screen.getByLabelText('Student number')).toHaveValue('');
  expect(screen.getByLabelText('Reason for your request')).toHaveValue('');
});

test('students can edit and delete pending requests', async () => {
  const { subscribeToStudentRequests } = require('./models/portalRepository');
  const onUpdateRequest = jest.fn().mockResolvedValue(undefined);
  const onDeleteRequest = jest.fn().mockResolvedValue(undefined);
  subscribeToStudentRequests.mockImplementation((uid, callback) => {
    callback([{
      id: 'REQ-PENDING',
      serviceId: 'transcript',
      service: 'Academic transcript',
      description: 'Please provide my academic transcript.',
      date: 'Today',
      status: 'Pending',
      feeAmount: 100,
      fee: 'M100',
      feeStatus: 'Unpaid',
    }]);
    return () => {};
  });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

  render(
    <StudentDashboard
      user={{ uid: 'student-1', displayName: 'Student Example', email: 'student@example.com' }}
      profile={{ name: 'Student Example', studentId: '901019217' }}
      profileError=""
      onSaveProfile={jest.fn()}
      onCancelRequest={jest.fn()}
      onUpdateRequest={onUpdateRequest}
      onDeleteRequest={onDeleteRequest}
      navigate={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Edit request' }));
  fireEvent.change(screen.getByLabelText('Edit request details'), { target: { value: 'Please provide the transcript for this academic year.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(onUpdateRequest).toHaveBeenCalledWith('REQ-PENDING', 'Please provide the transcript for this academic year.'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete request' })).toBeEnabled());

  fireEvent.click(screen.getByRole('button', { name: 'Delete request' }));
  await waitFor(() => expect(onDeleteRequest).toHaveBeenCalledWith('REQ-PENDING'));
  confirm.mockRestore();
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
  expect(screen.getByRole('alert')).toHaveTextContent(/student number must contain 9 digits and start with 90/i);
  expect(screen.getByRole('alert')).toHaveTextContent(/phone number using digits only/i);
  expect(onStudentSubmit).not.toHaveBeenCalled();
});

test('student dashboard displays student details as read-only and shows academic assignment', () => {
  const { subscribeToStudentRequests } = require('./models/portalRepository');
  subscribeToStudentRequests.mockImplementation((uid, callback) => {
    callback([{
      id: 'REQ-2001',
      serviceId: 'transcript',
      service: 'Academic transcript',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Accepted',
    }]);
    return () => {};
  });
  const { subscribeToStudentRecord } = require('./models/portalRepository');
  subscribeToStudentRecord.mockImplementationOnce((email, callback) => {
    callback({
      name: 'Student Example',
      email: 'student@example.com',
      studentId: '901019217',
      dateOfBirth: '2002-03-04',
      birthPlace: 'Maseru',
      phone: '+26650123456',
      address: '12 Main Street, Maseru',
      faculty: 'Faculty of Information & Communication Technology',
      course: 'Diploma in Information Technology',
    });
    return () => {};
  });
  render(
    <StudentDashboard
      user={{ uid: 'student-1', displayName: 'Student Example', email: 'student@example.com' }}
      profile={{ name: 'Student Example', studentId: '901019217' }}
      profileError=""
      onCancelRequest={jest.fn()}
      navigate={jest.fn()}
    />,
  );

  expect(screen.getByText('REFERENCE · REQ-2001')).toBeInTheDocument();
  expect(screen.getByText('Please provide my official transcript.')).toBeInTheDocument();
  expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
  expect(screen.getAllByText('M100.00').length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: 'Outstanding service fees' })).toBeInTheDocument();
  expect(screen.getByLabelText('Faculty')).toHaveValue('Faculty of Information & Communication Technology');
  expect(screen.getByLabelText('Course')).toHaveValue('Diploma in Information Technology');
  expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Full name')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Email address')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Student number')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Mobile number')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Home address')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Date of birth')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Place of birth')).toHaveAttribute('readonly');
});

test('staff can accept a pending request', async () => {
  const { subscribeToAllStudentRequests } = require('./models/portalRepository');
  subscribeToAllStudentRequests.mockImplementation((callback) => {
    callback([{
      id: 'request-1',
      serviceId: 'transcript',
      service: 'Academic transcript',
      studentName: 'Student Example',
      studentId: '901019217',
      email: 'student@example.com',
      description: 'Please provide my official transcript.',
      date: 'Today',
      status: 'Pending',
    }]);
    return () => {};
  });
  const onUpdateStatus = jest.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={onUpdateStatus}
      onDeleteRequest={jest.fn()}
      onSetFeeStatus={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /accept request/i }));

  await waitFor(() => expect(onUpdateStatus).toHaveBeenCalledWith('request-1', 'Accepted'));
});

test('staff can add a student record and grant admin access to Google accounts', async () => {
  const onCreateStudent = jest.fn().mockResolvedValue(undefined);
  const onGrantAdminAccess = jest.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStudent={onCreateStudent}
      onGrantAdminAccess={onGrantAdminAccess}
      onSetFeeStatus={jest.fn()}
      onSubscribeToAcademicOptions={subscribeToAcademicOptions}
      initialSection="staff"
    />,
  );

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Student Example' } });
  fireEvent.change(document.querySelector('#student-email'), { target: { value: 'student@example.com' } });
  fireEvent.change(screen.getByLabelText('Student number'), { target: { value: '901019217' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('progressbar', { name: 'Student record progress' })).toHaveAttribute('aria-valuenow', '2');
  fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '2002-03-04' } });
  fireEvent.change(screen.getByLabelText('Place of birth'), { target: { value: 'Maseru' } });
  fireEvent.change(screen.getByLabelText('Contact phone'), { target: { value: '+26650123456' } });
  fireEvent.change(screen.getByLabelText('Home address'), { target: { value: '12 Main Street, Maseru' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('progressbar', { name: 'Student record progress' })).toHaveAttribute('aria-valuenow', '3');
  fireEvent.change(screen.getByLabelText('Faculty'), { target: { value: 'Faculty of Information & Communication Technology' } });
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'Diploma in Information Technology' } });
  const studentForm = screen.getByRole('button', { name: 'Add student' }).closest('form');
  expect(screen.getByLabelText('Faculty')).toHaveValue('Faculty of Information & Communication Technology');
  expect(screen.getByLabelText('Course')).toHaveValue('Diploma in Information Technology');
  fireEvent.submit(studentForm);

  await waitFor(() => expect(onCreateStudent).toHaveBeenCalledWith({
    name: 'Student Example',
    email: 'student@example.com',
    studentId: '901019217',
    dateOfBirth: '2002-03-04',
    birthPlace: 'Maseru',
    phone: '+26650123456',
    address: '12 Main Street, Maseru',
    faculty: 'Faculty of Information & Communication Technology',
    course: 'Diploma in Information Technology',
  }));

  fireEvent.change(document.querySelector('#admin-email'), { target: { value: 'admin@example.com' } });
  fireEvent.submit(screen.getByRole('button', { name: /grant admin access/i }).closest('form'));
  await waitFor(() => expect(onGrantAdminAccess).toHaveBeenCalledWith('admin@example.com'));
});

test('faculty and course management is a separate admin page', async () => {
  const onSaveAcademicOptions = jest.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSubscribeToAcademicOptions={subscribeToAcademicOptions}
      onSaveAcademicOptions={onSaveAcademicOptions}
      initialSection="academics"
    />,
  );

  expect(screen.getByRole('heading', { name: 'Faculty and course choices' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Add a student' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Add an admin' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Faculty name'), { target: { value: 'Faculty of Design' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add faculty' }).closest('form'));

  await waitFor(() => expect(onSaveAcademicOptions).toHaveBeenCalledWith(expect.objectContaining({
    faculties: expect.arrayContaining(['Faculty of Design']),
  })));
});

test('admin can choose service visibility and an icon', async () => {
  const onCreateService = jest.fn().mockResolvedValue('service-1');
  const { container } = render(
    <AdminDashboard
      services={services}
      onCreateService={onCreateService}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSubscribeToAcademicOptions={subscribeToAcademicOptions}
      initialSection="services"
    />,
  );

  fireEvent.change(screen.getByLabelText('Service name'), { target: { value: 'Transcript replacement' } });
  fireEvent.change(screen.getByLabelText('Responsible department'), { target: { value: 'Student Affairs' } });
  fireEvent.change(screen.getByLabelText('Typical processing time'), { target: { value: '5 working days' } });
  fireEvent.change(screen.getByLabelText('Fee'), { target: { value: 'M50' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Request a replacement copy of a lost student transcript.' } });
  fireEvent.change(screen.getByLabelText('Service visibility'), { target: { value: 'public' } });
  fireEvent.change(screen.getByLabelText('Service icon'), { target: { value: 'university' } });
  expect(screen.getByLabelText('Service icon')).toHaveValue('university');
  expect(container.querySelector('.service-icon-preview svg')).toBeInTheDocument();
  fireEvent.submit(screen.getByRole('button', { name: 'Add service to directory' }).closest('form'));

  await waitFor(() => expect(onCreateService).toHaveBeenCalledWith({
    name: 'Transcript replacement',
    description: 'Request a replacement copy of a lost student transcript.',
    department: 'Student Affairs',
    processingTime: '5 working days',
    fee: 'M50',
    studentOnly: false,
    icon: 'university',
  }));
  await waitFor(() => expect(screen.getByLabelText('Service icon')).toHaveValue('document'));
});

test('admin sends an auto-filled letter and accepts the recommendation request', async () => {
  const { subscribeToAllStudentRequests } = require('./models/portalRepository');
  subscribeToAllStudentRequests.mockImplementationOnce((callback) => {
    callback([{
      id: 'recommendation-request',
      serviceId: 'recommendation',
      service: 'Letter of recommendation',
      studentName: 'Student Example',
      studentId: '901019217',
      email: 'student@example.com',
      description: 'Please prepare a letter for my scholarship application.',
      date: 'Today',
      status: 'Pending',
    }]);
    return () => {};
  });
  const onSendLetterAndAcceptRequest = jest.fn().mockResolvedValue('letter-1');
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStudent={jest.fn()}
      onGrantAdminAccess={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSendLetterAndAcceptRequest={onSendLetterAndAcceptRequest}
      adminEmail="admin@example.com"
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Write & send letter' }));
  expect(screen.getByLabelText('Letter text').value).toContain('Student Example');
  fireEvent.submit(screen.getByRole('button', { name: 'Send letter & accept request' }).closest('form'));

  await waitFor(() => expect(onSendLetterAndAcceptRequest).toHaveBeenCalledWith('recommendation-request', expect.objectContaining({
    studentEmail: 'student@example.com',
    studentId: '901019217',
    createdBy: 'admin@example.com',
  })));
});

test('admin can remove a student from the searchable directory', async () => {
  const { subscribeToStudentRecords } = require('./models/portalRepository');
  subscribeToStudentRecords.mockImplementationOnce((callback) => {
    callback([{
      name: 'Student Example',
      email: 'student@example.com',
      studentId: '901019217',
      dateOfBirth: '2002-03-04',
      birthPlace: 'Maseru',
      phone: '+26650123456',
      address: '12 Main Street, Maseru',
    }]);
    return () => {};
  });
  const onDeleteStudent = jest.fn().mockResolvedValue(undefined);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStudent={jest.fn()}
      onGrantAdminAccess={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSendLetterAndAcceptRequest={jest.fn()}
      onDeleteStudent={onDeleteStudent}
      adminEmail="admin@example.com"
      initialSection="students"
    />,
  );

  expect(screen.getByText('12 Main Street, Maseru')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete student' }));
  await waitFor(() => expect(onDeleteStudent).toHaveBeenCalledWith('student@example.com'));
  confirm.mockRestore();
});

test('admin groups student records by faculty and filters the directory', () => {
  const { subscribeToStudentRecords } = require('./models/portalRepository');
  subscribeToStudentRecords.mockImplementationOnce((callback) => {
    callback([
      { name: 'Alex Student', email: 'alex@example.com', studentId: '901019217', faculty: 'Faculty A', course: 'Course A' },
      { name: 'Sam Student', email: 'sam@example.com', studentId: '901019218', faculty: 'Faculty B', course: 'Course B' },
    ]);
    return () => {};
  });
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStudent={jest.fn()}
      onGrantAdminAccess={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSendLetterAndAcceptRequest={jest.fn()}
      onDeleteStudent={jest.fn()}
      initialSection="students"
    />,
  );

  expect(screen.getByRole('heading', { name: 'Faculty A' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Faculty B' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filter by faculty'), { target: { value: 'Faculty B' } });
  expect(screen.getByText('Sam Student')).toBeInTheDocument();
  expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
});

test('admin can edit a student record and change the faculty and course assignment', async () => {
  const { subscribeToStudentRecords } = require('./models/portalRepository');
  subscribeToStudentRecords.mockImplementationOnce((callback) => {
    callback([{
      name: 'Student Example',
      email: 'student@example.com',
      studentId: '901019217',
      dateOfBirth: '2002-03-04',
      birthPlace: 'Maseru',
      phone: '+26650123456',
      address: '12 Main Street, Maseru',
      faculty: 'Faculty of Information & Communication Technology',
      course: 'Diploma in Information Technology',
    }]);
    return () => {};
  });
  const onUpdateStudent = jest.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      services={services}
      onCreateService={jest.fn()}
      onUpdateStatus={jest.fn()}
      onDeleteRequest={jest.fn()}
      onCreateStudent={jest.fn()}
      onGrantAdminAccess={jest.fn()}
      onSetFeeStatus={jest.fn()}
      onSendLetterAndAcceptRequest={jest.fn()}
      onDeleteStudent={jest.fn()}
      onUpdateStudent={onUpdateStudent}
      onSubscribeToAcademicOptions={subscribeToAcademicOptions}
      adminEmail="admin@example.com"
      initialSection="students"
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Student' } });
  fireEvent.change(screen.getByLabelText('Faculty'), { target: { value: 'Faculty of Business Management and Globalisation' } });
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'Diploma in Marketing' } });
  const editForm = screen.getByRole('button', { name: 'Save student details' }).closest('form');
  expect(screen.getByLabelText('Faculty')).toHaveValue('Faculty of Business Management and Globalisation');
  expect(screen.getByLabelText('Course')).toHaveValue('Diploma in Marketing');
  fireEvent.submit(editForm);

  await waitFor(() => expect(onUpdateStudent).toHaveBeenCalledWith('student@example.com', expect.objectContaining({
    name: 'Updated Student',
    faculty: 'Faculty of Business Management and Globalisation',
    course: 'Diploma in Marketing',
  })));
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
  expect(screen.getByRole('heading', { name: 'Sign in to your portal' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});

test('the student dashboard route waits for authentication before rendering', async () => {
  window.location.hash = '/student';
  render(<App />);

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sign in to your portal' })).toBeInTheDocument();

  window.history.replaceState(null, '', '/');
});
