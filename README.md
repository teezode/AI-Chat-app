# AI Chat Application

A modern AI chat application built with React, TypeScript, Node.js, and Express.

## Features

- Real-time chat interface
- Message history
- Clean and modern UI
- TypeScript support
- Express backend

## Project Structure

```
.
├── client/             # React frontend
├── server/             # Node.js backend
├── package.json        # Root package.json
└── README.md          # This file
```

## Setup Instructions

1. Install dependencies:
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd client 
   npm install
   
   # Install backend dependencies
   cd ../server
   npm install
   ```

2. Start the development servers:
   ```bash
   # Start backend server (from root directory)
   npm run server
   
   # Start frontend server (from root directory)
   npm run client
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Development

- Frontend runs on port 3000
- Backend runs on port 5000
- API endpoints are prefixed with `/api`

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Tailwind CSS
  - Axios

- Backend:
  - Node.js
  - Express
  - TypeScript
  - Socket.IO 