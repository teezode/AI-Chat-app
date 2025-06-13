import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status on component mount and when localStorage changes
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/signin');
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      {/* Logo/App Name - Link to Home */}
      <Link to="/" className="text-2xl font-bold">DocuChats</Link>

      {/* Navigation Links */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
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
            <button
              onClick={handleLogout}
              className="px-3 py-1 border border-red-400 rounded-lg text-red-400 hover:bg-red-400 hover:text-white"
            >
              Logout
            </button>
          </>
        ) : (
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