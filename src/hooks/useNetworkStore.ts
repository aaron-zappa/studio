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

// Predefined roles for initialization
const predefinedRoles = [
    { expertise: 'Data Collector', goal: 'Gather information from the network' },
    { expertise: 'Analyzer', goal: 'Process and interpret collected data' },
    { expertise: 'Router', goal: 'Direct messages efficiently to their destination' },
    { expertise: 'Communicator', goal: 'Share findings and insights with other cells' },
    { expertise: 'Memory Unit', goal: 'Store and retrieve important information' },
    { expertise: 'Coordinator', goal: 'Orchestrate tasks among specialized cells' },
    { expertise: 'Security Monitor', goal: 'Detect anomalies and potential threats' },
];


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
    // Prevent excessively long history arrays
    const MAX_HISTORY = 100;
    if (cell.history.length >= MAX_HISTORY) {
        cell.history.shift(); // Remove the oldest entry
    }

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
  getCellConnections: () => Record<CellId, CellId[]>; // Added definition here
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
          const role = predefinedRoles[i % predefinedRoles.length]; // Assign roles cyclically
          const newCell: Cell = {
            id,
            age: 0,
            expertise: role.expertise, // Assign unique expertise
            goal: role.goal,           // Assign unique goal
            position,
            isAlive: true,
            version: 1,
            likedCells: [],
            history: [],
            // db: {}, // Initialize in-memory db placeholder
          };
          addHistoryEntry(newCell, 'init', `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`);
          state.cells[id] = newCell;
        }
        // Update overall purpose based on initialized cells (optional)
        // state.purpose = `Network initialized with cells focused on: ${predefinedRoles.slice(0, count).map(r => r.expertise).join(', ')}`;
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
                let roleIndex = 0;
                Object.values(state.cells).forEach(cell => {
                    if (!cell.isAlive) return;
                    let updated = false;
                     // Use AI instructions to guide role assignment, fallback to cycling predefined roles
                    if (instructions.includes('data analysis') && roleIndex === 0) {
                        cell.expertise = 'Data Analysis'; cell.goal = 'Analyze incoming data streams'; updated = true;
                    } else if ((instructions.includes('communication') || instructions.includes('routing')) && roleIndex === 1) {
                        cell.expertise = 'Communication Hub'; cell.goal = 'Facilitate message routing'; updated = true;
                    } else if (instructions.includes('memory') && roleIndex === 2) {
                        cell.expertise = 'Memory Unit'; cell.goal = 'Store critical information'; updated = true;
                    } else {
                         // Fallback to cycling through predefined roles if instructions are vague or already used
                         const assignedRole = predefinedRoles[roleIndex % predefinedRoles.length];
                         if(cell.expertise !== assignedRole.expertise || cell.goal !== assignedRole.goal) {
                             cell.expertise = assignedRole.expertise;
                             cell.goal = assignedRole.goal;
                             updated = true;
                         }
                    }
                     roleIndex++;

                    if(updated) {
                        addHistoryEntry(cell, 'decision', `Purpose updated. New Expertise: ${cell.expertise}, Goal: ${cell.goal}`);
                    }
                });
                console.log("Applied AI Purpose Initialization:", result.initializationInstructions);
            });
        } catch (error) {
            console.error("Error setting purpose with AI:", error);
            // Handle error (e.g., show a message to the user)
            // Fallback: assign roles manually if AI fails
            set(state => {
                 let roleIndex = 0;
                 Object.values(state.cells).forEach(cell => {
                     if (!cell.isAlive) return;
                     const assignedRole = predefinedRoles[roleIndex % predefinedRoles.length];
                      if(cell.expertise !== assignedRole.expertise || cell.goal !== assignedRole.goal) {
                           cell.expertise = assignedRole.expertise;
                           cell.goal = assignedRole.goal;
                          addHistoryEntry(cell, 'decision', `AI failed. Assigned Expertise: ${cell.expertise}, Goal: ${cell.goal}`);
                      }
                     roleIndex++;
                 });
            });
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
              console.log(`Cell ${cell.id} died.`);
            } else {
              // Simple periodic "decision" for demonstration
              if (state.tickCount % 20 === 0 && Math.random() < 0.1) { // Reduced frequency
                 addHistoryEntry(cell, 'decision', `Internal check at age ${cell.age}. Status: OK.`);
              }
              // Clone logic (example: clone every 25 ticks if conditions met and space available)
              if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) { // Reduced chance
                  get().addCell(cell.id);
              }
            }
          }
        });
        // Clear old messages (optional, maybe clear based on count instead of time)
         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }

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

            // Assign a role to the new cell, try not to duplicate expertise too much initially if random
            const role = parentCell
                ? { expertise: parentCell.expertise, goal: parentCell.goal } // Clones inherit parent's role
                : predefinedRoles[Object.keys(state.cells).length % predefinedRoles.length]; // Cycle for new random cells

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: role.expertise,
                goal: role.goal,
                position,
                isAlive: true,
                version: 1,
                likedCells: parentCell ? [parentCellId] : [], // Clones initially like their parent
                history: [],
                // db: {}, // Initialize DB
            };

            const initReason = parentCell
                ? `Cloned from Cell ${parentCellId}. Inherited Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`
                : `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`;
            addHistoryEntry(newCell, parentCell ? 'clone' : 'init', initReason);


            if (parentCell) {
                 addHistoryEntry(parentCell, 'clone', `Cloned itself. New cell ID: ${newCellId}`);
                 // Optionally, make the parent like the child
                 if (!parentCell.likedCells.includes(newCellId)) {
                    parentCell.likedCells.push(newCellId);
                    parentCell.version +=1;
                 }
            }

            state.cells[newCellId] = newCell;
            console.log(`Added cell ${newCellId} ${parentCell ? 'cloned from ' + parentCellId : ''} with role ${role.expertise}`);
        });
    },

    removeCell: (cellId) => {
      set((state) => {
        if (state.cells[cellId]) {
          // Trigger DB save before deleting (if alive)
          if (state.cells[cellId].isAlive) {
             // state.saveCellDb(cellId);
             // console.log(`Saving DB for cell ${cellId} before manual removal.`);
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
        let reasoning = "Direct message.";

        const allCells = get().cells;
        const cellExpertise = Object.fromEntries(
            Object.values(allCells).filter(c => c.isAlive).map(c => [c.id, c.expertise])
        );
        const cellConnections = get().getCellConnections();


        // --- AI Routing Logic ---
        // Use AI routing if the source is 'user' sending to a specific cell,
        // or if a cell sends a complex message (could be refined)
        const needsRouting = (sourceId === 'user' && targetId !== 'broadcast' && targetId !== 'user') ||
                             (sourceId !== 'user' && content.length > 50); // Example: Route longer messages

        if (needsRouting && targetId !== 'broadcast' && targetId !== 'user') {
            const startCellId = (sourceId === 'user')
                ? Object.values(allCells).find(c => c.isAlive)?.id // Find any live cell as entry point for user messages
                : sourceId;

            if (!startCellId || !allCells[startCellId]?.isAlive) {
                console.error("Cannot route message: No valid starting cell found.");
                // Potentially fallback to broadcast or error message
                 set(state => {
                    state.messages.push({ id: messageId, sourceCellId: sourceId, targetCellId: 'user', content: `Error: Could not find route for message to ${targetId}`, timestamp });
                 });
                return;
            }

            try {
                const input: RouteMessageInput = {
                    message: content,
                    targetCellId: targetId,
                    currentCellId: startCellId,
                    cellExpertise: cellExpertise,
                    cellConnections: cellConnections,
                    networkCondition: "Normal", // Example
                };
                const result: RouteMessageOutput = await routeMessage(input);
                route = result.route;
                reasoning = result.reasoning;
                console.log(`AI Route from ${startCellId} to ${targetId}:`, route, "Reason:", reasoning);

                 // --- Message Handling based on Route ---
                 // If AI provides a route, send messages sequentially along the route
                 if (route && route.length > 1) {
                     const initialSource = sourceId === 'user' ? route[0] : sourceId; // User message starts at first hop
                     const finalDestination = route[route.length - 1];

                     // Add the initial message to the queue (will be visualized)
                     set(state => {
                         state.messages.push({
                             id: messageId,
                             sourceCellId: sourceId, // Keep original source for display
                             targetCellId: finalDestination, // Show final target
                             content: content,
                             timestamp,
                             route: route, // Include the calculated route
                         });
                         // Log initial sending action
                         if (sourceId !== 'user' && state.cells[sourceId]) {
                              addHistoryEntry(state.cells[sourceId], 'message', `Sent (via route): "${content}" towards ${finalDestination}. AI Reason: ${reasoning}`);
                         }
                     });

                      // Simulate sending along the path (logging in each cell)
                      for (let i = 0; < route.length - 1; i++) {
                          const hopSourceId = route[i];
                          const hopTargetId = route[i+1];
                          set(state => {
                              const hopSourceCell = state.cells[hopSourceId];
                              const hopTargetCell = state.cells[hopTargetId];
                              if (hopSourceCell?.isAlive) {
                                  addHistoryEntry(hopSourceCell, 'message', `Relaying message "${content.substring(0, 20)}..." to ${hopTargetId}`);
                              }
                               if (hopTargetCell?.isAlive) {
                                  addHistoryEntry(hopTargetCell, 'message', `Received message "${content.substring(0, 20)}..." from ${hopSourceId}`);
                                  // Final destination handling
                                  if (i === route.length - 2) {
                                       handleMessageReception(hopTargetCell, hopSourceId, content); // Handle final reception
                                  }
                              }
                          });
                      }
                      // Routing handled, exit early
                      setTimeout(() => get().clearMessages(), 3000); // Clear visualization after delay
                      return;
                 } else {
                     // AI routing failed or returned direct path, proceed with direct message
                     console.log("AI routing resulted in direct message or failed.");
                     reasoning = route ? result.reasoning : "AI routing failed, sending directly.";
                 }

            } catch (error) {
                console.error("Error routing message with AI:", error);
                reasoning = "AI routing error, sending directly.";
                 // Fallback to direct message if routing fails
            }
        }

        // --- Direct Message or Broadcast Handling (No AI Route or Fallback) ---
        const newMessage: Message = {
            id: messageId,
            sourceCellId: sourceId,
            targetCellId: finalTargetId,
            content,
            timestamp,
            // No route info for direct sends
        };

        set(state => {
            state.messages.push(newMessage);

             // Log message in source cell history
             if (sourceId !== 'user' && state.cells[sourceId]) {
                 addHistoryEntry(state.cells[sourceId], 'message', `Sent: "${content}" to ${finalTargetId}. Reason: ${reasoning}`);
             }

             // Handle reception in target cell(s)
             if (finalTargetId === 'broadcast') {
                 Object.values(state.cells).forEach(cell => {
                     if (cell.isAlive && cell.id !== sourceId) {
                         addHistoryEntry(cell, 'message', `Received broadcast from ${sourceId}: "${content}"`);
                         handleMessageReception(cell, sourceId, content);
                     }
                 });
             } else if (finalTargetId !== 'user' && state.cells[finalTargetId]?.isAlive) {
                 const targetCell = state.cells[finalTargetId];
                 addHistoryEntry(targetCell, 'message', `Received from ${sourceId}: "${content}"`);
                 handleMessageReception(targetCell, sourceId, content);
             } else if (finalTargetId === 'user') {
                // Log message intended for the user interface (e.g., display in a chat window)
                console.log(`Message to User from ${sourceId}: ${content}`);
                // Potentially push to a dedicated 'userMessages' state array?
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
                         cell.version++; // Update version for likedCells change
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
                if (!cell.isAlive) return; // Dead cells don't move

                let avgX = 0, avgY = 0, count = 0;
                let repulsionX = 0, repulsionY = 0;
                const REPULSION_RADIUS = 40;
                const REPULSION_STRENGTH = 0.5;

                // Attraction to liked cells
                cell.likedCells.forEach(likedId => {
                    const likedCell = state.cells[likedId];
                    if (likedCell?.isAlive) {
                        avgX += likedCell.position.x;
                        avgY += likedCell.position.y;
                        count++;
                    }
                });

                 // Repulsion from all nearby cells
                 Object.values(state.cells).forEach(otherCell => {
                    if (otherCell.id === cell.id || !otherCell.isAlive) return;
                     const dx = cell.position.x - otherCell.position.x;
                     const dy = cell.position.y - otherCell.position.y;
                     const dist = Math.sqrt(dx * dx + dy * dy);

                     if (dist < REPULSION_RADIUS && dist > 0) {
                         const force = REPULSION_STRENGTH * (REPULSION_RADIUS - dist) / dist;
                         repulsionX += dx * force;
                         repulsionY += dy * force;
                     }
                 });


                let moveX = repulsionX;
                let moveY = repulsionY;
                let moved = false;

                if (count > 0) {
                    avgX /= count;
                    avgY /= count;
                    const attractDX = avgX - cell.position.x;
                    const attractDY = avgY - cell.position.y;
                    const attractDist = Math.sqrt(attractDX * attractDX + attractDY * attractDY);

                    if (attractDist > MOVE_STEP) { // Only attract if not too close
                         moveX += (attractDX / attractDist) * MOVE_STEP;
                         moveY += (attractDY / attractDist) * MOVE_STEP;
                         moved = true;
                    }
                }

                // Apply combined movement if repulsion occurred or attraction target is far enough
                 if (moved || repulsionX !== 0 || repulsionY !== 0) {
                      // Limit total movement speed
                     const totalMoveDist = Math.sqrt(moveX * moveX + moveY * moveY);
                     if (totalMoveDist > MOVE_STEP) {
                         moveX = (moveX / totalMoveDist) * MOVE_STEP;
                         moveY = (moveY / totalMoveDist) * MOVE_STEP;
                     }

                     const newX = cell.position.x + moveX;
                     const newY = cell.position.y + moveY;

                     cell.position.x = Math.max(10, Math.min(GRID_SIZE - 10, newX));
                     cell.position.y = Math.max(10, Math.min(GRID_SIZE - 10, newY));
                     cell.version += 1;
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
      // Ensure we return a plain object copy if needed by consumers,
      // but internal Immer mutations work directly on the draft state.
      const cell = get().cells[cellId];
      // return cell ? { ...cell, history: [...cell.history], likedCells: [...cell.likedCells] } : undefined;
       return cell; // Immer handles immutability, returning direct ref is usually fine
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
       // .map(c => ({...c})); // Return copies if needed outside the store
    },

    selectCell: (cellId) => {
      set({ selectedCellId: cellId });
    },

    clearMessages: () => {
       // Only clear messages older than a certain time (e.g., 3 seconds for visualization)
       const now = Date.now();
       const expirationTime = 3000;
       set(state => {
           state.messages = state.messages.filter(msg => (now - msg.timestamp) < expirationTime);
       });
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
    // saveCellDb: (cellId) => { ... },
    // loadCellDb: (cellId) => { ... },

  })),
  {
    name: 'network-store', // name for devtools
  }
);


// --- Internal Helper for Message Handling ---
const handleMessageReception = (targetCell: Cell, sourceId: CellId | 'user', content: string) => {
     // Simple "purpose?" query handling
     if (content.toLowerCase().trim() === 'purpose?') {
         const response = `My purpose is: ${targetCell.goal} (Expertise: ${targetCell.expertise})`;
         addHistoryEntry(targetCell, 'message', `Responding to purpose query from ${sourceId}.`);
         // Send response back to source (or user)
         useNetworkStore.getState().sendMessage(targetCell.id, sourceId, response);
         return; // Don't process further if it was just a purpose query
     }


    // Generic positive/negative reaction (example)
    const lowerContent = content.toLowerCase();
    if (sourceId !== 'user') { // Cells don't react emotionally to the 'user'
        if (lowerContent.includes('thank') || lowerContent.includes('helpful') || lowerContent.includes('good job')) {
            if (!targetCell.likedCells.includes(sourceId)) {
                targetCell.likedCells.push(sourceId);
                addHistoryEntry(targetCell, 'decision', `Liked cell ${sourceId} due to positive message.`);
                targetCell.version++;
            }
        } else if (lowerContent.includes('error') || lowerContent.includes('failed') || lowerContent.includes('bad')) {
            const index = targetCell.likedCells.indexOf(sourceId);
            if (index > -1) {
                targetCell.likedCells.splice(index, 1);
                addHistoryEntry(targetCell, 'decision', `Disliked cell ${sourceId} due to negative message.`);
                targetCell.version++;
            }
        }
    }

    // Potentially trigger other actions based on message content and cell expertise/goal...
    // e.g., if expertise is 'Analyzer' and message contains 'data:', trigger analysis
};


// --- Initialize with a few cells ---
useNetworkStore.getState().initializeNetwork(7); // Start with 7 cells for role diversity

// --- Auto-tick interval ---
let tickInterval: NodeJS.Timeout | null = null;

export const startAutoTick = (intervalMs = 1500) => { // Slightly faster tick
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
// useNetworkStore.subscribe(
//   (state) => state.cells, // Subscribe only to cells changes
//   (cells, previousCells) => {
//     // console.log('Cells changed:', cells);
//   }
// );
// useNetworkStore.subscribe(
//     (state) => state.messages,
//     (messages) => {
//         if (messages.length > 0) {
//             // console.log('New messages:', messages);
//         }
//     }
// )
