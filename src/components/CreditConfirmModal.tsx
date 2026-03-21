import { CSSProperties } from 'react';
import type { CreditCheck } from '@/utils/creditGate';

const s = (styles: CSSProperties): CSSProperties => styles;

const CreditConfirmModal = ({ creditCheck, onConfirm, onCancel }: {
  creditCheck: CreditCheck;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div onClick={onCancel} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.5)', backdropFilter: 'blur(8px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
    <div onClick={e => e.stopPropagation()} style={s({ background: 'white', borderRadius: 20, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' })}>
      <div style={s({ fontSize: 36, marginBottom: 8 })}>⚡</div>
      <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: '#7c3aed' })}>{creditCheck.cost} credits</div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#475569', marginTop: 4 })}>{creditCheck.displayName}</div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 8 })}>Balance after: {creditCheck.balanceAfter} credits</div>
      <div style={s({ display: 'flex', gap: 10, marginTop: 20 })}>
        <button onClick={onCancel} style={s({ flex: 1, padding: 11, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b' })}>Cancel</button>
        <button onClick={onConfirm} style={s({ flex: 1, padding: 11, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', cursor: 'pointer', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' })}>Use {creditCheck.cost} Credits →</button>
      </div>
    </div>
  </div>
);

export default CreditConfirmModal;
