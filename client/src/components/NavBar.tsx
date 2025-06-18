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
      <Link to="/" className="text-2xl font-bold text-white">DocuChats</Link>

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
            <Link
              to="/shared-pdfs"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
              Shared PDFs
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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-2 z-20 border border-gray-200 ring-1 ring-blue-200">
                  <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100">
                    {/* Avatar/Initials */}
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold">
                      {user?.name
                        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
                        : userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      {/* User Name */}
                      {user?.name && (
                        <span className="font-semibold text-gray-900 leading-tight">{user.name}</span>
                      )}
                      {/* User Email */}
                      <span className="text-sm text-gray-700">{userEmail}</span>
                    </div>
                  </div>
                  {/* Links */}
                  <Link
                    to="/profile"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                    onClick={() => setShowDropdown(false)}
                  >
                    Settings
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  {/* Notifications/Recent Activity Placeholder */}
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Recent Activity</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>No recent activity</li>
                    </ul>
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