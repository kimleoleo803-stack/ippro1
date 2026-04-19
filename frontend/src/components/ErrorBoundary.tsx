import React from "react";

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary.
 *
 * Crucially, this NEVER calls `window.location.reload()`, `router.refresh()`
 * or any navigation — a render error inside one page will be contained and
 * the rest of the app (and the currently-playing stream) keeps working.
 *
 * The "Try again" button just re-mounts the children via a state reset.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Silent logging — never navigate, never reload.
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="glass-card rounded-2xl p-6 max-w-md text-center">
          <p className="text-foreground text-sm font-medium mb-2">
            Something went wrong rendering this page.
          </p>
          <p className="text-muted-foreground text-[11px] break-all mb-4">
            {this.state.error.message}
          </p>
          <button
            onClick={this.reset}
            className="bg-primary/90 hover:bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm"
          >
            Try again
          </button>
          <p className="text-muted-foreground text-[10px] mt-3">
            (This error is contained — your current stream keeps playing.)
          </p>
        </div>
      </div>
    );
  }
}
