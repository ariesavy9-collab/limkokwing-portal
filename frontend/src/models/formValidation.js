const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const STUDENT_ID_PATTERN = /^[0-9]{9}$/;
const VERIFICATION_CODE_PATTERN = /^[0-9]{6}$/;
const NAME_VALIDATION_MESSAGE = 'can only contain letters and common name punctuation; numbers are not allowed.';

function getFieldLabel(form, field) {
  return form.querySelector(`label[for="${field.id}"]`)?.textContent.trim()
    || field.getAttribute('aria-label')
    || field.name
    || 'This field';
}

function getFieldType(field) {
  if (field.dataset.validationType) return field.dataset.validationType;
  const name = (field.name || field.id || '').replace(/[-_]/g, '').toLowerCase();
  if (field.type === 'email' || name.includes('email')) return 'email';
  if (name.includes('phone') || name.includes('mobile')) return 'phone';
  if (name.includes('studentid')) return 'studentId';
  if (name.includes('verificationcode')) return 'verificationCode';
  if (/^(name|fullname|studentname|profilename|staffname|contactname)$/.test(name)) return 'name';
  if (name.includes('password')) return 'password';
  return 'text';
}

function sanitizeValue(value, field, fieldType) {
  if (fieldType === 'name') {
    return value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]/g, '');
  }
  if (fieldType === 'studentId' || fieldType === 'verificationCode') {
    return value.replace(/[^0-9]/g, '');
  }
  if (fieldType === 'phone') {
    const digits = value.replace(/[^0-9]/g, '');
    return `${value.startsWith('+') ? '+' : ''}${digits}`;
  }
  if (fieldType === 'email') {
    return value.replace(/\s/g, '');
  }
  if (field.type === 'number') {
    const allowNegative = field.min === '' || Number(field.min) < 0;
    const allowDecimal = field.step === 'any' || Number(field.step) % 1 !== 0;
    let sanitized = value.replace(/[^0-9.-]/g, '');
    const negative = allowNegative && sanitized.startsWith('-');
    sanitized = sanitized.replace(/-/g, '');
    if (allowDecimal) {
      const decimalIndex = sanitized.indexOf('.');
      if (decimalIndex !== -1) {
        sanitized = `${sanitized.slice(0, decimalIndex + 1)}${sanitized.slice(decimalIndex + 1).replace(/\./g, '')}`;
      }
    } else {
      sanitized = sanitized.replace(/\./g, '');
    }
    return `${negative ? '-' : ''}${sanitized}`;
  }
  return value;
}

export function sanitizeFieldInput(field) {
  if (!(field instanceof HTMLInputElement) || field.readOnly || field.disabled) return false;

  const value = field.value;
  const sanitized = sanitizeValue(value, field, getFieldType(field));
  if (sanitized === value) return false;

  const supportsSelection = ['text', 'search', 'tel', 'url', 'password', 'email'].includes(field.type);
  const start = supportsSelection ? field.selectionStart : null;
  const end = supportsSelection ? field.selectionEnd : null;
  field.value = sanitized;
  if (start !== null && end !== null) {
    field.setSelectionRange(
      sanitizeValue(value.slice(0, start), field, getFieldType(field)).length,
      sanitizeValue(value.slice(0, end), field, getFieldType(field)).length,
    );
  }
  return true;
}

export function handleFormInput(event, setErrors) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)
    && !(field instanceof HTMLTextAreaElement)
    && !(field instanceof HTMLSelectElement)) return;
  sanitizeFieldInput(field);
  field.dataset.touched = 'true';
  setErrors(validateForm(event.currentTarget, { touchedOnly: true }));
}

export function validateForm(form, { touchedOnly = false } = {}) {
  const errors = [];
  const fields = Array.from(form.elements).filter((field) => (
    field instanceof HTMLInputElement
    || field instanceof HTMLTextAreaElement
    || field instanceof HTMLSelectElement
  ));

  fields.forEach((field) => {
    if (!touchedOnly) field.dataset.touched = 'true';
    if (field.disabled || (touchedOnly && !field.dataset.touched)) return;
    const fieldType = getFieldType(field);
    if (!touchedOnly && fieldType !== 'password') field.value = field.value.trim();
    const value = field.value.trim();
    const label = getFieldLabel(form, field);
    let message = '';
    const missingRequiredCheckbox = field.required
      && (field.type === 'checkbox' || field.type === 'radio')
      && !field.checked;

    if (missingRequiredCheckbox || (field.required && !value)) {
      message = `${label} is required.`;
    } else if (field.maxLength > 0 && value.length > field.maxLength) {
      message = `${label} must be no more than ${field.maxLength} characters.`;
    } else if (field.minLength > 0 && value.length && value.length < field.minLength) {
      message = `${label} must be at least ${field.minLength} characters.`;
    } else if (fieldType === 'email' && value && !EMAIL_PATTERN.test(value)) {
      message = `${label} must be a valid email address.`;
    } else if (fieldType === 'name' && value && !NAME_PATTERN.test(value)) {
      message = `${label} ${NAME_VALIDATION_MESSAGE}`;
    } else if (fieldType === 'studentId' && value && !STUDENT_ID_PATTERN.test(value)) {
      message = field.dataset.validationMessage || `${label} must contain exactly 9 digits.`;
    } else if (fieldType === 'phone' && value && !PHONE_PATTERN.test(value)) {
      message = field.dataset.validationMessage || `${label} must be a valid phone number.`;
    } else if (fieldType === 'verificationCode' && value && !VERIFICATION_CODE_PATTERN.test(value)) {
      message = field.dataset.validationMessage || `${label} must be a 6-digit code.`;
    } else if (fieldType === 'password' && value && value.length < (field.minLength || 6)) {
      message = `${label} must be at least ${field.minLength || 6} characters.`;
    } else if (field.type === 'number' && value && !Number.isFinite(Number(value))) {
      message = `${label} must contain a valid number.`;
    } else if (field.validity.rangeUnderflow) {
      message = `${label} must be at least ${field.min}.`;
    } else if (field.validity.rangeOverflow) {
      message = `${label} must be no more than ${field.max}.`;
    } else if (field.validity.stepMismatch) {
      message = `${label} must use a valid number increment.`;
    } else if (field.validity.patternMismatch) {
      message = field.dataset.validationMessage || `${label} has an invalid format.`;
    } else if (field.validity.typeMismatch || field.validity.badInput) {
      message = `${label} is invalid.`;
    }

    if (message) {
      field.setAttribute('aria-invalid', 'true');
      const fieldId = field.id || field.name;
      errors.push({ fieldId, message });
      const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      describedBy.add(`validation-${fieldId}`);
      field.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
    } else {
      field.removeAttribute('aria-invalid');
      const describedBy = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== `validation-${field.id || field.name}`);
      if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
      else field.removeAttribute('aria-describedby');
    }
  });

  return errors;
}

export function clearFormValidation(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
}
