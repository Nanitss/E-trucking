import React, { useEffect, useState, useContext } from 'react';
import { Route, Redirect, useHistory } from 'react-router-dom';
import Navbar  from './common/Navbar';
import Sidebar from './common/Sidebar';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ component: Cmp, showSidebar = false, requiredRole = null, ...rest }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasRequiredRole, setHasRequiredRole] = useState(true);
  const { isAuthenticated: contextAuthenticated, currentUser: contextUser } = useContext(AuthContext);
  const history = useHistory();

  useEffect(() => {
    // First check if we have authentication from context
    if (contextAuthenticated && contextUser) {
      console.log('ProtectedRoute: Using auth from context:', contextUser);
      setCurrentUser(contextUser);
      setAuthed(true);

      // Check role requirement if specified
      if (requiredRole && contextUser.role !== requiredRole) {
        console.log(`ProtectedRoute: User role ${contextUser.role} doesn't match required role ${requiredRole}`);
        setHasRequiredRole(false);
      }
      
      setLoading(false);
      return;
    }
    
    // Fallback to localStorage if context doesn't have auth info
    console.log('ProtectedRoute: Checking localStorage for auth');
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('ProtectedRoute: User found in localStorage:', parsedUser);
        setCurrentUser(parsedUser);
        setAuthed(true);
        
        // Check role requirement if specified
        if (requiredRole && parsedUser.role !== requiredRole) {
          console.log(`ProtectedRoute: User role ${parsedUser.role} doesn't match required role ${requiredRole}`);
          setHasRequiredRole(false);
        }
      } catch (e) {
        console.error('ProtectedRoute: Error parsing user from localStorage:', e);
      }
    } else {
      console.log('ProtectedRoute: No valid auth found in localStorage');
    }
    
    setLoading(false);
  }, [contextAuthenticated, contextUser, requiredRole]);

  if (loading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="loader-container">
        <div className="loader" />
      </div>
    );
  }

  console.log('ProtectedRoute: Rendering route with auth status:', isAuthenticated);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Redirect to="/login" />;
  }
  
  // If role requirement not met, redirect to appropriate page based on user's role
  if (!hasRequiredRole && requiredRole) {
    console.log('ProtectedRoute: Role requirement not met');
    const userRole = currentUser?.role;
    let redirectPath = '/login';
    
    // Determine where to redirect based on actual role
    if (userRole === 'admin') redirectPath = '/admin/dashboard';
    else if (userRole === 'client') redirectPath = '/client/landing';
    else if (userRole === 'driver') redirectPath = '/driver/dashboard';
    else if (userRole === 'helper') redirectPath = '/helper/dashboard';
    else if (userRole === 'operator') redirectPath = '/operator/delivery-assignment';
    else if (userRole === 'staff') redirectPath = '/staff/dashboard';
    
    console.log(`ProtectedRoute: Redirecting to ${redirectPath} based on role ${userRole}`);
    return <Redirect to={redirectPath} />;
  }

  return (
    <Route
      {...rest}
      render={props => (
        <div className="app-container">
          {showSidebar && <Sidebar userRole={currentUser?.role} />}
          <div className={`content-container ${showSidebar ? 'with-sidebar' : 'full-width'}`}>
            {showSidebar ? (
              <div className="content-body">
                <Cmp {...props} currentUser={currentUser} />
              </div>
            ) : (
              <Cmp {...props} currentUser={currentUser} />
            )}
          </div>
        </div>
      )}
    />
  );
};

export default ProtectedRoute;