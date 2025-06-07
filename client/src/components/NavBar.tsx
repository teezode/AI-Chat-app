import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

// Add a simple JWT decode function (we only need to decode, not verify)
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return null;
  }
};

const NavBar: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token in localStorage on component mount
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Decode the token to get user info
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        setUserEmail(decoded.email);
      }
    } else {
      setIsAuthenticated(false);
      setUserEmail(null);
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleSignOut = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    // Update authentication state
    setIsAuthenticated(false);
    setUserEmail(null);
    // Optionally navigate to the sign-in page or home page
    navigate('/signin');
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      {/* Logo/App Name - Link to Home */}
      <Link to="/" className="text-2xl font-bold">DocuChats</Link>

      {/* Navigation Links and User Info - Moved to the right */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          // Show these links when authenticated
          <>
            {/* Navigation Links with Icons and Styling */}
            <Link
              to="/"
              className="flex items-center px-3 py-1 border border-white rounded-lg hover:bg-gray-700"
            >
              <ArrowUpOnSquareIcon className="h-5 w-5 mr-1" />
              Upload
            </Link>
            <Link
              to="/my-pdfs"
              className="flex items-center px-3 py-1 border border-white rounded-lg hover:bg-gray-700"
            >
              <DocumentTextIcon className="h-5 w-5 mr-1" />
              My PDFs
            </Link>

            {/* User Info and Sign Out Button */}
            {userEmail && (
              <span className="text-sm px-3 py-1 border border-gray-600 rounded-lg bg-gray-700">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="px-3 py-1 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"
            >
              Sign Out
            </button>
          </>
        ) : (
          // Show these links when not authenticated
          <>
            <Link
              to="/signin"
              className="px-3 py-1 border border-white rounded-lg hover:bg-gray-700"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-3 py-1 border border-white rounded-lg hover:bg-gray-700"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default NavBar; 