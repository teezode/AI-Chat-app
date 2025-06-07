import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
// import Chat from './components/Chat'; // Original Chat component is likely no longer needed
import ChatWithPdfPage from './pages/ChatWithPdfPage';
import HomePage from './pages/HomePage'; // Move HomePage import to the top
import MyPDFsPage from './pages/MyPDFsPage';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder component for the My PDFs page
// const MyPDFsPage: React.FC = () => <div>My PDFs Page (Placeholder)</div>;

// Placeholder component for the old /upload route (can be removed entirely if not needed)
// const UploadPagePlaceholder: React.FC = () => <div>Upload Page (Placeholder - can be removed)</div>;

const App: React.FC = () => {
  return (
    <Router>
      <NavBar />
      
      <Routes>
        {/* Route for the Home Page (now handles upload) */}
        <Route path="/" element={<ProtectedRoute element={<HomePage />} />} />

        {/* Route for the My PDFs Page */}
        <Route path="/my-pdfs" element={<ProtectedRoute element={<MyPDFsPage />} />} />

        {/* Route for chatting with a PDF (receives state from HomePage) */}
        <Route path="/chat-with-pdf" element={<ProtectedRoute element={<ChatWithPdfPage />} />} />

        {/* Add routes for Sign Up and Sign In pages */}
        {/* <Route path="/signup" element={<SignUpPage />} /> */}
        {/* <Route path="/signin" element={<SignInPage />} /> */}

        {/* If the original /chat route is no longer needed, remove it */}
        {/* <Route path="/chat" element={<Chat />} /> */}

        {/* Remove the /upload route if not needed */}
        {/* <Route path="/upload" element={<UploadPagePlaceholder />} /> */}

      </Routes>
    </Router>
  );
};

export default App;
