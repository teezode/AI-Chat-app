import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Chat from './Chat';
import { Socket } from 'socket.io-client';

interface MockSocket {
  on: (event: string, callback: (...args: any[]) => void) => MockSocket;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
}

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket: MockSocket = {
    on: jest.fn((event: string, callback: (...args: any[]) => void) => {
      if (event === 'connect') {
        // Simulate immediate connection
        setTimeout(callback, 0);
      }
      return mockSocket;
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows username modal on initial render', () => {
    render(<Chat />);
    expect(screen.getByText('Enter Your Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('hides username modal after submitting username', async () => {
    render(<Chat />);
    const usernameInput = screen.getByPlaceholderText('Username');
    const submitButton = screen.getByText('Join Chat');

    fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Enter Your Username')).not.toBeInTheDocument();
    });
  });

  it('connects to socket server on mount', () => {
    const { io } = require('socket.io-client');
    render(<Chat />);
    expect(io).toHaveBeenCalledWith('http://localhost:5000');
  });

  it('sends message when form is submitted', async () => {
    const { io } = require('socket.io-client');
    const mockSocket: MockSocket = {
      on: jest.fn((event: string, callback: (...args: any[]) => void) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
        return mockSocket;
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    (io as jest.Mock).mockReturnValue(mockSocket);

    render(<Chat />);
    
    // Enter username
    const usernameInput = screen.getByPlaceholderText('Username');
    const joinButton = screen.getByText('Join Chat');
    fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
    fireEvent.click(joinButton);

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Send message
    const messageInput = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(messageInput, { target: { value: 'Hello, World!' } });
    fireEvent.click(sendButton);

    expect(mockSocket.emit).toHaveBeenCalledWith('message', {
      text: 'Hello, World!',
      sender: 'TestUser'
    });
  });
}); 