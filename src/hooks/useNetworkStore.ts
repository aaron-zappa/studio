
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
const MAX_CELLS = 100; // Limit the number of cells for performance
const GRID_SIZE = 500; // Size of the visualization area
const CLONE_DISTANCE_THRESHOLD = 50; // Min distance between parent and clone
const MOVE_STEP = 50; // Increased movement step further
const POSITION_HISTORY_LIMIT = 15; // Store the last 15 positions for trails

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
    { expertise: 'Data Validator', goal: 'Verify the integrity and accuracy of collected data' },
    { expertise: 'Data Summarizer', goal: 'Condense large datasets into concise summaries' },
    { expertise: 'Report Generator', goal: 'Create reports based on analyzed data and findings' },
    { expertise: 'Alert Manager', goal: 'Identify critical events and notify relevant cells or systems' },
    { expertise: 'Query Processor', goal: 'Handle and respond to data queries from other cells' },
    { expertise: 'Knowledge Graph Builder', goal: 'Construct and maintain relationships between data points' },
    { expertise: 'Anomaly Detector', goal: 'Identify unusual patterns or deviations from the norm' },
    { expertise: 'Trend Forecaster', goal: 'Predict future trends based on historical data' },
    { expertise: 'Optimization Engine', goal: 'Find optimal solutions for resource allocation or task scheduling' },
    { expertise: 'Simulation Modeler', goal: 'Create simulations based on current network state' },
    { expertise: 'Performance Monitor', goal: 'Track the performance and efficiency of other cells' },
    { expertise: 'Error Logger', goal: 'Record errors and failures occurring within the network' },
    { expertise: 'Self-Healing Coordinator', goal: 'Initiate recovery processes for failed cells' },
    { expertise: 'Load Balancer', goal: 'Distribute workload evenly across capable cells' },
    { expertise: 'Cache Manager', goal: 'Store frequently accessed data for faster retrieval' },
    { expertise: 'Encryption Specialist', goal: 'Encrypt and decrypt sensitive data transmissions' },
    { expertise: 'Authentication Provider', goal: 'Verify the identity of cells trying to communicate' },
    { expertise: 'Authorization Manager', goal: 'Control access permissions for data and resources' },
    { expertise: 'Threat Assessor', goal: 'Analyze potential security threats and vulnerabilities' },
    { expertise: 'Intrusion Prevention System', goal: 'Block or mitigate malicious activities' },
    { expertise: 'Energy Harvester', goal: 'Gather and store energy for the network' },
    { expertise: 'Resource Distributor', goal: 'Allocate energy and resources based on priority' },
    { expertise: 'Task Prioritizer', goal: 'Determine the order in which tasks should be executed' },
    { expertise: 'Workflow Manager', goal: 'Coordinate sequences of tasks across multiple cells' },
    { expertise: 'Event Correlator', goal: 'Identify relationships between different network events' },
    { expertise: 'Protocol Translator', goal: 'Enable communication between cells using different protocols' },
    { expertise: 'External API Gateway', goal: 'Interact with external systems and services' },
    { expertise: 'Data Transformation Unit', goal: 'Convert data between different formats' },
    { expertise: 'Compression Engine', goal: 'Reduce the size of data for efficient storage and transmission' },
    { expertise: 'Decompression Engine', goal: 'Restore compressed data to its original form' },
    { expertise: 'Natural Language Processor', goal: 'Understand and process human language requests' },
    { expertise: 'Sentiment Analyzer', goal: 'Determine the sentiment expressed in text data' },
    { expertise: 'Speech Recognition Unit', goal: 'Convert spoken language into text' },
    { expertise: 'Text-to-Speech Synthesizer', goal: 'Convert text into spoken language' },
    { expertise: 'Image Recognition Module', goal: 'Identify objects and features in images' },
    { expertise: 'Video Analyzer', goal: 'Process and understand content in video streams' },
    { expertise: 'Geospatial Analyst', goal: 'Analyze location-based data' },
    { expertise: 'Time Series Analyst', goal: 'Analyze data points indexed in time order' },
    { expertise: 'Reinforcement Learner', goal: 'Learn optimal behaviors through trial and error' },
    { expertise: 'Supervised Learner', goal: 'Learn from labeled training data' },
    { expertise: 'Unsupervised Learner', goal: 'Discover patterns in unlabeled data' },
    { expertise: 'Decision Tree Builder', goal: 'Create predictive models based on decision rules' },
    { expertise: 'Neural Network Trainer', goal: 'Train artificial neural networks for complex tasks' },
    { expertise: 'Genetic Algorithm Optimizer', goal: 'Use evolutionary algorithms to find solutions' },
    { expertise: 'Swarm Intelligence Coordinator', goal: 'Coordinate decentralized problem-solving agents' },
    { expertise: 'Fuzzy Logic Controller', goal: 'Handle reasoning with imprecise or uncertain information' },
    { expertise: 'Expert System Shell', goal: 'Provide a framework for building knowledge-based systems' },
    { expertise: 'Ontology Manager', goal: 'Define and manage formal representations of knowledge' },
    { expertise: 'Data Cleanser', goal: 'Identify and correct errors or inconsistencies in data' },
    { expertise: 'Feature Extractor', goal: 'Derive informative features from raw data' },
    { expertise: 'Dimensionality Reducer', goal: 'Reduce the number of variables under consideration' },
    { expertise: 'Clustering Algorithm', goal: 'Group similar data points together' },
    { expertise: 'Classification Model', goal: 'Assign data points to predefined categories' },
    { expertise: 'Regression Modeler', goal: 'Predict continuous values based on input variables' },
    { expertise: 'Collaborative Filter', goal: 'Make recommendations based on user preferences' },
    { expertise: 'Content-Based Filter', goal: 'Make recommendations based on item characteristics' },
    { expertise: 'A/B Testing Unit', goal: 'Compare different versions of a strategy or feature' },
    { expertise: 'Quality Assurance Bot', goal: 'Test the functionality and reliability of other cells' },
    { expertise: 'Documentation Generator', goal: 'Automatically create documentation for network components' },
    { expertise: 'User Profiler', goal: 'Build and maintain profiles of network users or entities' },
    { expertise: 'Context Manager', goal: 'Maintain awareness of the current situation or task context' },
    { expertise: 'Goal Decomposer', goal: 'Break down high-level goals into smaller, manageable tasks' },
    { expertise: 'Plan Executor', goal: 'Carry out sequences of actions to achieve a goal' },
    { expertise: 'Contingency Planner', goal: 'Develop backup plans for potential failures' },
    { expertise: 'Resource Monitor', goal: 'Track the availability and usage of network resources' },
    { expertise: 'Conflict Resolver', goal: 'Mediate conflicts between cells with competing goals' },
    { expertise: 'Negotiation Agent', goal: 'Facilitate agreements between cells' },
    { expertise: 'Trust Evaluator', goal: 'Assess the reliability and trustworthiness of other cells' },
    { expertise: 'Reputation Manager', goal: 'Maintain and update the reputation scores of cells' },
    { expertise: 'Audit Logger', goal: 'Record significant actions and events for auditing purposes' },
    { expertise: 'Compliance Checker', goal: 'Ensure network operations adhere to regulations or policies' },
    { expertise: 'Backup Agent', goal: 'Create backups of critical data and cell states' },
    { expertise: 'Restore Agent', goal: 'Recover data and states from backups' },
    { expertise: 'Archiving Unit', goal: 'Move old or inactive data to long-term storage' },
    { expertise: 'Garbage Collector', goal: 'Identify and remove obsolete or unnecessary data/cells' },
    { expertise: 'Network Topographer', goal: 'Map the structure and connections of the network' },
    { expertise: 'Visualization Generator', goal: 'Create visual representations of network data or state' },
    { expertise: 'Feedback Collector', goal: 'Gather feedback from users or other systems' },
    { expertise: 'Learning Adapter', goal: 'Adjust cell behavior based on feedback or performance' },
    { expertise: 'Ethical Governor', goal: 'Ensure cell actions align with ethical guidelines' },
    { expertise: 'Fairness Monitor', goal: 'Detect and mitigate bias in algorithms and decisions' },
    { expertise: 'Explainability Module', goal: 'Provide explanations for AI decisions or actions' },
    { expertise: 'Privacy Preserver', goal: 'Implement techniques to protect sensitive data' },
    { expertise: 'Synchronization Coordinator', goal: 'Ensure consistency across distributed cell states' },
    { expertise: 'Consensus Builder', goal: 'Help cells reach agreement on shared information or decisions' },
    { expertise: 'Clock Synchronizer', goal: 'Maintain accurate time across the network' },
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


// --- addHistoryEntry Function Definition ---
// Note: This function should ONLY be called from within an immer `set` block
// to ensure state mutations are handled correctly.
const addHistoryEntry = (cell: Cell, type: HistoryEntry['type'], text: string) => {
  if (!cell) {
    console.warn("Attempted to add history to a null/undefined cell.");
    return; // Guard against null cell references
  }

  // Ensure cell.history is an array (it might be undefined initially or due to errors)
  if (!Array.isArray(cell.history)) {
    console.warn(`Cell ${cell.id} history is not an array. Initializing.`);
    cell.history = [];
  }

  // Prevent excessively long history arrays
  const MAX_HISTORY = 100;
  if (cell.history.length >= MAX_HISTORY) {
    cell.history.shift(); // Remove the oldest entry
  }

  const seq = cell.history.length > 0 ? cell.history[cell.history.length - 1].seq + 1 : 0;
  const newEntry: HistoryEntry = {
    seq,
    type,
    age: cell.age,
    text,
    timestamp: Date.now(),
  };

  // The actual mutation happens within the `set` callback where this is called
  cell.history.push(newEntry);
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
  _addHistoryEntryDirect: (cellId: CellId, type: HistoryEntry['type'], text: string) => void; // Helper for internal use
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
    _addHistoryEntryDirect: (cellId, type, text) => {
        set(state => {
            const cell = state.cells[cellId];
            if (cell) {
                addHistoryEntry(cell, type, text); // Use the safe helper within set
            } else {
                console.warn(`_addHistoryEntryDirect: Cell ${cellId} not found.`);
            }
        });
    },
    initializeNetwork: (count) => {
      set((state) => {
        state.cells = {};
        state.messages = [];
        state.tickCount = 0;
        state.selectedCellId = null;
        const initialPositions: { x: number; y: number }[] = [];
        // Use the smaller of the requested count, MAX_CELLS, or available predefined roles
        const numCells = Math.min(count, MAX_CELLS, predefinedRoles.length);

        for (let i = 0; i < numCells; i++) {
          const id = nanoid(8);
          const position = getRandomPosition(initialPositions);
          initialPositions.push(position);
          const roleIndex = i % predefinedRoles.length; // Cycle through roles if count > roles.length
          const role = predefinedRoles[roleIndex];
          const newCell: Cell = {
            id,
            age: 0,
            expertise: role.expertise,
            goal: role.goal,
            position,
            positionHistory: [position],
            isAlive: true,
            version: 1,
            likedCells: [],
            history: [], // Initialize history as empty array
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
                const firstCell = Object.values(state.cells).find(c => c?.isAlive);
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
            // Cloning logic only triggers if below max cells
            if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) {
                 get().addCell(cell.id); // Call addCell which handles history internally
            }
          }
        });
         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }
        state.moveCells(); // Call moveCells within the set callback
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
            const existingPositions = Object.values(state.cells).filter(c => c).map(c => c.position); // Filter out potential nulls
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

                // Find the role with the absolute minimum count
                assignedRole = predefinedRoles.reduce((minRole, currentRole) => {
                    const minCount = currentExpertiseCounts[minRole.expertise] || 0;
                    const currentCount = currentExpertiseCounts[currentRole.expertise] || 0;
                    return currentCount < minCount ? currentRole : minRole;
                }, predefinedRoles[0]); // Start comparison with the first role

                 // Fallback if somehow no role is found (shouldn't happen)
                 if (!assignedRole) {
                    assignedRole = predefinedRoles[Object.keys(state.cells).length % predefinedRoles.length];
                 }
            }

             if (!assignedRole) {
                console.error("Failed to assign a role to the new cell.");
                return; // Exit if no role could be assigned
             }

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: assignedRole.expertise,
                goal: assignedRole.goal,
                position,
                positionHistory: [position], // Initialize position history
                isAlive: true,
                version: 1,
                likedCells: parentCell ? [parentCellId] : [],
                history: [],
            };

            const initReason = parentCell
                ? `Cloned from Cell ${parentCellId}. Inherited Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`
                : `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`;
            addHistoryEntry(newCell, parentCell ? 'clone' : 'init', initReason); // History added here

            if (parentCell) {
                 addHistoryEntry(parentCell, 'clone', `Cloned itself. New cell ID: ${newCellId}`);
                 if (!parentCell.likedCells.includes(newCellId)) {
                    parentCell.likedCells.push(newCellId);
                    parentCell.version +=1;
                 }
            }

            state.cells[newCellId] = newCell;
            console.log(`Added cell ${newCellId} ${parentCell ? 'cloned from ' + parentCellId : ''} with role ${assignedRole.expertise}`);
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
                Object.values(allCells).filter(c => c?.isAlive).map(c => [c.id, c.expertise]) // Filter nulls before mapping
            );
            const cellConnections = get().getCellConnections();

            const needsRouting = (sourceId === 'user' && targetId !== 'broadcast' && targetId !== 'user') ||
                                (sourceId !== 'user' && content.length > 50); // Consider routing for longer messages internally too

            if (needsRouting && targetId !== 'broadcast' && targetId !== 'user') {
                const startCellId = (sourceId === 'user')
                    ? Object.values(allCells).find(c => c?.isAlive)?.id // Find any alive cell as starting point for user messages
                    : sourceId;

                if (!startCellId || !allCells[startCellId]?.isAlive) {
                    console.error("Cannot route message: No valid starting cell found.");
                    // Send error message back to user if source was user
                    if (sourceId === 'user') {
                        set(state => {
                            state.messages.push({ id: messageId, sourceCellId: 'user', targetCellId: 'user', content: `Error: Could not find a live cell to start routing message to ${targetId}`, timestamp });
                        });
                    }
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
                         // Check if the final destination in the route is actually alive
                        const destinationCell = get().getCellById(finalDestination); // Use getCellById for consistency
                        if (!destinationCell?.isAlive) {
                            console.warn(`AI route destination ${finalDestination} is dead. Message dropped.`);
                            reasoning += " (Destination dead)";
                            get()._addHistoryEntryDirect(startCellId, 'decision', `Routing failed to ${finalDestination} (dead). Reason: ${reasoning}`);
                            route = undefined; // Invalidate route
                        } else {
                            set(state => {
                                state.messages.push({
                                    id: messageId,
                                    sourceCellId: sourceId,
                                    targetCellId: finalDestination, // Target the last cell in the valid route
                                    content: content,
                                    timestamp,
                                    route: route,
                                });
                                if (sourceId !== 'user' && state.cells[sourceId]) {
                                    addHistoryEntry(state.cells[sourceId], 'message', `Sent (via route): "${content.substring(0,30)}..." towards ${finalDestination}. AI Reason: ${reasoning.substring(0, 50)}`);
                                }
                            });

                            // Process message reception along the route
                             let stopPropagation = false;
                             for (let i = 0; i < route.length - 1; i++) {
                                 if (stopPropagation) break; // Exit loop if propagation stopped

                                 const hopSourceId = route[i];
                                 const hopTargetId = route[i+1];

                                 // Use a function to handle state update for reception to avoid nesting set calls deeply
                                 handleHopReception(hopTargetId, hopSourceId, content, i === route.length - 2, (shouldStop) => {
                                     stopPropagation = shouldStop;
                                 });
                             }

                            setTimeout(() => get().clearMessages(), 3000);
                            return; // Message handled via routing
                        }
                    } else {
                        console.log("AI routing resulted in direct message or failed to find a path.");
                        reasoning = route && route.length <= 1 ? result.reasoning : "AI routing failed or no path, sending directly.";
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
                // No route implies direct or broadcast
            };

            set(state => {
                state.messages.push(newMessage);

                if (sourceId !== 'user' && state.cells[sourceId]) {
                     addHistoryEntry(state.cells[sourceId], 'message', `Sent: "${content.substring(0,30)}..." to ${finalTargetId}. Reason: ${reasoning.substring(0,50)}`);
                }

                if (finalTargetId === 'broadcast') {
                    Object.values(state.cells).forEach(cell => {
                        if (cell?.isAlive && cell.id !== sourceId) { // Add null check and filter self
                            addHistoryEntry(cell, 'message', `Received broadcast from ${sourceId}: "${content.substring(0,30)}..."`);
                            handleMessageReceptionLogic(cell, sourceId, content);
                        }
                    });
                } else if (finalTargetId !== 'user') {
                    const targetCell = state.cells[finalTargetId];
                    if (targetCell?.isAlive) { // Check if direct target is alive
                        addHistoryEntry(targetCell, 'message', `Received from ${sourceId}: "${content.substring(0,30)}..."`);
                        handleMessageReceptionLogic(targetCell, finalTargetId === sourceId ? 'self' : sourceId, content);
                    } else {
                        console.warn(`Direct message target ${finalTargetId} is not alive. Message dropped.`);
                        if (sourceId === 'user') {
                            // Inform user if their direct message target was dead
                             state.messages.push({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${finalTargetId.substring(0,6)} is not responding (dead).`, timestamp: Date.now() });
                        } else if (state.cells[sourceId]) {
                            addHistoryEntry(state.cells[sourceId], 'decision', `Message to ${finalTargetId} failed (target dead).`);
                        }
                    }
                } else if (finalTargetId === 'user') {
                   console.log(`Message to User Interface from ${sourceId}: ${content}`);
                    // Optionally display user-targeted messages in UI - currently logged
                     state.messages.push({ id: nanoid(), sourceCellId: sourceId === 'user' ? 'user' : (state.cells[sourceId] ? sourceId : 'unknown'), targetCellId: 'user', content, timestamp: Date.now() });
                }
            });

            setTimeout(() => {
                get().clearMessages();
            }, 3000);
        } catch (error) {
             console.error("Unhandled error in sendMessage:", error);
             // Optionally, notify the user via toast or console
             if (sourceId === 'user') {
                 set(state => {
                     state.messages.push({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Internal error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp: Date.now() });
                 });
             }
        }
    },


    askForHelp: async (requestingCellId: CellId, requestText: string) => {
        try { // Wrap the entire action
             let requestingCell: Cell | undefined;
             set(state => { // Get cell within set to ensure latest state
                 requestingCell = state.cells[requestingCellId];
             });

            if (!requestingCell || !requestingCell.isAlive) {
                 console.warn(`askForHelp: Requesting cell ${requestingCellId} not found or dead.`);
                 return;
             }


            const neighbors = get().getNeighbors(requestingCellId, 150);
            const neighborExpertise = neighbors
                .filter(n => n.isAlive)
                .map(n => ({ cellId: n.id, expertise: n.expertise }));

             // Add history entry within the set callback where state is mutable
             get()._addHistoryEntryDirect(requestingCellId, 'message', `Asking neighbors for help: "${requestText}"`);


            if (neighborExpertise.length === 0) {
                get()._addHistoryEntryDirect(requestingCellId, 'decision', `Tried to ask for help: "${requestText}", but no neighbors found.`);
                console.log(`Cell ${requestingCellId} asked for help, but no neighbors.`);
                return;
            }

            try {
                const input: CellHelpRequestInterpretationInput = {
                    cellId: requestingCellId,
                    requestText,
                    neighboringCellExpertise: neighborExpertise,
                };
                console.log("Calling cellHelpRequestInterpretation with:", input);
                const result: CellHelpRequestInterpretationOutput = await cellHelpRequestInterpretation(input);
                 console.log("cellHelpRequestInterpretation result:", result);

                 // Add history about AI result
                 get()._addHistoryEntryDirect(requestingCellId, 'decision', `AI suggested neighbors for help (${result.relevantExpertise.length}): ${result.reasoning}`);
                 console.log(`Cell ${requestingCellId} help request interpreted by AI:`, result);


                 if (result.relevantExpertise.length > 0) {
                    result.relevantExpertise.forEach(expert => {
                        // Send message (sendMessage handles history internally)
                        get().sendMessage(requestingCellId, expert.cellId, `Need help with: ${requestText}. Your expertise in '${expert.expertise}' might be relevant.`);

                        // Update likedCells within a set callback
                        set(state => {
                            const cell = state.cells[requestingCellId];
                            const expertCell = state.cells[expert.cellId]; // Check if expert exists
                             if (cell && expertCell?.isAlive && !cell.likedCells.includes(expert.cellId)) { // Check if expert is alive before liking
                                cell.likedCells.push(expert.cellId);
                                addHistoryEntry(cell, 'decision', `Liked cell ${expert.cellId} for potential help.`); // Add history inside set
                            } else if (cell && expertCell && !expertCell.isAlive) {
                                addHistoryEntry(cell, 'decision', `AI suggested help from ${expert.cellId}, but it is no longer alive.`);
                            }
                        });
                    });
                } else {
                     get()._addHistoryEntryDirect(requestingCellId, 'decision', `No specific expertise found nearby, broadcasting help request.`);
                     // Send broadcast message
                     get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
                }

            } catch (interpretError) {
                console.error("Error in askForHelp calling cellHelpRequestInterpretation:", interpretError);
                 get()._addHistoryEntryDirect(requestingCellId, 'decision', `Error asking AI for help. Broadcasting request.`);
                 // Send broadcast message as fallback
                 get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`);
                // Rethrow or handle to inform caller
                throw new Error(`AI help interpretation failed: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`);
            }
        } catch (error) {
             console.error("Unhandled error in askForHelp:", error);
             // Rethrow or handle to inform caller
             throw error;
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

                    if (attractDist > MOVE_STEP / 2) { // Only move if distance is significant compared to step
                         moveX += (attractDX / attractDist) * (MOVE_STEP * 0.5); // Attraction is weaker
                         moved = true;
                    }
                }

                 // Also add random drift
                 const driftAngle = Math.random() * 2 * Math.PI;
                 const driftStrength = MOVE_STEP * 0.1; // Small random drift
                 moveX += Math.cos(driftAngle) * driftStrength;
                 moveY += Math.sin(driftAngle) * driftStrength;
                 moved = true; // Always consider drift as movement

                 if (moved || Math.abs(repulsionX) > 0.1 || Math.abs(repulsionY) > 0.1) {
                     const totalMoveDist = Math.sqrt(moveX * moveX + moveY * moveY);
                     if (totalMoveDist > MOVE_STEP) {
                         moveX = (moveX / totalMoveDist) * MOVE_STEP;
                         moveY = (moveY / totalMoveDist) * MOVE_STEP;
                     }

                     const newX = cell.position.x + moveX;
                     const newY = cell.position.y + moveY;

                     cell.position.x = Math.max(10, Math.min(GRID_SIZE - 10, newX));
                     cell.position.y = Math.max(10, Math.min(GRID_SIZE - 10, newY));

                     // Update position history
                     cell.positionHistory.push({ x: cell.position.x, y: cell.position.y });
                     if (cell.positionHistory.length > POSITION_HISTORY_LIMIT) {
                         cell.positionHistory.shift(); // Remove the oldest position
                     }

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
        const connectionRadius = 150; // Define connection radius

        allCells.forEach(cell => {
            if (!cell || !cell.isAlive) return; // Add null check
            // Find neighbors within the connection radius that are also alive
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


// --- Internal Helper for Message Handling (moved outside direct store definition) ---
// This function contains the LOGIC for handling reception, but MUTATIONS must
// happen within the `set` callback of the store action that calls this.

const handleMessageReceptionLogic = (targetCell: Cell, sourceId: CellId | 'user' | 'self', content: string) => {
     if (!targetCell || !targetCell.isAlive) return; // Guard against null/dead cell

     let historyEntriesToAdd: { type: HistoryEntry['type'], text: string }[] = [];
     let likedCellsChanges: CellId[] = []; // Track changes to likedCells
     let dislikedCellsChanges: CellId[] = []; // Track cells to remove from likedCells

     if (content.toLowerCase().trim() === 'purpose?') {
         const response = `My Purpose: ${targetCell.goal}. My Expertise: ${targetCell.expertise}. (Age: ${targetCell.age})`;
         historyEntriesToAdd.push({ type: 'message', text: `Responding to purpose query from ${sourceId}.` });

         // Schedule response sending (async, outside this pure logic function)
         // We return instructions to the caller (sendMessage or handleHopReception)
         return {
             responseToSend: { targetId: sourceId, content: response },
             history: historyEntriesToAdd,
             likedCellsChanges,
             dislikedCellsChanges,
         };
     }


    // --- Simple Social Interaction Logic ---
    if (sourceId !== 'user' && sourceId !== 'self') {
        const lowerContent = content.toLowerCase();
        const sourceCell = useNetworkStore.getState().getCellById(sourceId); // Check if source still exists and is alive

        if (sourceCell?.isAlive) { // Only interact socially with alive cells
             if (lowerContent.includes('thank') || lowerContent.includes('helpful') || lowerContent.includes('good job')) {
                 if (!targetCell.likedCells.includes(sourceId)) {
                     likedCellsChanges.push(sourceId);
                     historyEntriesToAdd.push({ type: 'decision', text: `Liked cell ${sourceId} due to positive message.` });
                 }
             } else if (lowerContent.includes('error') || lowerContent.includes('failed') || lowerContent.includes('bad')) {
                 const index = targetCell.likedCells.indexOf(sourceId);
                 if (index > -1) {
                     dislikedCellsChanges.push(sourceId);
                     historyEntriesToAdd.push({ type: 'decision', text: `Disliked cell ${sourceId} due to negative message.` });
                 }
             }
        }
    }

    // --- Role-Specific Message Handling (Example) ---
     if (targetCell.expertise === 'Data Analyzer' && content.startsWith('Analyze:')) {
          const dataToAnalyze = content.substring(8).trim(); // Get data part
          historyEntriesToAdd.push({ type: 'decision', text: `Received analysis request from ${sourceId} for: "${dataToAnalyze.substring(0,20)}..."` });
          // Simulate analysis delay
          setTimeout(() => {
                const analysisResult = `Analyzed data "${dataToAnalyze.substring(0,10)}...". Finding: ${Math.random() > 0.5 ? 'Anomaly Detected' : 'Nominal'}.`;
                const storeActions = useNetworkStore.getState();
                // Add history entry for the result
                storeActions._addHistoryEntryDirect(targetCell.id, 'decision', analysisResult);

                // Send result back to original sender (if not user/self and still alive)
                 if (sourceId !== 'user' && sourceId !== 'self') {
                    const sourceCell = storeActions.getCellById(sourceId);
                    if (sourceCell?.isAlive) {
                        storeActions.sendMessage(targetCell.id, sourceId, `Analysis Result: ${analysisResult}`);
                    }
                 } else if (sourceId === 'user') {
                    storeActions.sendMessage(targetCell.id, 'user', `Analysis Result: ${analysisResult}`);
                 }
          }, 1000 + Math.random() * 1000); // Simulate processing time

     } else if (targetCell.expertise === 'Task Router' && content.startsWith('Route Task:')) {
          const taskDescription = content.substring(11).trim();
           historyEntriesToAdd.push({ type: 'decision', text: `Received task routing request from ${sourceId}: "${taskDescription.substring(0,20)}..."` });
           // Simple routing: find a neighbor with relevant expertise (e.g., 'Analyzer' if task mentions 'analyze')
           const neighbors = useNetworkStore.getState().getNeighbors(targetCell.id, 150);
           let routed = false;
           for (const neighbor of neighbors) {
               if (neighbor.isAlive && taskDescription.toLowerCase().includes(neighbor.expertise.split(' ')[0].toLowerCase())) { // Simple keyword match
                   historyEntriesToAdd.push({ type: 'message', text: `Routing task "${taskDescription.substring(0,10)}..." to ${neighbor.id} (${neighbor.expertise})` });
                   // Schedule message sending
                   setTimeout(()=> useNetworkStore.getState().sendMessage(targetCell.id, neighbor.id, `Task from ${sourceId}: ${taskDescription}`), 10);
                   routed = true;
                   break;
               }
           }
           if (!routed) {
                historyEntriesToAdd.push({ type: 'decision', text: `Could not find suitable neighbor for task: "${taskDescription.substring(0,20)}...".` });
                // Optionally send failure message back
           }
     }

     // Return accumulated changes
      return {
         responseToSend: null,
         history: historyEntriesToAdd,
         likedCellsChanges,
         dislikedCellsChanges,
     };

};


// Helper to handle reception during a route hop, managing state updates
const handleHopReception = (targetCellId: CellId, sourceCellId: CellId, content: string, isFinalDestination: boolean, setStopPropagation: (stop: boolean) => void) => {
    set(state => {
        const targetCell = state.cells[targetCellId];

        if (targetCell?.isAlive) {
            addHistoryEntry(targetCell, 'message', `Received (route): "${content.substring(0, 20)}..." from ${sourceCellId}`);

            if (isFinalDestination) {
                const receptionResult = handleMessageReceptionLogic(targetCell, sourceCellId, content);
                if (receptionResult) {
                    // Apply changes from reception logic
                    receptionResult.history.forEach(entry => addHistoryEntry(targetCell, entry.type, entry.text));
                    receptionResult.likedCellsChanges.forEach(id => {
                        if (!targetCell.likedCells.includes(id)) {
                            targetCell.likedCells.push(id);
                            targetCell.version++;
                        }
                    });
                     receptionResult.dislikedCellsChanges.forEach(id => {
                         const index = targetCell.likedCells.indexOf(id);
                         if (index > -1) {
                             targetCell.likedCells.splice(index, 1);
                             targetCell.version++;
                         }
                    });

                    // Handle response if needed (outside the set callback for async sendMessage)
                    if (receptionResult.responseToSend) {
                        const { targetId, content: responseContent } = receptionResult.responseToSend;
                        // Ensure the original source is alive before responding
                        if (targetId !== 'user' && targetId !== 'self') {
                             const originalSourceCell = state.cells[targetId]; // Check state directly
                             if (originalSourceCell?.isAlive) {
                                 setTimeout(() => useNetworkStore.getState().sendMessage(targetCellId, targetId, responseContent), 10);
                             } else {
                                 console.warn(`Original source ${targetId} is dead, cannot send response from ${targetCellId}`);
                             }
                        } else if (targetId === 'user') {
                             setTimeout(() => useNetworkStore.getState().sendMessage(targetCellId, 'user', responseContent), 10);
                        }
                    }
                }
            }
        } else {
            console.warn(`Route hop target ${targetCellId} is dead. Stopping message propagation.`);
            setStopPropagation(true); // Signal to stop further hops
        }
    });
};


// --- Initialize with a set number of cells ---
// Ensure initialization happens only once, e.g., by checking if cells are already populated
if (typeof window !== 'undefined' && Object.keys(useNetworkStore.getState().cells).length === 0) {
    useNetworkStore.getState().initializeNetwork(MAX_CELLS); // Start with max allowed cells or predefined roles count
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

