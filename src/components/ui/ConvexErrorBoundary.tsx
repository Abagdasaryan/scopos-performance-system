"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ConvexErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ConvexErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const message = this.state.error.message;
      const isAuth =
        message.includes("Not authenticated") ||
        message.includes("Account not activated") ||
        message.includes("Account linking required");

      return (
        <div className="container" style={{ marginTop: 40 }}>
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
              {isAuth ? (
                <>
                  <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", marginBottom: 12 }}>
                    Account Setup Required
                  </h2>
                  <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>
                    Your account is not yet linked to an employee record.
                    Please contact your administrator to set up your account.
                  </p>
                  <p style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                    Error: {message}
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", marginBottom: 12 }}>
                    Something went wrong
                  </h2>
                  <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>
                    {message}
                  </p>
                </>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => this.setState({ error: null })}
                style={{ marginTop: 12 }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
