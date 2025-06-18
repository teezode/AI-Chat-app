import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
// import Chat from './components/Chat'; // Original Chat component is likely no longer needed
import ChatWithPdfPage from './pages/ChatWithPdfPage';
import HomePage from './pages/HomePage'; // Move HomePage import to the top
import MyPDFsPage from './pages/MyPDFsPage';
import SharedPDFsPage from './pages/SharedPDFsPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import UserProfilePage from './pages/UserProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import BackgroundSlideshow from './components/BackgroundSlideshow';

// Placeholder component for the My PDFs page
// const MyPDFsPage: React.FC = () => <div>My PDFs Page (Placeholder)</div>;

// Placeholder component for the old /upload route (can be removed entirely if not needed)
// const UploadPagePlaceholder: React.FC = () => <div>Upload Page (Placeholder - can be removed)</div>;

const App: React.FC = () => {
  return (
    <Router>
      <BackgroundSlideshow />
      <NavBar />
      
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute element={<HomePage />} />} />
        <Route path="/my-pdfs" element={<ProtectedRoute element={<MyPDFsPage />} />} />
        <Route path="/shared-pdfs" element={<ProtectedRoute element={<SharedPDFsPage />} />} />
        <Route path="/chat-with-pdf" element={<ProtectedRoute element={<ChatWithPdfPage />} />} />
        <Route path="/profile" element={<ProtectedRoute element={<UserProfilePage />} />} />

        {/* If the original /chat route is no longer needed, remove it */}
        {/* <Route path="/chat" element={<Chat />} /> */}

        {/* Remove the /upload route if not needed */}
        {/* <Route path="/upload" element={<UploadPagePlaceholder />} /> */}

      </Routes>
    </Router>
  );
};

export default App;
