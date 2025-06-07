import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TokenHandler: React.FC = () => {
  const navigate = useNavigate();

  // Effect to handle token from URL after Google OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Store the token in local storage
      localStorage.setItem('token', token);

      // Remove the token from the URL for a cleaner look
      urlParams.delete('token');
      window.history.replaceState({}, document.title, `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);

      // Navigate to the home page after storing the token
      navigate('/');
    }
  }, [navigate]); // Add navigate to the dependency array

  // This component doesn't render anything visible
  return null;
};

export default TokenHandler; 