// Implemented with Genkit
'use server';

/**
 * @fileOverview This file defines a Genkit flow for understanding the purpose of a cell network.
 *
 * It takes a user-defined purpose as input and initializes the cells with appropriate expertise and goals.
 * @exports cellPurposeUnderstanding - The main function to trigger the cell purpose understanding flow.
 * @exports CellPurposeUnderstandingInput - The input type for the cellPurposeUnderstanding function.
 * @exports CellPurposeUnderstandingOutput - The output type for the cellPurposeUnderstanding function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const CellPurposeUnderstandingInputSchema = z.object({
  purpose: z.string().describe('The overall purpose or desired functionality of the cell network.'),
});

export type CellPurposeUnderstandingInput = z.infer<typeof CellPurposeUnderstandingInputSchema>;

const CellPurposeUnderstandingOutputSchema = z.object({
  initializationInstructions: z
    .string()
    .describe(
      'Instructions for initializing the cells, including expertise, goals, and initial configurations, aligned with the overall purpose.'
    ),
});

export type CellPurposeUnderstandingOutput = z.infer<typeof CellPurposeUnderstandingOutputSchema>;

export async function cellPurposeUnderstanding(
  input: CellPurposeUnderstandingInput
): Promise<CellPurposeUnderstandingOutput> {
  return cellPurposeUnderstandingFlow(input);
}

const cellPurposeUnderstandingPrompt = ai.definePrompt({
  name: 'cellPurposeUnderstandingPrompt',
  input: {
    schema: z.object({
      purpose: z.string().describe('The overall purpose or desired functionality of the cell network.'),
    }),
  },
  output: {
    schema: z.object({
      initializationInstructions: z
        .string()
        .describe(
          'Instructions for initializing the cells, including expertise, goals, and initial configurations, aligned with the overall purpose.'
        ),
    }),
  },
  prompt: `You are an expert in designing cellular networks.

  The user will provide a high-level purpose or desired functionality for the network.  Your job is to provide detailed instructions on how to initialize the cells in the network so they work together to achieve this purpose.

  Consider the following:
  - What expertise should each cell have?
  - What goals should each cell pursue?
  - What initial configurations should each cell have?

  The overall purpose of the cell network is: {{{purpose}}}

  Provide your initialization instructions here:
  `,
});

const cellPurposeUnderstandingFlow = ai.defineFlow<
  typeof CellPurposeUnderstandingInputSchema,
  typeof CellPurposeUnderstandingOutputSchema
>(
  {
    name: 'cellPurposeUnderstandingFlow',
    inputSchema: CellPurposeUnderstandingInputSchema,
    outputSchema: CellPurposeUnderstandingOutputSchema,
  },
  async input => {
    const {output} = await cellPurposeUnderstandingPrompt(input);
    return output!;
  }
);
