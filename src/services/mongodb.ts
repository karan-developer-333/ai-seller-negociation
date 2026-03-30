import { MongoClient, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'bazaar_negotiation';
const LEADERBOARD_COLLECTION = 'leaderboard';

let client: MongoClient | null = null;

async function getCollection(): Promise<Collection | null> {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not configured. Leaderboard features disabled.');
    return null;
  }
  
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
    }
    
    const db = client.db(DB_NAME);
    return db.collection(LEADERBOARD_COLLECTION);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
}

export interface LeaderboardEntry {
  name: string;
  price: number;
  date: string;
  uid: string;
}

export async function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'date'>): Promise<void> {
  const collection = await getCollection();
  if (!collection) return;
  
  try {
    await collection.insertOne({
      ...entry,
      date: new Date()
    });
  } catch (error) {
    console.error('Failed to add leaderboard entry:', error);
  }
}

export async function getLeaderboard(limitCount: number = 10): Promise<LeaderboardEntry[]> {
  const collection = await getCollection();
  if (!collection) return [];
  
  try {
    const entries = await collection
      .find({})
      .sort({ price: 1 })
      .limit(limitCount)
      .toArray();
    
    return entries.map(entry => ({
      name: entry.name,
      price: entry.price,
      uid: entry.uid,
      date: entry.date instanceof Date ? entry.date.toLocaleDateString() : String(entry.date)
    }));
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
