import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SharedPDF {
  fileName: string;
  sharedBy: string;
  sharedAt: string;
  permission: 'view' | 'edit';
  ownerName?: string;
}

const SharedPDFsPage: React.FC = () => {
  const [sharedPdfs, setSharedPdfs] = useState<SharedPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSharedPdfs();
  }, []);

  const fetchSharedPdfs = async () => {
    setLoading(true);
    setError(null);
    try {
      // This would be a real API call in production
      // const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/shared-pdfs`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData: SharedPDF[] = [
        {
          fileName: 'Sample_Report.pdf',
          sharedBy: 'john@example.com',
          sharedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          permission: 'view',
          ownerName: 'John Doe'
        },
        {
          fileName: 'Project_Proposal.pdf',
          sharedBy: 'sarah@example.com',
          sharedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          permission: 'edit',
          ownerName: 'Sarah Smith'
        }
      ];
      
      setSharedPdfs(mockData);
    } catch (err: any) {
      console.error('Error fetching shared PDFs:', err);
      setError(err.message || 'Failed to fetch shared PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithPdf = async (fileName: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/extracted-text/${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch extracted text for ${fileName}`);
      }
      const data = await response.json();
      const extractedText = data.extractedText;

      navigate('/chat-with-pdf', { state: { pdfFileName: fileName, extractedText: extractedText } });

    } catch (error) {
      console.error('Error fetching extracted text for chat:', error);
      alert(`Could not load extracted text for ${fileName}. Please try again.`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading shared PDFs...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shared with Me</h1>
        <button
          onClick={() => navigate('/my-pdfs')}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Back to My PDFs
        </button>
      </div>

      {sharedPdfs.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shared PDFs yet</h3>
          <p className="text-gray-500">PDFs shared with you will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedPdfs.map((pdf, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      {pdf.fileName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Shared by: <span className="font-medium">{pdf.ownerName || pdf.sharedBy}</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {formatDate(pdf.sharedAt)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    pdf.permission === 'edit' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {pdf.permission === 'edit' ? 'Edit' : 'View'}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleChatWithPdf(pdf.fileName)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Open PDF
                  </button>
                  {pdf.permission === 'edit' && (
                    <button
                      className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      title="Edit permissions not yet implemented"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedPDFsPage; 