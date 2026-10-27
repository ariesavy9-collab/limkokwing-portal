import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import ValidationErrors, { FieldValidationError } from '../components/ValidationErrors';
import { handleFormInput, validateForm } from '../models/formValidation';
import {
  deleteInquiry,
  setInquiryStatus,
  subscribeToAllStudentRequests,
  subscribeToPublicInquiries,
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
        Explore service <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function HomePage({ navigate, user, services, serviceError, onStudentAccess }) {
  const availableServices = services.filter((service) => user || !service.studentOnly);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow hero-eyebrow"><span className="live-dot" /> MASERU CAMPUS · STUDENT SERVICES</span>
          <h1>Your university<br />services, <em>simplified.</em></h1>
          <p>From transcripts to technical support, find the help you need and follow every request in one place.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => navigate('/services')}>Explore our services <span aria-hidden="true">→</span></button>
            <button className="button button-light" onClick={onStudentAccess}>{user ? 'Student portal' : 'Student sign in'}</button>
          </div>
          <div className="hero-note"><Icon name="shield" size={16} /> Secure access for students. Public enquiries welcome.</div>
        </div>
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-caption"><span className="caption-line" /> Creativity meets opportunity</div>
      </section>

      <section className="trust-strip" aria-label="Portal highlights">
        <div><strong>{availableServices.length}</strong><span>services available</span></div>
        <div><strong>24/7</strong><span>online access</span></div>
        <div><strong>1 place</strong><span>for updates and support</span></div>
        <span className="trust-note">Serving our Maseru campus community</span>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HERE FOR YOUR NEXT STEP</span>
            <h2>Support, without the runaround.</h2>
          </div>
          <p>Clear information, simple forms, and transparent updates make it easier to get on with what matters.</p>
        </div>
        <div className="benefit-grid">
          <article className="benefit-card"><span className="benefit-number">01</span><Icon name="document" size={22} /><h3>Find the right service</h3><p>See what each service covers, who can use it, and how long it usually takes.</p></article>
          <article className="benefit-card"><span className="benefit-number">02</span><Icon name="calendar" size={22} /><h3>Submit in a few steps</h3><p>Send a clear request online and receive a reference for your records.</p></article>
          <article className="benefit-card"><span className="benefit-number">03</span><Icon name="message" size={22} /><h3>Stay in the loop</h3><p>Students can check request progress securely from their own dashboard.</p></article>
        </div>
      </section>

      <section className="section-block services-preview">
        {serviceError && <p className="form-alert form-alert-error" role="alert">{serviceError}</p>}
        <div className="section-heading">
          <div><span className="eyebrow">A BETTER WAY TO GET HELP</span><h2>How can we help?</h2></div>
          <button className="text-button view-all-link" onClick={() => navigate('/services')}>View all services <span aria-hidden="true">→</span></button>
        </div>
        <div className="service-grid">
          {availableServices.slice(0, 3).map((service) => <ServiceCard key={service.id} service={service} navigate={navigate} />)}
        </div>
      </section>

      {!user && (
        <section className="section-block public-pathways">
          <div className="section-heading">
            <div><span className="eyebrow">PLAN YOUR NEXT STEP</span><h2>Thinking about studying with us?</h2></div>
            <p>Explore programmes at the Maseru campus and contact the university for current fee information.</p>
          </div>
          <div className="pathway-grid">
            <article className="pathway-card">
              <span className="pathway-icon"><Icon name="university" size={22} /></span>
              <h3>Our courses</h3>
              <p>Browse the courses and faculties available at Limkokwing University, Lesotho.</p>
              <button className="text-button" onClick={() => navigate('/courses')}>View our courses <span aria-hidden="true">→</span></button>
            </article>
            <article className="pathway-card">
              <span className="pathway-icon"><Icon name="document" size={22} /></span>
              <h3>Tuition and fees</h3>
              <p>Request the current official fee schedule and confirm payment details with the university.</p>
              <button className="text-button" onClick={() => navigate('/fees')}>View fees <span aria-hidden="true">→</span></button>
            </article>
          </div>
        </section>
      )}

      {!user && (
        <section className="student-callout">
          <div className="callout-icon"><Icon name="shield" size={25} /></div>
          <div><span className="eyebrow">FOR REGISTERED STUDENTS</span><h2>Your requests, all in one place.</h2><p>Sign in to submit academic service requests, manage your profile, and track progress securely.</p></div>
          <button className="button button-primary" onClick={onStudentAccess}>Open student portal <span aria-hidden="true">→</span></button>
        </section>
      )}
    </>
  );
}

function ServicesPage({ navigate, user, services, serviceError }) {
  const [query, setQuery] = useState('');
  const availableServices = services.filter((service) => user || !service.studentOnly);
  const filteredServices = availableServices.filter((service) => (
    `${service.name} ${service.department} ${service.description}`.toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <section className="content-wrap">
      <PageHeading
        eyebrow={user ? 'YOUR STUDENT SERVICES' : 'SERVICES FOR VISITORS'}
        title="University services"
        description={user
          ? 'Find the right team, understand what to expect, and start a request when you are ready.'
          : 'Browse services available to visitors and prospective students. Sign in to access registered-student services.'}
      />
      {serviceError && <p className="form-alert form-alert-error" role="alert">{serviceError}</p>}
      <div className="service-filter">
        <label className="visually-hidden" htmlFor="service-search">Search university services</label>
        <Icon name="message" size={18} />
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
      {!user && <aside className="public-note"><Icon name="message" size={20} /><p><strong>Registered student?</strong> Sign in to view academic services and follow your requests online.</p><button className="text-button" onClick={() => navigate('/student')}>Student sign in <span aria-hidden="true">→</span></button></aside>}
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
        <Icon name="university" size={18} />
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
      <aside className="public-note">
        <Icon name="message" size={20} />
        <p><strong>Need help choosing?</strong> Ask the university team about course availability, entry requirements, and application dates.</p>
        <button className="text-button" onClick={() => navigate('/contact')}>Contact us <span aria-hidden="true">→</span></button>
      </aside>
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
          <button className="button button-primary" onClick={() => navigate('/contact')}>Ask about fees <span aria-hidden="true">→</span></button>
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
          <button className="button button-primary" onClick={onRequest}>{service.studentOnly ? 'Start student request' : 'Make an enquiry'} <span aria-hidden="true">→</span></button>
          <button className="button button-outline" onClick={() => navigate('/services')}>Back to services</button>
        </div>
      </article>
    </section>
  );
}

function RequestPage({ service, user, profile, onStudentSubmit, onPublicSubmit, onSubmitted, navigate, onSignIn }) {
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
              <div className="form-field"><label htmlFor="request-student-name">Full name</label><input id="request-student-name" name="studentName" defaultValue={profile?.name || user.displayName || ''} autoComplete="name" required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" /><FieldValidationError fieldId="request-student-name" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-student-id">Student number</label><input id="request-student-id" name="studentId" defaultValue={profile?.studentId || ''} inputMode="numeric" pattern="[0-9]{9}" data-validation-type="studentId" data-validation-message="Student number must contain exactly 9 digits, for example 901019217." placeholder="e.g. 901019217" required maxLength="9" /><FieldValidationError fieldId="request-student-id" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-email">University email</label><input id="request-email" type="email" name="email" autoComplete="email" defaultValue={user.email || ''} readOnly={Boolean(user.email)} required maxLength="254" /><FieldValidationError fieldId="request-email" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-phone">Mobile number</label><input id="request-phone" name="phone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" defaultValue={profile?.phone || user.phoneNumber || ''} required maxLength="16" /><FieldValidationError fieldId="request-phone" errors={validationErrors} /></div>
            </>
          ) : (
            <>
              <div className="form-field"><label htmlFor="request-name">Your name</label><input id="request-name" name="name" autoComplete="name" placeholder="Full name" required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" /><FieldValidationError fieldId="request-name" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-email">Email address</label><input id="request-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength="254" /><FieldValidationError fieldId="request-email" errors={validationErrors} /></div>
              <div className="form-field"><label htmlFor="request-phone">Mobile number</label><input id="request-phone" name="phone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." autoComplete="tel" placeholder="+266 5XXXXXXX" required maxLength="16" /><FieldValidationError fieldId="request-phone" errors={validationErrors} /></div>
            </>
          )}
          <div className="form-field"><label htmlFor="request-description">{user ? 'Reason for your request' : 'Your message'}</label><textarea id="request-description" name="description" rows="5" minLength="10" maxLength="1500" placeholder={user ? 'Tell us a little about what you need…' : 'Tell us how we can help…'} required /><FieldValidationError fieldId="request-description" errors={validationErrors} /></div>
          <p className="field-hint">Please do not include passwords or other sensitive personal information.</p>
          <ValidationErrors errors={validationErrors} />
          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          {success && <p className="form-alert form-alert-success" role="status">{success}{user && <> <button type="button" className="text-button" onClick={() => navigate('/student')}>View my requests</button></>}</p>}
          <button className="button button-primary form-submit" disabled={busy} type="submit">{busy ? 'Submitting…' : user ? 'Submit request' : 'Send enquiry'} <span aria-hidden="true">→</span></button>
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

function StudentDashboard({ user, profile, profileError, onSaveProfile, onCancelRequest, navigate }) {
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [filter, setFilter] = useState('All requests');
  const [profileOpen, setProfileOpen] = useState(!profile?.studentId);
  const [formError, setFormError] = useState('');
  const [profileValidationErrors, setProfileValidationErrors] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [cancellingId, setCancellingId] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToStudentRequests(user.uid, (items) => {
      setRequests(items);
      setRequestError('');
    }, (error) => setRequestError(error.message || 'Requests could not be loaded.'));
  }, [user]);

  useEffect(() => {
    setProfileOpen(!profile?.studentId);
  }, [profile?.studentId]);

  const visibleRequests = useMemo(() => (
    filter === 'All requests' ? requests : requests.filter((request) => request.status === filter)
  ), [filter, requests]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    setProfileValidationErrors(errors);
    if (errors.length) return;
    setSavingProfile(true);
    setFormError('');
    const values = new FormData(event.currentTarget);
    try {
      await onSaveProfile({
        name: values.get('profileName'),
        studentId: values.get('profileStudentId'),
        phone: values.get('profilePhone'),
      });
      setProfileOpen(false);
    } catch (error) {
      setFormError(error.message || 'Your profile could not be saved. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm('Cancel this pending request?')) return;
    setCancellingId(requestId);
    try {
      await onCancelRequest(requestId);
    } catch (error) {
      setRequestError(error.message || 'This request could not be cancelled.');
    } finally {
      setCancellingId('');
    }
  };

  const completedCount = requests.filter((request) => request.status === 'Completed').length;
  const openCount = requests.filter((request) => ['Pending', 'Accepted', 'In Progress'].includes(request.status)).length;

  return (
    <section className="content-wrap dashboard-wrap">
      <PageHeading
        eyebrow="YOUR STUDENT PORTAL"
        title={`Good to see you${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}.`}
        description="Manage your student information and keep an eye on your service requests."
        action={<button className="button button-primary" onClick={() => navigate('/services')}>New request <span aria-hidden="true">→</span></button>}
      />
      {(profileError || requestError) && <p className="form-alert form-alert-error" role="alert">{profileError || requestError}</p>}

      {profileOpen && (
        <form className="profile-panel" noValidate onSubmit={handleProfileSubmit} onChange={(event) => handleFormInput(event, setProfileValidationErrors)}>
          <div><span className="eyebrow">ONE LAST STEP</span><h2>Complete your student profile</h2><p>Add your student ID so we can link requests to your university record.</p></div>
          <div className="profile-fields">
            <div className="form-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" name="profileName" defaultValue={profile?.name || user.displayName || ''} required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" /><FieldValidationError fieldId="profile-name" errors={profileValidationErrors} /></div>
            <div className="form-field"><label htmlFor="profile-student-id">Student number</label><input id="profile-student-id" name="profileStudentId" defaultValue={profile?.studentId || ''} inputMode="numeric" pattern="[0-9]{9}" data-validation-type="studentId" data-validation-message="Student number must contain exactly 9 digits, for example 901019217." required maxLength="9" placeholder="e.g. 901019217" /><FieldValidationError fieldId="profile-student-id" errors={profileValidationErrors} /></div>
            <div className="form-field"><label htmlFor="profile-phone">Mobile number</label><input id="profile-phone" name="profilePhone" type="tel" inputMode="tel" pattern="[+]?[0-9]{8,15}" data-validation-type="phone" data-validation-message="Enter a phone number using digits only, with an optional leading +." defaultValue={profile?.phone || user.phoneNumber || ''} required maxLength="16" /><FieldValidationError fieldId="profile-phone" errors={profileValidationErrors} /></div>
          </div>
          <ValidationErrors errors={profileValidationErrors} />
          {formError && <p className="form-alert form-alert-error" role="alert">{formError}</p>}
          <button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save student profile'}</button>
        </form>
      )}

      <div className="dashboard-stats">
        <div><span>Total requests</span><strong>{requests.length}</strong><Icon name="document" size={19} /></div>
        <div><span>In progress</span><strong>{openCount}</strong><Icon name="calendar" size={19} /></div>
        <div><span>Completed</span><strong>{completedCount}</strong><Icon name="shield" size={19} /></div>
      </div>

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
                <p>{request.description}</p>
                <span className="request-date">Submitted {request.date || 'recently'}</span>
              </div>
              <div className="request-item-status"><StatusBadge status={request.status} />{request.status === 'Pending' && <button className="text-button cancel-button" disabled={cancellingId === request.id} onClick={() => handleCancel(request.id)}>{cancellingId === request.id ? 'Cancelling…' : 'Cancel request'}</button>}</div>
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
  const [actionError, setActionError] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markRead = async (notificationId) => {
    setActionError('');
    try {
      await onMarkRead(notificationId);
    } catch (failure) {
      setActionError(failure.message || 'The notification could not be marked as read.');
    }
  };

  const markAllRead = async () => {
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
  onCreateStaffAccount,
  initialSection = 'requests',
}) {
  const [requests, setRequests] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [error, setError] = useState('');
  const [section, setSection] = useState(initialSection);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [serviceValidationErrors, setServiceValidationErrors] = useState([]);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [staffValidationErrors, setStaffValidationErrors] = useState([]);

  useEffect(() => setSection(initialSection), [initialSection]);

  useEffect(() => {
    let requestReady = false;
    let inquiryReady = false;
    const onError = (failure) => setError(failure.message || 'Staff records could not be loaded.');
    const requestSubscription = subscribeToAllStudentRequests((items) => {
      setRequests(items);
      requestReady = true;
      if (inquiryReady) setError('');
    }, onError);
    const inquirySubscription = subscribeToPublicInquiries((items) => {
      setInquiries(items);
      inquiryReady = true;
      if (requestReady) setError('');
    }, onError);
    return () => {
      requestSubscription();
      inquirySubscription();
    };
  }, []);

  const filteredRequests = useMemo(() => requests.filter((request) => (
    `${request.studentName} ${request.studentId} ${request.service} ${request.email}`.toLowerCase().includes(query.toLowerCase())
  )), [query, requests]);
  const filteredInquiries = useMemo(() => inquiries.filter((item) => (
    `${item.name} ${item.service} ${item.email} ${item.message}`.toLowerCase().includes(query.toLowerCase())
  )), [inquiries, query]);

  const updateStatus = async (id, status) => {
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
    if (!window.confirm('Delete this record permanently? This action cannot be undone.')) return;
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
        studentOnly: values.get('serviceStudentOnly') === 'on',
      });
      form.reset();
      setServiceMessage(`Service added to the directory (reference ${id}).`);
    } catch (failure) {
      setServiceError(failure.message || 'The service could not be added.');
    } finally {
      setServiceBusy(false);
    }
  };

  const handleCreateStaffAccount = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setStaffValidationErrors(errors);
    if (errors.length) return;
    const values = new FormData(form);
    setStaffBusy(true);
    setStaffError('');
    setStaffMessage('');
    try {
      const account = await onCreateStaffAccount({
        name: values.get('staffName'),
        email: values.get('staffEmail'),
        password: values.get('staffPassword'),
      });
      form.reset();
      setStaffMessage(`Staff account created for ${account.email}. They can now sign in using their email and temporary password.`);
    } catch (failure) {
      setStaffError(failure.message || 'The staff account could not be created.');
    } finally {
      setStaffBusy(false);
    }
  };

  return (
    <section className="content-wrap dashboard-wrap">
      <PageHeading eyebrow="AUTHORIZED STAFF" title="Service management" description="Review incoming requests and enquiries, update progress, and keep students informed." />
      <div className="staff-controls">
        <div className="staff-tabs" role="tablist" aria-label="Staff record type">
          <button role="tab" aria-selected={section === 'requests'} className={section === 'requests' ? 'active' : ''} onClick={() => setSection('requests')}>Student requests <span>{requests.length}</span></button>
          <button role="tab" aria-selected={section === 'inquiries'} className={section === 'inquiries' ? 'active' : ''} onClick={() => setSection('inquiries')}>Public enquiries <span>{inquiries.length}</span></button>
          <button role="tab" aria-selected={section === 'services'} className={section === 'services' ? 'active' : ''} onClick={() => setSection('services')}>Services <span>{services.length}</span></button>
          <button role="tab" aria-selected={section === 'staff'} className={section === 'staff' ? 'active' : ''} onClick={() => setSection('staff')}>Staff accounts</button>
        </div>
        {['requests', 'inquiries'].includes(section) && <>
          <label className="visually-hidden" htmlFor="staff-search">Search student and public records</label>
          <input id="staff-search" className="staff-search" type="search" placeholder="Search records…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </>}
      </div>
      {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
      {section === 'requests' && <div className="staff-records">
        {filteredRequests.map((request) => (
          <article className="staff-record" key={request.id}>
            <div className="staff-record-header"><div><h3>{request.service}</h3><span>{request.studentName} · {request.studentId}</span></div><StatusBadge status={request.status} /></div>
            <p>{request.description}</p>
            <div className="staff-record-footer"><span>{request.email} · {request.date}</span><div>{request.status === 'Pending' && <button className="button button-primary staff-accept" disabled={busyId === request.id} onClick={() => updateStatus(request.id, 'Accepted')}>{busyId === request.id ? 'Updating…' : 'Accept request'}</button>}<label className="visually-hidden" htmlFor={`status-${request.id}`}>Update status for {request.studentName}</label><select id={`status-${request.id}`} disabled={busyId === request.id} className="select-control" value={request.status} onChange={(event) => updateStatus(request.id, event.target.value)}>{REQUEST_STATUSES.filter((status) => status !== 'Cancelled' || request.status === status).map((status) => <option key={status}>{status}</option>)}</select><button className="text-button delete-link" disabled={busyId === request.id} onClick={() => removeRecord(request.id)}>Delete</button></div></div>
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
          <label className="checkbox-field"><input type="checkbox" name="serviceStudentOnly" defaultChecked /><span>Available to registered students only</span></label>
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
      {section === 'staff' && <form className="request-form admin-account-form" noValidate onSubmit={handleCreateStaffAccount} onChange={(event) => handleFormInput(event, setStaffValidationErrors)}>
        <span className="eyebrow">AUTHORIZED STAFF ONLY</span>
        <h2>Create a staff account</h2>
        <p className="form-intro">Staff access is assigned securely by Firebase. New accounts can use the same sign-in form as students; authorized staff will see the staff workspace automatically.</p>
        <div className="form-field"><label htmlFor="staff-name">Staff member's full name</label><input id="staff-name" name="staffName" autoComplete="name" required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" /><FieldValidationError fieldId="staff-name" errors={staffValidationErrors} /></div>
        <div className="form-field"><label htmlFor="staff-email">Work email address</label><input id="staff-email" name="staffEmail" type="email" autoComplete="email" required maxLength="254" /><FieldValidationError fieldId="staff-email" errors={staffValidationErrors} /></div>
        <div className="form-field"><label htmlFor="staff-password">Temporary password</label><input id="staff-password" name="staffPassword" type="password" autoComplete="new-password" required minLength="12" maxLength="128" /><FieldValidationError fieldId="staff-password" errors={staffValidationErrors} /><p className="field-hint">Use at least 12 characters. Share this temporary password with the staff member securely.</p></div>
        <ValidationErrors errors={staffValidationErrors} />
        {staffError && <p className="form-alert form-alert-error" role="alert">{staffError}</p>}
        {staffMessage && <p className="form-alert form-alert-success" role="status">{staffMessage}</p>}
        <button className="button button-primary form-submit" disabled={staffBusy}>{staffBusy ? 'Creating staff account…' : 'Create staff account'}</button>
      </form>}
    </section>
  );
}

function ContactPage({ onSubmit }) {
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
        <div className="form-field"><label htmlFor="contact-name">Your name</label><input id="contact-name" name="contactName" autoComplete="name" required minLength="2" maxLength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*" data-validation-type="name" /><FieldValidationError fieldId="contact-name" errors={validationErrors} /></div>
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
        <div className="detail-actions"><button className="button button-primary" onClick={() => onPrimary ? onPrimary() : navigate(primaryPath)}>{primaryLabel} <span aria-hidden="true">→</span></button><button className="button button-outline" onClick={() => navigate('/')}>Go to home</button></div>
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
  HomePage,
  NotificationsPage,
  RequestPage,
  ServiceDetailsPage,
  ServicesPage,
  StudentDashboard,
  SubmissionConfirmationPage,
  SuccessPage,
};
