const express = require('express');
const router = express.Router();
const axios = require('axios'); // For making HTTP requests

// Ensure you have your OpenAI API key set as an environment variable
// e.g., in a .env file: OPENAI_API_KEY=your_key_here
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/text-to-speech', async (req, res) => {
    const { text, voice = 'alloy', speed = 1.0 } = req.body; // Default voice and speed

    if (!text) {
        return res.status(400).json({ error: 'Text is required for text-to-speech.' });
    }

    if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: OpenAI API key missing.' });
    }

    try {
        const openaiResponse = await axios.post(
            'https://api.openai.com/v1/audio/speech',
            {
                model: 'tts-1', // Or 'tts-1-hd' for higher quality
                input: text,
                voice: voice,
                speed: speed,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer', // Important for handling audio binary data
            }
        );

        // Set appropriate headers for audio playback
        res.set({
            'Content-Type': 'audio/mpeg', // Assuming MP3 format from OpenAI
            'Content-Length': openaiResponse.data.length,
            'Content-Disposition': 'inline; filename="speech.mp3"',
        });

        res.send(openaiResponse.data);
    } catch (error) {
        console.error('Error calling OpenAI TTS API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate speech from OpenAI.' });
    }
});

module.exports = router; 