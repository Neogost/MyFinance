import { Component } from 'react'
import ErrorPage from './ErrorPage'

/**
 * Capture les erreurs JavaScript non gérées pendant le rendu React.
 * Affiche une page d'erreur 500 à la place du crash silencieux.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.state.error?.message
      ? `Détail : ${this.state.error.message}`
      : undefined

    return (
      <ErrorPage
        status={500}
        message={message}
        fullPage
        onRetry={this.handleRetry}
      />
    )
  }
}
