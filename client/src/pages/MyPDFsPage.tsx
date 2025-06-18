import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import ShareModal from '../components/ShareModal';

// Serve the worker script from the Node.js server using the environment variable
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.REACT_APP_SERVER_URL}/pdfjs-worker.js`;

// Define available categories
const CATEGORIES = [
  'All',
  'Work',
  'Personal',
  'Education',
  'Finance',
  'Health',
  'Travel',
  'Technology',
  'Other'
];

const MyPDFsPage: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<{ fileName: string, timestamp: number, category?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfThumbnails, setPdfThumbnails] = useState<{[key: string]: string | null}>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCategoryModal, setShowCategoryModal] = useState<{[key: string]: boolean}>({});
  const [showShareModal, setShowShareModal] = useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();

  // Filter PDFs based on search term and category
  const filteredPdfs = pdfFiles.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Function to update PDF category
  const updatePdfCategory = (fileName: string, category: string) => {
    setPdfFiles(prev => prev.map(file => 
      file.fileName === fileName ? { ...file, category } : file
    ));
    setShowCategoryModal(prev => ({ ...prev, [fileName]: false }));
  };

  // Function to generate PDF thumbnail
  const generatePdfThumbnail = async (fileName: string): Promise<string | null> => {
    console.log('generatePdfThumbnail called with fileName:', fileName);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/pdf/${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // Get the first page

      const viewport = page.getViewport({ scale: 1.0 });
      // Create an off-screen canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get 2D context for canvas');
      }

      const scale = Math.min(150 / viewport.width, 150 / viewport.height);
      const scaledViewport = page.getViewport({ scale: scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error(`Error generating thumbnail for ${fileName}:`, err);
      return null;
    }
  };

  // Function to fetch the list of PDFs and generate thumbnails
  const fetchPdfs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/my-pdfs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: { fileName: string, timestamp: number, category?: string }[] = await response.json();
      setPdfFiles(data);

      // Generate thumbnails for all PDFs
      const thumbnails: {[key: string]: string | null} = {};
      for (const file of data) {
        thumbnails[file.fileName] = await generatePdfThumbnail(file.fileName);
      }
      setPdfThumbnails(thumbnails);

    } catch (err: any) {
      console.error('Error fetching PDFs:', err);
      setError(err.message || 'Failed to fetch PDFs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleChatWithPdf = async (fileName: string) => {
    console.log('handleChatWithPdf called with fileName:', fileName);
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

  const handleDeletePdf = async (fileName: string) => {
    console.log('handleDeletePdf called with fileName:', fileName);
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/my-pdfs/${encodeURIComponent(fileName)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        fetchPdfs();

      } catch (error) {
        console.error('Error deleting PDF:', error);
        setError('Failed to delete PDF.');
      }
    }
  };

  // Function to handle PDF sharing
  const handleSharePdf = async (email: string, permission: 'view' | 'edit') => {
    // This would typically make an API call to share the PDF
    // For now, we'll simulate the sharing process
    console.log(`Sharing PDF with ${email} with ${permission} permission`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would make an API call like:
    // const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/share-pdf`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ fileName, email, permission })
    // });
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading PDFs...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Uploaded PDFs</h1>
      
      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search PDFs by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Summary */}
        {(searchTerm || selectedCategory !== 'All') && (
          <p className="text-sm text-gray-600">
            Found {filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? 's' : ''} 
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          </p>
        )}
      </div>

      {pdfFiles.length === 0 ? (
        <div className="text-gray-500">No PDFs uploaded yet.</div>
      ) : filteredPdfs.length === 0 && (searchTerm || selectedCategory !== 'All') ? (
        <div className="text-gray-500">
          No PDFs found 
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredPdfs.map((file, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              onClick={() => handleChatWithPdf(file.fileName)}>
              <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-500 text-sm overflow-hidden">
                {pdfThumbnails[file.fileName] ? (
                  <img src={pdfThumbnails[file.fileName] || ''} alt={`Thumbnail of ${file.fileName}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    {pdfThumbnails[file.fileName] === undefined ? 'Loading preview...' : 'No preview available'}
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">{file.fileName}</h3>
                
                {/* Category Badge */}
                <div className="mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCategoryModal(prev => ({ ...prev, [file.fileName]: true }));
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      file.category 
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {file.category || 'Set Category'}
                  </button>
                </div>

                <div className="flex space-x-2 mt-auto">
                  <button className="text-blue-500 hover:text-blue-700" aria-label="Read PDF" onClick={(e) => {
                    e.stopPropagation();
                    handleChatWithPdf(file.fileName);
                  }}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H16.5M21 12c0 1.01-.333 2.04-.98 3.011zm-12 .5a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75ZM9.375 12H9a2.25 2.25 0 0 0-2.25 2.25V18a2.25 2.25 0 0 0 2.25 2.25h.375M21 12c0 1.01-.333 2.04-.98 3.011zm0 0c-.647 1.077-1.677 2.249-2.899 3.34a6.067 6.067 0 0 1-2.741 1.31m2.899-3.34a6.067 6.067 0 0 0-2.741-1.31M21 12.75V18a2.25 2.25 0 0 1-2.25 2.25H16.5m-2.25 0a6.067 6.067 0 0 0-2.741-1.31m0 0a6.067 6.067 0 0 1-2.741 1.31m3.01-3.34a6.067 6.067 0 0 1-2.741-1.31m0 0a6.067 6.067 0 0 0-2.741-1.31M16.5 20.25h-.375A2.25 2.25 0 0 1 13.875 18v-3.75m-3.75 0h-.75m3.75 0h.75m-3.75 0h.75m3.75 0h.75m-3.75 0h.75M13.875 12.75h.375a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H13.875m-3-9h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Z" />
                     </svg>
                  </button>
                  <button className="text-green-500 hover:text-green-700" aria-label="Share PDF" onClick={(e) => {
                    e.stopPropagation();
                    setShowShareModal(prev => ({ ...prev, [file.fileName]: true }));
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                  </button>
                  <button className="text-red-500 hover:text-red-700" aria-label="Delete PDF" onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePdf(file.fileName);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m-1.022.165L5.79 19.673a2.25 2.25 0 0 0 2.244 2.077h7.432a2.25 2.25 0 0 0 2.244-2.077L19.508 5.79m-14.65-3.34c.166-.037.334-.061.502-.077 1.45-.144 2.906-.22 4.364-.238m0 0l-.147-.001c-.2 0 .398.006.596.014M12 3.375c.926 0 1.802.043 2.655.128.68.068 1.36.129 2.041.182a.75.75 0 1 0-.412 1.366c-.52-.083-1.04-.156-1.56-.224c-.68-.069-1.36-.129-2.04-.182a48.07 48.07 0 0 0-4.364.238l-.147.001c-.2.006-.398.019-.596.034A.75.75 0 1 0 6.926 6.325c.52-.084 1.04-.158 1.56-.225c.68-.068 1.36-.128 2.04-.182Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Category Selection Modal */}
              {showCategoryModal[file.fileName] && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full mx-4">
                    <h3 className="text-lg font-semibold mb-3">Select Category for "{file.fileName}"</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {CATEGORIES.filter(cat => cat !== 'All').map(category => (
                        <button
                          key={category}
                          onClick={() => updatePdfCategory(file.fileName, category)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowCategoryModal(prev => ({ ...prev, [file.fileName]: false }))}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updatePdfCategory(file.fileName, '')}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Remove Category
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Modal */}
              <ShareModal
                isOpen={showShareModal[file.fileName] || false}
                onClose={() => setShowShareModal(prev => ({ ...prev, [file.fileName]: false }))}
                fileName={file.fileName}
                onShare={handleSharePdf}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPDFsPage; 