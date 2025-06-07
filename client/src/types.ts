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