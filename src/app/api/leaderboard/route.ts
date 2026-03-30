import { NextRequest, NextResponse } from 'next/server';
import { addLeaderboardEntry } from '@/services/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name, price, uid } = await req.json();
    
    if (!name || !price || !uid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await addLeaderboardEntry({ name, price, uid });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leaderboard POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add entry' },
      { status: 500 }
    );
  }
}
