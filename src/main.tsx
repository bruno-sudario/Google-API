import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/** Captura erros de render e mostra na tela em vez de deixar tudo em branco. */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { erro: Error | null }
> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  render() {
    if (this.state.erro) {
      return (
        <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, color: '#b91c1c' }}>
          <strong>Ocorreu um erro na aplicação</strong>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginTop: 8,
              color: '#7f1d1d',
              font: '12px monospace',
            }}
          >
            {this.state.erro.message}
            {'\n'}
            {this.state.erro.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
