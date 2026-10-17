'use client'

import React from 'react'

interface Props {
  questionId: number | string
  questionType: string
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class QuestionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[QuestionErrorBoundary] Caught error rendering Question #${this.props.questionId} (${this.props.questionType}):`,
      error,
      errorInfo
    )
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.questionId !== this.props.questionId && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg, 12px)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px dashed var(--color-error, #ef4444)',
            color: 'var(--color-text)',
            margin: '1rem 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '1.35rem' }}>⚠️</span>
            <strong style={{ color: '#f87171', fontSize: '1.05rem' }}>
              Component Render Error: Question #{this.props.questionId} ({this.props.questionType})
            </strong>
          </div>

          <p
            style={{
              fontSize: '0.88rem',
              color: '#fca5a5',
              marginBottom: '0.85rem',
              fontFamily: 'monospace',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
            }}
          >
            {this.state.error?.message || 'Component failed during rendering.'}
          </p>

          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-muted)',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '0.75rem',
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--color-gold)' }}>Diagnosis:</strong> This question is missing required data
            expected by the <code>{this.props.questionType}</code> component (for example, missing{' '}
            <code>chain</code> for missing-link, missing <code>clues</code> for who-am-i, or missing <code>options</code>
            ). Please verify the JSON definition for question #{this.props.questionId}.
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
