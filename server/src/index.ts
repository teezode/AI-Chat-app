process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIService } from './services/openai';
import multer, { Multer } from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import Datastore from 'nedb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Ensure you have a JWT_SECRET in your .env file
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_here'; // Replace with a strong, random secret

// Ensure you have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file
const googleClientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';

// Initialize the database
const usersDB = new Datastore({ filename: 'users.db', autoload: true });

// Add an index to ensure emails are unique
usersDB.ensureIndex({ fieldName: 'email', unique: true }, (err: Error | null) => {
  if (err) console.error('Error ensuring email index unique:', err);
});

// Add this at the top or in a types.d.ts file if needed:
declare module 'pdf-parse';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_here', // Replace with a strong, random secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Google Strategy for Passport
passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: '/auth/google/callback', // This should match the Authorized redirect URI in Google Cloud Console
    scope: ['profile', 'email'] // Request access to the user's profile and email
  }, async (accessToken: string, refreshToken: string, profile: passport.Profile, done: (error: any, user?: any) => void) => {
    // This function is called after the user authenticates with Google
    // profile contains the user's Google profile information
    try {
      // Find or create the user in your database
      usersDB.findOne({ googleId: profile.id }, async (err: Error | null, existingUser: any) => {
        if (err) return done(err);

        if (existingUser) {
          // User already exists, return the user
          return done(null, existingUser);
        } else {
          // New user, create an entry in the database
          const newUser = {
            googleId: profile.id,
            email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
            name: profile.displayName,
            // You might want to store other profile info like photos, etc.
          };
          usersDB.insert(newUser, (insertErr: Error | null, doc: any) => {
            if (insertErr) return done(insertErr);
            return done(null, doc);
          });
        }
      });
    } catch (error) {
      done(error as Error);
    }
  }
));

// Passport serialization and deserialization for session management
// This is needed for Passport to manage the user during the OAuth flow
passport.serializeUser((user: any, done: (error: any, id?: any) => void) => {
  // Serialize the user by their database ID
  done(null, user._id);
});

passport.deserializeUser((id: string, done: (error: any, user?: any) => void) => {
  // Find the user by their database ID
  usersDB.findOne({ _id: id }, (err: Error | null, user: any) => {
    done(err, user);
  });
});

// Store chat messages in memory (replace with database in production)
const messages: Array<{ id: string; text: string; sender: string; timestamp: number; isAI?: boolean }> = [];

// Initialize OpenAI service
const aiService = OpenAIService.getInstance();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create the 'uploads' directory if it doesn't exist
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use the original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Add this helper function before the routes
function formatExtractedText(text: string): string {
  let formatted = text;

  // NEW STEP 0: Remove any residual '__PARA_BREAK__' from previous processing if it exists in raw text.
  formatted = formatted.replace(/__PARA_BREAK__/g, ' ');

  // Step 1: Normalize all hyphen-like characters to a standard hyphen.
  formatted = formatted.replace(/[‐‑‒–—―]/g, '-');

  // Step 2: Aggressively remove all hyphens as they are likely artifacts from PDF extraction.
  formatted = formatted.replace(/-/g, '');

  // Step 3: Normalize non-breaking spaces to regular spaces.
  formatted = formatted.replace(/\xA0/g, ' ');

  // Step 4: Standardize paragraph breaks: replace 2 or more newlines directly with two newlines.
  formatted = formatted.replace(/\n{2,}/g, '\n\n');

  // Step 5: Replace any remaining single newlines with a space (these are likely soft wraps within a paragraph).
  formatted = formatted.replace(/\n/g, ' ');

  // Step 6: Aggressive Space Insertion for Word Boundaries.
  // a. CamelCase/PascalCase: Insert space between a lowercase letter and an uppercase letter
  formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
  // b. Acronym to Word: Insert space between an uppercase letter followed by another uppercase and then a lowercase
  formatted = formatted.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  // c. Letter-Number Transitions: Insert space between a letter and a number
  formatted = formatted.replace(/([a-zA-Z])([0-9])/g, '$1 $2');
  // d. Number-Letter Transitions: Insert space between a number and a letter
  formatted = formatted.replace(/([0-9])([a-zA-Z])/g, '$1 $2');
  // e. General PascalCase Split: Insert space before a capital letter if not at start and preceded by non-space, non-number, non-uppercase
  formatted = formatted.replace(/([^\s0-9A-Z])([A-Z])/g, '$1 $2');

  // Step 7: Normalize all whitespace: replace any sequence of two or more spaces with a single regular space.
  // This includes any extra spaces introduced by previous steps.
  formatted = formatted.replace(/ {2,}/g, ' ');

  // Step 8: Punctuation Spacing: Ensure no space before punctuation and a single space after, unless at end of string.
  formatted = formatted.replace(/\s*([.,!?;:])\s*/g, '$1'); 
  formatted = formatted.replace(/([.,!?;:])(?![\s\n]|$)/g, '$1 ');
  formatted = formatted.replace(/\s*([()])\s*/g, ' $1 ');

  // Step 9: Remove non-printable characters, keeping valid text characters, spaces, and newlines.
  formatted = formatted.replace(/[^\x20-\x7E\n ]/g, '');
  
  // Step 10: Final trimming of each line and the whole text.
  formatted = formatted.split('\n').map(line => line.trim()).join('\n');
  formatted = formatted.trim();
  
  return formatted;
}

// API Routes
app.get('/api/messages', (req: Request, res: Response) => {
  res.json(messages);
});

app.post('/api/upload', upload.single('pdf'), async (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const data = await pdfParse(file.path);
    console.log('Raw extracted text (upload):', data.text.substring(0, 500) + '...'); // Log first 500 chars
    const extractedText = formatExtractedText(data.text);
    console.log('Formatted extracted text (upload):', extractedText.substring(0, 500) + '...'); // Log first 500 chars
    res.json({ 
      message: 'PDF uploaded and text extracted successfully', 
      extractedText: extractedText, 
      pdfFileName: file.originalname 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract PDF text' });
  }
});

// New endpoint to serve PDF files by filename
app.get('/api/pdf/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = `./uploads/${filename}`;

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading PDF file:', err);
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.send(data);
  });
});

// New endpoint to serve pdf.worker.min.js
app.get('/pdfjs-worker.js', (req: Request, res: Response) => {
  // Construct the absolute path to pdf.worker.min.mjs
  const workerPath = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(workerPath);
});

// New endpoint to list uploaded PDF files
app.get('/api/my-pdfs', (req: Request, res: Response) => {
  const uploadDir = './uploads';
  fs.readdir(uploadDir, async (err, files) => {
    if (err) {
      console.error('Error listing PDF files:', err);
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: 'Failed to list PDF files' });
    }

    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    // Get detailed info for each PDF including modification time
    const filesWithDetails = await Promise.all(pdfFiles.map(async (fileName) => {
      const filePath = path.join(uploadDir, fileName);
      try {
        const stats = await fs.promises.stat(filePath);
        return { fileName, timestamp: stats.mtimeMs }; // mtimeMs is modification time in milliseconds
      } catch (statErr) {
        console.error(`Error getting stats for file ${fileName}:`, statErr);
        return { fileName, timestamp: 0 }; // Fallback if stat fails
      }
    }));

    // Sort by timestamp in descending order (latest first)
    filesWithDetails.sort((a, b) => b.timestamp - a.timestamp);

    res.json(filesWithDetails);
  });
});

// New endpoint to delete a PDF file by filename
app.delete('/api/my-pdfs/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = `./uploads/${filename}`;

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting PDF file:', err);
      return res.status(500).json({ error: 'Failed to delete PDF file' });
    }

    res.json({ message: 'PDF file deleted successfully' });
  });
});

// New endpoint to get extracted text of a PDF file by filename
app.get('/api/extracted-text/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = `./uploads/${filename}`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(fileBuffer);
    console.log('Raw extracted text (fetch):', data.text.substring(0, 500) + '...'); // Log first 500 chars
    const extractedText = formatExtractedText(data.text);
    console.log('Formatted extracted text (fetch):', extractedText.substring(0, 500) + '...'); // Log first 500 chars
    res.json({ extractedText: extractedText });
  } catch (err) {
    console.error('Error extracting PDF text:', err);
    res.status(500).json({ error: 'Failed to extract PDF text' });
  }
});

// New endpoint for user registration
app.post('/api/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    usersDB.findOne({ email: email }, async (err: Error | null, existingUser: any) => {
      if (err) {
        console.error('Error checking for existing user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

      // Insert new user into the database
      const newUser = { email, password: hashedPassword };
      usersDB.insert(newUser, (insertErr: Error | null, doc: any) => {
        if (insertErr) {
          console.error('Error inserting new user:', insertErr);
          return res.status(500).json({ error: 'Failed to register user' });
        }
        // Exclude password hash from the response for security
        res.status(201).json({ message: 'User registered successfully', user: { email: doc.email } });
      });
    });
  } catch (error) {
    console.error('Error in signup endpoint:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// New endpoint for user sign-in
app.post('/api/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find the user by email
    usersDB.findOne({ email: email }, async (err: Error | null, user: any) => {
      if (err) {
        console.error('Error finding user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Compare the provided password with the stored hashed password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate a JWT token
      const token = jwt.sign({ userId: user._id, email: user.email }, jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

      // Send the token back to the client
      res.json({ message: 'Sign in successful', token: token });
    });
  } catch (error) {
    console.error('Error in signin endpoint:', error);
    res.status(500).json({ error: 'Internal server error during signin' });
  }
});

// Google OAuth routes
// Route to initiate Google authentication
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route to handle the callback from Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signin' }), // Redirect to signin on failure
  (req: Request, res: Response) => {
    // Successful authentication, generate a JWT token and redirect or respond
    // req.user contains the authenticated user from our database
    const user = req.user as { _id: string, email?: string } | undefined;
    if (user) {
      const token = jwt.sign({ userId: user._id, email: user.email }, jwtSecret, { expiresIn: '1h' });
      // Redirect the user back to the client application, passing the token
      // We'll need a dedicated route or a way to handle this on the client side
      // For now, let's redirect to the home page and the client will need to check for the token
      res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
    } else {
      // This case should ideally not happen with successful authentication, but good to handle
      res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
    }
  }
);

// New endpoint to generate AI notes from text
app.post('/api/generate-notes', async (req: Request, res: Response) => {
  const { extractedText } = req.body;

  if (!extractedText) {
    return res.status(400).json({ error: 'No text provided for notes generation' });
  }

  try {
    // Truncate text to fit within model context (approx 15000 characters for gpt-3.5-turbo 16k)
    const truncatedText = extractedText.substring(0, 15000);
    const aiNotes = await aiService.generateNotesFromText(truncatedText);
    res.json({ notes: aiNotes });
  } catch (error) {
    console.error('Error in /api/generate-notes:', error);
    res.status(500).json({ error: 'Failed to generate AI notes' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // Send existing messages to newly connected client
  socket.emit('messages', messages);

  // Handle new messages
  socket.on('message', async (message: { text: string; sender: string }) => {
    try {
      // The incoming message.text may contain the PDF page context followed by 'User: ' and the actual query.
      // We need to separate the actual user query from the context for displaying in the chat.
      const userQueryMatch = message.text.match(/User: (.*)/s);
      const userQuery = userQueryMatch ? userQueryMatch[1].trim() : message.text; // If no match, assume the whole text is the query

      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        text: userQuery, // Use only the extracted user query for the chat display
        sender: message.sender,
        timestamp: Date.now()
      };
      
      messages.push(userMessage);
      io.emit('message', userMessage);

      // Get AI response
      const aiResponse = await aiService.getChatResponse(
        message.text // Use the full text including context for the AI call
      );
      
      // Add AI message
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'AI Assistant',
        timestamp: Date.now(),
        isAI: true
      };
      
      messages.push(aiMessage);
      io.emit('message', aiMessage);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000; // Use environment port or default to 5000
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 