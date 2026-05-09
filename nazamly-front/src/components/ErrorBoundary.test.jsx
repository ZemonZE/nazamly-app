import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows error details when showDetails prop is true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('hides error details when showDetails prop is false', () => {
    render(
      <ErrorBoundary showDetails={false}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
  });

  it('calls onReset when Try Again button is clicked', () => {
    const onReset = vi.fn();
    
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders fallback action button when provided', () => {
    const fallbackAction = vi.fn();
    
    render(
      <ErrorBoundary 
        fallbackAction={fallbackAction}
        fallbackActionLabel="Go Home"
      >
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const fallbackButton = screen.getByRole('button', { name: /go home/i });
    expect(fallbackButton).toBeInTheDocument();
    
    fireEvent.click(fallbackButton);
    expect(fallbackAction).toHaveBeenCalledTimes(1);
  });

  it('uses default fallback action label when not provided', () => {
    const fallbackAction = vi.fn();
    
    render(
      <ErrorBoundary fallbackAction={fallbackAction}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('logs error to console when error is caught', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
