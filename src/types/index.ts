
export type CellId = string;

export interface Cell {
  id: CellId;
  age: number;
  expertise: string;
  goal: string; // Added goal property
  position: { x: number; y: number };
  positionHistory: { x: number; y: number }[]; // Added to track movement
  isAlive: boolean;
  version: number; // Added version property
  likedCells: CellId[]; // Added likedCells property
  history: HistoryEntry[];
  db?: any; // Placeholder for in-memory DB, adjust as needed
  dbFilePath?: string; // Path to persisted SQLite file
}

// Data needed to create a history entry (age and timestamp are added automatically)
export interface HistoryEntryData {
    type: 'decision' | 'message' | 'clone' | 'death' | 'init';
    text: string;
}


export interface HistoryEntry extends HistoryEntryData {
  seq: number;
  age: number;
  timestamp: number;
}

export interface Message {
  id: string;
  sourceCellId: CellId | 'user'; // Removed broadcast/user from source
  targetCellId: CellId | 'broadcast' | 'user'; // Added 'user' target
  content: string;
  timestamp: number;
  route?: CellId[]; // Optional: track the path taken
}

export interface NetworkState {
  cells: Record<CellId, Cell | undefined>; // Allow undefined for deleted cells during transition
  messages: Message[];
  tickCount: number; // Added tick count for overall network time
  purpose: string; // Added network purpose
}
