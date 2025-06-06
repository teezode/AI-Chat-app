import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';

// Serve the worker script from the Node.js server using the environment variable
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.REACT_APP_SERVER_URL}/pdfjs-worker.js`;

const MyPDFsPage: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<{ fileName: string, timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfThumbnails, setPdfThumbnails] = useState<{[key: string]: string | null}>({});
  const navigate = useNavigate();

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
      const data: { fileName: string, timestamp: number }[] = await response.json();
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

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading PDFs...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Uploaded PDFs</h1>
      {pdfFiles.length === 0 ? (
        <div className="text-gray-500">No PDFs uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {pdfFiles.map((file, index) => (
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
                <div className="flex space-x-2 mt-auto">
                  <button className="text-blue-500 hover:text-blue-700" aria-label="Read PDF" onClick={(e) => {
                    e.stopPropagation();
                    handleChatWithPdf(file.fileName);
                  }}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H16.5M21 12c0 1.01-.333 2.04-.98 3.011zm-12 .5a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75ZM9.375 12H9a2.25 2.25 0 0 0-2.25 2.25V18a2.25 2.25 0 0 0 2.25 2.25h.375M21 12c0 1.01-.333 2.04-.98 3.011zm0 0c-.647 1.077-1.677 2.249-2.899 3.34a6.067 6.067 0 0 1-2.741 1.31m2.899-3.34a6.067 6.067 0 0 0-2.741-1.31M21 12.75V18a2.25 2.25 0 0 1-2.25 2.25H16.5m-2.25 0a6.067 6.067 0 0 0-2.741-1.31m0 0a6.067 6.067 0 0 1-2.741 1.31m3.01-3.34a6.067 6.067 0 0 1-2.741-1.31m0 0a6.067 6.067 0 0 0-2.741-1.31M16.5 20.25h-.375A2.25 2.25 0 0 1 13.875 18v-3.75m-3.75 0h-.75m3.75 0h.75m-3.75 0h.75m3.75 0h.75m-3.75 0h.75M13.875 12.75h.375a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H13.875m-3-9h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Z" />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPDFsPage; 