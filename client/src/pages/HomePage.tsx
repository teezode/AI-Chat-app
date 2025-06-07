import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline'; // Assuming Heroicons is installed
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [recentPdfs, setRecentPdfs] = useState<string[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  // Function to fetch the list of PDFs
  const fetchRecentPdfs = async () => {
    setLoadingRecent(true);
    setRecentError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/my-pdfs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: string[] = await response.json();
      // Display only the most recent 3 PDFs
      setRecentPdfs(data.slice(0, 3));
    } catch (err: any) {
      console.error('Error fetching recent PDFs:', err);
      setRecentError('Failed to load recent PDFs.');
    } finally {
      setLoadingRecent(false);
    }
  };

  // Fetch recent PDFs on component mount and after a successful upload
  useEffect(() => {
    fetchRecentPdfs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploading(true);
      setUploadStatus(null);

      const formData = new FormData();
      formData.append('pdf', file);
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          const data = await response.json();
          setUploadStatus('Uploaded and text extracted!');
          setSelectedFile(file); // Keep file selected to show name initially

          // Re-fetch recent PDFs after a successful upload
          fetchRecentPdfs();

          navigate('/chat-with-pdf', { state: { extractedText: data.extractedText, pdfFileName: file.name } });

        } else {
          setUploadStatus('Upload failed');
          console.error('File upload failed', response.status);
        }
      } catch (error) {
        setUploadStatus('Upload failed');
        console.error('Error uploading file:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default to allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      // Simulate the file input change event
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const event = new Event('change', { bubbles: true });
      // Assuming fileInputRef.current is the actual file input DOM element
      if (fileInputRef.current) {
         Object.defineProperty(event, 'target', { value: fileInputRef.current, enumerable: true });
         Object.defineProperty(fileInputRef.current, 'files', { value: dataTransfer.files, enumerable: true });
         handleFileChange(event as any);
      }
    } else if (file) {
       setUploadStatus('Please upload a PDF file.');
        setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const handleSelectPdfClick = () => {
    fileInputRef.current?.click();
  };

  const handleViewAllPdfs = () => {
    navigate('/my-pdfs');
  };

  const handleChatWithPdf = async (fileName: string) => {
    try {
      // We are essentially re-using the server-side upload endpoint logic here
      // to get the extracted text for a given filename.
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`);
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl text-gray-800 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Your PDF</h1>
        
        {/* Drag and Drop Area */}
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleSelectPdfClick}
        >
          <ArrowUpOnSquareIcon className="h-12 w-12 mb-3 text-gray-500" />
          <p className="text-center">Drag and Drop PDF file here</p>
          <p className="text-center">or click to select</p>
          <p className="text-sm mt-2 text-gray-500">maximum file size: 10MB (Placeholder)</p>
          {/* Hidden File Input */}
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </div>
        
        {/* Select PDF Button (Alternative) */}
         <button
          type="button"
          onClick={handleSelectPdfClick}
          className="w-full bg-blue-500 text-white py-2 mt-4 rounded-lg text-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          disabled={uploading}
        >
          Select PDF
        </button>

        {/* Upload Status/Selected File Feedback */}
        {selectedFile && !uploading && !uploadStatus && (
          <div className="mt-4 text-gray-700 text-center">
            Selected file: <span className="font-semibold">{selectedFile.name}</span>
          </div>
        )}
        {uploading && (
          <div className="mt-2 text-sm text-purple-600 text-center">
            Uploading <span className="font-semibold">{selectedFile?.name}</span>...
          </div>
        )}
        {uploadStatus && !uploading && (
          <div className={`mt-2 text-sm text-center ${uploadStatus.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
            {uploadStatus}
          </div>
        )}

        {/* Recent Uploads Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-lg font-semibold">Recent Uploads</h3>
             <button onClick={handleViewAllPdfs} className="text-sm text-blue-500 hover:underline">View All</button>
          </div>
          {
            loadingRecent ? (
              <div className="text-gray-500">Loading recent PDFs...</div>
            ) : recentError ? (
              <div className="text-red-600">Error: {recentError}</div>
            ) : recentPdfs.length === 0 ? (
              <div className="text-gray-500">No recent PDFs uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {recentPdfs.map((fileName, index) => (
                  <div key={index} className="bg-gray-100 p-3 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleChatWithPdf(fileName)}>
                    {fileName}
                  </div>
                ))}
              </div>
            )
          }
        </div>

      </div>
    </div>
  );
};

export default HomePage; 