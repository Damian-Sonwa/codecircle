// Form validation utilities

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength validation
export const PASSWORD_REGEX = {
  minLength: /.{8,}/,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
};

export const validateField = (
  value: any,
  rules: ValidationRule,
  fieldName: string
): string | null => {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || `${fieldName} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  // Min length check
  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    return rules.message || `${fieldName} must be at least ${rules.minLength} characters`;
  }

  // Max length check
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    return rules.message || `${fieldName} must be no more than ${rules.maxLength} characters`;
  }

  // Pattern check
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return rules.message || `${fieldName} format is invalid`;
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach((fieldName) => {
    const value = data[fieldName];
    const fieldRules = rules[fieldName];
    const error = validateField(value, fieldRules, fieldName);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Common validation rules
export const commonRules = {
  email: {
    required: true,
    pattern: EMAIL_REGEX,
    message: 'Please enter a valid email address',
  } as ValidationRule,
  
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!PASSWORD_REGEX.hasUpperCase.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!PASSWORD_REGEX.hasLowerCase.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!PASSWORD_REGEX.hasNumber.test(value)) {
        return 'Password must contain at least one number';
      }
      return null;
    },
  } as ValidationRule,
  
  username: {
    required: true,
    minLength: 2,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 2-30 characters and contain only letters, numbers, and underscores',
  } as ValidationRule,
  
  required: {
    required: true,
  } as ValidationRule,
};

