function ValidationErrors({ errors }) {
  if (!errors.length) return null;

  return (
    <ul className="validation-errors" role="alert" aria-live="assertive">
      {errors.map(({ fieldId, message }) => <li key={fieldId}>{message}</li>)}
    </ul>
  );
}

export function FieldValidationError({ fieldId, errors }) {
  const error = errors.find((item) => item.fieldId === fieldId);
  if (!error) return null;

  return <span className="field-validation-error" id={`validation-${fieldId}`} role="status" aria-live="assertive">{error.message}</span>;
}

export default ValidationErrors;
