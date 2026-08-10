import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-xl font-bold text-pine">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-4 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
