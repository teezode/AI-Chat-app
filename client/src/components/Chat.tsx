import React, { useEffect, useState, useRef } from 'react';
import { io } from "socket.io-client";
import { Socket } from 'socket.io-client';
import { Message } from '../types';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io('http://localhost:5050');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('messages', (initialMessages: Message[]) => {
      setMessages(initialMessages);
    });

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      if (message.isAI) {
        setIsLoading(false);
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      setIsLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username || isLoading) return;

    setIsLoading(true);
    socketRef.current?.emit('message', {
      text: newMessage,
      sender: username
    });

    setNewMessage('');
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setShowUsernameModal(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploading(true);
      setUploadStatus(null);
      setExtractedText(null);

      const formData = new FormData();
      formData.append('pdf', file);
      try {
        const response = await fetch('http://localhost:5050/api/upload', {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          const data = await response.json();
          setUploadStatus('Uploaded!');
          setExtractedText(data.extractedText);
          setSelectedFile(file);
        } else {
          setUploadStatus('Upload failed');
          setExtractedText('Failed to extract text.');
        }
      } catch (error) {
        setUploadStatus('Upload failed');
        setExtractedText('Failed to extract text.');
      } finally {
        setUploading(false);
        setTimeout(() => setUploadStatus(null), 3000);
      }
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  if (showUsernameModal) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Join Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">AI Chat</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Main content area with three columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Column: PDF Preview/Info */}
        <div className="w-1/4 p-4 bg-white border-r overflow-y-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-4">PDF Info</h2>
          {selectedFile && (
            <div className="text-sm text-gray-800 break-words mb-4">File: {selectedFile.name}</div>
          )}
          {!selectedFile && (
             <div className="text-sm text-gray-500">Upload a PDF to see its info here.</div>
          )}
        </div>

        {/* Center Column: Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.isAI
                      ? 'bg-purple-100 text-gray-800 border border-purple-200'
                      : message.sender === username
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <div className="font-semibold">{message.sender}</div>
                  <div>{message.text}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-purple-100 text-gray-800 rounded-lg p-3 border border-purple-200">
                  <div className="font-semibold">AI Assistant</div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="bg-white p-4 shadow-md">
            <div className="flex space-x-4 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || uploading}
              />
              {/* File input is hidden, triggered by button */} 
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={handlePaperclipClick}
                className="text-2xl px-2 py-2 rounded-lg hover:bg-gray-200 focus:outline-none flex items-center justify-center"
                disabled={uploading}
                title="Attach PDF"
              >
                📎
              </button>
               {/* Show filename and upload status next to the input */}
               {(selectedFile || uploading || uploadStatus) && (
                <span className="text-sm text-gray-600 truncate max-w-[120px] flex items-center">
                  {selectedFile && !uploading && !uploadStatus && selectedFile.name}
                  {uploading && (
                    <span className="text-purple-500 ml-1">
                      Uploading...
                    </span>
                  )}
                  {uploadStatus && (
                     <span className={`ml-1 ${uploadStatus === 'Uploaded!' ? 'text-green-600' : 'text-red-600'}`}>
                        {uploadStatus}
                     </span>
                  )}
                </span>
              )}
              <button
                type="submit"
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isLoading || uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={isLoading || uploading}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Extracted Notes */}
        <div className="w-1/4 p-4 bg-white border-l overflow-y-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Extracted Notes</h2>
          {extractedText && (
             <div className="text-sm text-gray-800 break-words">{extractedText}</div>
          )}
          {!extractedText && !uploading && (
             <div className="text-sm text-gray-500">Extracted text will appear here after PDF upload.</div>
          )}
           {uploading && selectedFile && (
              <div className="text-sm text-purple-500">Extracting text from {selectedFile.name}...</div>
           )}
           {uploadStatus === 'Upload failed' && (
               <div className="text-sm text-red-600">Failed to extract text from PDF.</div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Chat; 