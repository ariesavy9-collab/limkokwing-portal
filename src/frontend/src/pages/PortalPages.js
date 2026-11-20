import { useEffect, useMemo, useState } from 'react';
import Icon, { ICON_NAMES } from '../components/Icon';
import useConfirmation from '../components/ConfirmationDialog';
import ValidationErrors, { FieldValidationError } from '../components/ValidationErrors';
import AdminFinancePage from './admin/AdminFinancePage';
import AcademicOptionsPage from './admin/AcademicOptionsPage';
import { handleFormInput, validateForm } from '../models/formValidation';
import { getRequestFeeAmount } from '../models/fees';
import {
  deleteInquiry,
  setInquiryStatus,
  saveAcademicOptions,
  subscribeToAllStudentRequests,
  subscribeToPublicInquiries,
  subscribeToAcademicOptions,
  subscribeToStudentRecord,
  subscribeToStudentRecords,
  subscribeToStudentRequests,
} from '../models/portalRepository';
import { services as defaultServices } from '../models/services';

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function normalizeAcademicOptions(options = {}) {
  const faculties = Array.isArray(options.faculties)
    ? [...new Set(options.faculties.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second))
    : [];
  const courses = Array.isArray(options.courses)
    ? options.courses.filter((item) => (
      item && typeof item.faculty === 'string' && typeof item.name === 'string'
      && faculties.includes(item.faculty.trim()) && item.name.trim()
    )).map((item) => ({ faculty: item.faculty.trim(), name: item.name.trim() }))
    : [];
  return { faculties, courses };
}

const studentFormSteps = [
  { title: 'Identity', description: 'Basic student details' },
  { title: 'Contact details', description: 'Personal and contact information' },
  { title: 'Academic programme', description: 'Faculty and course assignment' },
];

async function downloadRequestPdf(request) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(10, 34, 72);
  pdf.setFontSize(18);
  pdf.text('LIMKOKWING UNIVERSITY', 18, 22);
  pdf.setFontSize(11);
  pdf.text('Student Service Request', 18, 31);
  pdf.setDrawColor(0, 94, 210);
  pdf.line(18, 36, 192, 36);
  pdf.setTextColor(25, 35, 54);
  pdf.setFontSize(10);
  const details = [
    `Reference: ${request.id}`,
    `Student: ${request.studentName || ''}`,
    `Student number: ${request.studentId || ''}`,
    `Email: ${request.email || ''}`,
    `Service: ${request.service || ''}`,
    `Date: ${request.date || ''}`,
    `Status: ${request.status || 'Pending'}`,
    `Fee: ${request.fee || 'No fee'} (${request.feeStatus || 'No fee'})`,
  ];
  let y = 48;
  details.forEach((detail) => {
    pdf.text(detail, 18, y);
    y += 8;
  });
  pdf.setFontSize(12);
  pdf.text('Request details', 18, y + 4);
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(request.description || '', 174), 18, y + 12);
  pdf.save(`service-request-${request.id.slice(0, 10)}.pdf`);
}

async function downloadStudentLetterPdf(letter) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(10, 34, 72);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('LIMKOKWING UNIVERSITY', 18, 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Maseru Campus, Maseru, Lesotho', 18, 30);
  pdf.setDrawColor(0, 85, 217);
  pdf.line(18, 36, pageWidth - 18, 36);
  pdf.setDrawColor(185, 35, 45);
  pdf.setTextColor(185, 35, 45);
  pdf.rect(pageWidth - 76, 43, 58, 12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('SAMPLE - NOT OFFICIAL', pageWidth - 73, 51);
  pdf.setTextColor(25, 35, 54);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Date: ${letter.createdAt?.toDate?.().toLocaleDateString() || new Date().toLocaleDateString()}`, 18, 53);
  pdf.text(`To: ${letter.studentName}`, 18, 68);
  pdf.text(`Student number: ${letter.studentId}`, 18, 76);
  pdf.text(`Email: ${letter.studentEmail}`, 18, 84);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const titleLines = pdf.splitTextToSize(letter.title, pageWidth - 36);
  pdf.text(titleLines, 18, 101);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const bodyLines = pdf.splitTextToSize(letter.body, pageWidth - 36);
  let y = 110 + (titleLines.length - 1) * 7;
  bodyLines.forEach((line) => {
    if (y > 270) {
      pdf.addPage();
      y = 24;
    }
    pdf.text(line, 18, y);
    y += 6;
  });
  pdf.setFontSize(9);
  pdf.setTextColor(185, 35, 45);
  pdf.text('Draft sample only. Not an official university document.', 18, 286);
  pdf.save(`draft-letter-${letter.studentId}-${letter.id.slice(0, 8)}.pdf`);
}

function ServiceCard({ service, navigate }) {
  return (
    <article className="service-card">
      <div className="service-icon"><Icon name={service.icon} size={21} /></div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-meta">
        <span><Icon name="calendar" size={15} /> {service.processingTime}</span>
        <span>{service.fee}</span>
      </div>
      <button className="service-link" onClick={() => navigate(`/services/${service.id}`)}>
        Explore service
      </button>
    </article>
  );
}

function ServicesPage({ navigate, services, serviceError }) {
  const [query, setQuery] = useState('');
  const availableServices = services.filter((service) => service.studentOnly);
  const filteredServices = availableServices.filter((service) => (
    `${service.name} ${service.department} ${service.description}`.toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <section className="content-wrap">
      <PageHeading
        eyebrow="YOUR STUDENT SERVICES"
        title="University services"
        description="Find the right team, understand what to expect, and start a request when you are ready."
      />
      {serviceError && <p className="form-alert form-alert-error" role="alert">{serviceError}</p>}
      <div className="service-filter">
        <label className="visually-hidden" htmlFor="service-search">Search university services</label>
        <Icon name="search" size={18} />
        <input id="service-search" type="search" placeholder="Search by service or department…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <span>{filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}</span>
      </div>
      {filteredServices.length ? (
        <div className="service-grid">
          {filteredServices.map((service) => <ServiceCard key={service.id} service={service} navigate={navigate} />)}
        </div>
      ) : (
        <div className="empty-state"><h2>No matching services</h2><p>Try a different search term, or contact the registry for help.</p><button className="button button-outline" onClick={() => setQuery('')}>Clear search</button></div>
      )}
    </section>
  );
}

function CoursesPage({ courses = [], navigate }) {
  const [search, setSearch] = useState('');
  const filteredCourses = courses.filter((course) => (
    `${course.name} ${course.faculty} ${course.award}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <section className="content-wrap">
      <PageHeading
        eyebrow="MASERU CAMPUS"
        title="Explore our courses"
        description="Find a programme that matches your interests. Contact the university to confirm current availability and entry requirements."
      />
      <div className="service-filter">
        <label className="visually-hidden" htmlFor="course-search">Search courses and faculties</label>
        <Icon name="search" size={18} />
        <input id="course-search" type="search" placeholder="Search by course or faculty…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <span>{filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}</span>
      </div>
      {filteredCourses.length ? (
        <div className="course-grid">
          {filteredCourses.map((course) => (
            <article className="course-card" key={course.id}>
              <span className="course-icon"><Icon name="university" size={21} /></span>
              <span className="eyebrow">{course.faculty}</span>
              <h2>{course.name}</h2>
              <p className="course-award">{course.award}</p>
              {course.duration && <p className="course-duration">Typical duration: {course.duration}</p>}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{search ? 'No matching courses' : 'Course information is being updated'}</h2>
          <p>{search ? 'Try another course or faculty name.' : 'Contact the university for the current course catalogue.'}</p>
          {search
            ? <button className="button button-outline" onClick={() => setSearch('')}>Clear search</button>
            : <button className="button button-outline" onClick={() => navigate('/contact')}>Contact the university</button>}
        </div>
      )}
    </section>
  );
}

function FeesPage({ navigate, services = defaultServices }) {
  const pricedServices = services.filter((service) => service.fee && service.fee !== 'No fee');

  return (
    <section className="content-wrap">
      <PageHeading
        eyebrow="MASERU CAMPUS"
        title="Tuition and fees"
        description="Request the latest official fee information before planning or making a payment."
      />
      <article className="fees-panel">
        <span className="fees-icon"><Icon name="document" size={24} /></span>
        <span className="eyebrow">CURRENT FEE SCHEDULE</span>
        <h2>Contact the university for current fees</h2>
        <p>Tuition and other charges can depend on the course and academic year. This portal does not publish fee amounts until an official schedule is available.</p>
        {pricedServices.length > 0 && (
          <div className="fees-service-list">
            <h3>Published service fees</h3>
            <ul>
              {pricedServices.map((service) => (
                <li key={service.id}><span>{service.name}</span><strong>{service.fee}</strong></li>
              ))}
            </ul>
          </div>
        )}
        <p>Contact the university team to request the current fee schedule and confirm payment instructions. Always verify payment details directly with the university.</p>
        <div className="detail-actions">
          <button className="button button-primary" onClick={() => navigate('/contact')}>Ask about fees</button>
          <button className="button button-outline" onClick={() => navigate('/courses')}>Browse courses</button>
        </div>
      </article>
    </section>
  );
}

function ServiceDetailsPage({ service, navigate, onRequest }) {
  return (
    <section className="content-wrap">
      <div className="breadcrumbs"><button className="text-button" onClick={() => navigate('/services')}>Services</button><span>/</span><span>{service.name}</span></div>
      <article className="detail-panel">
        <div className="detail-icon"><Icon name={service.icon} size={27} /></div>
        <span className="eyebrow">{service.department}</span>
        <h1>{service.name}</h1>
        <p className="detail-description">{service.description}</p>
        <div className="detail-facts">
          <div><span>Typical processing time</span><strong>{service.processingTime}</strong></div>
          <div><span>Service fee</span><strong>{service.fee}</strong></div>
          <div><span>Available to</span><strong>{service.audience}</strong></div>
        </div>
        <div className="detail-instructions">
          <h2>Before you start</h2>
          <ul>
            {service.studentOnly
              ? <><li>Have your registered student ID ready.</li><li>Provide a clear reason so the right team can assist.</li><li>Sign in with your student account to submit and track your request.</li></>
              : <><li>Share a current email address so the team can reply.</li><li>For technical support, include the device or service affected.</li><li>You do not need a student account to send a general enquiry.</li></>}
          </ul>
        </div>
        <div className="detail-actions">
          <button className="button button-primary" onClick={onRequest}>{service.studentOnly ? 'Start student request' : 'Make an enquiry'}</button>
          <button className="button button-outline" onClick={() => navigate('/services')}>Back to services</button>
        </div>
      </article>
    </section>
  );
}

function RequestPage({ service, user, profile, onStudentSubmit, onPublicSubmit, onSubmitted, navigate, onSignIn }) {
  const confirm = useConfirmation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const isStudentRequest = Boolean(user);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setValidationErrors(errors);
    if (errors.length) return;
    const confirmed = await confirm({
      title: isStudentRequest ? 'Submit this service request?' : 'Send this enquiry?',
      message: `Your ${isStudentRequest ? 'request for' : 'enquiry about'} ${service.name} will be sent to the university team.`,
      confirmLabel: isStudentRequest ? 'Submit request' : 'Send enquiry',
    });
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setSuccess('');
    const values = new FormData(form);
    const submittedDate = new Date().toISOString().slice(0, 10);
    const submission = {
      service: service.name,
      name: values.get(isStudentRequest ? 'studentName' : 'name'),
      studentId: isStudentRequest ? values.get('studentId') : '',
      email: user?.email || values.get('email'),
      description: values.get('description'),
      date: submittedDate,
    };
    try {
      let reference;
      if (isStudentRequest) {
        reference = await onStudentSubmit({
          studentName: submission.name,
          studentId: submission.studentId,
          email: submission.email,
          phone: values.get('phone'),
          serviceId: service.id,
          service: service.name,
          description: submission.description,
          date: submittedDate,
          fee: service.fee,
          feeAmount: Number(service.fee.match(/[0-9]+(?:\\.[0-9]+)?/)?.[0] || 0),
        });
      } else {
        reference = await onPublicSubmit({
          name: submission.name,
          email: submission.email,
          phone: values.get('phone'),
          serviceId: service.id,
          service: service.name,
          message: submission.description,
        });
      }
      submission.reference = reference;
      form.reset();
      form.querySelectorAll('input:not([readonly]), textarea').forEach((field) => {
        field.value = '';
      });
      if (onSubmitted) onSubmitted(submission);
      else setSuccess(`${isStudentRequest ? 'Request submitted successfully' : 'Enquiry sent successfully'}. Reference: ${reference}`);
    } catch (submitError) {
      setError(submitError.message || 'Your request could not be submitted. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="content-wrap request-wrap">
      <div className="breadcrumbs"><button className="text-button" onClick={() => navigate(`/services/${service.id}`)}>{service.name}</button><span>/</span><span>{user ? 'Student request' : 'Enquiry'}</span></div>
      <div className="request-layout">
        <form className="request-form" noValidate onSubmit={handleSubmit} onChange={(event) => {
          handleFormInput(event, setValidationErrors);
          setSuccess('');
        }}>
          <span className="eyebrow">{user ? 'STUDENT SERVICE REQUEST' : 'PUBLIC ENQUIRY'}</span>
          <h1>{user ? 'Submit your request' : 'How can we help?'}</h1>
          <p className="form-intro">{user ? 'Your request is private to your student account. We will share updates here.' : 'Send a message to our team. A student account is not required for this service.'}</p>

          {user ? (
            <>
              <div className="form-field"><label htmlFor="request-student-name">Full name</label><input id="request-student-name" name="studentName" defaultValue={profile?.name || user.displayName || ''} autoComplete="name" required minLength="2" maxLength="20" data-validation-type="name" /><FieldValidationError fieldId="request-student-name" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-student-id">Student number</label><input id="request-student-id" name="studentId" defaultValue={profile?.studentId || ''} inputMode="numeric" pattern="90[0-9]{7}" data-validation-type="studentId" data-validation-message="Student number must contain 9 digits and start with 90, for example 901019217." placeholder="e.g. 901019217" required maxLength="9" /><FieldValidationError fieldId="request-student-id" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-email">University email</label><input id="request-email" type="email" name="email" autoComplete="email" defaultValue={user.email || ''} readOnly={Boolean(user.email)} required maxLength="254" /><FieldValidationError fieldId="request-email" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-phone">Mobile number</label><input id="request-phone" name="phone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" defaultValue={profile?.phone || user.phoneNumber || ''} required maxLength="16" /><FieldValidationError fieldId="request-phone" errors={validationErrors} /></div>
            </>
          ) : (
            <>
              <div className="form-field"><label htmlFor="request-name">Your name</label><input id="request-name" name="name" autoComplete="name" placeholder="Full name" required minLength="2" maxLength="20" data-validation-type="name" /><FieldValidationError fieldId="request-name" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-email">Email address</label><input id="request-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength="254" /><FieldValidationError fieldId="request-email" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-phone">Mobile number</label><input id="request-phone" name="phone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" placeholder="+266 5XXXXXXX" required maxLength="16" /><FieldValidationError fieldId="request-phone" errors={validationErrors} /></div>
            </>
          )}
          <div className="form-field"><label htmlFor="request-description">{user ? 'Reason for your request' : 'Your message'}</label><textarea id="request-description" name="description" rows="5" minLength="10" maxLength="1500" placeholder={user ? 'Tell us a little about what you need…' : 'Tell us how we can help…'} required /><FieldValidationError fieldId="request-description" errors={validationErrors} /></div>
          <p className="field-hint">Please do not include passwords or other sensitive personal information.</p>
          <ValidationErrors errors={validationErrors} />
          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          {success && <p className="form-alert form-alert-success" role="status">{success}{user && <> <button type="button" className="text-button" onClick={() => navigate('/student')}>View my requests</button></>}</p>}
          <button className="button button-primary form-submit" disabled={busy} type="submit">{busy ? 'Submitting…' : user ? 'Submit request' : 'Send enquiry'}</button>
          <p className="privacy-note"><Icon name="shield" size={15} /> Your information is shared only with the team responsible for this service.</p>
        </form>
        <aside className="request-aside">
          <div className="request-aside-icon"><Icon name={service.icon} size={22} /></div>
          <span className="eyebrow">YOUR SELECTED SERVICE</span>
          <h2>{service.name}</h2>
          <p>{service.description}</p>
          <div className="aside-rule" />
          <div className="aside-fact"><span>Handled by</span><strong>{service.department}</strong></div>
          <div className="aside-fact"><span>Typical response</span><strong>{service.processingTime}</strong></div>
          <div className="aside-fact"><span>Fee</span><strong>{service.fee}</strong></div>
          {!user && <p className="aside-login">Already a student? <button className="text-button" type="button" onClick={() => onSignIn ? onSignIn() : navigate('/student')}>Sign in to your account</button></p>}
        </aside>
      </div>
    </section>
  );
}

const REQUEST_STATUSES = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Rejected', 'Cancelled'];

function StatusBadge({ status }) {
  return <span className={`status-pill status-${status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>{status || 'Pending'}</span>;
}

function StudentDashboard({ user, profile, profileError, onSubscribeToLetters, onCancelRequest, onUpdateRequest, onDeleteRequest, navigate }) {
  const confirm = useConfirmation();
  const [requests, setRequests] = useState([]);
  const [letters, setLetters] = useState([]);
  const [studentRecord, setStudentRecord] = useState(null);
  const [studentRecordLoaded, setStudentRecordLoaded] = useState(false);
  const [studentRecordError, setStudentRecordError] = useState('');
  const [letterError, setLetterError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [filter, setFilter] = useState('All requests');
  const [cancellingId, setCancellingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingRequestId, setSavingRequestId] = useState('');
  const [profileExpanded, setProfileExpanded] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setStudentRecord(null);
      setStudentRecordLoaded(false);
      setStudentRecordError('');
      return undefined;
    }
    setStudentRecord(null);
    setStudentRecordLoaded(false);
    setStudentRecordError('');
    return subscribeToStudentRecord(user.email, (record) => {
      setStudentRecord(record);
      setStudentRecordLoaded(true);
      setStudentRecordError('');
    }, (error) => {
      setStudentRecordLoaded(true);
      setStudentRecordError(error.message || 'Your student details could not be loaded.');
    });
  }, [user?.email]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToStudentRequests(user.uid, (items) => {
      setRequests(items);
      setRequestError('');
    }, (error) => setRequestError(error.message || 'Requests could not be loaded.'));
  }, [user]);

  useEffect(() => {
    if (!user?.email || !onSubscribeToLetters) return undefined;
    return onSubscribeToLetters(user.email, (items) => {
      setLetters(items);
      setLetterError('');
    }, (error) => setLetterError(error.message || 'Letters could not be loaded.'));
  }, [onSubscribeToLetters, user?.email]);

  const visibleRequests = useMemo(() => (
    filter === 'All requests' ? requests : requests.filter((request) => request.status === filter)
  ), [filter, requests]);

  const handleCancel = async (requestId) => {
    const request = requests.find((item) => item.id === requestId);
    const confirmed = await confirm({
      title: 'Cancel this request?',
      message: `The pending request for ${request?.service || 'this service'} will be cancelled.`,
      confirmLabel: 'Cancel request',
      destructive: true,
    });
    if (!confirmed) return;
    setCancellingId(requestId);
    try {
      await onCancelRequest(requestId);
    } catch (error) {
      setRequestError(error.message || 'This request could not be cancelled.');
    } finally {
      setCancellingId('');
    }
  };

  const handleSaveRequest = async (event, requestId) => {
    event.preventDefault();
    if (editDescription.trim().length < 10) {
      setRequestError('Request details must be at least 10 characters.');
      return;
    }
    const request = requests.find((item) => item.id === requestId);
    const confirmed = await confirm({
      title: 'Save request changes?',
      message: `Your updated details for ${request?.service || 'this request'} will replace the current description.`,
      confirmLabel: 'Save changes',
    });
    if (!confirmed) return;
    setSavingRequestId(requestId);
    setRequestError('');
    try {
      await onUpdateRequest(requestId, editDescription);
      setEditingId('');
    } catch (error) {
      setRequestError(error.message || 'The request could not be updated.');
    } finally {
      setSavingRequestId('');
    }
  };

  const handleDelete = async (requestId) => {
    const request = requests.find((item) => item.id === requestId);
    const confirmed = await confirm({
      title: 'Delete this request?',
      message: `The pending request for ${request?.service || 'this service'} will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete request',
      destructive: true,
    });
    if (!confirmed) return;
    setSavingRequestId(requestId);
    setRequestError('');
    try {
      await onDeleteRequest(requestId);
    } catch (error) {
      setRequestError(error.message || 'The request could not be deleted.');
    } finally {
      setSavingRequestId('');
    }
  };

  const completedCount = requests.filter((request) => request.status === 'Completed').length;
  const openCount = requests.filter((request) => ['Pending', 'Accepted', 'In Progress'].includes(request.status)).length;
  const unpaidRequests = requests.filter((request) => getRequestFeeAmount(request) > 0 && request.feeStatus !== 'Paid');
  const outstandingTotal = unpaidRequests.reduce((total, request) => total + getRequestFeeAmount(request), 0);
  const studentDetails = { ...profile, ...studentRecord };

  return (
    <section className="content-wrap dashboard-wrap">
      <PageHeading
        eyebrow="YOUR STUDENT PORTAL"
        title={`Good to see you${studentDetails.name ? `, ${studentDetails.name.split(' ')[0]}` : ''}.`}
        description="View your student information and keep an eye on your service requests."
        action={<div className="dashboard-actions"><button className="button button-primary" onClick={() => navigate('/services')}>New request</button></div>}
      />
      {(profileError || studentRecordError || requestError || letterError) && <p className="form-alert form-alert-error" role="alert">{profileError || studentRecordError || requestError || letterError}</p>}

      <section className="profile-panel" aria-labelledby="student-profile-heading">
        <div className="profile-panel-heading">
          <div><span className="eyebrow">STUDENT PROFILE</span><h2 id="student-profile-heading">Your student details</h2><p>Open your profile to view the university record associated with your account.</p></div>
          <button
            className="button button-outline profile-toggle"
            type="button"
            aria-expanded={profileExpanded}
            aria-controls="student-profile-details"
            onClick={() => setProfileExpanded((expanded) => !expanded)}
          >
            <Icon name={profileExpanded ? 'close' : 'eye'} size={17} />
            {profileExpanded ? 'Hide profile' : 'View profile'}
          </button>
        </div>
        <div className="profile-lock-note">
          <Icon name="key" size={17} />
          <span><strong>Locked university information</strong> These details are read-only. Contact Student Affairs to request a correction.</span>
        </div>
        <div id="student-profile-details" hidden={!profileExpanded}>
          {profileExpanded && (
            !studentRecordLoaded
              ? <p className="form-intro" role="status">Loading your university record…</p>
              : <div className="profile-fields">
                <div className="form-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" name="profileName" value={studentDetails.name || user.displayName || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-email">Email address</label><input id="profile-email" name="profileEmail" value={studentDetails.email || user.email || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-student-id">Student number</label><input id="profile-student-id" name="profileStudentId" value={studentDetails.studentId || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-faculty">Faculty</label><input id="profile-faculty" name="profileFaculty" value={studentDetails.faculty || 'Not assigned'} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-course">Course</label><input id="profile-course" name="profileCourse" value={studentDetails.course || 'Not assigned'} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-dob">Date of birth</label><input id="profile-dob" name="profileDateOfBirth" type="date" value={studentDetails.dateOfBirth || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-birth-place">Place of birth</label><input id="profile-birth-place" name="profileBirthPlace" value={studentDetails.birthPlace || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-phone">Mobile number</label><input id="profile-phone" name="profilePhone" value={studentDetails.phone || ''} readOnly /></div>
                <div className="form-field"><label htmlFor="profile-address">Home address</label><textarea id="profile-address" name="profileAddress" value={studentDetails.address || ''} readOnly rows="3" /></div>
              </div>
          )}
        </div>
      </section>

      <div className="dashboard-stats">
        <div><span>Total requests</span><strong>{requests.length}</strong><Icon name="document" size={19} /></div>
        <div><span>In progress</span><strong>{openCount}</strong><Icon name="calendar" size={19} /></div>
        <div><span>Completed</span><strong>{completedCount}</strong><Icon name="shield" size={19} /></div>
        <div className="debt-stat"><span>Fees owed</span><strong>M{outstandingTotal.toFixed(2)}</strong><Icon name="document" size={19} /></div>
      </div>

      {unpaidRequests.length > 0 && <section className="outstanding-fees" aria-labelledby="fees-owed-title">
        <div className="dashboard-section-heading"><div><span className="eyebrow">STUDENT ACCOUNT</span><h2 id="fees-owed-title">Outstanding service fees</h2></div><strong>M{outstandingTotal.toFixed(2)}</strong></div>
        <div className="fee-list">{unpaidRequests.map((request) => <div className="fee-row" key={request.id}><span>{request.service}</span><strong>M{getRequestFeeAmount(request).toFixed(2)}</strong><span className="fee-unpaid">Unpaid</span></div>)}</div>
      </section>}

      <section className="student-letters" aria-labelledby="student-letters-title">
        <div className="dashboard-section-heading"><div><span className="eyebrow">LETTERS</span><h2 id="student-letters-title">Letters from the university</h2></div></div>
        {letters.length ? <div className="student-letter-list">{letters.map((letter) => (
          <article className="student-letter-item" key={letter.id}>
            <div><h3>{letter.title}</h3><span>{letter.createdAt?.toDate?.().toLocaleDateString() || 'Recently sent'} · SAMPLE - NOT OFFICIAL</span><p>{letter.body}</p></div>
            <button className="button button-outline" type="button" onClick={() => downloadStudentLetterPdf(letter)}>Download letter PDF</button>
          </article>
        ))}</div> : <p className="form-intro">Letters sent by the university will appear here.</p>}
      </section>

      <div className="dashboard-section-heading">
        <div><span className="eyebrow">REQUEST HISTORY</span><h2>Your service requests</h2></div>
        <label className="visually-hidden" htmlFor="request-filter">Filter by request status</label>
        <select id="request-filter" className="select-control" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option>All requests</option>{REQUEST_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      {visibleRequests.length ? (
        <div className="request-list">
          {visibleRequests.map((request) => (
            <article className="request-item" key={request.id}>
              <div className="request-item-icon"><Icon name={defaultServices.find((service) => service.id === request.serviceId)?.icon || 'document'} size={19} /></div>
              <div className="request-item-main">
                <span className="request-reference">REFERENCE · {request.id.slice(0, 10).toUpperCase()}</span>
                <h3>{request.service}</h3>
                {editingId === request.id ? (
                  <form className="request-edit-form" onSubmit={(event) => handleSaveRequest(event, request.id)}>
                    <label className="visually-hidden" htmlFor={`edit-request-${request.id}`}>Edit request details</label>
                    <textarea id={`edit-request-${request.id}`} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} minLength="10" maxLength="1500" required />
                    <button className="button button-primary" type="submit" disabled={savingRequestId === request.id}>{savingRequestId === request.id ? 'Saving…' : 'Save changes'}</button>
                    <button className="button button-outline" type="button" onClick={() => setEditingId('')}>Cancel edit</button>
                  </form>
                ) : <p>{request.description}</p>}
                <span className="request-date">Submitted {request.date || 'recently'}</span>
                {getRequestFeeAmount(request) > 0 && <span className="request-fee">Fee: M{getRequestFeeAmount(request).toFixed(2)} · {request.feeStatus || 'Unpaid'}</span>}
                <button className="text-button request-pdf-link" type="button" onClick={() => downloadRequestPdf(request)}>Download request PDF</button>
              </div>
              <div className="request-item-status"><StatusBadge status={request.status} />{request.status === 'Pending' && <>
                {editingId !== request.id && <button className="text-button" type="button" onClick={() => { setEditingId(request.id); setEditDescription(request.description); }}>Edit request</button>}
                <button className="text-button delete-link" type="button" disabled={savingRequestId === request.id} onClick={() => handleDelete(request.id)}>Delete request</button>
                <button className="text-button cancel-button" type="button" disabled={cancellingId === request.id} onClick={() => handleCancel(request.id)}>{cancellingId === request.id ? 'Cancelling…' : 'Cancel request'}</button>
              </>}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span className="empty-icon"><Icon name="document" size={24} /></span><h2>{requests.length ? 'No requests in this status' : 'No requests just yet'}</h2><p>{requests.length ? 'Choose a different status filter to see your requests.' : 'When you submit a service request, you can follow its progress here.'}</p><button className="button button-outline" onClick={() => navigate('/services')}>Browse services</button></div>
      )}
    </section>
  );
}

function NotificationsPage({ notifications, error, onMarkRead, onMarkAllRead }) {
  const confirm = useConfirmation();
  const [actionError, setActionError] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markRead = async (notificationId) => {
    const notification = notifications.find((item) => item.id === notificationId);
    const confirmed = await confirm({
      title: 'Mark notification as read?',
      message: notification?.title
        ? `"${notification.title}" will be marked as read.`
        : 'This notification will be marked as read.',
      confirmLabel: 'Mark as read',
    });
    if (!confirmed) return;
    setActionError('');
    try {
      await onMarkRead(notificationId);
    } catch (failure) {
      setActionError(failure.message || 'The notification could not be marked as read.');
    }
  };

  const markAllRead = async () => {
    const confirmed = await confirm({
      title: 'Mark all notifications as read?',
      message: `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'} will be marked as read.`,
      confirmLabel: 'Mark all as read',
    });
    if (!confirmed) return;
    setActionError('');
    try {
      await onMarkAllRead();
    } catch (failure) {
      setActionError(failure.message || 'Notifications could not be marked as read.');
    }
  };

  return (
    <section className="content-wrap dashboard-wrap">
      <PageHeading
        eyebrow="STUDENT PORTAL"
        title="Notifications"
        description="Updates about your requests and student profile appear here."
        action={unreadCount > 0 && (
          <button className="button button-outline" type="button" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      />
      {(error || actionError) && <p className="form-alert form-alert-error" role="alert">{error || actionError}</p>}
      {notifications.length ? (
        <div className="portal-notification-list">
          {notifications.map((notification) => (
            <article
              className={`portal-notification${notification.read ? '' : ' unread'}`}
              key={notification.id}
            >
              <span className="portal-notification-icon"><Icon name={notification.type === 'profile' ? 'user' : 'bell'} size={18} /></span>
              <div className="portal-notification-content">
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                {notification.createdAt?.toDate && (
                  <time dateTime={notification.createdAt.toDate().toISOString()}>
                    {notification.createdAt.toDate().toLocaleString()}
                  </time>
                )}
              </div>
              {!notification.read && (
                <button className="text-button" type="button" onClick={() => markRead(notification.id)}>
                  Mark as read
                </button>
              )}
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="bell" size={24} /></span>
          <h2>No notifications yet</h2>
          <p>Request updates and important account activity will appear here.</p>
        </div>
      ) : null}
    </section>
  );
}

function AdminDashboard({
  services,
  onCreateService,
  onUpdateStatus,
  onDeleteRequest,
  onCreateStudent,
  onGrantAdminAccess,
  onSetFeeStatus,
  onSendLetterAndAcceptRequest,
  onDeleteStudent,
  onUpdateStudent,
  onSubscribeToAcademicOptions = subscribeToAcademicOptions,
  onSaveAcademicOptions = saveAcademicOptions,
  adminEmail,
  initialSection = 'requests',
  navigate,
}) {
  const confirm = useConfirmation();
  const [requests, setRequests] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [section, setSection] = useState(initialSection);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [serviceValidationErrors, setServiceValidationErrors] = useState([]);
  const [newServiceIcon, setNewServiceIcon] = useState('document');
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [staffValidationErrors, setStaffValidationErrors] = useState([]);
  const [letterRequestId, setLetterRequestId] = useState('');
  const [letterTitle, setLetterTitle] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [letterValidationErrors, setLetterValidationErrors] = useState([]);
  const [deletingStudentEmail, setDeletingStudentEmail] = useState('');
  const [editingStudentEmail, setEditingStudentEmail] = useState('');
  const [academicOptions, setAcademicOptions] = useState({ faculties: [], courses: [] });
  const [academicError, setAcademicError] = useState('');
  const [academicMessage, setAcademicMessage] = useState('');
  const [academicBusy, setAcademicBusy] = useState(false);
  const [newStudentFaculty, setNewStudentFaculty] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentStep, setNewStudentStep] = useState(0);
  const [editingStudentFaculty, setEditingStudentFaculty] = useState('');
  const [editingStudentCourse, setEditingStudentCourse] = useState('');
  const [studentFacultyFilter, setStudentFacultyFilter] = useState('all');
  const [courseFaculty, setCourseFaculty] = useState('');

  useEffect(() => setSection(initialSection), [initialSection]);

  useEffect(() => {
    let requestReady = false;
    let inquiryReady = false;
    let requestSubscription = () => {};
    let inquirySubscription = () => {};
    let studentSubscription = () => {};
    const onError = (failure) => setError(failure.message || 'Staff records could not be loaded.');
    requestSubscription = subscribeToAllStudentRequests((items) => {
      setRequests(items);
      requestReady = true;
      if (inquiryReady) setError('');
    }, onError) || (() => {});
    inquirySubscription = subscribeToPublicInquiries((items) => {
      setInquiries(items);
      inquiryReady = true;
      if (requestReady) setError('');
    }, onError) || (() => {});
    studentSubscription = subscribeToStudentRecords((items) => setStudents(items), onError) || (() => {});
    return () => {
      requestSubscription();
      inquirySubscription();
      studentSubscription();
    };
  }, []);

  useEffect(() => onSubscribeToAcademicOptions((options) => {
    setAcademicOptions(normalizeAcademicOptions(options));
    setAcademicError('');
  }, (failure) => {
    setAcademicError(failure.message || 'Academic choices could not be loaded.');
  }), [onSubscribeToAcademicOptions]);

  const filteredRequests = useMemo(() => requests.filter((request) => (
    `${request.studentName} ${request.studentId} ${request.service} ${request.email}`.toLowerCase().includes(query.toLowerCase())
  )), [query, requests]);
  const filteredInquiries = useMemo(() => inquiries.filter((item) => (
    `${item.name} ${item.service} ${item.email} ${item.message}`.toLowerCase().includes(query.toLowerCase())
  )), [inquiries, query]);
  const filteredStudents = useMemo(() => students.filter((student) => (
    `${student.name} ${student.studentId} ${student.email} ${student.faculty || ''} ${student.course || ''}`.toLowerCase().includes(query.toLowerCase())
  )), [query, students]);
  const facultyFilterOptions = useMemo(() => [...new Set([
    ...academicOptions.faculties,
    ...students.map((student) => student.faculty).filter(Boolean),
  ])].sort((first, second) => first.localeCompare(second)), [academicOptions.faculties, students]);
  const visibleStudents = filteredStudents.filter((student) => (
    studentFacultyFilter === 'all' || student.faculty === studentFacultyFilter
  ));
  const studentGroups = useMemo(() => {
    const groups = new Map();
    visibleStudents.forEach((student) => {
      const faculty = student.faculty || 'Faculty not assigned';
      groups.set(faculty, [...(groups.get(faculty) || []), student]);
    });
    return [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([faculty, groupStudents]) => [
        faculty,
        groupStudents.sort((first, second) => first.name.localeCompare(second.name)),
      ]);
  }, [visibleStudents]);
  const coursesForFaculty = (faculty) => academicOptions.courses
    .filter((course) => course.faculty === faculty)
    .map((course) => course.name);

  const openLetterEditor = (request) => {
    setLetterRequestId(request.id);
    setLetterTitle(`${request.service} - ${request.studentName}`);
    setLetterBody(`To whom it may concern,\n\nThis draft letter is prepared for ${request.studentName}, student number ${request.studentId}, in response to the ${request.service} request.\n\nPlease review and edit this text before sending. This generated draft is not an official university document.\n\nSincerely,\nStudent Affairs Office\nLimkokwing University of Creative Technology\nMaseru Campus, Maseru, Lesotho`);
    setLetterValidationErrors([]);
  };

  const handleSendLetter = async (event, request) => {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    setLetterValidationErrors(errors);
    if (errors.length) return;
    const confirmed = await confirm({
      title: 'Send this letter and accept the request?',
      message: `The letter will be sent to ${request.studentName}, and their ${request.service} request will be accepted.`,
      confirmLabel: 'Send letter',
    });
    if (!confirmed) return;
    setBusyId(request.id);
    setError('');
    try {
      await onSendLetterAndAcceptRequest(request.id, {
        studentEmail: request.email,
        studentName: request.studentName,
        studentId: request.studentId,
        title: letterTitle,
        body: letterBody,
        createdBy: adminEmail,
      });
      setLetterRequestId('');
    } catch (failure) {
      setError(failure.message || 'The letter could not be sent and the request was not accepted.');
    } finally {
      setBusyId('');
    }
  };

  const persistAcademicOptions = async (nextOptions, message) => {
    setAcademicBusy(true);
    setAcademicError('');
    setAcademicMessage('');
    try {
      await onSaveAcademicOptions(nextOptions);
      setAcademicOptions(nextOptions);
      setAcademicMessage(message);
      return true;
    } catch (failure) {
      setAcademicError(failure.message || 'Academic choices could not be saved.');
      return false;
    } finally {
      setAcademicBusy(false);
    }
  };

  const handleAddFaculty = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const faculty = new FormData(form).get('newFaculty').trim();
    if (!faculty) {
      setAcademicError('Enter a faculty name.');
      return;
    }
    if (academicOptions.faculties.some((item) => item.toLowerCase() === faculty.toLowerCase())) {
      setAcademicError('That faculty is already in the list.');
      return;
    }
    const confirmed = await confirm({
      title: 'Add this faculty?',
      message: `${faculty} will be available when staff add or edit student records.`,
      confirmLabel: 'Add faculty',
    });
    if (!confirmed) return;
    const saved = await persistAcademicOptions({
      ...academicOptions,
      faculties: [...academicOptions.faculties, faculty].sort((first, second) => first.localeCompare(second)),
    }, `${faculty} was added to the faculty list.`);
    if (saved) form.reset();
  };

  const handleAddCourse = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const faculty = values.get('courseFaculty');
    const name = values.get('courseName').trim();
    if (!name) {
      setAcademicError('Enter a course name.');
      return;
    }
    if (academicOptions.courses.some((course) => (
      course.faculty === faculty && course.name.toLowerCase() === name.toLowerCase()
    ))) {
      setAcademicError('That course is already listed for this faculty.');
      return;
    }
    const confirmed = await confirm({
      title: 'Add this course?',
      message: `${name} will be available under ${faculty} when staff add or edit student records.`,
      confirmLabel: 'Add course',
    });
    if (!confirmed) return;
    const saved = await persistAcademicOptions({
      ...academicOptions,
      courses: [...academicOptions.courses, { faculty, name }]
        .sort((first, second) => first.name.localeCompare(second.name)),
    }, `${name} was added to ${faculty}.`);
    if (saved) {
      form.reset();
      setCourseFaculty(faculty);
    }
  };

  const handleRemoveFaculty = async (faculty) => {
    const confirmed = await confirm({
      title: 'Remove this faculty?',
      message: `"${faculty}" and its course choices will be removed from future student entries. Existing student records will remain unchanged.`,
      confirmLabel: 'Remove faculty',
      destructive: true,
    });
    if (!confirmed) return;
    const nextOptions = {
      faculties: academicOptions.faculties.filter((item) => item !== faculty),
      courses: academicOptions.courses.filter((course) => course.faculty !== faculty),
    };
    const saved = await persistAcademicOptions(nextOptions, `${faculty} was removed from future choices.`);
    if (saved) {
      if (courseFaculty === faculty) setCourseFaculty('');
      if (newStudentFaculty === faculty) {
        setNewStudentFaculty('');
        setNewStudentCourse('');
      }
    }
  };

  const handleRemoveCourse = async (course) => {
    const confirmed = await confirm({
      title: 'Remove this course?',
      message: `"${course.name}" will be removed from future student entries for ${course.faculty}. Existing student records will remain unchanged.`,
      confirmLabel: 'Remove course',
      destructive: true,
    });
    if (!confirmed) return;
    const nextOptions = {
      ...academicOptions,
      courses: academicOptions.courses.filter((item) => (
        item.faculty !== course.faculty || item.name !== course.name
      )),
    };
    await persistAcademicOptions(nextOptions, `${course.name} was removed from future choices.`);
  };

  const updateStatus = async (id, status) => {
    const request = requests.find((item) => item.id === id);
    const inquiry = inquiries.find((item) => item.id === id);
    const record = section === 'requests' ? request : inquiry;
    const confirmed = await confirm({
      title: 'Update record status?',
      message: `The status for ${record?.studentName || record?.name || 'this record'} will change to ${status}.`,
      confirmLabel: 'Update status',
    });
    if (!confirmed) return;
    setBusyId(id);
    setError('');
    try {
      if (section === 'requests') await onUpdateStatus(id, status);
      else await setInquiryStatus(id, status);
    } catch (failure) {
      setError(failure.message || 'The record could not be updated.');
    } finally {
      setBusyId('');
    }
  };

  const removeRecord = async (id) => {
    const request = requests.find((item) => item.id === id);
    const inquiry = inquiries.find((item) => item.id === id);
    const recordName = section === 'requests'
      ? request?.studentName
      : inquiry?.name;
    const confirmed = await confirm({
      title: 'Delete this record?',
      message: `${recordName ? `${recordName}'s ` : 'This '}record will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Delete record',
      destructive: true,
    });
    if (!confirmed) return;
    setBusyId(id);
    setError('');
    try {
      if (section === 'requests') await onDeleteRequest(id);
      else await deleteInquiry(id);
    } catch (failure) {
      setError(failure.message || 'The record could not be deleted.');
    } finally {
      setBusyId('');
    }
  };

  const handleCreateService = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setServiceValidationErrors(errors);
    if (errors.length) return;
    const values = new FormData(form);
    const serviceName = values.get('serviceName');
    const confirmed = await confirm({
      title: 'Add this service?',
      message: `${serviceName} will be added to the service directory as ${values.get('serviceVisibility') === 'students' ? 'private to signed-in students' : 'public'}.`,
      confirmLabel: 'Add service',
    });
    if (!confirmed) return;
    setServiceBusy(true);
    setServiceError('');
    setServiceMessage('');
    try {
      const id = await onCreateService({
        name: values.get('serviceName'),
        description: values.get('serviceDescription'),
        department: values.get('serviceDepartment'),
        processingTime: values.get('serviceProcessingTime'),
        fee: values.get('serviceFee'),
        studentOnly: values.get('serviceVisibility') === 'students',
        icon: values.get('serviceIcon'),
      });
      form.reset();
      setNewServiceIcon('document');
      setServiceMessage(`Service added to the directory (reference ${id}).`);
    } catch (failure) {
      setServiceError(failure.message || 'The service could not be added.');
    } finally {
      setServiceBusy(false);
    }
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (newStudentStep < studentFormSteps.length - 1) {
      handleNextStudentStep(form);
      return;
    }
    const errors = validateForm(form);
    setStaffValidationErrors(errors);
    if (errors.length) return;
    const values = new FormData(form);
    const faculty = values.get('studentFaculty');
    const course = values.get('studentCourse');
    if (!academicOptions.faculties.includes(faculty)
      || !academicOptions.courses.some((item) => item.faculty === faculty && item.name === course)) {
      setStaffError('Choose a faculty and course from the current academic options.');
      return;
    }
    const studentName = values.get('studentName');
    const confirmed = await confirm({
      title: 'Add this student record?',
      message: `${studentName} will be added to the student directory with ${faculty} / ${course}.`,
      confirmLabel: 'Add student',
    });
    if (!confirmed) return;
    setStaffBusy(true);
    setStaffError('');
    setStaffMessage('');
    try {
      await onCreateStudent({
        name: values.get('studentName'),
        email: values.get('studentEmail'),
        studentId: values.get('studentId'),
        dateOfBirth: values.get('studentDateOfBirth'),
        birthPlace: values.get('studentBirthPlace'),
        phone: values.get('studentPhone'),
        address: values.get('studentAddress'),
        faculty: values.get('studentFaculty'),
        course: values.get('studentCourse'),
      });
      form.reset();
      setNewStudentFaculty('');
      setNewStudentCourse('');
      setNewStudentStep(0);
      setStaffMessage('Student added to the database. They can now sign in with Google using this email address.');
    } catch (failure) {
      setStaffError(failure.message || 'The student could not be added.');
    } finally {
      setStaffBusy(false);
    }
  };

  const handleNextStudentStep = (form) => {
    const stepFields = form.querySelector(`[data-student-step="${newStudentStep}"]`);
    const errors = validateForm(stepFields);
    setStaffValidationErrors(errors);
    if (errors.length) return;
    setNewStudentStep((step) => Math.min(step + 1, studentFormSteps.length - 1));
  };

  const openStudentEditor = (student) => {
    setEditingStudentEmail(student.email);
    setEditingStudentFaculty(student.faculty || '');
    setEditingStudentCourse(student.course || '');
    setStaffValidationErrors([]);
    setStaffError('');
  };

  const handleUpdateStudent = async (event, student) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setStaffValidationErrors(errors);
    if (errors.length) return;
    const values = new FormData(form);
    const updatedName = values.get('editStudentName');
    const confirmed = await confirm({
      title: 'Save student record changes?',
      message: `The university record for ${student.name} will be updated${updatedName !== student.name ? ` to ${updatedName}` : ''}.`,
      confirmLabel: 'Save changes',
    });
    if (!confirmed) return;
    setStaffBusy(true);
    setStaffError('');
    setStaffMessage('');
    try {
      await onUpdateStudent(student.email, {
        name: values.get('editStudentName'),
        studentId: values.get('editStudentId'),
        dateOfBirth: values.get('editStudentDateOfBirth'),
        birthPlace: values.get('editStudentBirthPlace'),
        phone: values.get('editStudentPhone'),
        address: values.get('editStudentAddress'),
        faculty: values.get('editStudentFaculty'),
        course: values.get('editStudentCourse'),
      });
      setEditingStudentEmail('');
      setEditingStudentFaculty('');
      setEditingStudentCourse('');
      setStaffMessage(`Details updated for ${student.name}.`);
    } catch (failure) {
      setStaffError(failure.message || 'The student details could not be updated.');
    } finally {
      setStaffBusy(false);
    }
  };

  const handleGrantAdmin = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setStaffValidationErrors(errors);
    if (errors.length) return;
    const email = new FormData(form).get('adminEmail');
    const confirmed = await confirm({
      title: 'Grant administrator access?',
      message: `${email} will be able to access the university administration tools.`,
      confirmLabel: 'Grant access',
    });
    if (!confirmed) return;
    setStaffBusy(true);
    setStaffError('');
    setStaffMessage('');
    try {
      await onGrantAdminAccess(email);
      form.reset();
      setStaffMessage(`Admin access granted to ${email}. They can now sign in with Google using this email address.`);
    } catch (failure) {
      setStaffError(failure.message || 'Admin access could not be granted.');
    } finally {
      setStaffBusy(false);
    }
  };

  const updateFeeStatus = async (requestId, feeStatus) => {
    const request = requests.find((item) => item.id === requestId);
    const confirmed = await confirm({
      title: 'Update fee payment status?',
      message: `The fee for ${request?.studentName || 'this student'}'s ${request?.service || 'request'} will be marked ${feeStatus.toLowerCase()}.`,
      confirmLabel: 'Update fee status',
    });
    if (!confirmed) return;
    setBusyId(requestId);
    setError('');
    try {
      await onSetFeeStatus(requestId, feeStatus);
    } catch (failure) {
      setError(failure.message || 'The fee status could not be updated.');
    } finally {
      setBusyId('');
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = await confirm({
      title: 'Permanently remove this student?',
      message: `${student.name} (${student.studentId}), their sign-in, profile, requests, notifications, and letters will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Remove student',
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingStudentEmail(student.email);
    setError('');
    try {
      await onDeleteStudent(student.email);
    } catch (failure) {
      setError(failure.message || 'The student could not be removed.');
    } finally {
      setDeletingStudentEmail('');
    }
  };

  const sectionDetails = {
    requests: { title: 'Request queue', description: 'Review incoming student requests and update their progress.' },
    inquiries: { title: 'Public enquiries', description: 'Respond to messages from students, applicants, and visitors.' },
    students: { title: 'Student directory', description: 'Find, update, and manage approved student records.' },
    finance: { title: 'Finance & fees', description: 'Track outstanding student fees, collected amounts, and payment status.' },
    services: { title: 'Service setup', description: 'Control service visibility and configure the public directory.' },
    staff: { title: 'Staff access', description: 'Add student records and manage authorized staff access.' },
    academics: { title: 'Academic options', description: 'Manage faculty and course choices for student records.' },
  };
  const changeSection = (nextSection) => {
    setSection(nextSection);
    if (navigate) navigate(`/staff?view=${nextSection}`);
  };

  return (
    <section className="content-wrap dashboard-wrap">
      <PageHeading eyebrow="ADMINISTRATION" title={sectionDetails[section].title} description={sectionDetails[section].description} />
      <div className="staff-controls">
        <div className="staff-tabs" role="tablist" aria-label="Staff record type">
          <button role="tab" aria-selected={section === 'requests'} className={section === 'requests' ? 'active' : ''} onClick={() => changeSection('requests')}><Icon name="document" size={16} />Request queue <span>{requests.length}</span></button>
          <button role="tab" aria-selected={section === 'inquiries'} className={section === 'inquiries' ? 'active' : ''} onClick={() => changeSection('inquiries')}><Icon name="message" size={16} />Public enquiries <span>{inquiries.length}</span></button>
          <button role="tab" aria-selected={section === 'finance'} className={section === 'finance' ? 'active' : ''} onClick={() => changeSection('finance')}><Icon name="chart" size={16} />Finance & fees</button>
          <button role="tab" aria-selected={section === 'services'} className={section === 'services' ? 'active' : ''} onClick={() => changeSection('services')}><Icon name="grid" size={16} />Service setup <span>{services.length}</span></button>
          <button role="tab" aria-selected={section === 'students'} className={section === 'students' ? 'active' : ''} onClick={() => changeSection('students')}><Icon name="id" size={16} />Student directory <span>{students.length}</span></button>
          <button role="tab" aria-selected={section === 'staff'} className={section === 'staff' ? 'active' : ''} onClick={() => changeSection('staff')}><Icon name="shield" size={16} />Staff access</button>
          <button role="tab" aria-selected={section === 'academics'} className={section === 'academics' ? 'active' : ''} onClick={() => changeSection('academics')}><Icon name="university" size={16} />Academic options</button>
        </div>
        {['requests', 'inquiries', 'students'].includes(section) && <>
            <label className="visually-hidden" htmlFor="staff-search">Search by name, email, student number, faculty, or course</label>
            <div className="staff-search-wrap">
              <Icon name="search" size={17} />
              <input id="staff-search" className="staff-search" type="search" placeholder="Search name, email, student number, faculty, or course" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </>}
      </div>
      {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
      {section === 'finance' && <AdminFinancePage requests={requests} />}
      {section === 'requests' && <div className="staff-records">
        {filteredRequests.map((request) => (
          <article className="staff-record" key={request.id}>
            <div className="staff-record-header"><div><h3>{request.service}</h3><span>{request.studentName} · {request.studentId}</span></div><StatusBadge status={request.status} /></div>
            <p>{request.description}</p>
            {letterRequestId === request.id && <form className="request-form admin-letter-editor" noValidate onSubmit={(event) => handleSendLetter(event, request)} onChange={(event) => handleFormInput(event, setLetterValidationErrors)}>
              <span className="eyebrow">GENERATED LETTER DRAFT</span>
              <p className="form-intro">Student and request details are filled in automatically. Review the text before sending. The PDF will be marked SAMPLE - NOT OFFICIAL.</p>
              <div className="form-field"><label htmlFor={`letter-title-${request.id}`}>Letter title</label><input id={`letter-title-${request.id}`} value={letterTitle} onChange={(event) => setLetterTitle(event.target.value)} required minLength="3" maxLength="120" /></div>
              <div className="form-field"><label htmlFor={`letter-body-${request.id}`}>Letter text</label><textarea id={`letter-body-${request.id}`} value={letterBody} onChange={(event) => setLetterBody(event.target.value)} required minLength="20" maxLength="5000" rows="12" /></div>
              <ValidationErrors errors={letterValidationErrors} />
              <div className="detail-actions"><button className="button button-primary" type="submit" disabled={busyId === request.id}>{busyId === request.id ? 'Sending letter…' : 'Send letter & accept request'}</button><button className="button button-outline" type="button" onClick={() => setLetterRequestId('')}>Cancel</button></div>
            </form>}
            <div className="staff-record-footer">
              <span>{request.email} · {request.date}</span>
              <div className="staff-record-actions">
                {request.status === 'Pending' && (request.serviceId === 'recommendation' || request.service?.toLowerCase().includes('letter')
                  ? <button className="button button-primary staff-accept" disabled={busyId === request.id} onClick={() => openLetterEditor(request)}>Write & send letter</button>
                  : <button className="button button-primary staff-accept" disabled={busyId === request.id} onClick={() => updateStatus(request.id, 'Accepted')}>{busyId === request.id ? 'Updating…' : 'Accept request'}</button>)}
                <label className="visually-hidden" htmlFor={`status-${request.id}`}>Update status for {request.studentName}</label>
                <select id={`status-${request.id}`} disabled={busyId === request.id} className="select-control" value={request.status} onChange={(event) => updateStatus(request.id, event.target.value)}>{REQUEST_STATUSES.filter((status) => status !== 'Cancelled' || request.status === status).map((status) => <option key={status}>{status}</option>)}</select>
                {getRequestFeeAmount(request) > 0 && <>
                  <label className="visually-hidden" htmlFor={`fee-status-${request.id}`}>Update fee payment status for {request.studentName}</label>
                  <select id={`fee-status-${request.id}`} className="select-control" value={request.feeStatus || 'Unpaid'} disabled={busyId === request.id} onChange={(event) => updateFeeStatus(request.id, event.target.value)}><option>Unpaid</option><option>Paid</option></select>
                </>}
                <button className="button button-outline" type="button" onClick={() => downloadRequestPdf(request)}>Download PDF</button>
                <button className="text-button delete-link" disabled={busyId === request.id} onClick={() => removeRecord(request.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
        {filteredRequests.length === 0 && (
          <div className="empty-state"><h2>{query ? 'No matching requests' : 'Nothing to review yet'}</h2><p>{query ? 'Try another name, email, service, or keyword.' : 'New student submissions will appear here as soon as they come in.'}</p></div>
        )}
      </div>}
      {section === 'inquiries' && <div className="staff-records">
        {filteredInquiries.map((item) => (
          <article className="staff-record" key={item.id}>
            <div className="staff-record-header"><div><h3>{item.service}</h3><span>{item.name} · {item.email}</span></div><StatusBadge status={item.status} /></div>
            <p>{item.message}</p>
            <div className="staff-record-footer"><span>{item.phone || 'No phone number provided'}</span><div><label className="visually-hidden" htmlFor={`inquiry-status-${item.id}`}>Update enquiry status for {item.name}</label><select id={`inquiry-status-${item.id}`} disabled={busyId === item.id} className="select-control" value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>{['New', 'In Progress', 'Resolved'].map((status) => <option key={status}>{status}</option>)}</select><button className="text-button delete-link" disabled={busyId === item.id} onClick={() => removeRecord(item.id)}>Delete</button></div></div>
          </article>
        ))}
        {filteredInquiries.length === 0 && <div className="empty-state"><h2>{query ? 'No matching enquiries' : 'No public enquiries yet'}</h2><p>New public enquiries will appear here as they are received.</p></div>}
      </div>}
      {section === 'students' && <>
        <div className="student-directory-toolbar">
          <label htmlFor="student-faculty-filter">Filter by faculty</label>
          <select id="student-faculty-filter" className="select-control" value={studentFacultyFilter} onChange={(event) => setStudentFacultyFilter(event.target.value)}>
            <option value="all">All faculties</option>
            {facultyFilterOptions.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}
          </select>
          <span>{visibleStudents.length} {visibleStudents.length === 1 ? 'student' : 'students'}</span>
        </div>
        <div className="student-directory-list">
          {studentGroups.length ? studentGroups.map(([faculty, groupStudents]) => (
            <section className="student-faculty-group" key={faculty} aria-labelledby={`faculty-heading-${faculty.replace(/[^A-Za-z0-9]/g, '-')}`}>
              <div className="student-faculty-heading">
                <Icon name="university" size={18} />
                <h2 id={`faculty-heading-${faculty.replace(/[^A-Za-z0-9]/g, '-')}`}>{faculty}</h2>
                <span>{groupStudents.length}</span>
              </div>
              {groupStudents.map((student) => {
                const facultyOptions = [...new Set([
                  student.faculty,
                  ...academicOptions.faculties,
                ].filter(Boolean))].sort((first, second) => first.localeCompare(second));
                const editCourseOptions = coursesForFaculty(editingStudentFaculty);
                const courseOptions = editingStudentEmail === student.email
                  && student.course && editingStudentFaculty === student.faculty
                  && !editCourseOptions.includes(student.course)
                  ? [student.course, ...editCourseOptions]
                  : editCourseOptions;
                return (
                  <article className="student-directory-record" key={student.email}>
                    <div className="student-directory-record-heading">
                      <div><h3>{student.name}</h3><span>{student.studentId} · {student.email}</span></div>
                      <div className="detail-actions">
                        <button className="button button-outline" type="button" disabled={staffBusy || deletingStudentEmail === student.email} onClick={() => {
                          if (editingStudentEmail === student.email) {
                            setEditingStudentEmail('');
                            setEditingStudentFaculty('');
                            setEditingStudentCourse('');
                          } else openStudentEditor(student);
                        }}>{editingStudentEmail === student.email ? 'Cancel edit' : 'Edit details'}</button>
                        <button className="button button-outline delete-link" type="button" disabled={deletingStudentEmail === student.email || staffBusy} onClick={() => handleDeleteStudent(student)}>{deletingStudentEmail === student.email ? 'Removing…' : 'Delete student'}</button>
                      </div>
                    </div>
                    {editingStudentEmail === student.email && <form className="request-form student-edit-form" noValidate onSubmit={(event) => handleUpdateStudent(event, student)} onChange={(event) => handleFormInput(event, setStaffValidationErrors)}>
                      <p className="form-intro">Update this student's university record. The sign-in email address cannot be changed here.</p>
                      <div className="profile-fields">
                        <div className="form-field"><label htmlFor={`edit-student-name-${student.studentId}`}>Full name</label><input id={`edit-student-name-${student.studentId}`} name="editStudentName" defaultValue={student.name} required minLength="2" maxLength="20" data-validation-type="name" /></div>
                        <div className="form-field"><label htmlFor={`edit-student-id-${student.studentId}`}>Student number</label><input id={`edit-student-id-${student.studentId}`} name="editStudentId" defaultValue={student.studentId} inputMode="numeric" pattern="90[0-9]{7}" data-validation-type="studentId" data-validation-message="Student number must contain 9 digits and start with 90." required maxLength="9" /></div>
                        <div className="form-field"><label htmlFor={`edit-student-dob-${student.studentId}`}>Date of birth</label><input id={`edit-student-dob-${student.studentId}`} name="editStudentDateOfBirth" type="date" defaultValue={student.dateOfBirth || ''} required /></div>
                        <div className="form-field"><label htmlFor={`edit-student-birth-place-${student.studentId}`}>Place of birth</label><input id={`edit-student-birth-place-${student.studentId}`} name="editStudentBirthPlace" defaultValue={student.birthPlace || ''} required minLength="2" maxLength="100" /></div>
                        <div className="form-field"><label htmlFor={`edit-student-phone-${student.studentId}`}>Contact phone</label><input id={`edit-student-phone-${student.studentId}`} name="editStudentPhone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." defaultValue={student.phone || ''} required maxLength="16" /></div>
                        <div className="form-field"><label htmlFor={`edit-student-address-${student.studentId}`}>Home address</label><textarea id={`edit-student-address-${student.studentId}`} name="editStudentAddress" defaultValue={student.address || ''} required minLength="5" maxLength="240" rows="3" /></div>
                        <div className="form-field"><label htmlFor={`edit-student-faculty-${student.studentId}`}>Faculty</label><select id={`edit-student-faculty-${student.studentId}`} name="editStudentFaculty" value={editingStudentFaculty} required onChange={(event) => {
                          setEditingStudentFaculty(event.target.value);
                          setEditingStudentCourse('');
                        }}><option value="">Select faculty</option>{facultyOptions.map((facultyOption) => <option key={facultyOption} value={facultyOption}>{facultyOption}</option>)}</select></div>
                        <div className="form-field"><label htmlFor={`edit-student-course-${student.studentId}`}>Course</label><select id={`edit-student-course-${student.studentId}`} name="editStudentCourse" value={editingStudentCourse} required disabled={!editingStudentFaculty || !courseOptions.length} onChange={(event) => setEditingStudentCourse(event.target.value)}><option value="">Select course</option>{courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}</select></div>
                      </div>
                      <ValidationErrors errors={staffValidationErrors} />
                      <button className="button button-primary" type="submit" disabled={staffBusy}>{staffBusy ? 'Saving details…' : 'Save student details'}</button>
                    </form>}
                    <dl className="student-directory-details">
                      <div><dt>Date of birth</dt><dd>{student.dateOfBirth || 'Not recorded'}</dd></div>
                      <div><dt>Place of birth</dt><dd>{student.birthPlace || 'Not recorded'}</dd></div>
                      <div><dt>Contact</dt><dd>{student.phone || 'Not recorded'}</dd></div>
                      <div><dt>Address</dt><dd>{student.address || 'Not recorded'}</dd></div>
                      <div><dt>Faculty</dt><dd>{student.faculty || 'Not assigned'}</dd></div>
                      <div><dt>Course</dt><dd>{student.course || 'Not assigned'}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </section>
          )) : <div className="empty-state"><h2>{query ? 'No matching students' : 'No students registered'}</h2><p>{query ? 'Try another student name, number, or faculty.' : 'Add students from Staff access.'}</p></div>}
        </div>
      </>}
      {section === 'services' && <div className="admin-management-grid">
        <form className="request-form admin-create-form" noValidate onSubmit={handleCreateService} onChange={(event) => handleFormInput(event, setServiceValidationErrors)}>
          <span className="eyebrow">SERVICE DIRECTORY</span>
          <h2>Add a service</h2>
          <p className="form-intro">New services are added to the live directory immediately.</p>
          <div className="form-field"><label htmlFor="service-name">Service name</label><input id="service-name" name="serviceName" required maxLength="100" /><FieldValidationError fieldId="service-name" errors={serviceValidationErrors} /></div>
          <div className="form-field"><label htmlFor="service-department">Responsible department</label><input id="service-department" name="serviceDepartment" required maxLength="100" /><FieldValidationError fieldId="service-department" errors={serviceValidationErrors} /></div>
          <div className="form-field"><label htmlFor="service-processing-time">Typical processing time</label><input id="service-processing-time" name="serviceProcessingTime" required maxLength="60" placeholder="e.g. 2 working days" /><FieldValidationError fieldId="service-processing-time" errors={serviceValidationErrors} /></div>
          <div className="form-field"><label htmlFor="service-fee">Fee</label><input id="service-fee" name="serviceFee" required maxLength="40" placeholder="No fee" /><FieldValidationError fieldId="service-fee" errors={serviceValidationErrors} /></div>
          <div className="form-field"><label htmlFor="service-description">Description</label><textarea id="service-description" name="serviceDescription" required minLength="10" maxLength="500" rows="4" /><FieldValidationError fieldId="service-description" errors={serviceValidationErrors} /></div>
          <div className="form-field">
            <label htmlFor="service-visibility">Service visibility</label>
            <select id="service-visibility" name="serviceVisibility" defaultValue="students">
              <option value="public">Public - visible to everyone</option>
              <option value="students">Private - signed-in students</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-icon">Service icon</label>
            <div className="service-icon-picker">
              <select id="service-icon" name="serviceIcon" value={newServiceIcon} onChange={(event) => setNewServiceIcon(event.target.value)}>
              {['document', ...ICON_NAMES.filter((iconName) => iconName !== 'document')]
                .map((iconName) => <option key={iconName} value={iconName}>{iconName.replace(/([A-Z])/g, ' $1')}</option>)}
              </select>
              <span className="service-icon-preview" aria-label={`Selected icon: ${newServiceIcon}`}><Icon name={newServiceIcon} size={22} /></span>
            </div>
          </div>
          <ValidationErrors errors={serviceValidationErrors} />
          {serviceError && <p className="form-alert form-alert-error" role="alert">{serviceError}</p>}
          {serviceMessage && <p className="form-alert form-alert-success" role="status">{serviceMessage}</p>}
          <button className="button button-primary form-submit" disabled={serviceBusy}>{serviceBusy ? 'Adding service…' : 'Add service to directory'}</button>
        </form>
        <section className="admin-service-list">
          <span className="eyebrow">CURRENT DIRECTORY</span>
          <h2>Available services</h2>
          <p className="form-intro">Visitors see public services. Signed-in students see the full service directory.</p>
          {services.map((service) => (
            <article key={service.id} className="admin-service-item">
              <span className="service-icon"><Icon name={service.icon || 'document'} size={18} /></span>
              <div><strong>{service.name}</strong><span>{service.studentOnly ? 'Student access' : 'Public access'} · {service.department}</span></div>
            </article>
          ))}
        </section>
      </div>}
      {section === 'staff' && <section className="admin-access-panel">
        <div className="admin-access-grid staff-management-grid">
          <form className="request-form admin-account-form student-create-form" noValidate onSubmit={handleCreateStudent} onChange={(event) => handleFormInput(event, setStaffValidationErrors)}>
            <span className="eyebrow">STUDENT DIRECTORY</span>
            <h2>Add a student</h2>
            <p className="form-intro">Enter the student's verified details. Faculty and course options are managed by staff.</p>
            <div className="student-form-progress">
              <ol aria-label="Student record steps">
                {studentFormSteps.map((step, index) => (
                  <li key={step.title} className={index === newStudentStep ? 'active' : index < newStudentStep ? 'complete' : ''} aria-current={index === newStudentStep ? 'step' : undefined}>
                    <span className="student-form-step-number">{index < newStudentStep ? '✓' : index + 1}</span>
                    <span><strong>{step.title}</strong><small>{step.description}</small></span>
                  </li>
                ))}
              </ol>
              <div className="student-form-progress-track" role="progressbar" aria-label="Student record progress" aria-valuemin={1} aria-valuemax={studentFormSteps.length} aria-valuenow={newStudentStep + 1}>
                <span style={{ width: `${((newStudentStep + 1) / studentFormSteps.length) * 100}%` }} />
              </div>
              <p>Step {newStudentStep + 1} of {studentFormSteps.length}</p>
            </div>
            <fieldset className="student-form-step" data-student-step="0" hidden={newStudentStep !== 0}>
              <legend>Student identity</legend>
              <div className="form-field"><label htmlFor="student-name">Full name</label><input id="student-name" name="studentName" required minLength="2" maxLength="20" data-validation-type="name" /><FieldValidationError fieldId="student-name" errors={staffValidationErrors} /></div>
              <div className="form-field"><label htmlFor="student-email">Google account email</label><input id="student-email" name="studentEmail" type="email" required maxLength="254" /><FieldValidationError fieldId="student-email" errors={staffValidationErrors} /></div>
              <div className="form-field"><label htmlFor="student-number">Student number</label><input id="student-number" name="studentId" inputMode="numeric" pattern="90[0-9]{7}" data-validation-type="studentId" data-validation-message="Student number must contain 9 digits and start with 90." required maxLength="9" placeholder="e.g. 901019217" /><FieldValidationError fieldId="student-number" errors={staffValidationErrors} /></div>
            </fieldset>
            <fieldset className="student-form-step" data-student-step="1" hidden={newStudentStep !== 1}>
              <legend>Contact details</legend>
              <div className="form-field"><label htmlFor="student-date-of-birth">Date of birth</label><input id="student-date-of-birth" name="studentDateOfBirth" type="date" required /></div>
              <div className="form-field"><label htmlFor="student-birth-place">Place of birth</label><input id="student-birth-place" name="studentBirthPlace" required minLength="2" maxLength="100" /></div>
              <div className="form-field"><label htmlFor="student-phone">Contact phone</label><input id="student-phone" name="studentPhone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." required maxLength="16" /></div>
              <div className="form-field"><label htmlFor="student-address">Home address</label><textarea id="student-address" name="studentAddress" required minLength="5" maxLength="240" rows="3" /></div>
            </fieldset>
            <fieldset className="student-form-step" data-student-step="2" hidden={newStudentStep !== 2}>
              <legend>Academic programme</legend>
              <div className="form-field"><label htmlFor="student-faculty">Faculty</label><select id="student-faculty" name="studentFaculty" value={newStudentFaculty} required onChange={(event) => {
                setNewStudentFaculty(event.target.value);
                setNewStudentCourse('');
              }}><option value="">Select faculty</option>{academicOptions.faculties.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}</select><FieldValidationError fieldId="student-faculty" errors={staffValidationErrors} /></div>
              <div className="form-field"><label htmlFor="student-course">Course</label><select id="student-course" name="studentCourse" value={newStudentCourse} required disabled={!newStudentFaculty || !coursesForFaculty(newStudentFaculty).length} onChange={(event) => setNewStudentCourse(event.target.value)}><option value="">Select course</option>{coursesForFaculty(newStudentFaculty).map((course) => <option key={course} value={course}>{course}</option>)}</select><FieldValidationError fieldId="student-course" errors={staffValidationErrors} /></div>
            </fieldset>
            <div className="student-form-actions">
              {newStudentStep > 0 && <button className="button button-outline" type="button" onClick={() => {
                setStaffValidationErrors([]);
                setNewStudentStep((step) => step - 1);
              }}>Previous</button>}
              {newStudentStep < studentFormSteps.length - 1
                ? <button className="button button-primary" type="button" onClick={(event) => handleNextStudentStep(event.currentTarget.closest('form'))}>Next</button>
                : <button className="button button-primary" type="submit" disabled={staffBusy}>{staffBusy ? 'Adding student…' : 'Add student'}</button>}
            </div>
          </form>
          <div className="staff-management-side">
            <form className="request-form admin-account-form" noValidate onSubmit={handleGrantAdmin} onChange={(event) => handleFormInput(event, setStaffValidationErrors)}>
              <span className="eyebrow">ADMINISTRATOR ACCESS</span>
              <h2>Add an admin</h2>
              <p className="form-intro">Grant administrator access to this email. The person can sign in with Google afterward.</p>
              <div className="form-field"><label htmlFor="admin-email">Google account email</label><input id="admin-email" name="adminEmail" type="email" required maxLength="254" /><FieldValidationError fieldId="admin-email" errors={staffValidationErrors} /></div>
              <button className="button button-primary form-submit" disabled={staffBusy}>{staffBusy ? 'Granting access…' : 'Grant admin access'}</button>
            </form>
            <ValidationErrors errors={staffValidationErrors} />
            {staffError && <p className="form-alert form-alert-error" role="alert">{staffError}</p>}
            {staffMessage && <p className="form-alert form-alert-success" role="status">{staffMessage}</p>}
          </div>
        </div>
      </section>}
      {section === 'academics' && <AcademicOptionsPage
        options={academicOptions}
        busy={academicBusy}
        error={academicError}
        message={academicMessage}
        courseFaculty={courseFaculty}
        coursesForFaculty={coursesForFaculty}
        onCourseFacultyChange={setCourseFaculty}
        onAddFaculty={handleAddFaculty}
        onAddCourse={handleAddCourse}
        onRemoveFaculty={handleRemoveFaculty}
        onRemoveCourse={handleRemoveCourse}
      />}
    </section>
  );
}

function ContactPage({ onSubmit }) {
  const confirm = useConfirmation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setValidationErrors(errors);
    if (errors.length) return;
    const values = new FormData(form);
    const confirmed = await confirm({
      title: 'Send this enquiry?',
      message: 'Your message will be sent to the university team so they can respond to you.',
      confirmLabel: 'Send enquiry',
    });
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const reference = await onSubmit({
        name: values.get('contactName'),
        email: values.get('contactEmail'),
        phone: values.get('contactPhone'),
        serviceId: 'enquiry',
        service: 'General enquiry',
        message: values.get('contactMessage'),
      });
      form.reset();
      setSuccess(`Your enquiry has been sent. Reference: ${reference}`);
    } catch (submitError) {
      setError(submitError.message || 'Your enquiry could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="content-wrap">
      <PageHeading eyebrow="WE'RE HERE TO HELP" title="Talk to our team" description="Not sure which service you need? The registry can point you in the right direction." />
      <div className="contact-grid">
        <article><span className="contact-icon"><Icon name="mail" size={21} /></span><span className="eyebrow">EMAIL</span><h2>Registry office</h2><a href="mailto:registry@limkokwing.ac.ls">registry@limkokwing.ac.ls</a><p>Send us your question and our team will get back to you.</p></article>
        <article><span className="contact-icon"><Icon name="support" size={21} /></span><span className="eyebrow">CALL</span><h2>Speak to us</h2><a href="tel:+26622313000">+266 2231 3000</a><p>Call the campus registry during office hours.</p></article>
        <article><span className="contact-icon"><Icon name="university" size={21} /></span><span className="eyebrow">VISIT</span><h2>Maseru campus</h2><p className="contact-address">Main Campus, Maseru<br />Block C, Lesotho</p><p>Monday–Friday · 08:30–16:30</p></article>
      </div>
      <form className="request-form contact-form" noValidate onSubmit={handleSubmit} onChange={(event) => handleFormInput(event, setValidationErrors)}>
        <span className="eyebrow">SEND A MESSAGE</span>
        <h2>Send a general enquiry</h2>
        <p className="form-intro">Your message will be sent to the university team and a reference will be shown when it is received.</p>
        <div className="form-field"><label htmlFor="contact-name">Your name</label><input id="contact-name" name="contactName" autoComplete="name" required minLength="2" maxLength="20" data-validation-type="name" /><FieldValidationError fieldId="contact-name" errors={validationErrors} /></div>
        <div className="form-field"><label htmlFor="contact-email">Email address</label><input id="contact-email" name="contactEmail" type="email" autoComplete="email" required maxLength="254" /><FieldValidationError fieldId="contact-email" errors={validationErrors} /></div>
        <div className="form-field"><label htmlFor="contact-phone">Mobile number</label><input id="contact-phone" name="contactPhone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" required maxLength="16" /><FieldValidationError fieldId="contact-phone" errors={validationErrors} /></div>
        <div className="form-field"><label htmlFor="contact-message">Your message</label><textarea id="contact-message" name="contactMessage" rows="5" minLength="10" maxLength="1500" required /><FieldValidationError fieldId="contact-message" errors={validationErrors} /></div>
        <ValidationErrors errors={validationErrors} />
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        {success && <p className="form-alert form-alert-success" role="status">{success}</p>}
        <button className="button button-primary form-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
      </form>
    </section>
  );
}

function SuccessPage({ navigate, title, message, primaryLabel = 'Explore services', primaryPath = '/services', onPrimary }) {
  return (
    <section className="content-wrap success-wrap">
      <div className="success-panel">
        <span className="success-icon"><Icon name="shield" size={28} /></span>
        <span className="eyebrow">LIMKOKWING UNIVERSITY</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="detail-actions"><button className="button button-primary" onClick={() => onPrimary ? onPrimary() : navigate(primaryPath)}>{primaryLabel}</button><button className="button button-outline" onClick={() => navigate('/')}>Go to home</button></div>
      </div>
    </section>
  );
}

function SubmissionConfirmationPage({ submission, navigate }) {
  if (!submission) {
    return (
      <SuccessPage
        navigate={navigate}
        title="No submission details available"
        message="A confirmation is shown after a request or enquiry is successfully submitted. You can start a new submission from the services page."
        primaryLabel="Browse services"
        primaryPath="/services"
      />
    );
  }

  const details = [
    ['Reference', submission.reference],
    ['Service', submission.service],
    ['Name', submission.name],
    ...(submission.studentId ? [['Student number', submission.studentId]] : []),
    ['Email', submission.email],
    ['Date submitted', submission.date],
    ['Description', submission.description],
  ];

  return (
    <section className="content-wrap success-wrap">
      <div className="success-panel submission-confirmation">
        <span className="success-icon"><Icon name="shield" size={28} /></span>
        <span className="eyebrow">LIMKOKWING UNIVERSITY</span>
        <h1>Submission received</h1>
        <p>Your {submission.studentId ? 'student request' : 'enquiry'} was submitted successfully. Keep the reference number for your records.</p>
        <dl className="confirmation-details">
          {details.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <div className="detail-actions">
          <button className="button button-primary" onClick={() => navigate('/services')}>Back to services</button>
          <button className="button button-outline" onClick={() => navigate('/')}>Go to home</button>
        </div>
      </div>
    </section>
  );
}

export {
  AdminDashboard,
  ContactPage,
  CoursesPage,
  FeesPage,
  NotificationsPage,
  RequestPage,
  ServiceDetailsPage,
  ServicesPage,
  StudentDashboard,
  SubmissionConfirmationPage,
  SuccessPage,
};
