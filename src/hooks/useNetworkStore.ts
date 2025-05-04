


import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NetworkState, Cell, CellId, Message, HistoryEntry, HistoryEntryData } from '@/types';
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
const MOVE_STEP = 100; // Increased movement step for more noticeable movement
const POSITION_HISTORY_LIMIT = 25; // Increased history limit for longer trails
const MAX_HISTORY = 100; // Max history entries per cell
const SLEEP_THRESHOLD = 50; // Ticks of inactivity before sleeping
const SLEEP_CHANCE_ON_TICK = 0.05; // 5% chance per tick to consider sleeping if inactive
const RANDOM_WAKE_CHANCE = 0.01; // Small chance for a sleeping cell to wake randomly

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


// Helper function to add history *within* an immer draft context
// Needs to be directly called within the 'set' callback for Immer to track changes
const _addHistoryEntry = (cell: Cell | undefined, data: HistoryEntryData) => {
    if (!cell) {
        console.warn("Attempted to add history to a non-existent cell.");
        return;
    }
    // Ensure history array exists, initializing if necessary
    if (!Array.isArray(cell.history)) {
        cell.history = [];
    }


    if (cell.history.length >= MAX_HISTORY) {
        cell.history.shift(); // Remove the oldest entry
    }

    // Find the highest sequence number in the current history (or start from -1 if empty)
    const maxSeq = cell.history.reduce((max, entry) => Math.max(max, entry.seq), -1);
    const newSeq = maxSeq + 1;

    const newEntry: HistoryEntry = {
        ...data,
        seq: newSeq, // Use the calculated new sequence number
        age: cell.age, // Ensure age is current
        timestamp: Date.now(), // Ensure timestamp is current
    };

    // Immer allows direct mutation of the draft state
    cell.history.push(newEntry);
    cell.version = (cell.version ?? 0) + 1; // Increment version on history change
};


// --- Store Definition ---

interface NetworkActions {
  initializeNetwork: (count: number) => void;
  setPurpose: (purpose: string) => Promise<void>;
  tick: () => void;
  addCell: (parentCellId?: CellId, expertise?: string) => void; // Updated signature
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

// Define the type for the set function provided by Zustand
type SetState = (fn: (state: NetworkStore) => void | Partial<NetworkStore>) => void;

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
            status: 'active', // Initialize as active
            lastActiveTick: 0, // Initialize last active tick
            version: 1,
            likedCells: [],
            history: [], // Initialize history as empty array
          };
          _addHistoryEntry(newCell, { type: 'init', text: `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}` });
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
                     _addHistoryEntry(firstCell, { type: 'decision', text: `Network purpose updated. AI guidance: ${result.initializationInstructions.substring(0, 100)}...` });
                     // Wake up all cells when purpose changes
                     Object.values(state.cells).forEach(cell => {
                        if (cell?.isAlive && cell.status === 'sleeping') {
                            cell.status = 'active';
                            cell.lastActiveTick = state.tickCount;
                            _addHistoryEntry(cell, { type: 'status', text: `Woken up by network purpose update.` });
                        }
                     })
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
               cell.status = 'sleeping'; // Dead cells are effectively sleeping
               _addHistoryEntry(cell, { type: 'death', text: `Died of old age (${cell.age}).` });
               console.log(`Cell ${cell.id} died.`);
               return; // No further processing for dead cells
           }

          // --- Sleeping Logic ---
          if (cell.status === 'sleeping') {
             // Check for wake-up message (handled in sendMessage/handleMessageReceptionLogic)
             // Small chance to wake up randomly
             if (Math.random() < RANDOM_WAKE_CHANCE) {
                 cell.status = 'active';
                 cell.lastActiveTick = state.tickCount;
                 _addHistoryEntry(cell, { type: 'status', text: `Woke up spontaneously.` });
             } else {
                 return; // Sleeping cells do nothing else this tick
             }
          }

          // --- Active Cell Logic ---
          // cell.lastActiveTick = state.tickCount; // Update last active tick only when truly active (e.g., receiving/sending message, specific actions) - Moved to relevant places

           // Check for sleeping condition based on inactivity and chance
           if (state.tickCount - cell.lastActiveTick > SLEEP_THRESHOLD && Math.random() < SLEEP_CHANCE_ON_TICK) {
                cell.status = 'sleeping';
                _addHistoryEntry(cell, { type: 'status', text: `Entering sleep due to inactivity.` });
                return; // Stop active processing for this tick
           }


           // Active cell logic (simplified) - Only run if truly active
           if (cell.status === 'active') {
                if (state.tickCount % 20 === 0 && Math.random() < 0.1) {
                    _addHistoryEntry(cell, { type: 'decision', text: `Internal check at age ${cell.age}. Status: OK.` });
                     cell.lastActiveTick = state.tickCount; // Internal checks count as activity
                }

                // Cloning logic only triggers if below max cells and active
                if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) {
                    get().addCell(cell.id); // Call addCell for cloning logic
                    cell.lastActiveTick = state.tickCount; // Cloning counts as activity
                }
           }

        });
         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }
        // Call moveCells logic directly within the same set callback
        Object.values(state.cells).forEach(cell => {
             // Only move active cells
             if (!cell || !cell.isAlive || cell.status !== 'active') return;

             let avgX = 0, avgY = 0, count = 0;
             let repulsionX = 0, repulsionY = 0;
             const REPULSION_RADIUS = 40;
             const REPULSION_STRENGTH = 0.5;

             cell.likedCells.forEach(likedId => {
                 const likedCell = state.cells[likedId];
                 // Interact only with other active cells
                 if (likedCell?.isAlive && likedCell.status === 'active') {
                     avgX += likedCell.position.x;
                     avgY += likedCell.position.y;
                     count++;
                 }
             });

             Object.values(state.cells).forEach(otherCell => {
                 // Repel only from other active cells
                 if (!otherCell || otherCell.id === cell.id || !otherCell.isAlive || otherCell.status !== 'active') return;
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

                 if (attractDist > MOVE_STEP / 2) {
                     moveX += (attractDX / attractDist) * (MOVE_STEP * 0.5);
                     moved = true;
                 }
             }

             const driftAngle = Math.random() * 2 * Math.PI;
             const driftStrength = MOVE_STEP * 0.1; // Reduce random drift influence
             moveX += Math.cos(driftAngle) * driftStrength;
             moveY += Math.sin(driftAngle) * driftStrength;
             moved = true; // Consider drift as movement

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

                 if (!cell.positionHistory) cell.positionHistory = []; // Ensure history exists
                 cell.positionHistory.push({ x: cell.position.x, y: cell.position.y });
                 if (cell.positionHistory.length > POSITION_HISTORY_LIMIT) {
                     cell.positionHistory.shift();
                 }

                 cell.version = (cell.version ?? 0) + 1;
                 cell.lastActiveTick = state.tickCount; // Movement counts as activity
             }

             const originalLikedCount = cell.likedCells.length;
             // Keep liking dead/sleeping cells, but don't interact with them for movement
             cell.likedCells = cell.likedCells.filter(id => state.cells[id]);
             // Version doesn't change just because a liked cell died/slept
         });
      });
    },

     // Updated addCell to accept optional custom expertise
     addCell: (parentCellId?: CellId, customExpertise?: string) => {
        set(state => {
            if (Object.keys(state.cells).length >= MAX_CELLS) {
                console.warn("Max cell limit reached. Cannot add new cell.");
                return;
            }

            const newCellId = nanoid(8);
            const parentCell = parentCellId ? state.cells[parentCellId] : undefined;
            const existingPositions = Object.values(state.cells).filter(c => c).map(c => c!.position);
            const position = parentCell
                ? getClonedPosition(parentCell.position, existingPositions)
                : getRandomPosition(existingPositions);

            let assignedRole: { expertise: string; goal: string; } | undefined = undefined;

            if (customExpertise) {
                // Use custom expertise, derive a generic goal or use parent's if cloning
                assignedRole = {
                     expertise: customExpertise,
                     goal: parentCell ? parentCell.goal : `Utilize ${customExpertise.split(' ')[0]} expertise.`
                 };
            } else if (parentCell) {
                 // Cloning without custom expertise: inherit from parent
                 assignedRole = { expertise: parentCell.expertise, goal: parentCell.goal };
            } else {
                // Adding new cell without parent or custom expertise: find the least represented role
                 const currentExpertiseCounts = Object.values(state.cells).reduce((acc, cell) => {
                     if (cell) {
                        acc[cell.expertise] = (acc[cell.expertise] || 0) + 1;
                     }
                     return acc;
                 }, {} as Record<string, number>);

                 assignedRole = predefinedRoles.reduce((minRole, currentRole) => {
                     const minCount = currentExpertiseCounts[minRole.expertise] || 0;
                     const currentCount = currentExpertiseCounts[currentRole.expertise] || 0;
                     return currentCount < minCount ? currentRole : minRole;
                 }, predefinedRoles[0]); // Default to first role if all counts are equal or list is empty

                  // Fallback if predefinedRoles is empty or something went wrong
                  if (!assignedRole) {
                     assignedRole = { expertise: "Generic Worker", goal: "Perform general tasks" };
                     console.warn("Could not determine least represented role, assigning Generic Worker.");
                  }
            }

            if (!assignedRole) {
                console.error("Failed to assign a role to the new cell.");
                return; // Should not happen with the fallback logic above
            }

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: assignedRole.expertise,
                goal: assignedRole.goal,
                position,
                positionHistory: [position],
                isAlive: true,
                status: 'active', // New cells start active
                lastActiveTick: state.tickCount,
                version: 1,
                likedCells: parentCell ? [parentCellId] : [],
                history: [],
            };

            const initReason = parentCell
                ? `Cloned from Cell ${parentCellId}. Inherited Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`
                : `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}`;
             _addHistoryEntry(newCell, { type: parentCell ? 'clone' : 'init', text: initReason });

             if (parentCell) {
                 _addHistoryEntry(parentCell, { type: 'clone', text: `Cloned itself. New cell ID: ${newCellId}` });
                 if (!parentCell.likedCells.includes(newCellId)) {
                     parentCell.likedCells.push(newCellId);
                     parentCell.version = (parentCell.version ?? 0) + 1;
                 }
                 // Ensure parent is active after cloning
                 parentCell.status = 'active';
                 parentCell.lastActiveTick = state.tickCount;
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
             if (cell) {
                 const index = cell.likedCells.indexOf(cellId);
                 if (index > -1) {
                     cell.likedCells.splice(index, 1);
                     cell.version = (cell.version ?? 0) + 1;
                 }
             }
          });
        }
      });
    },

     sendMessage: async (sourceIdInput, targetIdInput, content) => {
        const messageId = nanoid();
        const timestamp = Date.now();
        const sourceId = sourceIdInput; // Use the input directly
        let route: CellId[] | undefined = undefined;
        let finalTargetId = targetIdInput; // Use input target initially
        let reasoning = "Direct message.";
        let messagesToAdd: Message[] = []; // Queue messages to add

         // Function to queue a message for addition
         const queueMessage = (message: Message) => {
             messagesToAdd.push(message);
         };

        try {
            const allCells = get().cells;
            // Consider only ACTIVE cells for expertise routing
            const cellExpertise = Object.fromEntries(
                Object.values(allCells).filter(c => c?.isAlive && c.status === 'active').map(c => [c!.id, c!.expertise])
            );
            // Connections can exist even to sleeping cells, AI might choose to route through them if necessary
            const cellConnections = get().getCellConnections(); // Consider all connections, alive or not

            // Routing logic: Attempt if target is specific cell and either user sends or message is long
            // OR if target is sleeping (try to route to wake it up)
            const targetCellInitial = allCells[targetIdInput as CellId];
            const needsRouting = (targetIdInput !== 'broadcast' && targetIdInput !== 'user') &&
                                 ( (sourceId === 'user' || content.length > 50) || (targetCellInitial?.status === 'sleeping') );

            if (needsRouting && targetIdInput !== 'broadcast' && targetIdInput !== 'user') {
                // Find an *active* starting cell if source is user
                const startCellId = (sourceId === 'user')
                    ? Object.values(allCells).find(c => c?.isAlive && c.status === 'active')?.id
                    : sourceId;

                if (!startCellId || !allCells[startCellId]?.isAlive) { // No active starting cell
                    console.error("Cannot route message: No valid active starting cell found.");
                    if (sourceId === 'user') {
                        queueMessage({ id: messageId, sourceCellId: 'user', targetCellId: 'user', content: `Error: Could not find an active cell to start routing message to ${targetIdInput}`, timestamp });
                    }
                     set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                    return;
                }

                // Ensure the target cell exists before attempting to route
                const targetCellExists = allCells[targetIdInput as CellId];
                if (!targetCellExists) {
                    console.error(`Cannot route message: Target cell ${targetIdInput} does not exist.`);
                     if (sourceId === 'user') {
                         queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${targetIdInput} does not exist.`, timestamp: Date.now() });
                     }
                     set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                    return;
                }


                try {
                    const input: RouteMessageInput = { message: content, targetCellId: targetIdInput as CellId, currentCellId: startCellId, cellExpertise, cellConnections, networkCondition: "Normal" };
                    console.log("Calling routeMessage with:", input);
                    const result: RouteMessageOutput = await routeMessage(input);
                    console.log("routeMessage result:", result);
                    route = result.route;
                    reasoning = result.reasoning;
                    console.log(`AI Route from ${startCellId} to ${targetIdInput}:`, route, "Reason:", reasoning);

                    if (route && route.length > 1) {
                        const finalDestination = route[route.length - 1];
                        const destinationCell = get().getCellById(finalDestination);

                        // Route is valid only if the final destination exists (could be sleeping)
                        if (!destinationCell) {
                             console.warn(`AI route destination ${finalDestination} does not exist. Message dropped.`);
                             reasoning += " (Destination vanished)";
                             set(state => {
                                 const start = state.cells[startCellId];
                                 if(start) _addHistoryEntry(start, {type: 'decision', text: `Routing failed to ${finalDestination} (vanished). Reason: ${reasoning}`});
                             });
                             route = undefined; // Clear route, fallback to direct/broadcast below
                             finalTargetId = targetIdInput; // Reset finalTargetId to original input
                        } else {
                            finalTargetId = finalDestination; // Update final target based on successful route
                            // Queue the message with the route information
                            queueMessage({ id: messageId, sourceCellId: sourceId, targetCellId: finalDestination, content, timestamp, route });
                            set(state => {
                                if (sourceId !== 'user' && state.cells[sourceId]) {
                                    _addHistoryEntry(state.cells[sourceId], { type: 'message', text: `Sent (via route): "${content.substring(0,30)}..." towards ${finalDestination}. AI Reason: ${reasoning.substring(0, 50)}` });
                                    // Reset sender's inactivity timer
                                    state.cells[sourceId]!.status = 'active';
                                    state.cells[sourceId]!.lastActiveTick = state.tickCount;
                                }
                            });

                            // Process message reception along the route
                            let stopPropagation = false;
                            for (let i = 0; i < route.length - 1; i++) {
                                 if (stopPropagation) break;
                                 const hopSourceId = route[i];
                                 const hopTargetId = route[i+1];
                                 // Pass set function to hop handler
                                 handleHopReception(set, hopTargetId, hopSourceId, content, i === route.length - 2, (shouldStop) => stopPropagation = shouldStop);
                            }


                            setTimeout(() => get().clearMessages(), 3000);
                             set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                            return; // Return early as message handling happened via route
                        }
                    } else {
                        console.log("AI routing resulted in direct message or failed to find a path.");
                        reasoning = route && route.length <= 1 ? result.reasoning : "AI routing failed or no path, sending directly/broadcast.";
                        finalTargetId = targetIdInput; // Reset to original input if routing failed
                    }

                } catch (routingError) {
                    console.error("Error in sendMessage calling routeMessage:", routingError);
                    reasoning = "AI routing error, sending directly/broadcast.";
                     if (sourceId === 'user') {
                          queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error routing message: ${routingError instanceof Error ? routingError.message : 'Unknown error'}`, timestamp: Date.now() });
                     }
                    finalTargetId = targetIdInput; // Ensure finalTargetId is the original on error
                }
            } // End of routing block

            // --- Direct Message or Broadcast Handling (Fallback/Default) ---
            const newMessage: Message = { id: messageId, sourceCellId: sourceId, targetCellId: finalTargetId, content, timestamp };
            queueMessage(newMessage);

            set(state => {
                // Add history entry for the sender (if not user) and reset activity timer
                if (sourceId !== 'user' && state.cells[sourceId]) {
                    _addHistoryEntry(state.cells[sourceId], { type: 'message', text: `Sent: "${content.substring(0,30)}..." to ${finalTargetId}. Reason: ${reasoning.substring(0,50)}` });
                    state.cells[sourceId]!.status = 'active';
                    state.cells[sourceId]!.lastActiveTick = state.tickCount;
                }

                // Handle reception based on target
                if (finalTargetId === 'broadcast') {
                    Object.values(state.cells).forEach(cell => {
                        // Broadcast wakes up ALL alive cells
                        if (cell?.isAlive) {
                             // Wake up if sleeping
                             if (cell.status === 'sleeping') {
                                cell.status = 'active';
                                cell.lastActiveTick = state.tickCount;
                                _addHistoryEntry(cell, { type: 'status', text: `Woken up by broadcast from ${sourceId}.` });
                             } else {
                                // If already active, still update last active tick
                                cell.lastActiveTick = state.tickCount;
                             }
                             if (cell.id !== sourceId) { // Don't deliver broadcast to self
                                _addHistoryEntry(cell, { type: 'message', text: `Received broadcast from ${sourceId}: "${content.substring(0,30)}..."` });
                                handleMessageReceptionLogic(cell, sourceId, content, state, set); // Pass set here
                             }
                        }
                    });
                } else if (finalTargetId !== 'user') {
                    const targetCell = state.cells[finalTargetId];
                    // Deliver even if sleeping, it will wake up in handleMessageReceptionLogic
                    if (targetCell?.isAlive) {
                        _addHistoryEntry(targetCell, { type: 'message', text: `Received from ${sourceId}: "${content.substring(0,30)}..."` });
                        handleMessageReceptionLogic(targetCell, finalTargetId === sourceId ? 'self' : sourceId, content, state, set); // Pass set here
                    } else {
                        console.warn(`Direct message target ${finalTargetId} is not alive. Message dropped.`);
                        if (sourceId === 'user') {
                            queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${finalTargetId.substring(0,6)} is not responding (dead).`, timestamp: Date.now() });
                        } else if (state.cells[sourceId]) {
                            _addHistoryEntry(state.cells[sourceId], { type: 'decision', text: `Message to ${finalTargetId} failed (target dead).` });
                        }
                    }
                } else if (finalTargetId === 'user') {
                   console.log(`Message to User Interface from ${sourceId}: ${content}`);
                   // Ensure message appears correctly in UI
                   const msgToUpdate = messagesToAdd.find(m => m.id === messageId && m.targetCellId === 'user');
                   if (msgToUpdate) {
                     msgToUpdate.sourceCellId = sourceId; // Let UI handle 'user' vs cell ID display
                   }
                }
                 messagesToAdd.forEach(msg => state.messages.push(msg));
            });

            // Clear messages after a delay
            setTimeout(() => { get().clearMessages(); }, 3000);
        } catch (error) {
             console.error("Unhandled error in sendMessage:", error);
             if (sourceId === 'user') {
                 set(state => {
                     state.messages.push({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Internal error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp: Date.now() });
                 });
             }
        }
    },


    askForHelp: async (requestingCellId: CellId, requestText: string) => {
        try {
            let requestingCell: Cell | undefined;
            let currentTick = 0;

            // Add initial history entry and ensure cell is active
            set((state) => {
                 currentTick = state.tickCount; // Get current tick
                 requestingCell = state.cells[requestingCellId];
                 if(requestingCell) {
                     _addHistoryEntry(requestingCell, { type: 'message', text: `Asking neighbors for help: "${requestText}"` });
                     // Ensure the requesting cell is active
                     if (requestingCell.status === 'sleeping') {
                        requestingCell.status = 'active';
                        _addHistoryEntry(requestingCell, { type: 'status', text: `Woke up to ask for help.` });
                     }
                     requestingCell.lastActiveTick = currentTick;
                 } else {
                     console.warn(`askForHelp initial: Requesting cell ${requestingCellId} not found.`);
                 }
            });

             // Refresh requestingCell from the latest state *after* the set call
             requestingCell = get().getCellById(requestingCellId);

            if (!requestingCell || !requestingCell.isAlive) {
                 console.warn(`askForHelp: Requesting cell ${requestingCellId} not found or dead after initial set.`);
                 return;
            }

            const neighbors = get().getNeighbors(requestingCellId, 150);
            // Consider only ALIVE neighbors for expertise check
            const neighborExpertise = neighbors
                .filter(n => n.isAlive)
                .map(n => ({ cellId: n.id, expertise: n.expertise }));

            if (neighborExpertise.length === 0) {
                 set(state => {
                     const cell = state.cells[requestingCellId];
                     if(cell) _addHistoryEntry(cell, { type: 'decision', text: `Tried to ask for help: "${requestText}", but no live neighbors found.` });
                 });
                console.log(`Cell ${requestingCellId} asked for help, but no live neighbors.`);
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

                set(state => {
                     const cell = state.cells[requestingCellId];
                     if(cell) _addHistoryEntry(cell, { type: 'decision', text: `AI suggested neighbors for help (${result.relevantExpertise.length}): ${result.reasoning}` });
                });
                console.log(`Cell ${requestingCellId} help request interpreted by AI:`, result);

                if (result.relevantExpertise.length > 0) {
                    result.relevantExpertise.forEach(expert => {
                        // Prepare the help message content
                        const helpMessageContent = `Need help with: ${requestText}. AI suggested your expertise in '${expert.expertise}' might be relevant.`;

                        // Send message will handle waking the target if needed
                        // Use setTimeout to avoid potential race conditions with state updates
                        setTimeout(() => get().sendMessage(requestingCellId, expert.cellId, helpMessageContent), 10);

                        // Update likedCells within a set callback
                        set(state => {
                            const cell = state.cells[requestingCellId];
                            const expertCell = state.cells[expert.cellId];
                            // Like cell even if it's currently sleeping, AI identified it
                            if (cell && expertCell && !cell.likedCells.includes(expert.cellId)) {
                                cell.likedCells.push(expert.cellId);
                                _addHistoryEntry(cell, { type: 'decision', text: `Liked cell ${expert.cellId} for potential help.` });
                                cell.version = (cell.version ?? 0) + 1;
                            }
                        });
                    });
                } else {
                     set(state => {
                         const cell = state.cells[requestingCellId];
                         if(cell) _addHistoryEntry(cell, { type: 'decision', text: `No specific expertise found nearby, broadcasting help request.` });
                     });
                     // Send broadcast message (will wake up all cells)
                     setTimeout(() => get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`), 10);
                }

            } catch (interpretError) {
                console.error("Error in askForHelp calling cellHelpRequestInterpretation:", interpretError);
                set(state => {
                     const cell = state.cells[requestingCellId];
                     if(cell) _addHistoryEntry(cell, { type: 'decision', text: `Error asking AI for help. Broadcasting request.` });
                });
                // Send broadcast on error
                setTimeout(() => get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`), 10);
                throw new Error(`AI help interpretation failed: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`);
            }
        } catch (error) {
             console.error("Unhandled error in askForHelp:", error);
             throw error;
        }
    },


    moveCells: () => {
        // This logic is now integrated directly into the tick() action's set callback
        console.warn("moveCells action called directly, but logic is now in tick(). This call might be redundant.");
    },


    getCellById: (cellId) => {
      const cell = get().cells[cellId];
      return cell;
    },

    // Returns neighbors regardless of their status (alive/dead/sleeping)
    getNeighbors: (cellId, radius = 100) => {
      const cell = get().getCellById(cellId);
      if (!cell) return [];
      const { x, y } = cell.position;
      return Object.values(get().cells).filter((otherCell): otherCell is Cell => {
        if (!otherCell || otherCell.id === cellId) return false;
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

    // Returns connections only between ALIVE cells (can be sleeping or active)
     getCellConnections: (): Record<CellId, CellId[]> => {
        const connections: Record<CellId, CellId[]> = {};
        const allCells = Object.values(get().cells);
        const connectionRadius = 150;

        allCells.forEach(cell => {
            if (!cell || !cell.isAlive) return;
            // Find neighbors within radius that are also alive (status doesn't matter for connection)
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
// Modified to accept the immer `state` draft object and the zustand `set` function
const handleMessageReceptionLogic = (
    targetCell: Cell | undefined,
    sourceId: CellId | 'user' | 'self',
    content: string,
    state: NetworkStore, // Read-only state for checks
    set: SetState // Zustand's set function for modifications
) => {
     if (!targetCell || !targetCell.isAlive) return; // Check if alive first

     // --- Create a draft for modifications ---
     set(draft => {
         const mutableTargetCell = draft.cells[targetCell.id]; // Get the cell from the draft
         if (!mutableTargetCell) return; // Should not happen if initial check passed, but safety first

         const wasSleeping = mutableTargetCell.status === 'sleeping';

         // Always update last active tick on receiving a message
         mutableTargetCell.lastActiveTick = draft.tickCount;

         // Wake up the cell if it's sleeping
         if (wasSleeping) {
             mutableTargetCell.status = 'active';
             _addHistoryEntry(mutableTargetCell, { type: 'status', text: `Woken up by message from ${sourceId}.` });
         }


         let responseToSend: { targetId: CellId | 'user' | 'self', content: string } | null = null;

         // --- Purpose Query ---
         if (content.toLowerCase().trim() === 'purpose?') {
             const responseContent = `My Purpose: ${mutableTargetCell.goal}. My Expertise: ${mutableTargetCell.expertise}. (Age: ${mutableTargetCell.age}, Status: ${mutableTargetCell.status})`;
             _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Responding to purpose query from ${sourceId}.` });
             responseToSend = { targetId: sourceId, content: responseContent };
         }
         // --- Help Request Check (Wake up if relevant) ---
         else if (content.startsWith('Need help with:') && sourceId !== mutableTargetCell.id && sourceId !== 'user' ) {
             const requestText = content.substring(content.indexOf(':')+1).trim();
             // Check if the help message specifically mentions this cell's expertise
             const expertiseMentionRegex = /expertise in '([^']+)'/;
             const match = content.match(expertiseMentionRegex);
             const mentionedExpertise = match ? match[1] : null;

             // Wake up and potentially respond if the mentioned expertise matches
             if (mentionedExpertise && mutableTargetCell.expertise.toLowerCase() === mentionedExpertise.toLowerCase()) {
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received relevant help request from ${sourceId}. Considering.` });
                   // Decide if it can help based on status (must be active now) and goal
                   if (mutableTargetCell.status === 'active' && mutableTargetCell.goal.includes(mutableTargetCell.expertise.split(" ")[0])) { // Simple check if goal aligns
                         const helpResponse = `Cell ${mutableTargetCell.id}: Acknowledged help request re: ${mentionedExpertise}. I might be able to assist.`;
                         responseToSend = { targetId: sourceId, content: helpResponse };
                         _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Offering help to ${sourceId}.` });
                   } else {
                        _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Cannot offer help to ${sourceId} currently (status: ${mutableTargetCell.status} / goal mismatch).` });
                   }
             } else if (!mentionedExpertise && wasSleeping) {
                  // If woken up by a generic help request, just log it
                   _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Woken by generic help request from ${sourceId}.` });
             }
         }
         // --- Social Interaction ---
         else if (sourceId !== 'user' && sourceId !== 'self') {
             const lowerContent = content.toLowerCase();
             const sourceCell = draft.cells[sourceId]; // Get source from draft

             if (sourceCell?.isAlive) { // Only interact socially with alive cells
                 if (lowerContent.includes('thank') || lowerContent.includes('helpful') || lowerContent.includes('good job')) {
                     if (!mutableTargetCell.likedCells.includes(sourceId)) {
                         mutableTargetCell.likedCells.push(sourceId);
                         _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Liked cell ${sourceId} due to positive message.` });
                         mutableTargetCell.version = (mutableTargetCell.version ?? 0) + 1;
                     }
                 } else if (lowerContent.includes('error') || lowerContent.includes('failed') || lowerContent.includes('bad')) {
                     const index = mutableTargetCell.likedCells.indexOf(sourceId);
                     if (index > -1) {
                         mutableTargetCell.likedCells.splice(index, 1);
                         _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Disliked cell ${sourceId} due to negative message.` });
                         mutableTargetCell.version = (mutableTargetCell.version ?? 0) + 1;
                     }
                 }
             }
         }

         // --- Role-Specific Message Handling (Only if Active) ---
         if (mutableTargetCell.status === 'active') { // Check status again, might have just woken up
             if (mutableTargetCell.expertise === 'Data Analyzer' && content.startsWith('Analyze:')) {
                  const dataToAnalyze = content.substring(8).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received analysis request from ${sourceId} for: "${dataToAnalyze.substring(0,20)}..."` });
                  // Simulate analysis delay - Use setTimeout with getState().sendMessage
                  setTimeout(() => {
                        const analysisResult = `Analyzed data "${dataToAnalyze.substring(0,10)}...". Finding: ${Math.random() > 0.5 ? 'Anomaly Detected' : 'Nominal'}.`;
                        // Add history and send message in a separate set call or action
                         useNetworkStore.setState(innerDraft => { // Use setState for async update
                             const cell = innerDraft.cells[mutableTargetCell!.id];
                             if(cell) {
                                 _addHistoryEntry(cell, {type: 'decision', text: analysisResult});
                                 cell.lastActiveTick = innerDraft.tickCount; // Analysis counts as activity
                             }
                         });
                         useNetworkStore.getState().sendMessage(mutableTargetCell!.id, sourceId, `Analysis Result: ${analysisResult}`);
                  }, 1000 + Math.random() * 1000);

             } else if (mutableTargetCell.expertise === 'Task Router' && content.startsWith('Route Task:')) {
                  const taskDescription = content.substring(11).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received task routing request from ${sourceId}: "${taskDescription.substring(0,20)}..."` });
                  // Use getState() for read-only access within setTimeout's scope if needed
                  const neighbors = useNetworkStore.getState().getNeighbors(mutableTargetCell.id, 150);
                  let routed = false;
                  for (const neighbor of neighbors) {
                      // Route only to ACTIVE neighbors
                       if (neighbor.isAlive && neighbor.status === 'active' && taskDescription.toLowerCase().includes(neighbor.expertise.split(' ')[0].toLowerCase())) {
                           _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Routing task "${taskDescription.substring(0,10)}..." to ${neighbor.id} (${neighbor.expertise})` });
                            // Schedule message sending using the store's action
                           setTimeout(()=> useNetworkStore.getState().sendMessage(mutableTargetCell!.id, neighbor.id, `Task from ${sourceId}: ${taskDescription}`), 10);
                           routed = true;
                            mutableTargetCell.lastActiveTick = draft.tickCount; // Routing counts as activity
                           break;
                       }
                   }
                   if (!routed) {
                        _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not find suitable *active* neighbor for task: "${taskDescription.substring(0,20)}...".` });
                   }
             }
             // Add more role-specific logic here...
              else if (mutableTargetCell.expertise.endsWith('Sensor') && content.toLowerCase().trim() === 'report status') {
                   const sensorReading = Math.random() * 100; // Simulate sensor reading
                   const report = `Sensor ${mutableTargetCell.id} (${mutableTargetCell.expertise}): Reading = ${sensorReading.toFixed(2)}`;
                   _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Reporting status to ${sourceId}: ${report}` });
                   responseToSend = { targetId: sourceId, content: report };
                   mutableTargetCell.lastActiveTick = draft.tickCount; // Reporting counts as activity
              }


         } // End of active-only logic


          // If a response needs to be sent immediately
          if (responseToSend) {
             const { targetId: responseTargetId, content: responseContent } = responseToSend;
             // Check if original source exists and is alive (read from draft)
             if (responseTargetId !== 'user' && responseTargetId !== 'self') {
                  const originalSourceCell = draft.cells[responseTargetId];
                  if (originalSourceCell?.isAlive) {
                      // Schedule the send using the store action (async)
                      // Target cell (sender of response) ID is mutableTargetCell.id
                      setTimeout(() => useNetworkStore.getState().sendMessage(mutableTargetCell!.id, responseTargetId, responseContent), 10);
                  } else {
                      console.warn(`Original source ${responseTargetId} is dead/gone, cannot send response from ${mutableTargetCell!.id}`);
                      _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not respond to ${responseTargetId}, cell is dead/gone.` });
                  }
             } else if (responseTargetId === 'user') {
                 // Send response to UI
                 setTimeout(() => useNetworkStore.getState().sendMessage(mutableTargetCell!.id, 'user', responseContent), 10);
             }
         }
     }); // End of set block
};


// Helper to handle reception during a route hop, managing state updates
const handleHopReception = (
    set: SetState, // Pass the set function
    targetCellId: CellId,
    sourceCellId: CellId,
    content: string,
    isFinalDestination: boolean,
    setStopPropagation: (stop: boolean) => void
) => {
    set(state => {
        const targetCell = state.cells[targetCellId];

        // Only process hop if target cell exists and is alive
        if (targetCell?.isAlive) {
            const wasSleeping = targetCell.status === 'sleeping';
            // Always update last active tick when receiving a routed message
            targetCell.lastActiveTick = state.tickCount;
            // Wake up the cell if it's sleeping
            if (wasSleeping) {
                targetCell.status = 'active';
                 _addHistoryEntry(targetCell, { type: 'status', text: `Woken up by routed message from ${sourceCellId}.` });
            }

            _addHistoryEntry(targetCell, { type: 'message', text: `Received (route hop): "${content.substring(0, 20)}..." from ${sourceCellId}` });

            if (isFinalDestination) {
                 // Pass the draft state and set function to the logic function
                 handleMessageReceptionLogic(targetCell, sourceCellId, content, state, set);
            }
             // Do NOT set stopPropagation here if it woke up, allow message processing
        } else {
            console.warn(`Route hop target ${targetCellId} is dead/gone. Stopping message propagation.`);
            // Immediately signal stop if target is invalid
             _addHistoryEntry(state.cells[sourceCellId], {type: 'decision', text: `Route stopped, target ${targetCellId} dead/gone.`})
            setStopPropagation(true);
        }
    });
};


// --- Initialize with a set number of cells ---
if (typeof window !== 'undefined' && Object.keys(useNetworkStore.getState().cells).length === 0) {
    useNetworkStore.getState().initializeNetwork(10); // Start with 10 cells initially
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
if (typeof window !== 'undefined') {
    if (!tickInterval) { // Ensure it only starts once
        startAutoTick();
    }
}

// Cleanup interval on script unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopAutoTick);
}
