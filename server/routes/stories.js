import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as storyManager from '../services/storyManager.js';
import * as llm from '../services/llm.js';
import * as promptBuilder from '../services/promptBuilder.js';
import * as cardEngine from '../services/cardEngine.js';

const router = Router();

// List all stories
router.get('/', async (req, res) => {
  try {
    const stories = await storyManager.listStories();
    res.json(stories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a new story
router.post('/', async (req, res) => {
  try {
    const story = await storyManager.createStory(req.body);
    res.status(201).json(story);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a story
router.get('/:id', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.id);
    res.json(story);
  } catch (e) {
    res.status(404).json({ error: 'Story not found' });
  }
});

// Update story metadata
router.put('/:id', async (req, res) => {
  try {
    const story = await storyManager.updateStory(req.params.id, req.body);
    res.json(story);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a story
router.delete('/:id', async (req, res) => {
  try {
    await storyManager.deleteStory(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Chat — send a direction, get AI prose back via SSE stream
router.post('/:id/chat', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.id);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Add user message to story
    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    story.messages.push(userMsg);

    // Build the prompt (includes system prompt with cards + message history)
    const llmMessages = promptBuilder.buildMessages(story);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Track streaming state
    let fullContent = '';
    let cardsStarted = false;
    let sentLength = 0;

    await llm.streamChat(
      llmMessages,
      // onChunk — stream prose to client, stop when cards block starts
      (chunk) => {
        fullContent += chunk;

        if (cardsStarted) return;

        const cardsIdx = fullContent.indexOf('[[[QUILL_CARDS_START]]]');
        if (cardsIdx !== -1) {
          cardsStarted = true;
          // Send any remaining prose before the marker
          const unsent = fullContent.substring(sentLength, cardsIdx);
          if (unsent.trim()) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: unsent })}\n\n`);
          }
          sentLength = fullContent.length;
        } else {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          sentLength = fullContent.length;
        }
      },
      // onDone — parse cards, save story, send final event
      async (fullContent) => {
        const cardUpdates = cardEngine.parseCardUpdates(fullContent);
        const prose = cardEngine.stripCardBlock(fullContent);

        // Update cards
        story.cards = cardEngine.applyCardUpdates(story.cards, cardUpdates);

        // Add assistant message (prose only, no card block)
        const assistantMsg = {
          id: uuidv4(),
          role: 'assistant',
          content: prose,
          timestamp: new Date().toISOString(),
        };
        story.messages.push(assistantMsg);

        // Save everything
        await storyManager.saveStory(story);

        // Send final event
        res.write(`data: ${JSON.stringify({
          type: 'done',
          messageId: assistantMsg.id,
          prose,
          cards: story.cards,
        })}\n\n`);
        res.end();
      },
    );
  } catch (e) {
    console.error('[Chat Error]', e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
      res.end();
    }
  }
});

// Update a specific message
router.put('/:id/messages/:messageId', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.id);
    const msgIndex = story.messages.findIndex(m => m.id === req.params.messageId);
    if (msgIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (req.body.content !== undefined) {
      story.messages[msgIndex].content = req.body.content;
    }
    
    await storyManager.saveStory(story);
    res.json(story.messages[msgIndex]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rewind timeline (truncate messages after a given index)
router.post('/:id/rewind', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.id);
    const { messageIndex } = req.body;
    
    if (messageIndex === undefined || messageIndex < 0 || messageIndex >= story.messages.length) {
      return res.status(400).json({ error: 'Invalid message index' });
    }
    
    // Keep messages up to the index (inclusive)
    story.messages = story.messages.slice(0, messageIndex + 1);
    
    await storyManager.saveStory(story);
    res.json(story);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
