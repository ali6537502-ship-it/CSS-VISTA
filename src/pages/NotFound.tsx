import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div className="font-display text-6xl font-bold text-pine">404</div>
      <h1 className="mt-3 font-display text-2xl font-bold text-pine">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="rounded-md bg-pine px-5 py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Back to home</Link>
        <Link to="/start-css" className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-secondary">Start CSS</Link>
      </div>
    </div>
  )
}
