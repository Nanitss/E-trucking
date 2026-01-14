// src/pages/shared/ErrorPage.js - Improved error handling component
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import './ErrorPage.css';

const ErrorPage = ({ error = null, title = 'Error', message = 'Something went wrong' }) => {
  const history = useHistory();
  const location = useLocation();

  // Get specific error from location state or props
  const errorMessage = error || location.state?.error || message;
  const errorTitle = location.state?.title || title;

  const handleGoBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/admin/dashboard');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    history.push('/admin/dashboard');
  };

  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-title">{errorTitle}</h1>
        <p className="error-message">{errorMessage}</p>
        
        <div className="error-actions">
          <button onClick={handleGoBack} className="btn btn-secondary">
            Go Back
          </button>
          <button onClick={handleRefresh} className="btn btn-secondary">
            Refresh Page
          </button>
          <button onClick={handleGoHome} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>

        <div className="error-details">
          <p>Path: {location.pathname}</p>
          {process.env.NODE_ENV === 'development' && error && (
            <pre>{JSON.stringify(error, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;

// ErrorBoundary component for catching JS errors
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          title="Application Error"
          message="The application encountered an error. Please try refreshing the page."
          error={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}