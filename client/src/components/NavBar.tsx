import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const NavBar: React.FC = () => {
  const navigate = useNavigate();

  // When sign-in/sign-up are removed, we no longer need to check for token or handle sign-out.
  // All routes are effectively public and accessible directly.

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      {/* Logo/App Name - Link to Home */}
      <Link to="/" className="text-2xl font-bold">DocuChats</Link>

      {/* Navigation Links - Always visible */}
      <div className="flex items-center space-x-4">
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
      </div>
    </nav>
  );
};

export default NavBar; 