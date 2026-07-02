export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
