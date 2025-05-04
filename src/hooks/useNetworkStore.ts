import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NetworkState, Cell, CellId, Message, HistoryEntry } from '@/types';
import {
  cellPurposeUnderstanding,
  CellPurposeUnderstandingInput,
  CellPurposeUnderstandingOutput,
} from '@/ai/flows/cell-purpose-understanding';
import {
  cellHelpRequestInterpretation,
  CellHelpRequestInterpretationInput,
  CellHelpRequestInterpretationOutput,
} from '@/ai/flows/cell-help-request-interpretation';
import {
  routeMessage,
  RouteMessageInput,
  RouteMessageOutput,
} from '@/ai/flows/message-routing';
import { nanoid } from 'nanoid'; // Using nanoid for unique IDs

const MAX_AGE = 99;
const MAX_CELLS = 50; // Limit the number of cells for performance
const GRID_SIZE = 500; // Size of the visualization area
const CLONE_DISTANCE_THRESHOLD = 50; // Min distance between parent and clone
const MOVE_STEP = 10; // How much cells move per tick towards liked cells

// --- Helper Functions ---

const getRandomPosition = (existingPositions: { x: number; y: number }[], attempt = 0): { x: number; y: number } => {
    const MAX_ATTEMPTS = 10;
    const MARGIN = 30; // Minimum distance between cells initially

    const x = Math.random() * (GRID_SIZE - MARGIN * 2) + MARGIN;
    const y = Math.random() * (GRID_SIZE - MARGIN * 2) + MARGIN;

    if (attempt >= MAX_ATTEMPTS) {
        console.warn("Max attempts reached for finding unique position, placing randomly.");
        return { x, y };
    }

    for (const pos of existingPositions) {
        const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
        if (distance < MARGIN) {
        return getRandomPosition(existingPositions, attempt + 1);
        }
    }
    return { x, y };
};

const getClonedPosition = (parentPos: { x: number; y: number }, existingPositions: { x: number; y: number }[]): { x: number; y: number } => {
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const ANGLE_STEP = Math.PI / 8; // Try different angles

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const angle = Math.random() * 2 * Math.PI;
        const distance = CLONE_DISTANCE_THRESHOLD + Math.random() * 20; // Place slightly further than threshold
        const newX = parentPos.x + Math.cos(angle) * distance;
        const newY = parentPos.y + Math.sin(angle) * distance;

        // Clamp position within bounds
        const clampedX = Math.max(10, Math.min(GRID_SIZE - 10, newX));
        const clampedY = Math.max(10, Math.min(GRID_SIZE - 10, newY));

        let tooClose = false;
        for (const pos of existingPositions) {
            const dist = Math.sqrt(Math.pow(pos.x - clampedX, 2) + Math.pow(pos.y - clampedY, 2));
            if (dist < CLONE_DISTANCE_THRESHOLD / 2) { // Don't overlap too much
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            return { x: clampedX, y: clampedY };
        }
    }

    console.warn("Could not find suitable clone position, placing near parent.");
    return { x: parentPos.x + 5, y: parentPos.y + 5 }; // Fallback
};


const addHistoryEntry = (cell: Cell, type: HistoryEntry['type'], text: string) => {
    const seq = cell.history.length > 0 ? cell.history[cell.history.length - 1].seq + 1 : 0;
    cell.history.push({
        seq,
        type,
        age: cell.age,
        text,
        timestamp: Date.now(),
    });
    cell.version += 1; // Increment version on history change
};

// --- Store Definition ---

interface NetworkActions {
  initializeNetwork: (count: number) => void;
  setPurpose: (purpose: string) => Promise<void>;
  tick: () => void;
  addCell: (parentCellId?: CellId) => void;
  removeCell: (cellId: CellId) => void;
  sendMessage: (sourceId: CellId | 'user', targetId: CellId | 'broadcast' | 'user', content: string) => Promise<void>;
  getCellById: (cellId: CellId) => Cell | undefined;
  getNeighbors: (cellId: CellId, radius?: number) => Cell[];
  selectCell: (cellId: CellId | null) => void; // For UI selection
  clearMessages: () => void;
  askForHelp: (requestingCellId: CellId, requestText: string) => Promise<void>;
  moveCells: () => void;
  // Placeholder for DB interactions - implement later if needed
  // saveCellDb: (cellId: CellId) => void;
  // loadCellDb: (cellId: CellId) => void;
}

type NetworkStore = NetworkState & NetworkActions & {
  selectedCellId: CellId | null;
};

export const useNetworkStore = create(
  immer<NetworkStore>((set, get) => ({
    // --- State ---
    cells: {},
    messages: [],
    tickCount: 0,
    purpose: 'Simulate a basic cellular network.',
    selectedCellId: null,

    // --- Actions ---
    initializeNetwork: (count) => {
      set((state) => {
        state.cells = {};
        state.messages = [];
        state.tickCount = 0;
        state.selectedCellId = null;
        const initialPositions: { x: number; y: number }[] = [];
        for (let i = 0; i < count && i < MAX_CELLS; i++) {
          const id = nanoid(8);
          const position = getRandomPosition(initialPositions);
          initialPositions.push(position);
          const newCell: Cell = {
            id,
            age: 0,
            expertise: 'General',
            goal: 'Survive and learn',
            position,
            isAlive: true,
            version: 1,
            likedCells: [],
            history: [],
            // db: {}, // Initialize in-memory db placeholder
          };
          addHistoryEntry(newCell, 'init', `Initialized with expertise: ${newCell.expertise}, goal: ${newCell.goal}`);
          state.cells[id] = newCell;
        }
      });
      // Optionally set initial purpose after initialization
      // get().setPurpose(get().purpose);
    },

    setPurpose: async (purpose) => {
        if (!purpose) return;
        set(state => { state.purpose = purpose });
        try {
            const input: CellPurposeUnderstandingInput = { purpose };
            // Call AI - Note: In a real app, handle potential errors gracefully
            const result: CellPurposeUnderstandingOutput = await cellPurposeUnderstanding(input);

            set(state => {
                state.purpose = purpose; // Update purpose again in case of async delay
                // Apply initialization instructions (simplified example)
                // In a real scenario, parse 'result.initializationInstructions' more robustly
                const instructions = result.initializationInstructions.toLowerCase();
                Object.values(state.cells).forEach(cell => {
                    if (!cell.isAlive) return;
                    let updated = false;
                    // Simple keyword matching for demonstration
                    if (instructions.includes('data analysis')) {
                        cell.expertise = 'Data Analysis';
                        cell.goal = 'Analyze incoming data streams';
                        updated = true;
                    } else if (instructions.includes('communication') || instructions.includes('routing')) {
                        cell.expertise = 'Communication Hub';
                        cell.goal = 'Facilitate message routing';
                        updated = true;
                    } else {
                        // Default if no specific instruction matches
                        cell.expertise = 'General Purpose';
                        cell.goal = 'Contribute to network goals';
                        // updated = true; // Only log if changed
                    }
                    if(updated) {
                        addHistoryEntry(cell, 'decision', `Purpose updated. New Expertise: ${cell.expertise}, Goal: ${cell.goal}`);
                    }
                });
                console.log("Applied AI Purpose Initialization:", result.initializationInstructions);
            });
        } catch (error) {
            console.error("Error setting purpose with AI:", error);
            // Handle error (e.g., show a message to the user)
        }
    },

    tick: () => {
      set((state) => {
        state.tickCount += 1;
        Object.values(state.cells).forEach((cell) => {
          if (cell.isAlive) {
            cell.age += 1;
            if (cell.age > MAX_AGE) {
              cell.isAlive = false;
              addHistoryEntry(cell, 'death', `Died of old age (${cell.age}).`);
              // Placeholder: Trigger DB save to file here
              // state.saveCellDb(cell.id);
              console.log(`Cell ${cell.id} died. DB path: ${cell.dbFilePath}`);
            } else {
              // Simple periodic "decision" for demonstration
              if (state.tickCount % 10 === 0) {
                 addHistoryEntry(cell, 'decision', `Reached age ${cell.age}. Still alive.`);
              }
              // Clone logic (example: clone every 20 ticks if conditions met)
              if (cell.age > 10 && cell.age % 20 === 0 && Object.keys(state.cells).length < MAX_CELLS) {
                  // Check if any liked cell is nearby for potential cloning trigger (optional)
                  // const neighbors = get().getNeighbors(cell.id, 50);
                  // const likedNeighborNearby = neighbors.some(n => cell.likedCells.includes(n.id));
                  // if(likedNeighborNearby) { ... }

                  // Directly clone for simplicity
                  get().addCell(cell.id);
              }
            }
          }
        });
        // Clear old messages (optional)
        // state.messages = state.messages.filter(msg => Date.now() - msg.timestamp < 10000); // Keep for 10s

        // Move cells towards liked cells
        state.moveCells();
      });
    },

    addCell: (parentCellId?: CellId) => {
        if (Object.keys(get().cells).length >= MAX_CELLS) {
            console.warn("Max cell limit reached. Cannot add new cell.");
            return;
        }
        set(state => {
            const newCellId = nanoid(8);
            const parentCell = parentCellId ? state.cells[parentCellId] : undefined;
            const existingPositions = Object.values(state.cells).map(c => c.position);
            const position = parentCell
                ? getClonedPosition(parentCell.position, existingPositions)
                : getRandomPosition(existingPositions);

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: parentCell ? parentCell.expertise : 'General', // Inherit expertise
                goal: parentCell ? parentCell.goal : 'Survive and learn', // Inherit goal
                position,
                isAlive: true,
                version: 1,
                likedCells: parentCell ? [...parentCell.likedCells] : [], // Inherit liked cells (optional)
                history: [],
                // db: {}, // Initialize DB
            };

            const initReason = parentCell
                ? `Cloned from Cell ${parentCellId}. Inherited Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`
                : `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`;
            addHistoryEntry(newCell, parentCell ? 'clone' : 'init', initReason);


            if (parentCell) {
                 addHistoryEntry(parentCell, 'clone', `Cloned itself. New cell ID: ${newCellId}`);
                 // Optionally, make the parent like the child and vice-versa
                 if (!parentCell.likedCells.includes(newCellId)) {
                    parentCell.likedCells.push(newCellId);
                    parentCell.version +=1;
                 }
                 if (!newCell.likedCells.includes(parentCellId)) {
                     newCell.likedCells.push(parentCellId);
                     newCell.version += 1;
                 }

            }

            state.cells[newCellId] = newCell;
            console.log(`Added cell ${newCellId} ${parentCell ? 'cloned from ' + parentCellId : ''}`);
        });
    },

    removeCell: (cellId) => {
      set((state) => {
        if (state.cells[cellId]) {
          // Trigger DB save before deleting (if alive)
          if (state.cells[cellId].isAlive) {
             // state.saveCellDb(cellId);
             console.log(`Saving DB for cell ${cellId} before manual removal.`);
          }
          delete state.cells[cellId];
          if (state.selectedCellId === cellId) {
            state.selectedCellId = null;
          }
          // Optional: Remove from likedCells lists of other cells
          Object.values(state.cells).forEach(cell => {
              const index = cell.likedCells.indexOf(cellId);
              if (index > -1) {
                  cell.likedCells.splice(index, 1);
                  cell.version += 1;
              }
          });
        }
      });
    },

    sendMessage: async (sourceId, targetId, content) => {
        const messageId = nanoid();
        const timestamp = Date.now();
        let route: CellId[] | undefined = undefined;
        let finalTargetId = targetId;

        if (sourceId === 'user' && targetId !== 'broadcast' && targetId !== 'user') {
            // User sending to a specific cell - Use AI to route
            const sourceCell = Object.values(get().cells).find(c => c.isAlive); // Find any live cell as entry point
            if (!sourceCell) {
                console.error("No live cells to start routing from.");
                return; // Or handle appropriately
            }
             try {
                const input: RouteMessageInput = {
                    message: content,
                    targetCellId: targetId,
                    currentCellId: sourceCell.id, // Start routing from an arbitrary live cell
                    cellExpertise: Object.fromEntries(Object.values(get().cells).filter(c => c.isAlive).map(c => [c.id, c.expertise])),
                    cellConnections: get().getCellConnections(), // Need a way to get connections
                    networkCondition: "Normal", // Example
                };
                const result: RouteMessageOutput = await routeMessage(input);
                route = result.route;
                console.log("AI Route:", route, "Reason:", result.reasoning);
                // If AI provides a route, we might adjust the initial message target?
                // For now, just log it and send the original message.
                // A more complex system might send intermediary messages along the route.
            } catch (error) {
                console.error("Error routing message with AI:", error);
                 // Fallback to direct message or broadcast if routing fails?
            }
        }


        const newMessage: Message = {
            id: messageId,
            sourceCellId: sourceId,
            targetCellId: finalTargetId,
            content,
            timestamp,
            route,
        };

        set(state => {
            state.messages.push(newMessage);

             // Log message in relevant cell histories
             if (sourceId !== 'user' && state.cells[sourceId]) {
                 addHistoryEntry(state.cells[sourceId], 'message', `Sent: "${content}" to ${finalTargetId}`);
             }
             if (finalTargetId === 'broadcast') {
                 Object.values(state.cells).forEach(cell => {
                     if (cell.isAlive && cell.id !== sourceId) {
                         addHistoryEntry(cell, 'message', `Received broadcast from ${sourceId}: "${content}"`);
                         // Simple reaction: like the sender if broadcast is positive (example)
                         if (content.toLowerCase().includes('good') || content.toLowerCase().includes('help')) {
                             if (sourceId !== 'user' && !cell.likedCells.includes(sourceId)) {
                                 cell.likedCells.push(sourceId);
                                 addHistoryEntry(cell, 'decision', `Liked cell ${sourceId} due to broadcast.`);
                             }
                         }
                     }
                 });
             } else if (finalTargetId !== 'user' && state.cells[finalTargetId]?.isAlive) {
                 addHistoryEntry(state.cells[finalTargetId], 'message', `Received from ${sourceId}: "${content}"`);
                 // Simple reaction: like the sender if message is positive
                 if (sourceId !== 'user' && (content.toLowerCase().includes('thank') || content.toLowerCase().includes('helpful'))) {
                      if (!state.cells[finalTargetId].likedCells.includes(sourceId)) {
                          state.cells[finalTargetId].likedCells.push(sourceId);
                          addHistoryEntry(state.cells[finalTargetId], 'decision', `Liked cell ${sourceId} due to message.`);
                      }
                 }
             }
        });

         // Simulate message delivery delay and removal (optional)
         setTimeout(() => {
             get().clearMessages(); // Clear after a delay for visualization
         }, 3000); // Remove message visualization after 3 seconds
    },

    askForHelp: async (requestingCellId: CellId, requestText: string) => {
      const requestingCell = get().getCellById(requestingCellId);
      if (!requestingCell || !requestingCell.isAlive) return;

      const neighbors = get().getNeighbors(requestingCellId, 150); // Check neighbors within a radius
      const neighborExpertise = neighbors
        .filter(n => n.isAlive)
        .map(n => ({ cellId: n.id, expertise: n.expertise }));

      if (neighborExpertise.length === 0) {
          addHistoryEntry(requestingCell, 'decision', `Tried to ask for help: "${requestText}", but no neighbors found.`);
          console.log(`Cell ${requestingCellId} asked for help, but no neighbors.`);
          return;
      }

      addHistoryEntry(requestingCell, 'message', `Asking neighbors for help: "${requestText}"`);

      try {
        const input: CellHelpRequestInterpretationInput = {
            cellId: requestingCellId,
            requestText,
            neighboringCellExpertise: neighborExpertise,
        };
        // Call AI to find relevant neighbors
        const result: CellHelpRequestInterpretationOutput = await cellHelpRequestInterpretation(input);
        addHistoryEntry(requestingCell, 'decision', `AI suggested neighbors for help (${result.relevantExpertise.length}): ${result.reasoning}`);
        console.log(`Cell ${requestingCellId} help request interpreted by AI:`, result);


        // Send targeted messages to relevant neighbors identified by AI
        if (result.relevantExpertise.length > 0) {
            result.relevantExpertise.forEach(expert => {
                get().sendMessage(requestingCellId, expert.cellId, `Need help with: ${requestText}. Your expertise in '${expert.expertise}' might be relevant.`);
                 // Requesting cell "likes" the helpful neighbor
                 set(state => {
                     const cell = state.cells[requestingCellId];
                     if (cell && !cell.likedCells.includes(expert.cellId)) {
                         cell.likedCells.push(expert.cellId);
                         addHistoryEntry(cell, 'decision', `Liked cell ${expert.cellId} for potential help.`);
                     }
                 })
            });
        } else {
            // Fallback: Broadcast if AI finds no specific expertise
            addHistoryEntry(requestingCell, 'decision', `No specific expertise found nearby, broadcasting help request.`);
            get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
        }

      } catch (error) {
          console.error("Error interpreting help request with AI:", error);
          addHistoryEntry(requestingCell, 'decision', `Error asking AI for help. Broadcasting request.`);
          // Fallback: Broadcast if AI fails
          get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
      }
    },


    moveCells: () => {
        set(state => {
            Object.values(state.cells).forEach(cell => {
                if (!cell.isAlive || cell.likedCells.length === 0) return;

                let targetX = 0;
                let targetY = 0;
                let likedCount = 0;

                cell.likedCells.forEach(likedId => {
                    const likedCell = state.cells[likedId];
                    // Only move towards alive liked cells
                    if (likedCell && likedCell.isAlive) {
                        targetX += likedCell.position.x;
                        targetY += likedCell.position.y;
                        likedCount++;
                    } else {
                        // Optional: Remove dead cells from liked list implicitly
                        // queueMicrotask(() => {
                        //     set(s => {
                        //         const currentCell = s.cells[cell.id];
                        //         if (currentCell) {
                        //             currentCell.likedCells = currentCell.likedCells.filter(id => id !== likedId);
                        //             currentCell.version++;
                        //         }
                        //     });
                        // });
                    }
                });

                if (likedCount > 0) {
                    targetX /= likedCount;
                    targetY /= likedCount;

                    const dx = targetX - cell.position.x;
                    const dy = targetY - cell.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Only move if not already very close
                    if (distance > MOVE_STEP * 1.5) { // Don't jitter if already close
                        const moveX = (dx / distance) * MOVE_STEP;
                        const moveY = (dy / distance) * MOVE_STEP;

                        const newX = cell.position.x + moveX;
                        const newY = cell.position.y + moveY;

                         // Clamp position within bounds
                        cell.position.x = Math.max(10, Math.min(GRID_SIZE - 10, newX));
                        cell.position.y = Math.max(10, Math.min(GRID_SIZE - 10, newY));
                        cell.version += 1; // Position change updates version
                    }
                }
                 // Clean up likedCells list - remove references to dead or non-existent cells
                 const originalLikedCount = cell.likedCells.length;
                 cell.likedCells = cell.likedCells.filter(id => state.cells[id]?.isAlive);
                 if (cell.likedCells.length !== originalLikedCount) {
                     cell.version += 1;
                 }
            });
        });
    },


    getCellById: (cellId) => {
      return get().cells[cellId];
    },

    getNeighbors: (cellId, radius = 100) => {
      const cell = get().getCellById(cellId);
      if (!cell) return [];
      const { x, y } = cell.position;
      return Object.values(get().cells).filter((otherCell) => {
        if (otherCell.id === cellId) return false; // Don't include self
        const dx = otherCell.position.x - x;
        const dy = otherCell.position.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= radius;
      });
    },

    selectCell: (cellId) => {
      set({ selectedCellId: cellId });
    },

    clearMessages: () => {
       set(state => { state.messages = [] });
    },

     // Helper to get connections for AI routing (simplified: assumes direct connection if close)
     getCellConnections: (): Record<CellId, CellId[]> => {
        const connections: Record<CellId, CellId[]> = {};
        const allCells = Object.values(get().cells);
        const connectionRadius = 150; // Cells within this radius are considered "connected"

        allCells.forEach(cell => {
            if (!cell.isAlive) return;
            connections[cell.id] = get().getNeighbors(cell.id, connectionRadius)
                                       .filter(n => n.isAlive)
                                       .map(n => n.id);
        });
        return connections;
     },


    // --- DB Placeholders ---
    // saveCellDb: (cellId) => {
    //   set(state => {
    //     const cell = state.cells[cellId];
    //     if (cell) {
    //       // In a real app, this would involve serializing the DB state
    //       // and writing it to a file using Node.js 'fs' or similar.
    //       // This requires backend logic or Electron.
    //       const filePath = `./cell_${cell.id}_v${cell.version}_age${cell.age}.sqlite`;
    //       cell.dbFilePath = filePath;
    //       console.log(`Placeholder: Saving DB for cell ${cellId} to ${filePath}`);
    //       // Actual saving logic would go here.
    //       // For example: const serializedData = JSON.stringify(cell.db); fs.writeFileSync(filePath, serializedData);
    //       addHistoryEntry(cell, 'decision', `Persisted state to ${filePath}`);
    //     }
    //   });
    // },
    // loadCellDb: (cellId) => {
    //     const cell = get().getCellById(cellId);
    //      if (cell && cell.dbFilePath) {
    //         console.log(`Placeholder: Loading DB for cell ${cellId} from ${cell.dbFilePath}`);
    //         // Actual loading logic here
    //         // Example: const data = fs.readFileSync(cell.dbFilePath); const dbState = JSON.parse(data);
    //         // set(state => { state.cells[cellId].db = dbState; });
    //      } else {
    //          console.log(`No DB file path found for cell ${cellId} or cell doesn't exist.`);
    //      }
    // },

  })),
  {
    name: 'network-store', // name for devtools
  }
);

// --- Initialize with a few cells ---
useNetworkStore.getState().initializeNetwork(5);

// --- Auto-tick interval ---
let tickInterval: NodeJS.Timeout | null = null;

export const startAutoTick = (intervalMs = 2000) => {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    useNetworkStore.getState().tick();
  }, intervalMs);
  console.log("Auto-tick started");
};

export const stopAutoTick = () => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log("Auto-tick stopped");
  }
};

// Start ticking automatically when the store is loaded
startAutoTick();

// --- Subscribe to changes (optional, for debugging) ---
useNetworkStore.subscribe(
  (state) => state.cells, // Subscribe only to cells changes
  (cells, previousCells) => {
    // console.log('Cells changed:', cells);
  }
);
useNetworkStore.subscribe(
    (state) => state.messages,
    (messages) => {
        if (messages.length > 0) {
            // console.log('New messages:', messages);
        }
    }
)
