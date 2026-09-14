import { useSearchParams } from 'react-router'

export function useWorkspaceSection(key: string, values: readonly string[], fallback: string) {
  const [params, setParams] = useSearchParams()
  const requested = params.get(key) || fallback
  const value = values.includes(requested) ? requested : fallback
  function select(next: string) {
    const query = new URLSearchParams(window.location.search)
    if (next === fallback) query.delete(key)
    else query.set(key, next)
    setParams(query)
  }
  return [value, select] as const
}

export default function WorkspaceTabs({ id, label, items, value, onChange }: {
  id: string; label: string; items: { value: string; label: string }[]; value: string; onChange: (value: string) => void
}) {
  return <div className="ca-workspace-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.value} id={`${id}-${item.value}-tab`} type="button" role="tab"
      aria-selected={value === item.value} aria-controls={`${id}-${item.value}`} tabIndex={value === item.value ? 0 : -1}
      onClick={() => onChange(item.value)} onKeyDown={event => {
        let next = index
        if (event.key === 'ArrowRight') next = (index + 1) % items.length
        else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = items.length - 1
        else return
        event.preventDefault()
        onChange(items[next].value)
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
      }}>{item.label}</button>)}
  </div>
}
