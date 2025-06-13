import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

interface ProtectedRouteProps {
  element: React.ReactElement; // The component to render if authenticated
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  const { isAuthenticated } = useAuth(); // Use isAuthenticated from AuthContext

  if (isAuthenticated) {
    return element; // Render the component if authenticated
  } else {
    // Redirect to sign in page if not authenticated
    return <Navigate to="/signin" replace />;
  }
};

export default ProtectedRoute; 