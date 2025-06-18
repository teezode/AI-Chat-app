import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from "socket.io-client"; // Import io
import { Socket } from 'socket.io-client'; // Import Socket type
import { Message } from '../types'; // Import Message type
import * as pdfjs from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Serve the worker script from the Node.js server using the environment variable
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.REACT_APP_SERVER_URL}/pdfjs-worker.js`;

// Add this helper function before the component
function formatPageText(text: string): { paragraph: string; sentences: string[] }[] {
  let formattedText = text;

  // 1. Normalize all whitespace characters (including non-breaking spaces, tabs, etc.) to single spaces
  formattedText = formattedText.replace(/[\s\u00A0]+/g, ' ');

  // 2. Add space between concatenated words/numbers
  formattedText = formattedText.replace(/([a-z])([A-Z])/g, '$1 $2'); // lowercase then uppercase
  formattedText = formattedText.replace(/([a-zA-Z])(\d)/g, '$1 $2'); // letter then digit
  formattedText = formattedText.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // digit then letter

  // 3. Ensure correct spacing around punctuation marks (.,!?;:)
  // Remove any space immediately before punctuation
  formattedText = formattedText.replace(/\s*([.,!?;:])/g, '$1');
  // Ensure one space immediately after punctuation if not followed by another punctuation mark or end of string/newline
  formattedText = formattedText.replace(/([.,!?;:])(?![.,!?;:\s]|$)/g, '$1 ');

  // 4. Handle hyphens - keeping existing hyphenated words together and fixing common hyphen spacing issues
  formattedText = formattedText.replace(/(\S)-(\S)/g, '$1-$2'); // Keeps 'word-word'
  formattedText = formattedText.replace(/\s-\s/g, '-'); // 'word - word' -> 'word-word'
  formattedText = formattedText.replace(/(\s|^)-(\S)/g, '$1-$2'); // ' -word' -> '-word' (handles start of line)
  formattedText = formattedText.replace(/(\S)-(\s|$)/g, '$1-$2'); // 'word- ' -> 'word-' (handles end of line)

  // 5. Final pass to replace any remaining multiple spaces with a single space
  formattedText = formattedText.replace(/\s+/g, ' ');

  // 6. Trim leading/trailing spaces from the whole text before paragraph splitting
  formattedText = formattedText.trim();

  // Split into paragraphs (double newlines or form feed)
  const paragraphs = formattedText.split(/\n\n+|\f/);
  
  // Format each paragraph and split into sentences
  return paragraphs
    .filter(p => p.trim().length > 0) // Remove empty paragraphs early
    .map(paragraph => {
      let trimmedParagraph = paragraph.trim();
      const sentences = trimmedParagraph.split(/(?<=[.!?])\s*/)
        .filter(s => s.trim().length > 0) // Remove empty sentences
        .map(sentence => {
          let s = sentence.trim();
          if (s.length > 0) {
            return s.charAt(0).toUpperCase() + s.slice(1); // Capitalize first letter
          }
          return s;
        });
      return { paragraph: trimmedParagraph, sentences: sentences };
    });
}

// Add a helper function to format AI notes for better readability
function formatAiNotes(text: string): string {
  // Replace multiple newlines with a single newline to ensure proper paragraphs
  let formatted = text.replace(/\n{3,}/g, '\n\n');
  // Ensure proper spacing after periods and other punctuation
  formatted = formatted.replace(/\.([A-Z])/g, '. $1');
  formatted = formatted.replace(/([.,!?;:])(\S)/g, '$1 $2'); // Add space after punctuation if not already there
  // Trim whitespace from each line and re-join
  formatted = formatted.split('\n').map(line => line.trim()).join('\n');
  // Remove empty lines at the start and end of the whole text
  formatted = formatted.trim();
  return formatted;
}

const ChatWithPdfPage: React.FC = () => {
  const location = useLocation();
  // Ensure we handle cases where state might be missing on direct access
  const { extractedText, pdfFileName } = (location.state as { extractedText: string; pdfFileName: string }) || {};

  // State for chat messages (Moved from Chat.tsx)
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs and state related to socket connection (Moved from Chat.tsx)
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Ref for PDF preview canvas
  // The pdfjs document object is handled locally within the useEffect
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // State for active tab in the right column
  const [activeTab, setActiveTab] = useState('extracted'); // 'extracted' or 'notes'

  // State for extracted text segmented by pages and current page index
  const [pageTexts, setPageTexts] = useState<{ paragraph: string; sentences: string[] }[][]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // State for AI-generated notes and loading status
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // State for PDF preview page navigation
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1); // 1-indexed for display

  // State for text-to-speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingParagraphIndex, setSpeakingParagraphIndex] = useState<number | null>(null);
  const [speakingSentenceIndex, setSpeakingSentenceIndex] = useState<number | null>(null);
  const [loadingSpeech, setLoadingSpeech] = useState(false); // New state for loading OpenAI speech

  // State for voice chat
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Add new state for tracking the highest sentence read
  const [lastReadSentenceIndex, setLastReadSentenceIndex] = useState<number | null>(null);

  // Effect to segment the extracted text into pages (simple approach)
  useEffect(() => {
    if (extractedText) {
      // Basic segmentation: Split by a reasonable marker like form feed character or a large number of newlines
      const rawSegments = extractedText.split(/\f|\n{10,}/);
      // Apply formatPageText to each raw segment to get structured paragraphs and sentences for each PDF page
      const formattedPageSegments = rawSegments.map(segment => formatPageText(segment));
      setPageTexts(formattedPageSegments);
      setCurrentPageIndex(0); // Reset to first segment on new text
      setCurrentPreviewPage(1); // Reset PDF preview to page 1 on new text
      console.log('PDFViewer: extractedText processed, pageTexts set to:', formattedPageSegments);
    } else {
       setPageTexts([]);
       setCurrentPageIndex(0);
       setCurrentPreviewPage(1); // Reset PDF preview to page 1
       console.log('PDFViewer: extractedText is empty, pageTexts reset to empty array.');
    }
  }, [extractedText]); // Re-segment if extractedText changes

  // Effect to generate AI notes when extractedText is available
  useEffect(() => {
    const generateNotes = async () => {
      if (!extractedText) return;

      setLoadingNotes(true);
      setNotesError(null);
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/generate-notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ extractedText }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAiNotes(data.notes);
      } catch (error) {
        console.error('Error generating AI notes:', error);
        setNotesError('Failed to generate AI notes.');
        setAiNotes(null); // Clear previous notes on error
      } finally {
        setLoadingNotes(false);
      }
    };

    generateNotes();
  }, [extractedText]); // Generate notes when extractedText changes

  // Setup SpeechRecognition for voice chat
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      console.log('Speech Recognition API detected.');
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false; // Listen for a single utterance
      recognition.interimResults = false; // Don't show interim results
      recognition.lang = 'en-US'; // Set language

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('SpeechRecognition: onresult event fired.', event);
        const transcript = event.results[0][0].transcript;
        setNewMessage(transcript); // Set the transcribed text to the input field
        // Optionally, automatically send the message after transcription
        // handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsVoiceChatActive(false);
      };

      recognition.onend = () => {
        console.log('SpeechRecognition: onend event fired.');
        // Only set to false if not explicitly starting again (e.g., in continuous mode)
        if (isVoiceChatActive) { // Keep active if continuous or awaiting next command
          // For now, turn off after single utterance. Will improve later for continuous.
          setIsVoiceChatActive(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition not supported in this browser.');
      // Optionally, disable the voice chat button or show a message
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        console.log('SpeechRecognition: Cleaning up recognition instance.');
        recognitionRef.current.stop();
      }
    };
  }, [isVoiceChatActive]); // Re-run effect if isVoiceChatActive changes to manage recognition lifecycle

  // Socket connection and event listeners (Moved from Chat.tsx)
  useEffect(() => {
    // Connect to WebSocket server using the environment variable
    const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'); // Fallback to 5000
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

    // Clean up socket connection
    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to fetch and render PDF preview
  useEffect(() => {
    const loadPdfPreview = async () => {
      if (!pdfFileName) return;

      try {
        // Fetch the PDF from the server for preview rendering using the environment variable
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/pdf/${encodeURIComponent(pdfFileName)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // Load the PDF document
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        setPdfNumPages(pdf.numPages); // Set total number of pages

        // Render the current preview page
        if (pdfCanvasRef.current && pdf.numPages > 0 && currentPreviewPage > 0 && currentPreviewPage <= pdf.numPages) {
          const page = await pdf.getPage(currentPreviewPage); // Render the current preview page
          const viewport = page.getViewport({ scale: 1.0 }); // Initial viewport at scale 1.0
          const canvas = pdfCanvasRef.current;
          const canvasContext = canvas.getContext('2d');
          if (canvasContext) {
            // Calculate scale to fit within the container width
            const containerWidth = canvas.parentElement?.offsetWidth || viewport.width;
            const scale = Math.min(containerWidth / viewport.width, 1.0);
            const scaledViewport = page.getViewport({ scale: scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
              canvasContext,
              viewport: scaledViewport,
            };
            await page.render(renderContext).promise;
          }
        } else if (pdfCanvasRef.current) {
          // Clear canvas if no pages or invalid page number
          const canvasContext = pdfCanvasRef.current.getContext('2d');
          if (canvasContext) {
            canvasContext.clearRect(0, 0, pdfCanvasRef.current.width, pdfCanvasRef.current.height);
          }
        }

      } catch (error) {
        console.error('Error loading or rendering PDF preview:', error);
        // You might want to update a state to show an error message to the user
      }
    };

    loadPdfPreview();
  }, [pdfFileName, currentPreviewPage]); // Rerun effect if pdfFileName or currentPreviewPage changes

  // Effect to stop speech if preview page changes or PDF changes
  useEffect(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel(); // Stop Web Speech API speech
      setIsSpeaking(false);
      setSpeakingParagraphIndex(null);
      setSpeakingSentenceIndex(null);
      setLoadingSpeech(false); // Also stop loading state
    }
  }, [currentPreviewPage, pdfFileName, isSpeaking, currentPageIndex]); // Added currentPageIndex dependency

  // Reset highlights when TTS stops or a new session starts
  useEffect(() => {
    if (!isSpeaking) {
      setLastReadSentenceIndex(null);
    }
  }, [isSpeaking]);

  // Update handleSpeakPage to read from a sentence through the rest of the paragraph
  const handleSpeakPage = async (paragraphIdx?: number, sentenceIdx?: number) => {
    if (isSpeaking || loadingSpeech) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingParagraphIndex(null);
      setSpeakingSentenceIndex(null);
      setLastReadSentenceIndex(null);
      setLoadingSpeech(false);
      return;
    }

    let sentencesToSpeak: string[] = [];
    let targetParagraphIndex: number | null = null;
    let targetSentenceIndex: number | null = null;

    const currentPdfPageParagraphs = pageTexts[currentPreviewPage - 1];
    if (!currentPdfPageParagraphs || currentPdfPageParagraphs.length === 0) return;

    if (paragraphIdx !== undefined && sentenceIdx !== undefined) {
      const paragraphData = currentPdfPageParagraphs[paragraphIdx];
      if (paragraphData && paragraphData.sentences && paragraphData.sentences[sentenceIdx] !== undefined) {
        sentencesToSpeak = paragraphData.sentences.slice(sentenceIdx);
        targetParagraphIndex = paragraphIdx;
        targetSentenceIndex = sentenceIdx;
      } else {
        return;
      }
    } else {
      const currentParagraph = currentPdfPageParagraphs[currentPageIndex];
      if (currentParagraph && currentParagraph.sentences) {
        sentencesToSpeak = currentParagraph.sentences;
        targetParagraphIndex = currentPageIndex;
        targetSentenceIndex = 0;
      } else {
        return;
      }
    }

    if (sentencesToSpeak.length > 0) {
      setLoadingSpeech(true);
      setLastReadSentenceIndex(null);
      setSpeakingParagraphIndex(targetParagraphIndex);
      setSpeakingSentenceIndex(targetSentenceIndex);
      setIsSpeaking(true);

      // Helper to play each sentence in sequence
      const playSentences = async (sentences: string[], idx: number) => {
        if (idx >= sentences.length) {
          setIsSpeaking(false);
          setSpeakingParagraphIndex(null);
          setSpeakingSentenceIndex(null);
          setLastReadSentenceIndex(null);
          setLoadingSpeech(false);
          return;
        }
        setSpeakingSentenceIndex((targetSentenceIndex ?? 0) + idx);
        setLastReadSentenceIndex((targetSentenceIndex ?? 0) + idx - 1);
        try {
          const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentences[idx], voice: 'alloy', speed: 1.0 }),
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            playSentences(sentences, idx + 1);
          };
          audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            setSpeakingParagraphIndex(null);
            setSpeakingSentenceIndex(null);
            setLastReadSentenceIndex(null);
            setLoadingSpeech(false);
          };
          audio.play();
        } catch (error) {
          setIsSpeaking(false);
          setSpeakingParagraphIndex(null);
          setSpeakingSentenceIndex(null);
          setLastReadSentenceIndex(null);
          setLoadingSpeech(false);
        }
      };
      playSentences(sentencesToSpeak, 0);
    }
  };

  // Handle click on a sentence to start speaking from that sentence
  const handleSentenceClick = (paragraphIdx: number, sentenceIdx: number, sentenceText: string) => {
    // If the same sentence is clicked and it's currently speaking/loading, stop it.
    if ((isSpeaking && speakingParagraphIndex === paragraphIdx && speakingSentenceIndex === sentenceIdx) || loadingSpeech) {
      window.speechSynthesis.cancel(); // Cancel any ongoing Web Speech API speech
      setIsSpeaking(false);
      setSpeakingParagraphIndex(null);
      setSpeakingSentenceIndex(null);
      setLoadingSpeech(false);
    } else {
      // Stop any ongoing speech and start speaking the clicked sentence
      window.speechSynthesis.cancel(); // Cancel any lingering Web Speech API speech
      setIsSpeaking(false); // Reset immediately before new speech starts
      setLoadingSpeech(false); // Reset loading status
      handleSpeakPage(paragraphIdx, sentenceIdx);
    }
  };

  // Handle voice chat toggle
  const handleToggleVoiceChat = () => {
    if (isVoiceChatActive) {
      console.log('Attempting to stop voice chat.');
      recognitionRef.current?.stop();
      setIsVoiceChatActive(false);
    } else {
      console.log('Attempting to start voice chat.');
      // Before starting, ensure any ongoing speech is stopped
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingParagraphIndex(null);
        setSpeakingSentenceIndex(null);
        setLoadingSpeech(false); // Also stop loading state
      }
      recognitionRef.current?.start();
      setIsVoiceChatActive(true);
      setNewMessage(''); // Clear input when starting voice chat
    }
  };

  // Handle sending messages (Modified to include extractedText context)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // We need a username, but for this page, maybe the user is determined differently or hardcoded initially.
    // Assuming username logic is handled elsewhere or we use a default.
    const currentUser = "User"; // Placeholder, replace with actual username logic

    if (!newMessage.trim() || isLoading || !currentUser) return;

    setIsLoading(true);
    // Emit message via socket, including the text of the current selected paragraph for context
    // Safely access currentPdfPageParagraphs and currentParagraphText
    const currentPdfPageParagraphs = pageTexts[currentPreviewPage - 1];
    const currentParagraphText = (currentPdfPageParagraphs && currentPdfPageParagraphs[currentPageIndex] && currentPdfPageParagraphs[currentPageIndex].paragraph) 
      ? currentPdfPageParagraphs[currentPageIndex].paragraph
      : '';

    const messagePayload = {
        text: currentParagraphText.substring(0, 4000) + '\n\nUser: ' + newMessage, // Limit context size
          sender: currentUser
      };
      socketRef.current?.emit('message', messagePayload);

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header (NavBar is already included in App.tsx) */}
      <div className="bg-white shadow-md p-4 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-800">Chat with PDF: {pdfFileName || 'N/A'}</h1>
          {pdfNumPages > 0 && (
              <div className="flex items-center space-x-1 ml-4 overflow-x-auto whitespace-nowrap pb-1">
                  {/* Render page buttons */}
                  {[...Array(pdfNumPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Only show a limited range of pages around the current page, or first/last few
                      const isCloseToCurrent = Math.abs(pageNumber - currentPreviewPage) <= 3; // Show 3 pages before/after
                      const isFirstOrLastFew = pageNumber <= 2 || pageNumber >= pdfNumPages - 1;

                      if (isCloseToCurrent || isFirstOrLastFew) {
                          return (
                              <button
                                  key={pageNumber}
                                  onClick={() => setCurrentPreviewPage(pageNumber)}
                                  className={`px-3 py-1 rounded-md text-sm font-medium ${currentPreviewPage === pageNumber ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                  Page {pageNumber}
                              </button>
                          );
                      } else if (pageNumber === currentPreviewPage - 4 || pageNumber === currentPreviewPage + 4) { // Add ellipsis
                          return <span key={`ellipsis-${pageNumber}`} className="px-2 text-gray-500">...</span>;
                      }
                      return null;
                  })}
              </div>
          )}
          <div className="flex items-center text-sm font-medium ml-auto">
            <span className={`h-3 w-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
      </div>

      {/* Main content area with three columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Column: PDF Info/Preview */}
        <div className="w-1/4 p-4 bg-white border-r overflow-y-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-4">PDF Info</h2>
          {pdfFileName ? (
            <div className="text-sm text-gray-800 break-words mb-4">File: {pdfFileName}</div>
          ) : (
             <div className="text-sm text-gray-500">No PDF selected.</div>
          )}
          {/* PDF Preview Area */}
          <div className="mt-4 flex justify-center flex-col items-center bg-gray-800 p-4 rounded-lg relative overflow-hidden">
            {/* Loading/Placeholder state */}
            {pdfFileName && pageTexts.length === 0 && (
                <div className="text-sm text-gray-500 mb-4">Loading PDF preview...</div>
            )}
            {!pdfFileName && (
                 <div className="text-sm text-gray-500 mb-4">No PDF selected.</div>
            )}
             {/* Placeholder icon if no PDF or loading */}
            {(!pdfFileName || pageTexts.length === 0) && (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-600 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 1 0-3.375 3.375h.273a2.5 2.5 0 0 1 2.5 2.5v.375m-12 0h-.083a2.5 2.5 0 0 1-2.5-2.5V9.75m2.25-3
                    .375a3.375 3.375 0 1 1 3.375 3.375H9.375A2.5 2.5 0 0 0 6.875 10.5v-.375m9 4.5a3.375 3.375 0 1 1 3.375 3.375h-.273a2.5 2.5 0 0 0-2.5-2.5v-.375M19.5 9.75h-.375a2.5 2.5 0 0 0-2.5 2.5v.375m0 4.5h.375a2.5 2.5 0 0 0 2.5-2.5v-.375m-12 3a3.375 3.375 0 1 1 3.375 3.375H8.25a2.5 2.5 0 0 0-2.5-2.5v-.375m0-4.5H6.375a2.5 2.5 0 0 0-2.5 2.5v.375" />
                 </svg>
            )}

            {/* Canvas for PDF rendering */}
            <canvas ref={pdfCanvasRef} className="max-w-full h-auto border rounded"></canvas>
             {/* Page Navigation Controls - REMOVED from here */}
             {/* Text-to-Speech Play Button */}
             {pageTexts.length > 0 && (
                 <button
                     onClick={() => handleSpeakPage()}
                     className={`absolute bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-full transition-colors ${isSpeaking || loadingSpeech ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg`}
                     aria-label={isSpeaking || loadingSpeech ? 'Stop speaking' : 'Speak page'}
                 >
                     {isSpeaking || loadingSpeech ? (
                         // Stop icon
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9A2.25 2.25 0 0 1 18.75 7.5v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                         </svg>
                     ) : (
                         // Play icon
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.97 11.16a.75.75 0 0 0 0-1.32L7.23 6.22a.75.75 0 0 0-1.08.67v6.02a.75.75 0 0 0 1.08.67l8.74-4.91Z" />
                         </svg>
                     )}
                 </button>
             )}
          </div>
        </div>

        {/* Center Column: Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
           {/* Messages Area */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
             {/* Chat messages will be rendered here (Moved from Chat.tsx) */}
             {messages.length === 0 && !isLoading && (
               <div className="text-center text-gray-500">Start chatting about the PDF!</div>
             )}
             {messages.map((message) => (
               <div
                 key={message.id}
                 className={`flex ${message.sender === "User" /* Use currentUser logic here */ ? 'justify-end' : 'justify-start'}`}
               >
                 <div
                   className={`max-w-[70%] rounded-lg p-3 ${
                     message.isAI
                       ? 'bg-purple-100 text-gray-800 border border-purple-200'
                       : message.sender === "User" /* Use currentUser logic here */
                       ? 'bg-blue-500 text-white'
                       : 'bg-white text-gray-800'
                   }`}
                 >
                   <div className="font-semibold">{message.isAI ? 'Docuchat' : message.sender}</div>
                   {/* Render message.text using ReactMarkdown if it's an AI message */}
                   {message.isAI ? (
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                   ) : (
                     <div>{message.text}</div>
                   )}
                   <div className="text-xs opacity-75 mt-1">
                     {new Date(message.timestamp).toLocaleTimeString()}
                   </div>
                 </div>
               </div>
             ))}

             {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-purple-100 text-gray-800 rounded-lg p-3 border border-purple-200">
                   <div className="font-semibold">Docuchat</div>
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
                placeholder={`Ask a question about ${pdfFileName || 'the PDF'}...`}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || isVoiceChatActive}
              />
              <button
                type="button"
                onClick={handleToggleVoiceChat}
                className={`p-2 rounded-lg transition-colors ${isVoiceChatActive ? 'bg-red-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                aria-label={isVoiceChatActive ? 'Stop voice chat' : 'Start voice chat'}
                title={isVoiceChatActive ? 'Stop Voice Chat' : 'Start Voice Chat'}
              >
                {/* Sound wave icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  {isVoiceChatActive ? (
                    // Animated sound wave bars when active
                    <g className="voice-wave-animation">
                      <rect x="3" y="10" width="2" height="4" rx="1" className="fill-current" />
                      <rect x="7" y="8" width="2" height="8" rx="1" className="fill-current" />
                      <rect x="11" y="6" width="2" height="12" rx="1" className="fill-current" />
                      <rect x="15" y="8" width="2" height="8" rx="1" className="fill-current" />
                      <rect x="19" y="10" width="2" height="4" rx="1" className="fill-current" />
                    </g>
                  ) : (
                    // Static microphone icon when inactive
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 6a6 6 0 0 1-6-6v-1.5m6 6v3.75m-3.75 0h7.5M12 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  )}
                </svg>
              </button>
              {/* Paperclip/Upload button is on the Home page now */}
              <button
                type="submit"
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={isLoading}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Extracted Notes */}
        <div className="w-1/4 p-4 bg-white border-l overflow-y-auto flex flex-col">
          {/* Tab Headers */}
          <div className="flex mb-4 border-b">
            <button
              className={`pb-2 mr-4 ${activeTab === 'extracted' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('extracted')}
            >
              Extracted Text
            </button>
            <button
              className={`pb-2 ${activeTab === 'notes' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('notes')}
            >
              AI Notes
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'extracted' && (
            <div className="text-sm text-gray-800 break-words whitespace-pre-wrap overflow-y-auto flex-1">
              {extractedText ? (
                <div className="prose prose-sm max-w-none">
                  {(() => {
                    const currentPdfPageParagraphs = pageTexts[currentPreviewPage - 1];
                    if (!currentPdfPageParagraphs || currentPdfPageParagraphs.length === 0) {
                      return <div className="text-gray-500 italic">No text available for this PDF page.</div>;
                    }

                    const currentParagraphData = currentPdfPageParagraphs[currentPageIndex];
                    if (!currentParagraphData || currentParagraphData.sentences.length === 0) {
                      return <div className="text-gray-500 italic">No text available for this segment.</div>;
                    }

                    return (
                      <div className="space-y-4">
                        {currentParagraphData.sentences.map((sentence, sentenceIndex) => (
                          <p key={sentenceIndex} className="leading-relaxed">
                            <span
                              onClick={() => handleSentenceClick(currentPageIndex, sentenceIndex, sentence)}
                              className={`cursor-pointer px-1 rounded transition-colors
                                ${
                                  speakingParagraphIndex === currentPageIndex &&
                                  lastReadSentenceIndex !== null &&
                                  sentenceIndex <= lastReadSentenceIndex
                                    ? 'bg-purple-100' // Soft lavender highlight
                                    : speakingParagraphIndex === currentPageIndex &&
                                      speakingSentenceIndex === sentenceIndex
                                    ? 'bg-yellow-300' // Currently reading
                                    : ''
                                }
                              `}
                            >
                              {sentence}{' '}
                            </span>
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Extracted text will appear here after PDF upload.</div>
              )}
              {/* Page Navigation Buttons */}
              {pageTexts[currentPreviewPage - 1] && pageTexts[currentPreviewPage - 1].length > 1 && (
                <div className="sticky bottom-0 bg-white border-t mt-4 pt-4">
                  <div className="flex flex-wrap justify-center gap-2">
                    {pageTexts[currentPreviewPage - 1].map((_, index) => (
                      <button
                        key={index}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          currentPageIndex === index 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => setCurrentPageIndex(index)}
                      >
                        Segment {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="text-sm text-gray-800 overflow-y-auto flex-1 p-4 bg-gray-50 rounded-lg shadow-inner border border-gray-200">
              {loadingNotes && <div className="text-sm text-gray-500">Generating AI notes...</div>}
              {notesError && <div className="text-sm text-red-600">Error: {notesError}</div>}
              {aiNotes && !loadingNotes && !notesError && (
                <div className="prose prose-sm max-w-none space-y-4">
                  {formatAiNotes(aiNotes)
                    .split('\n\n')
                    .map((paragraph, index) => (
                      <p key={index} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                </div>
              )}
              {!aiNotes && !loadingNotes && !notesError && extractedText && (
                <div className="text-sm text-gray-500">AI-generated notes will appear here after generation.</div>
              )}
              {!extractedText && (
                 <div className="text-sm text-gray-500">Upload a PDF to generate AI notes.</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ChatWithPdfPage; 