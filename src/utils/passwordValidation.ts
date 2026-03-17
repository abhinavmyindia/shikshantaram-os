// Password strength validation rules
export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export function validatePassword(password: string): { checks: PasswordCheck[]; allPassed: boolean; strength: 'weak' | 'fair' | 'strong' } {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Contains uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Contains a digit', passed: /\d/.test(password) },
    { label: 'Contains special character (!@#$%...)', passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password) },
  ];

  const passedCount = checks.filter(c => c.passed).length;
  const allPassed = passedCount === checks.length;
  const strength: 'weak' | 'fair' | 'strong' = passedCount <= 2 ? 'weak' : passedCount <= 4 ? 'fair' : 'strong';

  return { checks, allPassed, strength };
}

export const strengthColors = {
  weak: { bar: '#ef4444', label: 'Weak' },
  fair: { bar: '#f59e0b', label: 'Fair' },
  strong: { bar: '#10b981', label: 'Strong' },
};
