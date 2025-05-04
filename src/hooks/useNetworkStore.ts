
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
import { nanoid } from 'nanoid';


const MAX_AGE = 99;
export const MAX_CELLS = 100; // Export the constant
const GRID_SIZE = 500;
const CLONE_DISTANCE_THRESHOLD = 50;
const MOVE_STEP = 150; // Allow bigger movements
const POSITION_HISTORY_LIMIT = 30;
const MAX_HISTORY = 100;
const SLEEP_THRESHOLD = 50;
const SLEEP_CHANCE_ON_TICK = 0.05;
const RANDOM_WAKE_CHANCE = 0.01;
const MIN_DISTANCE_BETWEEN_CELLS = 20;

// --- Helper Functions ---

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
    const MARGIN = 30;

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
    const ANGLE_STEP = Math.PI / 8;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const angle = Math.random() * 2 * Math.PI;
        const distance = CLONE_DISTANCE_THRESHOLD + Math.random() * 20;
        const newX = parentPos.x + Math.cos(angle) * distance;
        const newY = parentPos.y + Math.sin(angle) * distance;

        const clampedX = Math.max(10, Math.min(GRID_SIZE - 10, newX));
        const clampedY = Math.max(10, Math.min(GRID_SIZE - 10, newY));

        let tooClose = false;
        for (const pos of existingPositions) {
            const dist = Math.sqrt(Math.pow(pos.x - clampedX, 2) + Math.pow(pos.y - clampedY, 2));
            if (dist < MIN_DISTANCE_BETWEEN_CELLS) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            return { x: clampedX, y: clampedY };
        }
    }

    console.warn("Could not find suitable clone position, placing near parent.");
    return { x: parentPos.x + 5, y: parentPos.y + 5 };
};


// Helper function to add history *within* an immer draft context
const _addHistoryEntry = (cell: Cell | undefined, data: HistoryEntryData) => {
    if (!cell) {
        console.warn("Attempted to add history to a non-existent cell.");
        return;
    }
     if (!Array.isArray(cell.history)) {
        cell.history = [];
     }

    // Check if the array is extensible before pushing
    if (!Object.isExtensible(cell.history)) {
        console.error("Cell history array is not extensible. Cannot add entry.");
        // Potentially try to replace the array if necessary, though this indicates a deeper issue
        // cell.history = [...cell.history]; // This would create a new, extensible array
        return;
    }


    if (cell.history.length >= MAX_HISTORY) {
        cell.history.shift();
    }

    const maxSeq = cell.history.reduce((max, entry) => Math.max(max, entry.seq), -1);
    const newSeq = maxSeq + 1;

    const newEntry: HistoryEntry = {
        ...data,
        seq: newSeq,
        age: cell.age,
        timestamp: Date.now(),
    };

    // Immer allows direct mutation of the draft state
    try {
        cell.history.push(newEntry);
        cell.version = (cell.version ?? 0) + 1;
    } catch (error) {
         console.error("Error pushing history entry:", error, "Cell ID:", cell.id, "Entry:", newEntry);
         // Attempt to recover by replacing the array, log the issue
         if (error instanceof TypeError && error.message.includes("not extensible")) {
            console.warn("Attempting to recover from non-extensible history array for cell:", cell.id);
            cell.history = [...cell.history, newEntry]; // Create a new extensible array
            cell.version = (cell.version ?? 0) + 1;
         }
    }
};


// --- Store Definition ---

interface NetworkActions {
  initializeNetwork: (count: number) => void;
  setPurpose: (purpose: string) => Promise<void>;
  tick: () => void;
  addCell: (parentCellId?: CellId, expertise?: string) => void;
  removeCell: (cellId: CellId) => void;
  sendMessage: (sourceId: CellId | 'user', targetId: CellId | 'broadcast' | 'user', content: string) => Promise<void>;
  getCellById: (cellId: CellId) => Cell | undefined;
  getNeighbors: (cellId: CellId, radius?: number) => Cell[];
  selectCell: (cellId: CellId | null) => void;
  clearMessages: () => void;
  askForHelp: (requestingCellId: CellId, requestText: string) => Promise<void>;
  reduceCellAge: (cellId: CellId, amount: number) => void;
  getCellConnections: () => Record<CellId, CellId[]>;
}

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
        const numCells = Math.min(count, MAX_CELLS);

        for (let i = 0; i < numCells; i++) {
          const id = nanoid(8);
          const position = getRandomPosition(initialPositions);
          initialPositions.push(position);
          const roleIndex = i % predefinedRoles.length;
          const role = predefinedRoles[roleIndex];
          const newCell: Cell = {
            id,
            age: 0,
            expertise: role.expertise,
            goal: role.goal,
            position,
            positionHistory: [position],
            isAlive: true,
            status: 'active',
            lastActiveTick: 0,
            version: 1,
            likedCells: [],
            history: [],
          };
          _addHistoryEntry(newCell, { type: 'init', text: `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}` });
          state.cells[id] = newCell;
        }
         state.purpose = `Network initialized with ${numCells} specialized cells working towards various goals.`;
      });
    },

    setPurpose: async (purpose) => {
        if (!purpose) return;
        set(state => { state.purpose = purpose });
        try {
            const input: CellPurposeUnderstandingInput = { purpose };
            console.log("Calling cellPurposeUnderstanding with:", input);
            const result: CellPurposeUnderstandingOutput = await cellPurposeUnderstanding(input);
            console.log("cellPurposeUnderstanding result:", result);

            set(state => {
                state.purpose = purpose;
                console.log("AI Proposed Initialization Instructions:", result.initializationInstructions);
                const firstCell = Object.values(state.cells).find(c => c?.isAlive);
                 if (firstCell) {
                     _addHistoryEntry(firstCell, { type: 'decision', text: `Network purpose updated. AI guidance: ${result.initializationInstructions.substring(0, 100)}...` });
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
            throw new Error(`Failed to set network purpose via AI: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    tick: () => {
      set((state) => {
        state.tickCount += 1;
        Object.values(state.cells).forEach((cell) => {
          if (!cell || !cell.isAlive) return;
          cell.age += 1;

           if (cell.age > MAX_AGE) {
               cell.isAlive = false;
               cell.status = 'sleeping';
               _addHistoryEntry(cell, { type: 'death', text: `Died of old age (${cell.age}).` });
               console.log(`Cell ${cell.id} died.`);
               return;
           }

          // --- Sleeping Logic ---
          if (cell.status === 'sleeping') {
             if (Math.random() < RANDOM_WAKE_CHANCE) {
                 cell.status = 'active';
                 cell.lastActiveTick = state.tickCount;
                 _addHistoryEntry(cell, { type: 'status', text: `Woke up spontaneously.` });
             } else {
                 return;
             }
          }

          // --- Active Cell Logic ---
           if (state.tickCount - cell.lastActiveTick > SLEEP_THRESHOLD && Math.random() < SLEEP_CHANCE_ON_TICK) {
                const recentMessages = cell.history.slice(-5);
                const isWaiting = recentMessages.some(h => h.type === 'message' && h.text.startsWith('Sent') && !recentMessages.some(rh => rh.type === 'message' && rh.text.startsWith('Received from')));
                const needsHelp = recentMessages.some(h => h.type === 'message' && h.text.startsWith('Asking neighbors for help') && !recentMessages.some(rh => rh.type === 'message' && rh.text.startsWith('Offering help to')));

                 if (!isWaiting && !needsHelp) {
                     const lowerGoal = cell.goal.toLowerCase();
                     const isCriticalGoal = lowerGoal.includes('monitor') || lowerGoal.includes('security') || lowerGoal.includes('alert') || lowerGoal.includes('coordinate');
                     const isGenericTask = lowerGoal.includes('general task') || lowerGoal.includes('idle');

                     if (!isCriticalGoal || isGenericTask) {
                        cell.status = 'sleeping';
                        _addHistoryEntry(cell, { type: 'status', text: `Entering sleep due to inactivity/generic goal.` });
                        return;
                     } else {
                         _addHistoryEntry(cell, { type: 'decision', text: `Staying awake despite inactivity due to critical goal: ${cell.goal}.` });
                         cell.lastActiveTick = state.tickCount;
                     }
                 } else {
                     _addHistoryEntry(cell, { type: 'decision', text: `Staying awake despite inactivity (waiting=${isWaiting}, needsHelp=${needsHelp}).` });
                     cell.lastActiveTick = state.tickCount;
                 }
           }

           if (cell.status === 'active') {
                if (state.tickCount % 20 === 0 && Math.random() < 0.1) {
                    _addHistoryEntry(cell, { type: 'decision', text: `Internal check at age ${cell.age}. Status: OK.` });
                     cell.lastActiveTick = state.tickCount;
                }

                if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) {
                    get().addCell(cell.id);
                    cell.lastActiveTick = state.tickCount;
                }
           }

        });
         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }

        Object.values(state.cells).forEach(cell => {
             if (!cell || !cell.isAlive || cell.status !== 'active') return;

             let avgX = 0, avgY = 0, count = 0;
             let repulsionX = 0, repulsionY = 0;
             const REPULSION_RADIUS = 40;
             const REPULSION_STRENGTH = 0.5;

             cell.likedCells.forEach(likedId => {
                 const likedCell = state.cells[likedId];
                 if (likedCell?.isAlive && likedCell.status === 'active') {
                     avgX += likedCell.position.x;
                     avgY += likedCell.position.y;
                     count++;
                 }
             });

             Object.values(state.cells).forEach(otherCell => {
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
             const driftStrength = MOVE_STEP * 0.1;
             moveX += Math.cos(driftAngle) * driftStrength;
             moveY += Math.sin(driftAngle) * driftStrength;
             moved = true;

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

                 if (!cell.positionHistory) cell.positionHistory = [];
                 cell.positionHistory.push({ x: cell.position.x, y: cell.position.y });
                 if (cell.positionHistory.length > POSITION_HISTORY_LIMIT) {
                     cell.positionHistory.shift();
                 }

                 cell.version = (cell.version ?? 0) + 1;
                 cell.lastActiveTick = state.tickCount;
             }

             const originalLikedCount = cell.likedCells.length;
             cell.likedCells = cell.likedCells.filter(id => state.cells[id]);
         });
      });
    },

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
                assignedRole = {
                     expertise: customExpertise,
                     goal: parentCell ? parentCell.goal : `Utilize ${customExpertise.split(' ')[0]} expertise effectively.`
                 };
            } else if (parentCell) {
                 assignedRole = { expertise: parentCell.expertise, goal: parentCell.goal };
            } else {
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
                 }, predefinedRoles[0]);

                  if (!assignedRole) {
                     assignedRole = { expertise: "Generic Worker", goal: "Perform general tasks" };
                     console.warn("Could not determine least represented role, assigning Generic Worker.");
                  }
            }

            if (!assignedRole) {
                console.error("Failed to assign a role to the new cell.");
                return;
            }

            const newCell: Cell = {
                id: newCellId,
                age: 0,
                expertise: assignedRole.expertise,
                goal: assignedRole.goal,
                position,
                positionHistory: [position],
                isAlive: true,
                status: 'active',
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

     sendMessage: async (sourceId: CellId | 'user', targetId: CellId | 'broadcast' | 'user', content: string) => {
        const messageId = nanoid();
        const timestamp = Date.now();
        let route: CellId[] | undefined = undefined;
        let finalTargetId = targetId;
        let reasoning = "Direct message.";
        let messagesToAdd: Message[] = [];

        const queueMessage = (message: Message) => {
             messagesToAdd.push(message);
         };

        try {
            const allCells = get().cells;
            const cellExpertise = Object.fromEntries(
                Object.values(allCells).filter(c => c?.isAlive && c.status === 'active').map(c => [c!.id, c!.expertise])
            );
            const cellConnections = get().getCellConnections();

            const targetCellInitial = allCells[targetId as CellId];
            const needsRouting = (targetId !== 'broadcast' && targetId !== 'user') &&
                                 ( (sourceId === 'user' || content.length > 50) || (targetCellInitial?.status === 'sleeping') );

            if (needsRouting && targetId !== 'broadcast' && targetId !== 'user') {
                const startCellId = (sourceId === 'user')
                    ? Object.values(allCells).find(c => c?.isAlive && c.status === 'active')?.id
                    : sourceId;

                if (!startCellId || !allCells[startCellId]?.isAlive) {
                    console.error("Cannot route message: No valid active starting cell found.");
                    if (sourceId === 'user') {
                        queueMessage({ id: messageId, sourceCellId: 'user', targetCellId: 'user', content: `Error: Could not find an active cell to start routing message to ${targetId}`, timestamp });
                    }
                     set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                    return;
                }

                const targetCellExists = allCells[targetId as CellId];
                if (!targetCellExists) {
                    console.error(`Cannot route message: Target cell ${targetId} does not exist.`);
                     if (sourceId === 'user') {
                         queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${targetId} does not exist.`, timestamp: Date.now() });
                     }
                     set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                    return;
                }


                try {
                    const input: RouteMessageInput = { message: content, targetCellId: targetId, currentCellId: startCellId, cellExpertise, cellConnections, networkCondition: "Normal" };
                    console.log("Calling routeMessage with:", input);
                    const result: RouteMessageOutput = await routeMessage(input);
                    console.log("routeMessage result:", result);
                    route = result.route;
                    reasoning = result.reasoning;
                    console.log(`AI Route from ${startCellId} to ${targetId}:`, route, "Reason:", reasoning);

                    if (route && route.length > 1) {
                        const finalDestination = route[route.length - 1];
                        const destinationCell = get().getCellById(finalDestination);

                        if (!destinationCell) {
                             console.warn(`AI route destination ${finalDestination} does not exist. Message dropped.`);
                             reasoning += " (Destination vanished)";
                             set(state => {
                                 const start = state.cells[startCellId];
                                 if(start) _addHistoryEntry(start, {type: 'decision', text: `Routing failed to ${finalDestination} (vanished). Reason: ${reasoning}`});
                             });
                             route = undefined;
                             finalTargetId = targetId;
                        } else {
                            finalTargetId = finalDestination;
                            queueMessage({ id: messageId, sourceCellId: sourceId, targetCellId: finalDestination, content, timestamp, route });
                            set(state => {
                                if (sourceId !== 'user' && state.cells[sourceId]) {
                                    _addHistoryEntry(state.cells[sourceId]!, { type: 'message', text: `Sent (via route): "${content.substring(0,30)}..." towards ${finalDestination}. AI Reason: ${reasoning.substring(0, 50)}` });
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
                                 handleHopReception(set, hopTargetId, hopSourceId, content, i === route.length - 2, (shouldStop) => stopPropagation = shouldStop);
                            }


                            setTimeout(() => get().clearMessages(), 3000);
                             set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                            return;
                        }
                    } else {
                        console.log("AI routing resulted in direct message or failed to find a path.");
                        reasoning = route && route.length <= 1 ? result.reasoning : "AI routing failed or no path, sending directly/broadcast.";
                        finalTargetId = targetId;
                    }

                } catch (routingError) {
                    console.error("Error in sendMessage calling routeMessage:", routingError);
                    reasoning = "AI routing error, sending directly/broadcast.";
                     if (sourceId === 'user') {
                          queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error routing message: ${routingError instanceof Error ? routingError.message : 'Unknown error'}`, timestamp: Date.now() });
                     }
                    finalTargetId = targetId;
                }
            }

            // --- Direct Message or Broadcast Handling (Fallback/Default) ---
            const newMessage: Message = { id: messageId, sourceCellId: sourceId, targetCellId: finalTargetId, content, timestamp };
            queueMessage(newMessage);

            set(state => {
                if (sourceId !== 'user' && state.cells[sourceId]) {
                    _addHistoryEntry(state.cells[sourceId]!, { type: 'message', text: `Sent: "${content.substring(0,30)}..." to ${finalTargetId}. Reason: ${reasoning.substring(0,50)}` });
                    state.cells[sourceId]!.status = 'active';
                    state.cells[sourceId]!.lastActiveTick = state.tickCount;
                }

                if (finalTargetId === 'broadcast') {
                    Object.values(state.cells).forEach(cell => {
                        if (!cell) return;
                        if (content.toLowerCase().trim() === 'color all sensors green' && cell.expertise.endsWith('Sensor') && cell.isAlive) {
                            cell.indicatorColor = 'green';
                            cell.version = (cell.version ?? 0) + 1;
                            _addHistoryEntry(cell, { type: 'config', text: `Indicator set to green by broadcast.` });
                        } else if (content.toLowerCase().trim() === 'reset sensor color' && cell.expertise.endsWith('Sensor') && cell.isAlive) {
                            delete cell.indicatorColor;
                            cell.version = (cell.version ?? 0) + 1;
                            _addHistoryEntry(cell, { type: 'config', text: `Indicator color reset by broadcast.` });
                        } else if (cell.isAlive) {
                             if (cell.status === 'sleeping') {
                                cell.status = 'active';
                                cell.lastActiveTick = state.tickCount;
                                _addHistoryEntry(cell, { type: 'status', text: `Woken up by broadcast from ${sourceId}.` });
                             } else {
                                cell.lastActiveTick = state.tickCount;
                             }
                             if (cell.id !== sourceId) {
                                _addHistoryEntry(cell, { type: 'message', text: `Received broadcast from ${sourceId}: "${content.substring(0,30)}..."` });
                                handleMessageReceptionLogic(cell, sourceId, content, state, set);
                             }
                        }
                    });
                } else if (finalTargetId !== 'user') {
                    const targetCell = state.cells[finalTargetId];
                    if (targetCell?.isAlive) {
                        _addHistoryEntry(targetCell, { type: 'message', text: `Received from ${sourceId}: "${content.substring(0,30)}..."` });
                        handleMessageReceptionLogic(targetCell, finalTargetId === sourceId ? 'self' : sourceId, content, state, set);
                    } else {
                        console.warn(`Direct message target ${finalTargetId} is not alive. Message dropped.`);
                        if (sourceId === 'user') {
                            queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${finalTargetId.substring(0,6)} is not responding (dead).`, timestamp: Date.now() });
                        } else if (state.cells[sourceId]) {
                            _addHistoryEntry(state.cells[sourceId]!, { type: 'decision', text: `Message to ${finalTargetId} failed (target dead).` });
                        }
                    }
                } else if (finalTargetId === 'user') {
                   console.log(`Message to User Interface from ${sourceId}: ${content}`);
                   const msgToUpdate = messagesToAdd.find(m => m.id === messageId && m.targetCellId === 'user');
                   if (msgToUpdate) {
                     msgToUpdate.sourceCellId = sourceId;
                   }
                }
                 messagesToAdd.forEach(msg => state.messages.push(msg));
            });

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

            set((state) => {
                 currentTick = state.tickCount;
                 requestingCell = state.cells[requestingCellId];
                 if(requestingCell) {
                     _addHistoryEntry(requestingCell, { type: 'message', text: `Asking neighbors for help: "${requestText}"` });
                     if (requestingCell.status === 'sleeping') {
                        requestingCell.status = 'active';
                        _addHistoryEntry(requestingCell, { type: 'status', text: `Woke up to ask for help.` });
                     }
                     requestingCell.lastActiveTick = currentTick;
                 } else {
                     console.warn(`askForHelp initial: Requesting cell ${requestingCellId} not found.`);
                 }
            });

             requestingCell = get().getCellById(requestingCellId);

            if (!requestingCell || !requestingCell.isAlive) {
                 console.warn(`askForHelp: Requesting cell ${requestingCellId} not found or dead after initial set.`);
                 return;
            }

            const neighbors = get().getNeighbors(requestingCellId, 150);
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
                        const helpMessageContent = `Need help with: ${requestText}. AI suggested your expertise in '${expert.expertise}' might be relevant.`;
                        setTimeout(() => get().sendMessage(requestingCellId, expert.cellId, helpMessageContent), 10);

                        set(state => {
                            const cell = state.cells[requestingCellId];
                            const expertCell = state.cells[expert.cellId];
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
                     setTimeout(() => get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`), 10);
                }

            } catch (interpretError) {
                console.error("Error in askForHelp calling cellHelpRequestInterpretation:", interpretError);
                set(state => {
                     const cell = state.cells[requestingCellId];
                     if(cell) _addHistoryEntry(cell, { type: 'decision', text: `Error asking AI for help. Broadcasting request.` });
                });
                setTimeout(() => get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`), 10);
                throw new Error(`AI help interpretation failed: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`);
            }
        } catch (error) {
             console.error("Unhandled error in askForHelp:", error);
             throw error;
        }
    },


    reduceCellAge: (cellId, amount) => {
      set(state => {
        const cell = state.cells[cellId];
        if (cell && cell.isAlive) {
          const oldAge = cell.age;
          cell.age = Math.max(0, cell.age - amount);
          _addHistoryEntry(cell, { type: 'config', text: `Age reduced by ${amount} (from ${oldAge} to ${cell.age}).` });
          cell.version = (cell.version ?? 0) + 1;
        } else {
          console.warn(`Attempted to reduce age for non-existent or dead cell: ${cellId}`);
        }
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

     getCellConnections: (): Record<CellId, CellId[]> => {
        const connections: Record<CellId, CellId[]> = {};
        const allCells = Object.values(get().cells);
        const connectionRadius = 150;

        allCells.forEach(cell => {
            if (!cell || !cell.isAlive) return;
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
const handleMessageReceptionLogic = (
    targetCell: Cell | undefined,
    sourceId: CellId | 'user' | 'self',
    content: string,
    state: NetworkStore,
    set: SetState
) => {
     if (!targetCell || !targetCell.isAlive) return;

     set(draft => {
         const mutableTargetCell = draft.cells[targetCell.id];
         if (!mutableTargetCell) return;

         const wasSleeping = mutableTargetCell.status === 'sleeping';
         mutableTargetCell.lastActiveTick = draft.tickCount;

         if (wasSleeping) {
             mutableTargetCell.status = 'active';
             _addHistoryEntry(mutableTargetCell, { type: 'status', text: `Woken up by message from ${sourceId}.` });
         }

         let responseToSend: { targetId: CellId | 'user' | 'self', content: string } | null = null;

          const lowerContentTrimmed = content.toLowerCase().trim();
          if (lowerContentTrimmed === 'color all sensors green' && mutableTargetCell.expertise.endsWith('Sensor')) {
              mutableTargetCell.indicatorColor = 'green';
              mutableTargetCell.version = (mutableTargetCell.version ?? 0) + 1;
              _addHistoryEntry(mutableTargetCell, { type: 'config', text: `Indicator set to green by ${sourceId}.` });
              return;
          }
           if (lowerContentTrimmed === 'reset sensor color' && mutableTargetCell.expertise.endsWith('Sensor')) {
              delete mutableTargetCell.indicatorColor;
              mutableTargetCell.version = (mutableTargetCell.version ?? 0) + 1;
              _addHistoryEntry(mutableTargetCell, { type: 'config', text: `Indicator color reset by ${sourceId}.` });
              return;
          }

         if (content.toLowerCase().trim() === 'purpose?') {
             const responseContent = `My Purpose: ${mutableTargetCell.goal}. My Expertise: ${mutableTargetCell.expertise}. (Age: ${mutableTargetCell.age}, Status: ${mutableTargetCell.status})`;
             _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Responding to purpose query from ${sourceId}.` });
             responseToSend = { targetId: sourceId, content: responseContent };
         }
         else if (content.startsWith('Need help with:') && sourceId !== mutableTargetCell.id && sourceId !== 'user' ) {
             const requestText = content.substring(content.indexOf(':')+1).trim();
             const expertiseMentionRegex = /expertise in '([^']+)'/;
             const match = content.match(expertiseMentionRegex);
             const mentionedExpertise = match ? match[1] : null;

             if (mentionedExpertise && mutableTargetCell.expertise.toLowerCase() === mentionedExpertise.toLowerCase()) {
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received relevant help request from ${sourceId}. Considering.` });
                   if (mutableTargetCell.status === 'active' && mutableTargetCell.goal.toLowerCase().includes(mutableTargetCell.expertise.split(" ")[0].toLowerCase())) {
                         const helpResponse = `Cell ${mutableTargetCell.id}: Acknowledged help request re: ${mentionedExpertise}. I might be able to assist.`;
                         responseToSend = { targetId: sourceId, content: helpResponse };
                         _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Offering help to ${sourceId}.` });
                   } else {
                        _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Cannot offer help to ${sourceId} currently (status: ${mutableTargetCell.status} / goal mismatch).` });
                   }
             } else if (!mentionedExpertise && wasSleeping) {
                   _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Woken by generic help request from ${sourceId}.` });
             }
         }
         else if (sourceId !== 'user' && sourceId !== 'self') {
             const lowerContent = content.toLowerCase();
             const sourceCell = draft.cells[sourceId];

             if (sourceCell?.isAlive) {
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

         if (mutableTargetCell.status === 'active') {
             if (mutableTargetCell.expertise === 'Data Analyzer' && content.startsWith('Analyze:')) {
                  const dataToAnalyze = content.substring(8).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received analysis request from ${sourceId} for: "${dataToAnalyze.substring(0,20)}..."` });
                  setTimeout(() => {
                        const analysisResult = `Analyzed data "${dataToAnalyze.substring(0,10)}...". Finding: ${Math.random() > 0.5 ? 'Anomaly Detected' : 'Nominal'}.`;
                         useNetworkStore.setState(innerDraft => {
                             const cell = innerDraft.cells[mutableTargetCell!.id];
                             if(cell) {
                                 _addHistoryEntry(cell, {type: 'decision', text: analysisResult});
                                 cell.lastActiveTick = innerDraft.tickCount;
                             }
                         });
                         useNetworkStore.getState().sendMessage(mutableTargetCell!.id, sourceId, `Analysis Result: ${analysisResult}`);
                  }, 1000 + Math.random() * 1000);

             } else if (mutableTargetCell.expertise === 'Task Router' && content.startsWith('Route Task:')) {
                  const taskDescription = content.substring(11).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received task routing request from ${sourceId}: "${taskDescription.substring(0,20)}..."` });
                  const neighbors = useNetworkStore.getState().getNeighbors(mutableTargetCell.id, 150);
                  let routed = false;
                  for (const neighbor of neighbors) {
                       if (neighbor.isAlive && neighbor.status === 'active' && taskDescription.toLowerCase().includes(neighbor.expertise.split(' ')[0].toLowerCase())) {
                           _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Routing task "${taskDescription.substring(0,10)}..." to ${neighbor.id} (${neighbor.expertise})` });
                           setTimeout(()=> useNetworkStore.getState().sendMessage(mutableTargetCell!.id, neighbor.id, `Task from ${sourceId}: ${taskDescription}`), 10);
                           routed = true;
                            mutableTargetCell.lastActiveTick = draft.tickCount;
                           break;
                       }
                   }
                   if (!routed) {
                        _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not find suitable *active* neighbor for task: "${taskDescription.substring(0,20)}...".` });
                   }
             }
              else if (mutableTargetCell.expertise.endsWith('Sensor') && content.toLowerCase().trim() === 'report status') {
                   const sensorReading = Math.random() * 100;
                   const report = `Sensor ${mutableTargetCell.id} (${mutableTargetCell.expertise}): Reading = ${sensorReading.toFixed(2)}`;
                   _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Reporting status to ${sourceId}: ${report}` });
                   responseToSend = { targetId: sourceId, content: report };
                   mutableTargetCell.lastActiveTick = draft.tickCount;
              }


         }


          if (responseToSend) {
             const { targetId: responseTargetId, content: responseContent } = responseToSend;
             if (responseTargetId !== 'user' && responseTargetId !== 'self') {
                  const originalSourceCell = draft.cells[responseTargetId];
                  if (originalSourceCell?.isAlive) {
                      setTimeout(() => useNetworkStore.getState().sendMessage(mutableTargetCell!.id, responseTargetId, responseContent), 10);
                  } else {
                      console.warn(`Original source ${responseTargetId} is dead/gone, cannot send response from ${mutableTargetCell!.id}`);
                      _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not respond to ${responseTargetId}, cell is dead/gone.` });
                  }
             } else if (responseTargetId === 'user') {
                 setTimeout(() => useNetworkStore.getState().sendMessage(mutableTargetCell!.id, 'user', responseContent), 10);
             }
         }
     });
};


// Helper to handle reception during a route hop, managing state updates
const handleHopReception = (
    set: SetState,
    targetCellId: CellId,
    sourceCellId: CellId,
    content: string,
    isFinalDestination: boolean,
    setStopPropagation: (stop: boolean) => void
) => {
    set(state => {
        const targetCell = state.cells[targetCellId];

        if (targetCell?.isAlive) {
            const wasSleeping = targetCell.status === 'sleeping';
            targetCell.lastActiveTick = state.tickCount;
            if (wasSleeping) {
                targetCell.status = 'active';
                 _addHistoryEntry(targetCell, { type: 'status', text: `Woken up by routed message from ${sourceCellId}.` });
            }

            _addHistoryEntry(targetCell, { type: 'message', text: `Received (route hop): "${content.substring(0, 20)}..." from ${sourceCellId}` });

            if (isFinalDestination) {
                 handleMessageReceptionLogic(targetCell, sourceCellId, content, state, set);
            }
        } else {
            console.warn(`Route hop target ${targetCellId} is dead/gone. Stopping message propagation.`);
            if (state.cells[sourceCellId]) {
                _addHistoryEntry(state.cells[sourceCellId]!, {type: 'decision', text: `Route stopped, target ${targetCellId} dead/gone.`})
            }
            setStopPropagation(true);
        }
    });
};


// --- Initialize with a set number of cells ---
if (typeof window !== 'undefined' && Object.keys(useNetworkStore.getState().cells).length === 0) {
    useNetworkStore.getState().initializeNetwork(10);
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
        stopAutoTick();
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

if (typeof window !== 'undefined') {
    if (!tickInterval) {
        startAutoTick();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopAutoTick);
}

    