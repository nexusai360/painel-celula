import { createContext, useContext, useId, useRef } from 'react'

const TabsCtx = createContext(null)

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <TabsCtx.Provider value={{ value, onValueChange, baseId: useId() }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ children, className = '', 'aria-label': ariaLabel }) {
  const listRef = useRef(null)
  function onKeyDown(e) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    const tabs = Array.from(listRef.current.querySelectorAll('[role="tab"]:not([disabled])'))
    const i = tabs.indexOf(document.activeElement)
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    e.preventDefault()
    tabs[next]?.focus()
    tabs[next]?.click()
  }
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`inline-flex items-center gap-1 rounded-xl bg-surface p-1 ${className}`}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, disabled = false, className = '' }) {
  const ctx = useContext(TabsCtx)
  const active = ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => ctx.onValueChange?.(value)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'bg-card text-text shadow-sm' : 'text-text-muted hover:text-text'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = '' }) {
  const ctx = useContext(TabsCtx)
  if (ctx.value !== value) return null
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </div>
  )
}
