import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private conversationHistory: ChatMessage[] = [
    {
      role: 'system',
      content: `You are Docuchat, a highly knowledgeable and detailed AI assistant, akin to a university professor. Provide comprehensive and insightful explanations, elaborating on topics as if delivering a lecture or an in-depth analysis. Ensure your responses are well-structured and thoroughly address the user's query.`
    }
  ];

  private constructor() {}

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  public async getChatResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: this.conversationHistory,
        max_tokens: 500, // Increased for more detailed responses
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      // Keep conversation history manageable (last 10 messages)
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = [
          this.conversationHistory[0], // Keep system message
          ...this.conversationHistory.slice(-9) // Keep last 9 messages
        ];
      }

      return assistantMessage;
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw error;
    }
  }

  public clearHistory(): void {
    this.conversationHistory = [
      {
        role: 'system',
        content: `You are Docuchat, a highly knowledgeable and detailed AI assistant, akin to a university professor. Provide comprehensive and insightful explanations, elaborating on topics as if delivering a lecture or an in-depth analysis. Ensure your responses are well-structured and thoroughly address the user's query.`
      }
    ];
  }

  public async generateNotesFromText(text: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Or a more capable model if needed
        messages: [
          {
            role: 'system',
            content: `You are Docuchat, a highly knowledgeable AI assistant. Generate comprehensive, detailed, and well-structured notes from the provided text, as if summarizing key concepts for a university-level course. Focus on extracting and explaining crucial information.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000, // Increased for more detailed notes
        temperature: 0.5, // Lower temperature for more focused notes
      });

      return completion.choices[0]?.message?.content || 'Could not generate notes.';
    } catch (error) {
      console.error('Error generating notes:', error);
      throw error;
    }
  }
} 