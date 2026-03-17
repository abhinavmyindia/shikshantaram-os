import { validatePassword, strengthColors } from '@/utils/passwordValidation';

interface Props {
  password: string;
}

export default function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const { checks, strength } = validatePassword(password);
  const passedCount = checks.filter(c => c.passed).length;
  const pct = (passedCount / checks.length) * 100;
  const sc = strengthColors[strength];

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: sc.bar, transition: 'width 0.3s ease' }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: sc.bar, minWidth: 40, textAlign: 'right' }}>{sc.label}</span>
      </div>

      {/* Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: c.passed ? '#059669' : '#94a3b8' }}>
            <span style={{ fontSize: 10 }}>{c.passed ? '✅' : '○'}</span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}
