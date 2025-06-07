import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUpPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center">Sign Up</h3>
        <div className="flex justify-center mb-6">
          <svg className="w-16 h-16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M44.5 20H24V28.9L36.3 30C35.3 35.6 30.3 39.8 24 39.8C16.8 39.8 11 34.1 11 26.9C11 19.7 16.8 13.9 24 13.9C27.4 13.9 30.4 15.1 32.7 17.2L38.7 11.2C34.7 7.4 29.7 5 24 5C11.9 5 2 14.9 2 26.9C2 38.9 11.9 48.8 24 48.8C36.1 48.8 45.8 39.7 45.8 26.9C45.8 25.5 45.7 23.9 45.5 22.5L44.5 20Z" fill="#4285F4"/>
            <path d="M11 26.9C11 19.7 16.8 13.9 24 13.9C27.4 13.9 30.4 15.1 32.7 17.2L38.7 11.2C34.7 7.4 29.7 5 24 5C11.9 5 2 14.9 2 26.9C2 38.9 11.9 48.8 24 48.8C36.1 48.8 45.8 39.7 45.8 26.9C45.8 25.5 45.7 23.9 45.5 22.5L44.5 20Z" fill="url(#paint0_linear_105_287)"/>
            <path d="M11 26.9C11 19.7 16.8 13.9 24 13.9C27.4 13.9 30.4 15.1 32.7 17.2L38.7 11.2C34.7 7.4 29.7 5 24 5C11.9 5 2 14.9 2 26.9C2 38.9 11.9 48.8 24 48.8C36.1 48.8 45.8 39.7 45.8 26.9C45.8 25.5 45.7 23.9 45.5 22.5L44.5 20Z" fill-opacity="0.2" fill="url(#paint1_radial_105_287)"/>
            <path d="M44.5 20H24V28.9L36.3 30C35.3 35.6 30.3 39.8 24 39.8C16.8 39.8 11 34.1 11 26.9C11 19.7 16.8 13.9 24 13.9C27.4 13.9 30.4 15.1 32.7 17.2L38.7 11.2C34.7 7.4 29.7 5 24 5C11.9 5 2 14.9 2 26.9C2 38.9 11.9 48.8 24 48.8C36.1 48.8 45.8 39.7 45.8 26.9C45.8 25.5 45.7 23.9 45.5 22.5L44.5 20Z" fill-opacity="0.2" fill="url(#paint2_radial_105_287)"/>
            <path d="M24 39.8C16.8 39.8 11 34.1 11 26.9C11 19.7 16.8 13.9 24 13.9C27.4 13.9 30.4 15.1 32.7 17.2L38.7 11.2C34.7 7.4 29.7 5 24 5C11.9 5 2 14.9 2 26.9C2 38.9 11.9 48.8 24 48.8C36.1 48.8 45.8 39.7 45.8 26.9C45.8 25.5 45.7 23.9 45.5 22.5L44.5 20Z" fill="url(#paint3_radial_105_287)"/>
            <defs>
              <linearGradient id="paint0_linear_105_287" x1="12.8261" y1="20" x2="18.7652" y2="42.513" gradientUnits="userSpaceOnUse">
                <stop stop-color="#2E7D32"/>
                <stop offset="1" stop-color="#212121" stop-opacity="0.47"/>
              </linearGradient>
              <radialGradient id="paint1_radial_105_287" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(44.05 19.5) rotate(132.436) scale(50.0754)">
                <stop stop-color="#2962FF"/>
                <stop offset="1" stop-color="#2962FF" stop-opacity="0.19"/>
              </radialGradient>
              <radialGradient id="paint2_radial_105_287" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(2 26.9) rotate(90) scale(24.9 22)">
                <stop stop-color="#FBBC04"/>
                <stop offset="1" stop-color="#FBBC04" stop-opacity="0.19"/>
              </radialGradient>
              <radialGradient id="paint3_radial_105_287" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 5) rotate(90) scale(21.9 22)">
                <stop stop-color="#E53935"/>
                <stop offset="1" stop-color="#E53935" stop-opacity="0.19"/>
              </radialGradient>
            </defs>
          </svg>
        </div>
        <div className="mt-8 flex justify-center">
           <div className="text-center">
              <a href={`${process.env.REACT_APP_SERVER_URL}/auth/google`}
                 className="inline-block px-6 py-3 text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-lg"
              >
                Sign Up with Google
              </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage; 