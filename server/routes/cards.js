import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as storyManager from '../services/storyManager.js';

const router = Router();

// Get all cards for a story
router.get('/:storyId', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.storyId);
    res.json(story.cards || []);
  } catch (e) {
    res.status(404).json({ error: 'Story not found' });
  }
});

// Create a card manually
router.post('/:storyId', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.storyId);
    const card = {
      id: uuidv4(),
      type: req.body.type || 'world',
      title: req.body.title || 'New Card',
      fields: req.body.fields || {},
      lastUpdated: new Date().toISOString(),
    };
    story.cards.push(card);
    await storyManager.saveStory(story);
    res.status(201).json(card);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a card
router.put('/:storyId/:cardId', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.storyId);
    const idx = story.cards.findIndex(c => c.id === req.params.cardId);
    if (idx === -1) return res.status(404).json({ error: 'Card not found' });

    const card = story.cards[idx];
    if (req.body.title !== undefined) card.title = req.body.title;
    if (req.body.type !== undefined) card.type = req.body.type;
    if (req.body.fields !== undefined) card.fields = { ...card.fields, ...req.body.fields };
    card.lastUpdated = new Date().toISOString();

    story.cards[idx] = card;
    await storyManager.saveStory(story);
    res.json(card);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a card
router.delete('/:storyId/:cardId', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.storyId);
    const idx = story.cards.findIndex(c => c.id === req.params.cardId);
    if (idx === -1) return res.status(404).json({ error: 'Card not found' });

    story.cards.splice(idx, 1);
    await storyManager.saveStory(story);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate cards from premise
router.post('/:storyId/magic', async (req, res) => {
  try {
    const story = await storyManager.getStory(req.params.storyId);
    if (!req.body.premise) {
      return res.status(400).json({ error: 'Premise is required' });
    }

    const { premise } = req.body;
    
    // Call LLM to parse premise into card updates
    const cardEngine = await import('../services/cardEngine.js');
    const updates = await cardEngine.generateCardsFromPremise(premise);
    
    // Apply those updates to the story's cards
    story.cards = cardEngine.applyCardUpdates(story.cards || [], updates);
    
    await storyManager.saveStory(story);
    res.status(201).json(story.cards);
  } catch (e) {
    console.error('[MagicCards]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
