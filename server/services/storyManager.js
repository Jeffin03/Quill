import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

function getStoriesDir() {
  return path.resolve(config.dataDir);
}

function getStoryPath(id) {
  return path.join(getStoriesDir(), `${id}.json`);
}

/**
 * Ensure the data directory exists.
 */
export async function ensureDataDir() {
  await fs.mkdir(getStoriesDir(), { recursive: true });
}

/**
 * List all stories (metadata only, not full content).
 */
export async function listStories() {
  const dir = getStoriesDir();
  try {
    const files = await fs.readdir(dir);
    const stories = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const story = JSON.parse(content);
        stories.push({
          id: story.id,
          title: story.title,
          genre: story.settings?.genre,
          pacing: story.settings?.pacing,
          tone: story.settings?.tone,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          messageCount: story.messages?.length || 0,
          cardCount: story.cards?.length || 0,
        });
      } catch {
        // Skip corrupt files
      }
    }

    return stories.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch {
    return [];
  }
}

/**
 * Get a full story by ID.
 */
export async function getStory(id) {
  const content = await fs.readFile(getStoryPath(id), 'utf-8');
  return JSON.parse(content);
}

/**
 * Create a new story with initial settings.
 */
export async function createStory(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const story = {
    id,
    title: data.title || 'Untitled Story',
    createdAt: now,
    updatedAt: now,
    settings: {
      genre: data.genre || 'general fiction',
      pacing: data.pacing || 'slow-burn',
      tone: data.tone || 'atmospheric',
    },
    messages: [],
    cards: [],
    tree: {
      rootNodeId: null,
      nodes: {},
      activeNodeId: null,
    },
  };

  await ensureDataDir();
  await fs.writeFile(getStoryPath(id), JSON.stringify(story, null, 2));
  return story;
}

/**
 * Update story metadata (title, settings). Does not overwrite messages/cards.
 */
export async function updateStory(id, updates) {
  const story = await getStory(id);
  const safeUpdates = {};

  if (updates.title !== undefined) safeUpdates.title = updates.title;
  if (updates.settings) {
    safeUpdates.settings = { ...story.settings, ...updates.settings };
  }

  const updated = {
    ...story,
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(getStoryPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * Save a full story object to disk.
 */
export async function saveStory(story) {
  story.updatedAt = new Date().toISOString();
  await ensureDataDir();
  await fs.writeFile(getStoryPath(story.id), JSON.stringify(story, null, 2));
  return story;
}

/**
 * Delete a story by ID.
 */
export async function deleteStory(id) {
  await fs.unlink(getStoryPath(id));
}
