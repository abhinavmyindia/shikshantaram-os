import { CSSProperties } from 'react';

const bg: CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
};

export default function SplashScreen() {
  return (
    <div style={bg}>
      <svg width="48" height="48" viewBox="0 0 50 50" fill="none">
        <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
        <circle cx="21" cy="14" r="2" fill="white"/>
        <circle cx="29" cy="14" r="2" fill="white"/>
      </svg>
      <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: '#0f172a', marginTop: 16 }}>Shikshantaram OS</div>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', marginTop: 20 }} />
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginTop: 12 }}>Loading your workspace...</div>
    </div>
  );
}
