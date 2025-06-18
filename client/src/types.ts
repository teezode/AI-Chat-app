export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  isAI?: boolean;
}

export interface ChatState {
  messages: Message[];
  currentUser: string;
  connected: boolean;
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  bio?: string;
  createdAt?: string;
  lastLogin?: string;
  googleId?: string;
} 