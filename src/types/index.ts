export type CellId = string;

export interface Cell {
  id: CellId;
  age: number;
  expertise: string;
  goal: string; // Added goal property
  position: { x: number; y: number };
  isAlive: boolean;
  version: number; // Added version property
  likedCells: CellId[]; // Added likedCells property
  history: HistoryEntry[];
  db?: any; // Placeholder for in-memory DB, adjust as needed
  dbFilePath?: string; // Path to persisted SQLite file
}

export interface HistoryEntry {
  seq: number;
  type: 'decision' | 'message' | 'clone' | 'death' | 'init'; // Added event types
  age: number;
  text: string;
  timestamp: number; // Added timestamp
}

export interface Message {
  id: string;
  sourceCellId: CellId;
  targetCellId: CellId | 'broadcast' | 'user'; // Added 'user' target
  content: string;
  timestamp: number;
  route?: CellId[]; // Optional: track the path taken
}

export interface NetworkState {
  cells: Record<CellId, Cell>;
  messages: Message[];
  tickCount: number; // Added tick count for overall network time
  purpose: string; // Added network purpose
}
