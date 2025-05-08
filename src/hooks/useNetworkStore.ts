
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
const EVENT_GENERATION_INTERVAL = 15; // Generate event roughly every 15 ticks

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
    // Add the new role
    { expertise: 'Event Generator', goal: 'Inject realistic events and tasks into the network' },
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
        console.warn("Cell history array is not extensible. Recreating for cell:", cell.id);
        cell.history = [...cell.history]; // Create a new, extensible array
        // return;
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
         if (error instanceof TypeError && (error.message.includes("not extensible") || error.message.includes("Cannot add property"))) {
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
type GetState = () => NetworkStore;


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

        // Ensure at least one Event Generator if possible
        let hasEventGenerator = false;
        const eventGenRole = predefinedRoles.find(r => r.expertise === 'Event Generator');

        for (let i = 0; i < numCells; i++) {
          const id = nanoid(8);
          const position = getRandomPosition(initialPositions);
          initialPositions.push(position);
          let role: { expertise: string; goal: string; };

          // Assign Event Generator role to the first cell if not already assigned
          if (i === 0 && eventGenRole && !hasEventGenerator) {
              role = eventGenRole;
              hasEventGenerator = true;
          } else {
              const roleIndex = i % predefinedRoles.length;
              role = predefinedRoles[roleIndex];
              // Prevent duplicate Event Generator if assigned later by modulo
              if (role.expertise === 'Event Generator' && hasEventGenerator) {
                  role = predefinedRoles[(i + 1) % predefinedRoles.length]; // Assign next role
              } else if (role.expertise === 'Event Generator') {
                  hasEventGenerator = true;
              }
          }


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
            history: [], // Ensure history is initialized as an empty array
          };
          _addHistoryEntry(newCell, { type: 'init', text: `Initialized with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}` });
          state.cells[id] = newCell;
        }

         // If no Event Generator was added (e.g., count was 0 or roles cycled perfectly), add one now if possible
         if (!hasEventGenerator && eventGenRole && Object.keys(state.cells).length < MAX_CELLS) {
            const id = nanoid(8);
            const position = getRandomPosition(initialPositions);
            initialPositions.push(position);
            const newCell: Cell = {
                id,
                age: 0,
                expertise: eventGenRole.expertise,
                goal: eventGenRole.goal,
                position,
                positionHistory: [position],
                isAlive: true,
                status: 'active',
                lastActiveTick: 0,
                version: 1,
                likedCells: [],
                history: [],
            };
            _addHistoryEntry(newCell, { type: 'init', text: `Initialized (as Event Generator) with Expertise: ${newCell.expertise}, Goal: ${newCell.goal}` });
            state.cells[id] = newCell;
            console.log("Added dedicated Event Generator cell.");
         } else if (!hasEventGenerator && eventGenRole && Object.keys(state.cells).length > 0) {
            // If max cells reached, replace the last added cell with event generator
            const cellIds = Object.keys(state.cells);
            const lastCellId = cellIds[cellIds.length - 1];
            if (state.cells[lastCellId] && state.cells[lastCellId]?.expertise !== 'Event Generator') {
                 const replacedCell = state.cells[lastCellId]!;
                 replacedCell.expertise = eventGenRole.expertise;
                 replacedCell.goal = eventGenRole.goal;
                 _addHistoryEntry(replacedCell, { type: 'config', text: `Reassigned as Event Generator.` });
                 console.log(`Replaced cell ${lastCellId} with Event Generator.`);
            }
         }


         state.purpose = `Network initialized with ${Object.keys(state.cells).length} specialized cells working towards various goals.`;
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
        const allLiveCells = Object.values(state.cells).filter(c => c?.isAlive);
        const allLiveExpertise = [...new Set(allLiveCells.filter(c => c).map(c => c!.expertise))];

        allLiveCells.forEach((cell) => {
          if (!cell) return; // Should not happen with filter, but belts and braces
          cell.age += 1;
          cell.version = (cell.version ?? 0) + 1; // Increment version each tick for reactivity

           if (cell.age > MAX_AGE) {
               cell.isAlive = false;
               cell.status = 'sleeping'; // Dead cells are effectively sleeping visually
               _addHistoryEntry(cell, { type: 'death', text: `Died of old age (${cell.age}).` });
               console.log(`Cell ${cell.id} died.`);
               return; // Stop processing for this dead cell
           }

          // --- Sleeping Logic ---
          if (cell.status === 'sleeping') {
             if (Math.random() < RANDOM_WAKE_CHANCE) {
                 cell.status = 'active';
                 cell.lastActiveTick = state.tickCount;
                 _addHistoryEntry(cell, { type: 'status', text: `Woke up spontaneously.` });
             } else {
                 return; // Stop processing for sleeping cell
             }
          }

          // --- Active Cell Logic ---
           if (state.tickCount - cell.lastActiveTick > SLEEP_THRESHOLD && Math.random() < SLEEP_CHANCE_ON_TICK) {
                const recentMessages = cell.history.slice(-5);
                const isWaiting = recentMessages.some(h => h.type === 'message' && h.text.startsWith('Sent') && !recentMessages.some(rh => rh.type === 'message' && rh.text.startsWith('Received from')));
                const needsHelp = recentMessages.some(h => h.type === 'message' && h.text.startsWith('Asking neighbors for help') && !recentMessages.some(rh => rh.type === 'message' && rh.text.startsWith('Offering help to')));

                 if (!isWaiting && !needsHelp) {
                     const lowerGoal = cell.goal.toLowerCase();
                     // Keep essential roles awake more often
                     const isCriticalGoal = lowerGoal.includes('monitor') || lowerGoal.includes('security') || lowerGoal.includes('alert') || lowerGoal.includes('coordinate') || lowerGoal.includes('event');
                     const isGenericTask = lowerGoal.includes('general task') || lowerGoal.includes('idle');

                     if (!isCriticalGoal || isGenericTask) {
                        cell.status = 'sleeping';
                        _addHistoryEntry(cell, { type: 'status', text: `Entering sleep due to inactivity/generic goal.` });
                        return; // Go to sleep
                     } else {
                         _addHistoryEntry(cell, { type: 'decision', text: `Staying awake despite inactivity due to critical goal: ${cell.goal}.` });
                         cell.lastActiveTick = state.tickCount; // Reset inactivity timer
                     }
                 } else {
                     _addHistoryEntry(cell, { type: 'decision', text: `Staying awake despite inactivity (waiting=${isWaiting}, needsHelp=${needsHelp}).` });
                     cell.lastActiveTick = state.tickCount; // Reset inactivity timer
                 }
           } else if (cell.status === 'active') {
                 // Keep track of last active tick for active cells too
                 cell.lastActiveTick = state.tickCount;
           }

           if (cell.status === 'active') {
                // --- Event Generation Logic ---
                if (cell.expertise === 'Event Generator' && state.tickCount % EVENT_GENERATION_INTERVAL === 0 && Math.random() < 0.7) {
                    const eventType = Math.random();
                    let eventContent = '';
                    let targetId: CellId | 'broadcast' | 'user' = 'broadcast';

                    const potentialTargets = allLiveCells.filter(c => c && c.id !== cell.id && c.status === 'active');

                    if (eventType < 0.4 && potentialTargets.length > 0) { // Target specific expertise
                        const randomExpertise = allLiveExpertise[Math.floor(Math.random() * allLiveExpertise.length)];
                        const targetCell = potentialTargets.find(c => c!.expertise === randomExpertise);
                        if (targetCell) {
                             eventContent = `Route Task: New task requiring ${randomExpertise} skills. Details: ${nanoid(5)}`;
                             targetId = targetCell.id;
                             _addHistoryEntry(cell, { type: 'decision', text: `Generating task for ${randomExpertise} targeting ${targetId}` });
                        } else {
                            eventContent = `Broadcast: General network query - looking for ${randomExpertise}. ID: ${nanoid(5)}`;
                            targetId = 'broadcast';
                            _addHistoryEntry(cell, { type: 'decision', text: `Generating broadcast query for ${randomExpertise}` });
                        }
                    } else if (eventType < 0.7) { // Generate general broadcast event
                        const eventDescriptions = ["Network status update required.", "Potential anomaly detected.", "Resource check requested.", "System-wide coordination needed."];
                        eventContent = `Broadcast: ${eventDescriptions[Math.floor(Math.random() * eventDescriptions.length)]} ID: ${nanoid(5)}`;
                        targetId = 'broadcast';
                        _addHistoryEntry(cell, { type: 'decision', text: `Generating broadcast event: ${eventContent}` });
                    } else { // Generate internal event for self
                        eventContent = `Internal Task: Recalibrating generation parameters. ID: ${nanoid(5)}`;
                        targetId = cell.id; // Target self
                        _addHistoryEntry(cell, { type: 'decision', text: `Generating internal task for self.` });
                    }

                    // Use setTimeout to avoid issues with modifying state during iteration/triggering other actions directly
                    setTimeout(() => get().sendMessage(cell.id, targetId, eventContent), 5);
                }


                // --- Cloning Logic ---
                if (cell.age > 15 && cell.age % 25 === 0 && Object.keys(state.cells).length < MAX_CELLS && Math.random() < 0.2) {
                    get().addCell(cell.id);
                    // lastActiveTick updated within addCell if parent exists
                }

                 // --- Movement Logic ---
                let avgX = 0, avgY = 0, count = 0;
                let repulsionX = 0, repulsionY = 0;
                const REPULSION_RADIUS = 40;
                const REPULSION_STRENGTH = 0.5;

                cell.likedCells.forEach(likedId => {
                    const likedCell = state.cells[likedId];
                    // Attracted to alive cells (active or sleeping)
                    if (likedCell?.isAlive) {
                        avgX += likedCell.position.x;
                        avgY += likedCell.position.y;
                        count++;
                    }
                });

                // Repulsed by other nearby active cells only
                allLiveCells.forEach(otherCell => {
                    if (!otherCell || otherCell.id === cell.id || otherCell.status !== 'active') return;
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

                // Attraction towards liked cells
                if (count > 0) {
                    avgX /= count;
                    avgY /= count;
                    const attractDX = avgX - cell.position.x;
                    const attractDY = avgY - cell.position.y;
                    const attractDist = Math.sqrt(attractDX * attractDX + attractDY * attractDY);

                    // Only move if significantly far from average liked position
                    if (attractDist > MOVE_STEP / 4) { // Reduced threshold to encourage movement
                        moveX += (attractDX / attractDist) * (MOVE_STEP * 0.5); // Strength of attraction
                        moved = true;
                    }
                }

                // Random drift
                const driftAngle = Math.random() * 2 * Math.PI;
                const driftStrength = MOVE_STEP * 0.2; // Increased drift
                moveX += Math.cos(driftAngle) * driftStrength;
                moveY += Math.sin(driftAngle) * driftStrength;
                moved = true; // Always allow some drift

                // Apply movement if needed
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
                     // Only add to history if position actually changed significantly
                     const lastPos = cell.positionHistory[cell.positionHistory.length - 1];
                     if (!lastPos || Math.abs(lastPos.x - cell.position.x) > 0.1 || Math.abs(lastPos.y - cell.position.y) > 0.1) {
                        cell.positionHistory.push({ x: cell.position.x, y: cell.position.y });
                        if (cell.positionHistory.length > POSITION_HISTORY_LIMIT) {
                            cell.positionHistory.shift();
                        }
                     }

                    // cell.version incremented at start of tick processing now
                    // cell.lastActiveTick = state.tickCount; // Updated earlier
                }

                // Prune dead liked cells
                 const originalLikedCount = cell.likedCells.length;
                 cell.likedCells = cell.likedCells.filter(id => state.cells[id]?.isAlive);
                 if (cell.likedCells.length !== originalLikedCount) {
                    _addHistoryEntry(cell, { type: 'decision', text: `Pruned ${originalLikedCount - cell.likedCells.length} dead liked cells.` });
                 }
           } // End active cell logic
        }); // End forEach cell

         const MAX_MESSAGES_DISPLAYED = 50;
         if (state.messages.length > MAX_MESSAGES_DISPLAYED) {
            state.messages = state.messages.slice(-MAX_MESSAGES_DISPLAYED);
         }
      }); // End set state for tick
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

                 // Find the role with the minimum count, excluding Event Generator unless it's the only option left
                 let minRole = predefinedRoles[0];
                 let minCount = Infinity;

                 for (const role of predefinedRoles) {
                    if (role.expertise === 'Event Generator' && Object.keys(state.cells).some(id => state.cells[id]?.expertise === 'Event Generator')) {
                        continue; // Skip Event Generator if one already exists
                    }
                     const count = currentExpertiseCounts[role.expertise] || 0;
                     if (count < minCount) {
                         minCount = count;
                         minRole = role;
                     }
                 }
                 assignedRole = minRole;


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
                 parentCell.status = 'active'; // Cloning makes the parent active
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
        const get = useNetworkStore.getState; // Get a reference to get
        const set = useNetworkStore.setState; // Get a reference to set

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
             // Routing conditions: specific target (not broadcast/user), and either from user, long message, or target is sleeping
            const needsRouting = (targetId !== 'broadcast' && targetId !== 'user') &&
                                 (sourceId === 'user' || content.length > 50 || targetCellInitial?.status === 'sleeping');


            if (needsRouting && targetId !== 'broadcast' && targetId !== 'user') {
                 // Determine the starting cell for routing
                 let startCellId: CellId | undefined;
                 if (sourceId === 'user') {
                     // Find any active cell, prefer non-sleeping if possible
                     startCellId = Object.values(allCells).find(c => c?.isAlive && c.status === 'active')?.id ??
                                   Object.values(allCells).find(c => c?.isAlive)?.id; // Fallback to any alive cell
                 } else {
                     startCellId = allCells[sourceId]?.isAlive ? sourceId : undefined;
                 }


                if (!startCellId) {
                    console.error("Cannot route message: No valid starting cell found (source dead or no active cells for user).");
                    if (sourceId === 'user') {
                        queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Could not find an active cell to start routing message to ${targetId}.`, timestamp: Date.now() });
                    }
                    set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); }); // Add potential error message
                    return;
                }

                const targetCellExists = allCells[targetId as CellId];
                if (!targetCellExists) {
                    console.error(`Cannot route message: Target cell ${targetId} does not exist.`);
                     if (sourceId === 'user') {
                         queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${targetId} does not exist.`, timestamp: Date.now() });
                     }
                    set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); }); // Add potential error message
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

                        if (!destinationCell?.isAlive) { // Check if destination is alive
                             console.warn(`AI route destination ${finalDestination} is not alive or doesn't exist. Message dropped.`);
                             reasoning += " (Destination dead/vanished)";
                             set(state => {
                                 const start = state.cells[startCellId!]; // startCellId must be defined here
                                 if(start) _addHistoryEntry(start, {type: 'decision', text: `Routing failed to ${finalDestination} (dead/vanished). Reason: ${reasoning}`});
                             });
                             route = undefined; // Prevent further processing of this route
                             finalTargetId = targetId; // Reset target for potential fallback
                        } else {
                             // Route is valid, process it
                            finalTargetId = finalDestination;
                            queueMessage({ id: messageId, sourceCellId: sourceId, targetCellId: finalDestination, content, timestamp, route });
                            set(state => {
                                if (sourceId !== 'user' && state.cells[sourceId]) {
                                    _addHistoryEntry(state.cells[sourceId]!, { type: 'message', text: `Sent (via route): "${content.substring(0,30)}..." towards ${finalDestination}. AI Reason: ${reasoning.substring(0, 50)}` });
                                    // Sending makes the source active
                                    state.cells[sourceId]!.status = 'active';
                                    state.cells[sourceId]!.lastActiveTick = state.tickCount;
                                }
                            });

                            // Process message reception along the route
                            let stopPropagation = false;
                             // Iterate correctly through hops
                             for (let i = 0; i < route.length - 1; i++) {
                                 if (stopPropagation) break;
                                 const hopSourceId = route[i];
                                 const hopTargetId = route[i + 1];
                                 handleHopReception(set, get, hopTargetId, hopSourceId, content, i === route.length - 2, (shouldStop) => stopPropagation = shouldStop);
                             }


                            setTimeout(() => get().clearMessages(), 3000); // Clear visual message indicator after delay
                             set(state => { messagesToAdd.forEach(msg => state.messages.push(msg)); });
                            return; // Exit sendMessage as route was processed
                        }
                    } else {
                        // AI routing resulted in direct message or failed to find a path.
                        console.log("AI routing resulted in direct message or failed to find a path.");
                        reasoning = route && route.length <= 1 ? result.reasoning : "AI routing failed or no path, sending directly/broadcast.";
                        finalTargetId = targetId; // Ensure target is the original if routing failed
                    }

                } catch (routingError) {
                    console.error("Error in sendMessage calling routeMessage:", routingError);
                    reasoning = "AI routing error, sending directly/broadcast.";
                     if (sourceId === 'user') {
                          queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error routing message: ${routingError instanceof Error ? routingError.message : 'Unknown error'}`, timestamp: Date.now() });
                     }
                    finalTargetId = targetId; // Ensure target is the original on error
                }
            }

            // --- Direct Message or Broadcast Handling (Fallback/Default) ---
            // Use the original sourceId passed to the function
            const newMessage: Message = { id: messageId, sourceCellId: sourceId, targetCellId: finalTargetId, content, timestamp };
            queueMessage(newMessage);

            set(state => {
                // Record sending history if source is a cell
                if (sourceId !== 'user' && state.cells[sourceId]) {
                    _addHistoryEntry(state.cells[sourceId]!, { type: 'message', text: `Sent: "${content.substring(0,30)}..." to ${finalTargetId}. Reason: ${reasoning.substring(0,50)}` });
                     // Sending makes the source active
                    state.cells[sourceId]!.status = 'active';
                    state.cells[sourceId]!.lastActiveTick = state.tickCount;
                }

                // Handle reception based on target
                if (finalTargetId === 'broadcast') {
                    Object.values(state.cells).forEach(cell => {
                        if (!cell) return;
                         // Handle specific broadcast commands
                        if (content.toLowerCase().trim() === 'color all sensors green' && cell.expertise.endsWith('Sensor') && cell.isAlive) {
                            cell.indicatorColor = 'green';
                            _addHistoryEntry(cell, { type: 'config', text: `Indicator set to green by broadcast.` });
                        } else if (content.toLowerCase().trim() === 'reset sensor color' && cell.expertise.endsWith('Sensor') && cell.isAlive) {
                            delete cell.indicatorColor;
                            _addHistoryEntry(cell, { type: 'config', text: `Indicator color reset by broadcast.` });
                         } else if (cell.isAlive && cell.id !== sourceId) { // Generic broadcast reception for alive cells (not source)
                             const wasSleeping = cell.status === 'sleeping';
                             if (wasSleeping) {
                                cell.status = 'active'; // Wake up sleeping cells on broadcast
                                cell.lastActiveTick = state.tickCount;
                                _addHistoryEntry(cell, { type: 'status', text: `Woken up by broadcast from ${sourceId}.` });
                             } else {
                                cell.lastActiveTick = state.tickCount; // Keep active cells active
                             }
                             _addHistoryEntry(cell, { type: 'message', text: `Received broadcast from ${sourceId}: "${content.substring(0,30)}..."` });
                             // Trigger generic reception logic for the broadcast content
                             handleMessageReceptionLogic(cell, sourceId, content, state, set, get);
                        }
                    });
                } else if (finalTargetId !== 'user') { // Direct message to a specific cell
                    const targetCell = state.cells[finalTargetId];
                    if (targetCell?.isAlive) {
                        _addHistoryEntry(targetCell, { type: 'message', text: `Received from ${sourceId}: "${content.substring(0,30)}..."` });
                        // Trigger reception logic
                        handleMessageReceptionLogic(targetCell, finalTargetId === sourceId ? 'self' : sourceId, content, state, set, get);
                    } else {
                        // Target is dead or doesn't exist
                        console.warn(`Direct message target ${finalTargetId} is not alive or invalid. Message dropped.`);
                        if (sourceId === 'user') {
                            queueMessage({ id: nanoid(), sourceCellId: 'user', targetCellId: 'user', content: `Error: Target cell ${finalTargetId.substring(0,6)} is not responding (dead/invalid).`, timestamp: Date.now() });
                        } else if (state.cells[sourceId]) {
                             // Add history to the sender indicating failure
                            _addHistoryEntry(state.cells[sourceId]!, { type: 'decision', text: `Message to ${finalTargetId} failed (target dead/invalid).` });
                        }
                    }
                } else if (finalTargetId === 'user') { // Message intended for UI/debug
                   console.log(`Message to User Interface from ${sourceId}: ${content}`);
                   // Update the message object if needed (e.g., for display purposes)
                   const msgToUpdate = messagesToAdd.find(m => m.id === messageId && m.targetCellId === 'user');
                   if (msgToUpdate) {
                     msgToUpdate.sourceCellId = sourceId; // Ensure source is correctly set
                   }
                }
                 messagesToAdd.forEach(msg => state.messages.push(msg)); // Add all queued messages (original + errors)
            });

            setTimeout(() => { get().clearMessages(); }, 3000); // Clear visual message indicator
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
         const get = useNetworkStore.getState;
         const set = useNetworkStore.setState;
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
                .filter(n => n.isAlive) // Only consider alive neighbors
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
                        // Check if expert cell still exists and is alive before sending message
                         const expertCell = get().getCellById(expert.cellId);
                         if (expertCell?.isAlive) {
                            const helpMessageContent = `Need help with: ${requestText}. AI suggested your expertise in '${expert.expertise}' might be relevant.`;
                            // Use sendMessage which handles routing and activity updates
                             setTimeout(() => get().sendMessage(requestingCellId, expert.cellId, helpMessageContent), 10);

                            set(state => {
                                const cell = state.cells[requestingCellId];
                                const expertCellState = state.cells[expert.cellId]; // Re-fetch within set for consistency
                                if (cell && expertCellState && !cell.likedCells.includes(expert.cellId)) {
                                    cell.likedCells.push(expert.cellId);
                                    _addHistoryEntry(cell, { type: 'decision', text: `Liked cell ${expert.cellId} for potential help.` });
                                }
                            });
                         } else {
                              console.warn(`AI suggested expert ${expert.cellId} is no longer alive. Skipping message.`);
                               set(state => {
                                 const cell = state.cells[requestingCellId];
                                 if(cell) _addHistoryEntry(cell, { type: 'decision', text: `Skipped asking help from ${expert.cellId} (dead/gone).` });
                              });
                         }
                    });
                } else {
                     // No specific expertise found, broadcast
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
                 // Broadcast as fallback on AI error
                setTimeout(() => get().sendMessage(requestingCellId, 'broadcast', `Help needed: ${requestText}`), 10);
                throw new Error(`AI help interpretation failed: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`);
            }
        } catch (error) {
             console.error("Unhandled error in askForHelp:", error);
             throw error; // Re-throw to indicate failure
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
        const connectionRadius = 150; // Connection radius for routing

        allCells.forEach(cell => {
            if (!cell || !cell.isAlive) return;
            connections[cell.id] = get().getNeighbors(cell.id, connectionRadius)
                                       .filter(n => n.isAlive) // Only connect to alive neighbors
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
    set: SetState,
    get: GetState // Pass get for actions like sendMessage
) => {
     if (!targetCell || !targetCell.isAlive) return; // Exit if target is not valid/alive

     set(draft => {
         const mutableTargetCell = draft.cells[targetCell.id];
         if (!mutableTargetCell || !mutableTargetCell.isAlive) return; // Double-check within draft

         const wasSleeping = mutableTargetCell.status === 'sleeping';
         mutableTargetCell.lastActiveTick = draft.tickCount; // Update activity on message reception

         if (wasSleeping) {
             mutableTargetCell.status = 'active';
             _addHistoryEntry(mutableTargetCell, { type: 'status', text: `Woken up by message from ${sourceId}.` });
         }

         let responseToSend: { targetId: CellId | 'user' | 'self', content: string } | null = null;

         // --- Specific Message Handling ---
          const lowerContentTrimmed = content.toLowerCase().trim();
          // Sensor color commands
          if (lowerContentTrimmed === 'color all sensors green' && mutableTargetCell.expertise.endsWith('Sensor')) {
              mutableTargetCell.indicatorColor = 'green';
              _addHistoryEntry(mutableTargetCell, { type: 'config', text: `Indicator set to green by ${sourceId}.` });
              return; // Handled, no further processing needed for this message
          }
           if (lowerContentTrimmed === 'reset sensor color' && mutableTargetCell.expertise.endsWith('Sensor')) {
              delete mutableTargetCell.indicatorColor;
              _addHistoryEntry(mutableTargetCell, { type: 'config', text: `Indicator color reset by ${sourceId}.` });
              return; // Handled
          }

         // Purpose query response
         if (content.toLowerCase().trim() === 'purpose?') {
             const responseContent = `My Purpose: ${mutableTargetCell.goal}. My Expertise: ${mutableTargetCell.expertise}. (Age: ${mutableTargetCell.age}, Status: ${mutableTargetCell.status})`;
             _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Responding to purpose query from ${sourceId}.` });
             responseToSend = { targetId: sourceId, content: responseContent };
         }
         // Help request response logic
         else if (content.startsWith('Need help with:') && sourceId !== mutableTargetCell.id && sourceId !== 'user' ) {
             const requestText = content.substring(content.indexOf(':')+1).trim();
             const expertiseMentionRegex = /expertise in '([^']+)'/;
             const match = content.match(expertiseMentionRegex);
             const mentionedExpertise = match ? match[1] : null;

             // If AI mentioned this cell's specific expertise
             if (mentionedExpertise && mutableTargetCell.expertise.toLowerCase() === mentionedExpertise.toLowerCase()) {
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received relevant help request from ${sourceId}. Considering.` });
                   // Offer help if active and goal seems related (simple check)
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
         // Update liked cells based on sentiment (simple example)
         else if (sourceId !== 'user' && sourceId !== 'self') {
             const lowerContent = content.toLowerCase();
             const sourceCell = draft.cells[sourceId];

             if (sourceCell?.isAlive) {
                 if (lowerContent.includes('thank') || lowerContent.includes('helpful') || lowerContent.includes('good job')) {
                     if (!mutableTargetCell.likedCells.includes(sourceId)) {
                         mutableTargetCell.likedCells.push(sourceId);
                         _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Liked cell ${sourceId} due to positive message.` });
                     }
                 } else if (lowerContent.includes('error') || lowerContent.includes('failed') || lowerContent.includes('bad')) {
                     const index = mutableTargetCell.likedCells.indexOf(sourceId);
                     if (index > -1) {
                         mutableTargetCell.likedCells.splice(index, 1);
                         _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Disliked cell ${sourceId} due to negative message.` });
                     }
                 }
             }
         }

         // --- Role-Specific Message Handling (Active Cells Only) ---
         if (mutableTargetCell.status === 'active') {
             if (mutableTargetCell.expertise === 'Data Analyzer' && content.startsWith('Analyze:')) {
                  const dataToAnalyze = content.substring(8).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received analysis request from ${sourceId} for: "${dataToAnalyze.substring(0,20)}..."` });
                  // Simulate analysis delay and response
                  setTimeout(() => {
                        const analysisResult = `Analyzed data "${dataToAnalyze.substring(0,10)}...". Finding: ${Math.random() > 0.5 ? 'Anomaly Detected' : 'Nominal'}.`;
                         // Use set/get from outer scope for async update
                         set(innerDraft => {
                             const cell = innerDraft.cells[mutableTargetCell!.id];
                             if(cell && cell.isAlive) { // Check if still alive
                                 _addHistoryEntry(cell, {type: 'decision', text: analysisResult});
                                 cell.lastActiveTick = innerDraft.tickCount; // Update activity
                             }
                         });
                         // Send response back using the store's action
                         get().sendMessage(mutableTargetCell!.id, sourceId, `Analysis Result: ${analysisResult}`);
                  }, 1000 + Math.random() * 1000);

             } else if (mutableTargetCell.expertise === 'Task Router' && content.startsWith('Route Task:')) {
                  const taskDescription = content.substring(11).trim();
                  _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Received task routing request from ${sourceId}: "${taskDescription.substring(0,20)}..."` });
                  const neighbors = get().getNeighbors(mutableTargetCell.id, 150);
                  let routed = false;
                  for (const neighbor of neighbors) {
                       // Check if neighbor is alive, active, and seems relevant (simple check)
                       if (neighbor.isAlive && neighbor.status === 'active' && taskDescription.toLowerCase().includes(neighbor.expertise.split(' ')[0].toLowerCase())) {
                           _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Routing task "${taskDescription.substring(0,10)}..." to ${neighbor.id} (${neighbor.expertise})` });
                           // Send message using store action
                           setTimeout(()=> get().sendMessage(mutableTargetCell!.id, neighbor.id, `Task from ${sourceId}: ${taskDescription}`), 10);
                           routed = true;
                           mutableTargetCell.lastActiveTick = draft.tickCount; // Update activity
                           break; // Stop after finding one suitable neighbor
                       }
                   }
                   if (!routed) {
                        _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not find suitable *active* neighbor for task: "${taskDescription.substring(0,20)}...".` });
                        // Optionally, could broadcast or send error back
                   }
             }
              // Sensor reporting status
              else if (mutableTargetCell.expertise.endsWith('Sensor') && content.toLowerCase().trim() === 'report status') {
                   const sensorReading = Math.random() * 100;
                   const report = `Sensor ${mutableTargetCell.id} (${mutableTargetCell.expertise}): Reading = ${sensorReading.toFixed(2)}`;
                   _addHistoryEntry(mutableTargetCell, { type: 'message', text: `Reporting status to ${sourceId}: ${report}` });
                   responseToSend = { targetId: sourceId, content: report };
                   mutableTargetCell.lastActiveTick = draft.tickCount; // Update activity
              }
         } // End role-specific handling


         // --- Send Response if Generated ---
          if (responseToSend) {
             const { targetId: responseTargetId, content: responseContent } = responseToSend;
             if (responseTargetId !== 'user' && responseTargetId !== 'self') {
                  const originalSourceCell = draft.cells[responseTargetId];
                  // Check if the original sender is still alive before responding
                  if (originalSourceCell?.isAlive) {
                      // Use timeout to decouple sending from current tick processing
                      setTimeout(() => get().sendMessage(mutableTargetCell!.id, responseTargetId, responseContent), 10);
                  } else {
                      console.warn(`Original source ${responseTargetId} is dead/gone, cannot send response from ${mutableTargetCell!.id}`);
                      _addHistoryEntry(mutableTargetCell, { type: 'decision', text: `Could not respond to ${responseTargetId}, cell is dead/gone.` });
                  }
             } else if (responseTargetId === 'user') {
                  // Send response to the user interface/debug console
                 setTimeout(() => get().sendMessage(mutableTargetCell!.id, 'user', responseContent), 10);
             }
             // No action needed for targetId === 'self'
         }
     }); // End set state for reception logic
};


// Helper to handle reception during a route hop, managing state updates
const handleHopReception = (
    set: SetState,
    get: GetState, // Pass get for actions
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
            targetCell.lastActiveTick = state.tickCount; // Update activity on hop
            if (wasSleeping) {
                targetCell.status = 'active';
                 _addHistoryEntry(targetCell, { type: 'status', text: `Woken up by routed message from ${sourceCellId}.` });
            }

            _addHistoryEntry(targetCell, { type: 'message', text: `Received (route hop): "${content.substring(0, 20)}..." from ${sourceCellId}` });

            // If this is the final destination, trigger the full reception logic
            if (isFinalDestination) {
                 handleMessageReceptionLogic(targetCell, sourceCellId, content, state, set, get);
            }
        } else {
             // Target cell is dead or gone mid-route
            console.warn(`Route hop target ${targetCellId} is dead/gone. Stopping message propagation.`);
            if (state.cells[sourceCellId]) { // Add history to the sender of this hop
                _addHistoryEntry(state.cells[sourceCellId]!, {type: 'decision', text: `Route stopped, next hop target ${targetCellId} dead/gone.`})
            }
            setStopPropagation(true); // Signal to stop further hops
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

    