export function ago(from: number, now: number) {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

export function duration(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

export function Brand({ right }: { right?: React.ReactNode }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" fill="#1f5eff" /><circle cx="18" cy="18" r="2" fill="#1f5eff" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <h1>FindMyTruck</h1>
        <small>Know your truck&apos;s status without a call</small>
      </div>
      {right}
    </div>
  );
}
