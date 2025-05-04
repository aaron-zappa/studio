'use server';

/**
 * @fileOverview Interprets a cell's help request and identifies relevant expertise in neighboring cells.
 *
 * - cellHelpRequestInterpretation - A function that interprets a cell's help request and identifies relevant expertise.
 * - CellHelpRequestInterpretationInput - The input type for the cellHelpRequestInterpretation function.
 * - CellHelpRequestInterpretationOutput - The return type for the cellHelpRequestInterpretation function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const CellHelpRequestInterpretationInputSchema = z.object({
  cellId: z.string().describe('The ID of the cell requesting help.'),
  requestText: z.string().describe('The text of the help request from the cell.'),
  neighboringCellExpertise: z
    .array(z.object({cellId: z.string(), expertise: z.string()}))
    .describe('An array of neighboring cells and their stated expertise.'),
});
export type CellHelpRequestInterpretationInput = z.infer<
  typeof CellHelpRequestInterpretationInputSchema
>;

const CellHelpRequestInterpretationOutputSchema = z.object({
  relevantExpertise: z
    .array(z.object({cellId: z.string(), expertise: z.string()}))
    .describe(
      'An array of neighboring cells with expertise relevant to the help request.'
    ),
  reasoning: z.string().describe('The AI reasoning for selecting the relevant expertise.'),
});
export type CellHelpRequestInterpretationOutput = z.infer<
  typeof CellHelpRequestInterpretationOutputSchema
>;

export async function cellHelpRequestInterpretation(
  input: CellHelpRequestInterpretationInput
): Promise<CellHelpRequestInterpretationOutput> {
  return cellHelpRequestInterpretationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cellHelpRequestInterpretationPrompt',
  input: {
    schema: z.object({
      cellId: z.string().describe('The ID of the cell requesting help.'),
      requestText: z.string().describe('The text of the help request from the cell.'),
      neighboringCellExpertise: z
        .array(z.object({cellId: z.string(), expertise: z.string()}))
        .describe('An array of neighboring cells and their stated expertise.'),
    }),
  },
  output: {
    schema: z.object({
      relevantExpertise: z
        .array(z.object({cellId: z.string(), expertise: z.string()}))
        .describe(
          'An array of neighboring cells with expertise relevant to the help request.'
        ),
      reasoning: z.string().describe('The AI reasoning for selecting the relevant expertise.'),
    }),
  },
  prompt: `You are an AI assistant helping a cell in a network find the most relevant expertise among its neighbors to solve its problem. 

Cell ID: {{{cellId}}}

Help Request: {{{requestText}}}

Neighboring Cell Expertise:
{{#each neighboringCellExpertise}}
- Cell ID: {{{this.cellId}}}, Expertise: {{{this.expertise}}}
{{/each}}

Based on the help request, identify the neighboring cells with the most relevant expertise. Explain your reasoning, and list the cells with the relevant expertise.

Output the relevant expertise as a JSON array of objects, each containing the cellId and expertise. Also, include your reasoning for selecting the expertise.
`,
});

const cellHelpRequestInterpretationFlow = ai.defineFlow<
  typeof CellHelpRequestInterpretationInputSchema,
  typeof CellHelpRequestInterpretationOutputSchema
>({
  name: 'cellHelpRequestInterpretationFlow',
  inputSchema: CellHelpRequestInterpretationInputSchema,
  outputSchema: CellHelpRequestInterpretationOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
