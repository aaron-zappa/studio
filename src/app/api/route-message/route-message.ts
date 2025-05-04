'use server';

/**
 * @fileOverview This file defines the intelligent message routing flow for the CellConnect application.
 *
 * It uses GenAI to determine the optimal path for a message through the cellular network based on cell expertise, message content, and network conditions.
 *
 * - `routeMessage` - A function that takes a message and a target cell ID, and returns the optimal route for the message.
 * - `RouteMessageInput` - The input type for the `routeMessage` function.
 * - `RouteMessageOutput` - The return type for the `routeMessage` function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const RouteMessageInputSchema = z.object({
  message: z.string().describe('The content of the message to be routed.'),
  targetCellId: z.string().describe('The ID of the target cell.'),
  currentCellId: z.string().describe('The ID of the current cell.'),
  networkCondition: z.string().optional().describe('The current network conditions, e.g., congestion, cell availability.'),
  cellExpertise: z.record(z.string(), z.string()).describe('A map of cell IDs to their areas of expertise.'),
  cellConnections: z.record(z.string(), z.array(z.string())).describe('A map of cell IDs to the IDs of their connected cells.'),
});

export type RouteMessageInput = z.infer<typeof RouteMessageInputSchema>;

const RouteMessageOutputSchema = z.object({
  route: z.array(z.string()).describe('An array of cell IDs representing the optimal route for the message. The first element must be the currentCellId, and the last must be the targetCellId.'),
  reasoning: z.string().describe('The AI reasoning behind the chosen route.'),
});

export type RouteMessageOutput = z.infer<typeof RouteMessageOutputSchema>;

export async function routeMessage(input: RouteMessageInput): Promise<RouteMessageOutput> {
  // Basic validation: Ensure current and target are not the same if routing is needed
  if (input.currentCellId === input.targetCellId) {
    console.log("Route message: Current and target are the same. No routing needed.");
    return { route: [input.currentCellId], reasoning: "Source and target are the same cell." };
  }

  // Check if target exists and is alive
  if (!input.cellExpertise[input.targetCellId]) {
    console.warn(`Route message: Target cell ${input.targetCellId} does not exist or is not alive.`);
     // Find any alive neighbor as a fallback target for routing attempt
     const neighbors = input.cellConnections[input.currentCellId] || [];
     const fallbackTarget = neighbors.find(neighborId => input.cellExpertise[neighborId]);
     if (fallbackTarget) {
        console.log(`Routing towards neighbor ${fallbackTarget} instead.`);
        input.targetCellId = fallbackTarget; // Modify input for the prompt
     } else {
         console.error(`No alive neighbors found for ${input.currentCellId} to route message.`);
         // Return a minimal route indicating failure to route
         return { route: [input.currentCellId], reasoning: `Target cell ${input.targetCellId} is unreachable and no fallback neighbors found.` };
     }
  }

  console.log("Calling routeMessageFlow with input:", input);
  try {
     const result = await routeMessageFlow(input);
     console.log("routeMessageFlow raw result:", result);

     // --- Post-processing and Validation ---
     if (!result || !result.route || result.route.length === 0) {
       console.warn("AI routing returned empty or invalid route. Falling back to direct connection attempt.");
       // Attempt direct connection if possible, otherwise just the current cell
        const directRoutePossible = input.cellConnections[input.currentCellId]?.includes(input.targetCellId);
        const fallbackRoute = directRoutePossible ? [input.currentCellId, input.targetCellId] : [input.currentCellId];
       return { route: fallbackRoute, reasoning: "AI routing failed or returned invalid route. Attempting direct connection." };
     }

     // Ensure the route starts with the current cell and ends with the target cell
     if (result.route[0] !== input.currentCellId) {
        console.warn("AI route doesn't start with current cell. Prepending.");
        result.route.unshift(input.currentCellId);
     }
      // Validate if the AI's intended target is the actual target or the fallback
     if (result.route[result.route.length - 1] !== input.targetCellId) {
        console.warn(`AI route ends at ${result.route[result.route.length - 1]} instead of ${input.targetCellId}. Attempting to append target if connected.`);
         // Check if the last node in the AI route can connect to the actual target
         const lastAiNodeId = result.route[result.route.length - 1];
         if (input.cellConnections[lastAiNodeId]?.includes(input.targetCellId)) {
             result.route.push(input.targetCellId);
             result.reasoning += " (Appended final target step).";
         } else {
             console.warn(`Cannot append target ${input.targetCellId}. Route might be incomplete.`);
             // Decide how to handle this - maybe fallback to direct or return as is? Returning as is for now.
             result.reasoning += " (Warning: Route may not reach final target).";
         }
     }


     // Ensure all cells in the route exist and are alive (according to input data)
     const validRoute = result.route.filter(cellId => input.cellExpertise[cellId]);
     if (validRoute.length !== result.route.length) {
         console.warn("AI route contains dead or non-existent cells. Filtering them out.");
         // This might break the route continuity, but it's better than failing entirely.
         // A more sophisticated approach might try to re-route or find alternatives.
         result.route = validRoute.length > 0 ? validRoute : [input.currentCellId]; // Fallback if filtering removes everything
         result.reasoning += " (Filtered out invalid cells from route).";
          // Re-validate start/end after filtering
         if (result.route[0] !== input.currentCellId && validRoute.length > 0) result.route.unshift(input.currentCellId);
         if (result.route[result.route.length - 1] !== input.targetCellId && input.cellConnections[result.route[result.route.length-1]]?.includes(input.targetCellId)) {
             result.route.push(input.targetCellId);
         } else if (result.route.length === 1 && result.route[0] === input.currentCellId && input.cellConnections[input.currentCellId]?.includes(input.targetCellId)) {
            // If filtering reduced route to just source, but direct connection exists, use it.
            result.route.push(input.targetCellId);
            result.reasoning = "AI route invalid after filtering. Attempting direct connection.";
         }
     }

     console.log("Validated routeMessageFlow result:", result);
     return result;
  } catch (error) {
      console.error("Error executing routeMessageFlow:", error);
      // Fallback to direct connection attempt if possible
       const directRoutePossible = input.cellConnections[input.currentCellId]?.includes(input.targetCellId);
       const fallbackRoute = directRoutePossible ? [input.currentCellId, input.targetCellId] : [input.currentCellId];
      return { route: fallbackRoute, reasoning: `Error during AI routing: ${error instanceof Error ? error.message : String(error)}. Attempting direct connection.` };
  }
}

const routeMessagePrompt = ai.definePrompt({
  name: 'routeMessagePrompt',
  input: {
    schema: z.object({
      message: z.string().describe('The content of the message to be routed.'),
      targetCellId: z.string().describe('The ID of the target cell.'),
      currentCellId: z.string().describe('The ID of the current cell.'),
      networkCondition: z.string().optional().describe('The current network conditions, e.g., congestion, cell availability.'),
      cellExpertise: z.record(z.string(), z.string()).describe('A map of cell IDs to their areas of expertise. Assume only these cells exist and are alive.'),
      cellConnections: z.record(z.string(), z.array(z.string())).describe('A map of cell IDs to the IDs of their directly connected (neighboring) cells. Messages can only travel between connected cells.'),
    }),
  },
  output: {
    schema: z.object({
      route: z.array(z.string()).describe('An array of cell IDs representing the optimal path for the message, starting with currentCellId and ending with targetCellId. Only include directly connected cells in sequence. If no path exists, return only the currentCellId.'),
      reasoning: z.string().describe('The AI reasoning behind the chosen route, considering expertise, connections, and message content.'),
    }),
  },
  prompt: `You are an AI message routing expert within a simulated cellular network. Your task is to find the most efficient and logical path for a message from a current cell to a target cell.

You MUST adhere to the following constraints:
1.  **Connectivity:** Messages can ONLY travel between cells listed in the 'cellConnections'. A route MUST consist of a sequence of directly connected cells.
2.  **Viability:** Only consider cells listed in 'cellExpertise' as existing and alive. Do NOT route through cells not in this list.
3.  **Path Format:** The output 'route' array MUST start with the 'currentCellId' and end with the 'targetCellId'.
4.  **Efficiency:** Prefer shorter paths unless the message content strongly suggests routing through a specific expert cell is beneficial.
5.  **Relevance:** Consider the 'cellExpertise' and 'message' content. If the message requires specific expertise found in a cell along a potential path, that path might be preferred even if slightly longer.
6.  **No Path:** If no valid path exists between the current cell and the target cell using the available connections and alive cells, the route array should contain ONLY the 'currentCellId'.

Network Information:
*   Message Content: {{{message}}}
*   Current Cell ID: {{{currentCellId}}}
*   Target Cell ID: {{{targetCellId}}}
*   Network Conditions: {{#if networkCondition}}{{{networkCondition}}}{{else}}Normal{{/if}}
*   Available Cells and Expertise: {{#each cellExpertise}}{{@key}}: {{this}}{{/each}}
*   Direct Cell Connections: {{#each cellConnections}}{{@key}} -> [{{#each this}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}]{{/each}}

Determine the optimal sequence of cell IDs for the message route. Explain your reasoning clearly, referencing connectivity, expertise, and message content as needed.
`,
});

const routeMessageFlow = ai.defineFlow<typeof RouteMessageInputSchema, typeof RouteMessageOutputSchema>(
  {
    name: 'routeMessageFlow',
    inputSchema: RouteMessageInputSchema,
    outputSchema: RouteMessageOutputSchema,
  },
  async (input) => {
    // Minor input adjustment for clarity in prompt if needed
    // e.g., Ensure connections are symmetrical if they should be, though the prompt implies directed paths

    const { output } = await routeMessagePrompt(input);

     // Basic check on the raw output before returning
     if (!output) {
        console.error("routeMessagePrompt returned undefined output.");
        // Throw an error or return a default failure state
        throw new Error("AI prompt failed to return an output.");
     }
     // Further validation could happen here, but more robust validation is in the wrapper function.
     console.log("Raw output from routeMessagePrompt:", output);

    return output; // Return even potentially invalid output, let the wrapper handle validation
  }
);
