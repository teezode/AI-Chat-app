import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpOnSquareIcon, DocumentTextIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const userEmail = user?.email || 'user@example.com';

  return (
    <nav className="text-gray-800 p-4 flex justify-between items-center">
      {/* Logo/App Name - Link to Home */}
      <Link to="/" className="text-2xl font-bold text-gray-900">DocuChats</Link>

      {/* Navigation Links and User Profile */}
      <div className="flex items-center space-x-4 relative">
        {isAuthenticated ? (
          <>
            <Link
              to="/"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              <ArrowUpOnSquareIcon className="h-5 w-5 mr-2 text-blue-500" />
              Upload
            </Link>
            <Link
              to="/my-pdfs"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2 text-red-500" />
              My PDFs
            </Link>

            {/* User Profile Section */}
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                <div className="flex flex-col text-right mr-2">
                  <span className="text-sm font-medium text-gray-800">{userEmail}</span>
                </div>
                {/* Placeholder for User Avatar */}
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {userEmail.charAt(0).toUpperCase()}
                </div>
                <ChevronDownIcon className="h-4 w-4 ml-2 text-gray-500" />
              </button>

              {/* Dropdown Content */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl py-2 z-10 border border-gray-200">
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold text-gray-800">{userEmail}</p>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-700">Total storage size left:</p>
                    <p className="text-xs text-gray-500 mt-1">0/100MB</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '0%' }}></div> {/* Always 0% for 0/100MB */}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to="/signin"
              className="px-3 py-1 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-3 py-1 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
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