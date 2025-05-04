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
    { expertise: 'Data Collector', goal: 'Gather information from sensors and network messages' },
    { expertise: 'Data Analyzer', goal: 'Process raw data to find patterns and anomalies' },
    { expertise: 'Task Router', goal: 'Direct incoming tasks to the appropriate specialist cell' },
    { expertise: 'Network Communicator', goal: 'Relay important findings between cell groups' },
    { expertise: 'Long-Term Memory', goal: 'Store and retrieve historical data for context' },
    { expertise: 'System Coordinator', goal: 'Oversee network health and resource allocation' },
    { expertise: 'Security Monitor', goal: 'Detect and report potential intrusions or malfunctions' },
    { expertise: 'Resource Allocator', goal: 'Distribute energy or computational resources efficiently'},
    { expertise: 'Predictive Modeler', goal: 'Forecast future network states based on current trends'},
    { expertise: 'User Interface Liaison', goal: 'Format data and responses for user interaction'},
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
    if (!cell) return; // Guard against null cell references
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
        const numCells = Math.min(count, MAX_CELLS, predefinedRoles.length); // Ensure we don't exceed max cells or roles

        for (let i = 0; i < numCells; i++) {
          const id = nanoid(8);
          const position = getRandomPosition(initialPositions);
          initialPositions.push(position);
          const role = predefinedRoles[i]; // Assign roles sequentially from the unique list
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
         // Update overall purpose based on initialized cells
         state.purpose = `Network initialized with ${numCells} specialized cells working towards various goals.`;
      });
    },

    setPurpose: async (purpose) => {
        if (!purpose) return;
        set(state => { state.purpose = purpose });
        try {
            const input: CellPurposeUnderstandingInput = { purpose };
            // Call AI Server Action
            console.log("Calling cellPurposeUnderstanding with:", input);
            const result: CellPurposeUnderstandingOutput = await cellPurposeUnderstanding(input);
            console.log("cellPurposeUnderstanding result:", result);

            set(state => {
                state.purpose = purpose; // Update purpose again in case of async delay
                // Apply initialization instructions (simplified example)
                console.log("AI Proposed Initialization Instructions:", result.initializationInstructions);
                // For now, just add a history entry to the first available cell
                const firstCell = Object.values(state.cells).find(c => c.isAlive);
                 if (firstCell) {
                     addHistoryEntry(firstCell, 'decision', `Network purpose updated. AI guidance: ${result.initializationInstructions.substring(0, 100)}...`);
                 } else {
                    console.warn("No live cells to record purpose update history.");
                 }
            });
        } catch (error) {
            console.error("Error in setPurpose calling cellPurposeUnderstanding:", error);
            set(state => {
                 state.purpose += " (AI config failed - see console)";
            })
            // Rethrow or handle the error to inform the caller (e.g., control panel)
            throw new Error(`Failed to set network purpose via AI: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    tick: () => {
      set((state) => {
        state.tickCount += 1;
        Object.values(state.cells).forEach((cell) => {
          if (!cell || !cell.isAlive) return; // Add null check
          cell.age += 1;
          if (cell.age > MAX_AGE) {
            cell.isAlive = false;
            addHistoryEntry(cell, 'death', `Died of old age (${cell.age}).`);
            console.log(`Cell ${cell.id} died.`);
          } else {
            if (state.tickCount % 20 === 0 && Math.random() < 0.1) {
               addHistoryEntry(cell, 'decision', `Internal check at age ${cell.age}. Status: OK.`);
            }
            if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) {
                get().addCell(cell.id);
            }
          }
        });
         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }
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

            let assignedRole: { expertise: string; goal: string; } | undefined = undefined;
            if (parentCell) {
                assignedRole = { expertise: parentCell.expertise, goal: parentCell.goal };
            } else {
                const currentExpertiseCounts = Object.values(state.cells).reduce((acc, cell) => {
                    if (cell) { // Add null check
                       acc[cell.expertise] = (acc[cell.expertise] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

                let minCount = Infinity;
                for (const role of predefinedRoles) {
                    const count = currentExpertiseCounts[role.expertise] || 0;
                    if (count < minCount) {
                        minCount = count;
                        assignedRole = role;
                    }
                    if (count === 0) break;
                }
                 if (!assignedRole) {
                    assignedRole = predefinedRoles[Object.keys(state.cells).length % predefinedRoles.length];
                 }
            }

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: assignedRole!.expertise,
                goal: assignedRole!.goal,
                position,
                isAlive: true,
                version: 1,
                likedCells: parentCell ? [parentCellId] : [],
                history: [],
            };

            const initReason = parentCell
                ? `Cloned from Cell ${parentCellId}. Inherited Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`
                : `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`;
            addHistoryEntry(newCell, parentCell ? 'clone' : 'init', initReason);

            if (parentCell) {
                 addHistoryEntry(parentCell, 'clone', `Cloned itself. New cell ID: ${newCellId}`);
                 if (!parentCell.likedCells.includes(newCellId)) {
                    parentCell.likedCells.push(newCellId);
                    parentCell.version +=1;
                 }
            }

            state.cells[newCellId] = newCell;
            console.log(`Added cell ${newCellId} ${parentCell ? 'cloned from ' + parentCellId : ''} with role ${assignedRole!.expertise}`);
        });
    },

    removeCell: (cellId) => {
      set((state) => {
        if (state.cells[cellId]) {
          delete state.cells[cellId];
          if (state.selectedCellId === cellId) {
            state.selectedCellId = null;
          }
          Object.values(state.cells).forEach(cell => {
             if (cell) { // Add null check
                 const index = cell.likedCells.indexOf(cellId);
                 if (index > -1) {
                     cell.likedCells.splice(index, 1);
                     cell.version += 1;
                 }
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

        try { // Wrap entire message sending logic in try...catch
            const allCells = get().cells;
            const cellExpertise = Object.fromEntries(
                Object.values(allCells).filter(c => c && c.isAlive).map(c => [c.id, c.expertise]) // Add null check
            );
            const cellConnections = get().getCellConnections();

            const needsRouting = (sourceId === 'user' && targetId !== 'broadcast' && targetId !== 'user') ||
                                (sourceId !== 'user' && content.length > 50);

            if (needsRouting && targetId !== 'broadcast' && targetId !== 'user') {
                const startCellId = (sourceId === 'user')
                    ? Object.values(allCells).find(c => c && c.isAlive)?.id // Add null check
                    : sourceId;

                if (!startCellId || !allCells[startCellId]?.isAlive) {
                    console.error("Cannot route message: No valid starting cell found.");
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
                        networkCondition: "Normal",
                    };
                    console.log("Calling routeMessage with:", input);
                    const result: RouteMessageOutput = await routeMessage(input);
                     console.log("routeMessage result:", result);
                    route = result.route;
                    reasoning = result.reasoning;
                    console.log(`AI Route from ${startCellId} to ${targetId}:`, route, "Reason:", reasoning);

                    if (route && route.length > 1) {
                        const finalDestination = route[route.length - 1];
                        set(state => {
                            state.messages.push({
                                id: messageId,
                                sourceCellId: sourceId,
                                targetCellId: finalDestination,
                                content: content,
                                timestamp,
                                route: route,
                            });
                            if (sourceId !== 'user' && state.cells[sourceId]) {
                                addHistoryEntry(state.cells[sourceId], 'message', `Sent (via route): "${content}" towards ${finalDestination}. AI Reason: ${reasoning}`);
                            }
                        });

                        for (let i = 0; i < route.length - 1; i++) {
                            const hopSourceId = route[i];
                            const hopTargetId = route[i+1];
                            set(state => {
                                const hopSourceCell = state.cells[hopSourceId];
                                const hopTargetCell = state.cells[hopTargetId];
                                if (hopTargetCell?.isAlive) {
                                    addHistoryEntry(hopTargetCell, 'message', `Received message "${content.substring(0, 20)}..." from ${hopSourceId}`);
                                    if (i === route.length - 2) {
                                        handleMessageReception(hopTargetCell, hopSourceId, content);
                                    }
                                }
                            });
                        }
                        setTimeout(() => get().clearMessages(), 3000);
                        return;
                    } else {
                        console.log("AI routing resulted in direct message or failed.");
                        reasoning = route ? result.reasoning : "AI routing failed, sending directly.";
                    }

                } catch (routingError) {
                    console.error("Error in sendMessage calling routeMessage:", routingError);
                    reasoning = "AI routing error, sending directly.";
                     // Let the code proceed to direct message handling as fallback
                }
            }

            // --- Direct Message or Broadcast Handling (Fallback/Default) ---
            const newMessage: Message = {
                id: messageId,
                sourceCellId: sourceId,
                targetCellId: finalTargetId,
                content,
                timestamp,
            };

            set(state => {
                state.messages.push(newMessage);

                if (sourceId !== 'user' && state.cells[sourceId]) {
                    addHistoryEntry(state.cells[sourceId], 'message', `Sent: "${content}" to ${finalTargetId}. Reason: ${reasoning}`);
                }

                if (finalTargetId === 'broadcast') {
                    Object.values(state.cells).forEach(cell => {
                        if (cell && cell.isAlive && cell.id !== sourceId) { // Add null check
                            addHistoryEntry(cell, 'message', `Received broadcast from ${sourceId}: "${content}"`);
                            handleMessageReception(cell, sourceId, content);
                        }
                    });
                } else if (finalTargetId !== 'user' && state.cells[finalTargetId]?.isAlive) {
                    const targetCell = state.cells[finalTargetId];
                     if(targetCell) { // Add null check
                        addHistoryEntry(targetCell, 'message', `Received from ${sourceId}: "${content}"`);
                        handleMessageReception(targetCell, finalTargetId === sourceId ? 'self' : sourceId, content);
                     }
                } else if (finalTargetId === 'user') {
                   console.log(`Message to User from ${sourceId}: ${content}`);
                }
            });

            setTimeout(() => {
                get().clearMessages();
            }, 3000);
        } catch (error) {
             console.error("Unhandled error in sendMessage:", error);
             // Optionally, notify the user via toast or console
        }
    },

    askForHelp: async (requestingCellId: CellId, requestText: string) => {
        try { // Wrap the entire action
            const requestingCell = get().getCellById(requestingCellId);
            if (!requestingCell || !requestingCell.isAlive) return;

            const neighbors = get().getNeighbors(requestingCellId, 150);
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
                console.log("Calling cellHelpRequestInterpretation with:", input);
                const result: CellHelpRequestInterpretationOutput = await cellHelpRequestInterpretation(input);
                 console.log("cellHelpRequestInterpretation result:", result);
                addHistoryEntry(requestingCell, 'decision', `AI suggested neighbors for help (${result.relevantExpertise.length}): ${result.reasoning}`);
                console.log(`Cell ${requestingCellId} help request interpreted by AI:`, result);

                if (result.relevantExpertise.length > 0) {
                    result.relevantExpertise.forEach(expert => {
                        get().sendMessage(requestingCellId, expert.cellId, `Need help with: ${requestText}. Your expertise in '${expert.expertise}' might be relevant.`);
                        set(state => {
                            const cell = state.cells[requestingCellId];
                            if (cell && !cell.likedCells.includes(expert.cellId)) {
                                cell.likedCells.push(expert.cellId);
                                addHistoryEntry(cell, 'decision', `Liked cell ${expert.cellId} for potential help.`);
                                cell.version++;
                            }
                        })
                    });
                } else {
                    addHistoryEntry(requestingCell, 'decision', `No specific expertise found nearby, broadcasting help request.`);
                    get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
                }

            } catch (interpretError) {
                console.error("Error in askForHelp calling cellHelpRequestInterpretation:", interpretError);
                addHistoryEntry(requestingCell, 'decision', `Error asking AI for help. Broadcasting request.`);
                get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
            }
        } catch (error) {
             console.error("Unhandled error in askForHelp:", error);
             // Optionally, notify the user via toast or console
        }
    },


    moveCells: () => {
        set(state => {
            Object.values(state.cells).forEach(cell => {
                 if (!cell || !cell.isAlive) return; // Add null check

                let avgX = 0, avgY = 0, count = 0;
                let repulsionX = 0, repulsionY = 0;
                const REPULSION_RADIUS = 40;
                const REPULSION_STRENGTH = 0.5;

                cell.likedCells.forEach(likedId => {
                    const likedCell = state.cells[likedId];
                    if (likedCell?.isAlive) {
                        avgX += likedCell.position.x;
                        avgY += likedCell.position.y;
                        count++;
                    }
                });

                 Object.values(state.cells).forEach(otherCell => {
                    if (!otherCell || otherCell.id === cell.id || !otherCell.isAlive) return; // Add null check
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

                    if (attractDist > MOVE_STEP) {
                         moveX += (attractDX / attractDist) * MOVE_STEP;
                         moveY += (attractDY / attractDist) * MOVE_STEP;
                         moved = true;
                    }
                }

                 if (moved || repulsionX !== 0 || repulsionY !== 0) {
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

                 const originalLikedCount = cell.likedCells.length;
                 cell.likedCells = cell.likedCells.filter(id => state.cells[id]?.isAlive);
                 if (cell.likedCells.length !== originalLikedCount) {
                     cell.version += 1;
                 }
            });
        });
    },


    getCellById: (cellId) => {
      const cell = get().cells[cellId];
      return cell;
    },

    getNeighbors: (cellId, radius = 100) => {
      const cell = get().getCellById(cellId);
      if (!cell) return [];
      const { x, y } = cell.position;
      return Object.values(get().cells).filter((otherCell): otherCell is Cell => { // Type assertion
        if (!otherCell || otherCell.id === cellId) return false; // Add null check and exclude self
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
       const now = Date.now();
       const expirationTime = 3000;
       set(state => {
           state.messages = state.messages.filter(msg => (now - msg.timestamp) < expirationTime);
       });
    },

     getCellConnections: (): Record<CellId, CellId[]> => {
        const connections: Record<CellId, CellId[]> = {};
        const allCells = Object.values(get().cells);
        const connectionRadius = 150;

        allCells.forEach(cell => {
            if (!cell || !cell.isAlive) return; // Add null check
            connections[cell.id] = get().getNeighbors(cell.id, connectionRadius)
                                       .filter(n => n.isAlive)
                                       .map(n => n.id);
        });
        return connections;
     },
  })),
  {
    name: 'network-store',
  }
);


// --- Internal Helper for Message Handling ---
const handleMessageReception = (targetCell: Cell, sourceId: CellId | 'user' | 'self', content: string) => {
     if (!targetCell) return; // Guard against null cell

     if (content.toLowerCase().trim() === 'purpose?') {
         const response = `My purpose is: ${targetCell.goal}. My expertise is in: ${targetCell.expertise}.`;
         addHistoryEntry(targetCell, 'message', `Responding to purpose query from ${sourceId}.`);

         if (sourceId !== 'user' && sourceId !== 'self') {
              const sourceCell = useNetworkStore.getState().getCellById(sourceId);
             if (sourceCell?.isAlive) { // Ensure source is valid and alive
                  useNetworkStore.getState().sendMessage(targetCell.id, sourceId, response);
             } else {
                  console.warn(`Source cell ${sourceId} not found or dead, cannot send purpose response.`);
             }
         } else if (sourceId === 'user') {
             useNetworkStore.getState().sendMessage(targetCell.id, 'user', response);
         }
         return;
     }


    if (sourceId !== 'user' && sourceId !== 'self') {
        const lowerContent = content.toLowerCase();
        const sourceCellExists = !!useNetworkStore.getState().cells[sourceId]; // Check if source still exists

        if (sourceCellExists && (lowerContent.includes('thank') || lowerContent.includes('helpful') || lowerContent.includes('good job'))) {
            if (!targetCell.likedCells.includes(sourceId)) {
                targetCell.likedCells.push(sourceId);
                addHistoryEntry(targetCell, 'decision', `Liked cell ${sourceId} due to positive message.`);
                targetCell.version++;
            }
        } else if (sourceCellExists && (lowerContent.includes('error') || lowerContent.includes('failed') || lowerContent.includes('bad'))) {
            const index = targetCell.likedCells.indexOf(sourceId);
            if (index > -1) {
                targetCell.likedCells.splice(index, 1);
                addHistoryEntry(targetCell, 'decision', `Disliked cell ${sourceId} due to negative message.`);
                targetCell.version++;
            }
        }
    }

    // Add more sophisticated handling based on content, expertise, goal etc.
     if (targetCell.expertise === 'Data Analyzer' && content.includes('Analyze:')) {
          addHistoryEntry(targetCell, 'decision', `Received analysis request from ${sourceId}. Processing...`);
          // Simulate analysis
          setTimeout(() => {
              const result = `Analysis complete for data from ${sourceId}. Result: Pattern detected.`;
              addHistoryEntry(targetCell, 'decision', result);
              if (sourceId !== 'user' && sourceId !== 'self' && useNetworkStore.getState().getCellById(sourceId)?.isAlive) {
                  useNetworkStore.getState().sendMessage(targetCell.id, sourceId, result);
              } else if (sourceId === 'user') {
                   useNetworkStore.getState().sendMessage(targetCell.id, 'user', result);
              }
          }, 1000 + Math.random() * 1000); // Simulate processing time
     }

};


// --- Initialize with a set number of cells ---
// Ensure initialization happens only once, e.g., by checking if cells are already populated
if (Object.keys(useNetworkStore.getState().cells).length === 0) {
    useNetworkStore.getState().initializeNetwork(predefinedRoles.length);
}


// --- Auto-tick interval ---
let tickInterval: NodeJS.Timeout | null = null;

export const startAutoTick = (intervalMs = 1500) => {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    try {
      useNetworkStore.getState().tick();
    } catch (error) {
        console.error("Error during auto-tick:", error);
        stopAutoTick(); // Stop ticking if an error occurs to prevent spam
    }
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

// Start ticking automatically only on the client-side after mount
// This prevents potential SSR issues or multiple initializations
if (typeof window !== 'undefined') {
    if (!tickInterval) { // Ensure it only starts once
        startAutoTick();
    }
}

// Cleanup interval on script unload (important for hot-reloading environments)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopAutoTick);
}
