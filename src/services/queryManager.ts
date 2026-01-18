import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface QueryDatabase {
  available: string[];
  used: string[];
  lastUpdated: string;
}

let dbPath: string;
let data: QueryDatabase = {
  available: [],
  used: [],
  lastUpdated: new Date().toISOString(),
};

// Default queries to seed the database
const DEFAULT_QUERIES = [
  'weather today', 'news headlines', 'best restaurants nearby', 'movie reviews',
  'how to cook pasta', 'travel destinations 2024', 'workout routines', 'book recommendations',
  'technology trends', 'healthy recipes', 'home improvement tips', 'financial advice',
  'car maintenance', 'gardening tips', 'pet care advice', 'fashion trends',
  'music playlists', 'video game reviews', 'sports scores', 'celebrity news',
  'science discoveries', 'history facts', 'art exhibitions', 'photography tips',
  'DIY projects', 'meditation techniques', 'language learning', 'coding tutorials',
  'business ideas', 'investment strategies', 'real estate market', 'job interview tips',
  'resume writing', 'networking advice', 'productivity hacks', 'time management',
  'stress relief', 'sleep improvement', 'nutrition facts', 'exercise benefits',
  'mental health tips', 'relationship advice', 'parenting tips', 'education resources',
  'online courses', 'podcast recommendations', 'streaming services', 'social media trends',
  'environmental news', 'climate change', 'renewable energy', 'electric vehicles',
  'space exploration', 'artificial intelligence', 'virtual reality', 'cryptocurrency',
  'blockchain technology', 'cybersecurity tips', 'privacy protection', 'data backup',
  'cloud storage', 'smart home devices', 'wearable technology', 'mobile apps',
  'web development', 'graphic design', 'video editing', 'audio production',
  'animation software', 'game development', '3D modeling', 'machine learning',
  'data science', 'statistics basics', 'math tutorials', 'physics explained',
  'chemistry basics', 'biology facts', 'astronomy news', 'geography trivia',
  'world capitals', 'famous landmarks', 'tourist attractions', 'cultural festivals',
  'traditional foods', 'wine regions', 'coffee origins', 'tea varieties',
  'chocolate brands', 'ice cream flavors', 'pizza recipes', 'burger joints',
  'sushi restaurants', 'vegetarian options', 'vegan recipes', 'gluten free meals',
  'keto diet', 'intermittent fasting', 'weight loss tips', 'muscle building',
  'yoga poses', 'pilates exercises', 'running tips', 'cycling routes',
  'swimming techniques', 'tennis lessons', 'golf courses', 'basketball drills',
  'football highlights', 'baseball stats', 'hockey teams', 'soccer leagues',
];

export function initQueryDatabase(): void {
  const userDataPath = app?.getPath('userData') || process.cwd();
  dbPath = path.join(userDataPath, 'queries.json');

  if (fs.existsSync(dbPath)) {
    try {
      const fileData = fs.readFileSync(dbPath, 'utf-8');
      data = JSON.parse(fileData);
    } catch (e) {
      console.error('Failed to load query database:', e);
      seedDefaultQueries();
    }
  } else {
    seedDefaultQueries();
  }
}

function saveToFile(): void {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save query database:', e);
  }
}

function seedDefaultQueries(): void {
  data = {
    available: [...DEFAULT_QUERIES],
    used: [],
    lastUpdated: new Date().toISOString(),
  };
  saveToFile();
}

// Get queries and mark them as used
export function consumeQueries(count: number): string[] {
  if (data.available.length === 0) {
    return [];
  }

  // Shuffle available queries
  const shuffled = [...data.available].sort(() => Math.random() - 0.5);

  // Take requested count (or all if less available)
  const toConsume = shuffled.slice(0, Math.min(count, shuffled.length));

  // Move consumed queries to used list
  data.available = data.available.filter(q => !toConsume.includes(q));
  data.used.push(...toConsume);

  saveToFile();
  return toConsume;
}

// Get available query count
export function getAvailableCount(): number {
  return data.available.length;
}

// Get used query count
export function getUsedCount(): number {
  return data.used.length;
}

// Get all stats
export function getQueryStats(): { available: number; used: number; total: number } {
  return {
    available: data.available.length,
    used: data.used.length,
    total: data.available.length + data.used.length,
  };
}

// Add new queries (from import or manual add)
export function addQueries(queries: string[]): number {
  const newQueries = queries.filter(q =>
    q.trim() &&
    !data.available.includes(q.trim()) &&
    !data.used.includes(q.trim())
  ).map(q => q.trim());

  data.available.push(...newQueries);
  saveToFile();
  return newQueries.length;
}

// Reset used queries back to available
export function resetUsedQueries(): void {
  data.available.push(...data.used);
  data.used = [];
  saveToFile();
}

// Clear all queries
export function clearAllQueries(): void {
  data.available = [];
  data.used = [];
  saveToFile();
}

// Reset to default queries
export function resetToDefaultQueries(): void {
  seedDefaultQueries();
}

// Get all available queries (for export/display)
export function getAvailableQueries(): string[] {
  return [...data.available];
}

// Get all used queries (for export/display)
export function getUsedQueries(): string[] {
  return [...data.used];
}

// Remove specific queries
export function removeQueries(queries: string[]): void {
  data.available = data.available.filter(q => !queries.includes(q));
  data.used = data.used.filter(q => !queries.includes(q));
  saveToFile();
}
