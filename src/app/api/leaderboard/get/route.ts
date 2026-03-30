import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/services/mongodb';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const entries = await getLeaderboard(limit);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', entries: [] },
      { status: 500 }
    );
  }
}
