export type Mood = 'neutral' | 'surprised' | 'angry' | 'sad' | 'happy' | 'impressed' | 'firm' | 'yielding';

export type Message = {
  role: 'user' | 'model';
  text: string;
  price?: number;
  mood?: Mood;
};

export type NegotiationState = {
  currentPrice: number;
  rounds: number;
  maxRounds: number;
  isGameOver: boolean;
  history: Message[];
  product: Product;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  initialPrice: number;
  minPrice: number;
  image: string;
};

export type LeaderboardEntry = {
  name: string;
  price: number;
  date: string;
  uid: string;
};
