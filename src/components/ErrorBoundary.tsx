import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Empêche qu'une erreur de rendu dans une page ne laisse un écran entièrement
 * blanc : on affiche un message et un bouton de rechargement à la place.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur de rendu :", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border bg-background p-8 shadow-lg">
          <h1 className="text-xl font-bold">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground">
            La page n'a pas pu s'afficher correctement. Réessayez ou revenez à
            l'accueil.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Recharger
            </button>
            <a
              href="/"
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
