import { Component, type ReactNode } from 'react'
import { isDynamicImportFailure, recoverFromDynamicImport, refreshLatestApplication } from '@/lib/chunkRecovery'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    recoverFromDynamicImport(error)
  }
  render() {
    if (this.state.error) {
      const staleDeployment = isDynamicImportFailure(this.state.error)
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-xl font-bold text-pine">{staleDeployment ? 'Updating CSS Vista' : 'Something went wrong on this page'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{staleDeployment ? 'A newer website version is available. This page is refreshing automatically.' : this.state.error.message}</p>
          <button onClick={() => refreshLatestApplication()} className="mt-4 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
            Load latest version
          </button>
          <a href="/" className="ml-2 inline-flex rounded-md border px-4 py-2 text-sm font-semibold text-pine">Home</a>
        </div>
      )
    }
    return this.props.children
  }
}
