import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** UI customizado de fallback. Se ausente, usa o padrão. */
  fallback?: ReactNode;
  /** Tag para identificar o boundary nos logs (ex: 'Root', 'TaxModule'). */
  scope?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura erros de renderização em qualquer descendente e exibe um fallback
 * em vez de tela branca. Loga o erro via logger centralizado.
 *
 * Uso típico — envolver a árvore inteira em `App.tsx`:
 *   <ErrorBoundary scope="Root"><App /></ErrorBoundary>
 *
 * Para isolar áreas críticas, pode-se aninhar boundaries com escopo próprio.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Erro de renderização capturado pelo ErrorBoundary', error, {
      scope: this.props.scope ?? 'ErrorBoundary',
      data: { componentStack: errorInfo.componentStack },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">
              Algo deu errado
            </h1>
            <p className="text-sm text-slate-500">
              Ocorreu um erro inesperado ao carregar esta tela. A equipe foi
              notificada. Tente recarregar a página.
            </p>
            {import.meta.env.MODE !== 'production' && this.state.error && (
              <pre className="text-xs text-left bg-slate-100 rounded-lg p-3 mt-4 overflow-auto max-h-40 text-slate-700">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button
            onClick={this.handleReload}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }
}
