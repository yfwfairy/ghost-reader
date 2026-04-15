import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  fallback?: ReactNode
  onReset?: () => void
  children: ReactNode
}

type ErrorBoundaryState = { hasError: boolean }

/**
 * 根级降级 UI — 硬编码英文，不依赖 i18n（翻译本身可能是崩溃源）
 */
function DefaultFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-fallback">
      <span className="error-fallback__icon material-symbols-outlined" aria-hidden="true">
        error_outline
      </span>
      <h2 className="error-fallback__title">Something went wrong</h2>
      <p className="error-fallback__description">
        An unexpected error occurred. You can try again or restart the app.
      </p>
      <button className="error-fallback__btn" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback onRetry={this.reset} />
    }
    return this.props.children
  }
}
