import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onShare: (email: string, permission: 'view' | 'edit') => Promise<void>;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, fileName, onShare }) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleShare = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSharing(true);
    setError('');
    setSuccess('');

    try {
      await onShare(email.trim(), permission);
      setSuccess(`Successfully shared "${fileName}" with ${email}`);
      setEmail('');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError('Failed to share PDF. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Share PDF</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-2">Sharing: <span className="font-medium text-gray-900">{fileName}</span></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSharing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Level
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSharing}
              >
                <option value="view">View Only</option>
                <option value="edit">View and Edit</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {permission === 'view' 
                  ? 'User can only view and chat with the PDF' 
                  : 'User can view, edit, and manage the PDF'
                }
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSharing ? 'Sharing...' : 'Share PDF'}
              </button>
              <button
                onClick={onClose}
                disabled={isSharing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 