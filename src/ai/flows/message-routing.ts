// src/ai/flows/message-routing.ts
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
  route: z.array(z.string()).describe('An array of cell IDs representing the optimal route for the message.'),
  reasoning: z.string().describe('The AI reasoning behind the chosen route.'),
});

export type RouteMessageOutput = z.infer<typeof RouteMessageOutputSchema>;

export async function routeMessage(input: RouteMessageInput): Promise<RouteMessageOutput> {
  return routeMessageFlow(input);
}

const routeMessagePrompt = ai.definePrompt({
  name: 'routeMessagePrompt',
  input: {
    schema: z.object({
      message: z.string().describe('The content of the message to be routed.'),
      targetCellId: z.string().describe('The ID of the target cell.'),
      currentCellId: z.string().describe('The ID of the current cell.'),
      networkCondition: z.string().optional().describe('The current network conditions, e.g., congestion, cell availability.'),
      cellExpertise: z.record(z.string(), z.string()).describe('A map of cell IDs to their areas of expertise.'),
      cellConnections: z.record(z.string(), z.array(z.string())).describe('A map of cell IDs to the IDs of their connected cells.'),
    }),
  },
  output: {
    schema: z.object({
      route: z.array(z.string()).describe('An array of cell IDs representing the optimal route for the message.'),
      reasoning: z.string().describe('The AI reasoning behind the chosen route.'),
    }),
  },
  prompt: `You are an AI message routing expert within a cellular network.

You are provided with the following information:

*   Message: {{{message}}}
*   Target Cell ID: {{{targetCellId}}}
*   Current Cell ID: {{{currentCellId}}}
*   Network Conditions: {{{networkCondition}}}
*   Cell Expertise: {{{cellExpertise}}}
*   Cell Connections: {{{cellConnections}}}

Determine the optimal route for the message to reach the target cell, considering cell expertise, message content, and network conditions. The route should be a list of cell IDs, including the current cell and the target cell. Explain your reasoning for choosing this route.

Output the route as a JSON array of cell IDs and the reasoning for your choice.`, 
});

const routeMessageFlow = ai.defineFlow<typeof RouteMessageInputSchema, typeof RouteMessageOutputSchema>(
  {
    name: 'routeMessageFlow',
    inputSchema: RouteMessageInputSchema,
    outputSchema: RouteMessageOutputSchema,
  },
  async input => {
    const {output} = await routeMessagePrompt(input);
    return output!;
  }
);
