function AcademicOptionsPage({
  options,
  busy,
  error,
  message,
  courseFaculty,
  coursesForFaculty,
  onCourseFacultyChange,
  onAddFaculty,
  onAddCourse,
  onRemoveFaculty,
  onRemoveCourse,
}) {
  return (
    <section className="academic-options-panel academic-options-page" aria-labelledby="academic-options-heading">
      <span className="eyebrow">ACADEMIC CONFIGURATION</span>
      <h2 id="academic-options-heading">Faculty and course choices</h2>
      <p className="form-intro">Maintain the dropdown options used when adding or editing student records. Removing an option does not change existing records.</p>
      <div className="academic-options-forms">
        <form className="request-form" noValidate onSubmit={onAddFaculty}>
          <h3>Add a faculty</h3>
          <div className="form-field"><label htmlFor="new-faculty">Faculty name</label><input id="new-faculty" name="newFaculty" required minLength="2" maxLength="120" /></div>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add faculty'}</button>
        </form>
        <form className="request-form" noValidate onSubmit={onAddCourse}>
          <h3>Add a course</h3>
          <div className="form-field"><label htmlFor="course-faculty">Faculty for this course</label><select id="course-faculty" name="courseFaculty" value={courseFaculty} required onChange={(event) => onCourseFacultyChange(event.target.value)}><option value="">Select faculty</option>{options.faculties.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}</select></div>
          <div className="form-field"><label htmlFor="course-name">Course name</label><input id="course-name" name="courseName" required minLength="2" maxLength="120" disabled={!courseFaculty} /></div>
          <button className="button button-primary" type="submit" disabled={busy || !courseFaculty}>{busy ? 'Saving…' : 'Add course'}</button>
        </form>
      </div>
      {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
      {message && <p className="form-alert form-alert-success" role="status">{message}</p>}
      <div className="academic-options-list">
        {options.faculties.map((faculty) => (
          <article className="academic-faculty-item" key={faculty}>
            <div className="academic-faculty-item-heading"><h3>{faculty}</h3><button className="button button-outline delete-link" type="button" disabled={busy} onClick={() => onRemoveFaculty(faculty)}>Remove faculty</button></div>
            <ul>
              {coursesForFaculty(faculty).map((courseName) => (
                <li key={courseName}><span>{courseName}</span><button className="button button-outline delete-link" type="button" disabled={busy} onClick={() => onRemoveCourse({ faculty, name: courseName })}>Remove</button></li>
              ))}
              {!coursesForFaculty(faculty).length && <li className="academic-empty-course">No courses added yet.</li>}
            </ul>
          </article>
        ))}
        {!options.faculties.length && <p className="empty-state">No academic choices have been added yet.</p>}
      </div>
    </section>
  );
}

export default AcademicOptionsPage;
