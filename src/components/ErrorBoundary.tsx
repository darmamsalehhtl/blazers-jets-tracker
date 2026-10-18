import { Component, type ReactNode } from 'react'

/** Catches render errors so one broken section shows a message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Navigating somewhere else clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm">
        <p className="font-medium text-bad">Something went wrong showing this page.</p>
        <p className="mt-1 text-muted">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
          Try again
        </button>
      </div>
    )
  }
}
