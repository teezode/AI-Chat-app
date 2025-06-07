import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactElement; // The component to render if authenticated
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  // Check if the user is authenticated (e.g., by checking for a token in localStorage)
  const isAuthenticated = localStorage.getItem('token') !== null;

  if (isAuthenticated) {
    return element; // Render the component if authenticated
  } else {
    // Redirect to the sign-in page if not authenticated
    return <Navigate to="/signin" replace />;
  }
};

export default ProtectedRoute; 