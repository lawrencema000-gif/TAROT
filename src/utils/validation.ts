export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FieldValidation {
  validate: (value: string) => ValidationResult;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain both letters and numbers' };
  }

  return { valid: true };
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Display name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }

  const validNameRegex = /^[\p{L}\p{N}\s'-]+$/u;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true };
}

export function validateBirthDate(dateStr: string): ValidationResult {
  if (!dateStr) {
    return { valid: false, error: 'Birth date is required' };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Please enter a valid date' };
  }

  const now = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);

  if (date > now) {
    return { valid: false, error: 'Birth date cannot be in the future' };
  }

  if (date < minDate) {
    return { valid: false, error: 'Please enter a valid birth date' };
  }

  const age = Math.floor((now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 13) {
    return { valid: false, error: 'You must be at least 13 years old' };
  }

  return { valid: true };
}

export function validateBirthTime(timeStr: string): ValidationResult {
  if (!timeStr) {
    return { valid: true };
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(timeStr)) {
    return { valid: false, error: 'Please enter a valid time (HH:MM)' };
  }

  return { valid: true };
}

export function validateJournalEntry(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Journal entry cannot be empty' };
  }

  if (content.length > 10000) {
    return { valid: false, error: 'Journal entry is too long (max 10,000 characters)' };
  }

  return { valid: true };
}

export function validateTags(tags: string[]): ValidationResult {
  if (tags.length > 10) {
    return { valid: false, error: 'Maximum 10 tags allowed' };
  }

  for (const tag of tags) {
    if (tag.length > 30) {
      return { valid: false, error: 'Tags must be less than 30 characters each' };
    }
    if (!/^[\w\s-]+$/.test(tag)) {
      return { valid: false, error: 'Tags can only contain letters, numbers, and hyphens' };
    }
  }

  return { valid: true };
}

export function validateNotes(notes: string): ValidationResult {
  if (notes.length > 5000) {
    return { valid: false, error: 'Notes are too long (max 5,000 characters)' };
  }

  return { valid: true };
}

export function sanitizeInput(input: string): string {
  // Decode URL-encoded variants before stripping
  let s = input;
  try {
    s = decodeURIComponent(s);
  } catch {
    // ignore invalid sequences
  }
  return s
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&#\d+;?/g, '')
    .replace(/&#x[\da-f]+;?/gi, '')
    .trim();
}

export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

export function validateForm(
  values: Record<string, string>,
  validations: Record<string, FieldValidation>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, validation] of Object.entries(validations)) {
    const value = values[field] || '';

    if (validation.required && !value.trim()) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      valid = false;
      continue;
    }

    if (validation.minLength && value.length < validation.minLength) {
      errors[field] = `Must be at least ${validation.minLength} characters`;
      valid = false;
      continue;
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      errors[field] = `Must be less than ${validation.maxLength} characters`;
      valid = false;
      continue;
    }

    const result = validation.validate(value);
    if (!result.valid) {
      errors[field] = result.error || 'Invalid value';
      valid = false;
    }
  }

  return { valid, errors };
}

export function debounceValidation<T extends unknown[]>(
  fn: (...args: T) => ValidationResult,
  delay = 300
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
