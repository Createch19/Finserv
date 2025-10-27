'use server';

/**
 * @fileOverview An AI-powered system that intelligently determines when and how to send automated payment reminders for due EMIs.
 *
 * - intelligentEmiReminder - A function that determines whether, when, and how to send EMI reminders.
 * - IntelligentEmiReminderInput - The input type for the intelligentEmiReminder function.
 * - IntelligentEmiReminderOutput - The return type for the intelligentEmiReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentEmiReminderInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  emiDueDate: z.string().describe('The due date of the EMI (YYYY-MM-DD).'),
  emiAmount: z.number().describe('The amount of the EMI due.'),
  paymentHistory: z
    .string()
    .describe(
      'A summary of the customer payment history, including on-time payments, late payments, and any defaults.'
    ),
  customerCommunicationPreferences: z
    .string()
    .describe(
      'The customer preferred method of communication, such as SMS, WhatsApp, or email.'
    ),
  loanAmount: z.number().describe('The total loan amount.'),
  outstandingBalance: z.number().describe('The outstanding loan balance.'),
});

export type IntelligentEmiReminderInput = z.infer<
  typeof IntelligentEmiReminderInputSchema
>;

const IntelligentEmiReminderOutputSchema = z.object({
  shouldSendReminder: z
    .boolean()
    .describe(
      'Whether a reminder should be sent to the customer based on their payment history and preferences.'
    ),
  reminderTiming: z
    .string()
    .describe(
      'The optimal timing for sending the reminder, such as days before the due date or on the due date. Examples: 3 days before, on due date'
    ),
  reminderMessage: z
    .string()
    .describe(
      'The content of the reminder message, tailored to the customer and the situation.'
    ),
  communicationChannel: z
    .string()
    .describe(
      'The communication channel to use for sending the reminder, such as SMS, WhatsApp, or email.'
    ),
});

export type IntelligentEmiReminderOutput = z.infer<
  typeof IntelligentEmiReminderOutputSchema
>;

export async function intelligentEmiReminder(
  input: IntelligentEmiReminderInput
): Promise<IntelligentEmiReminderOutput> {
  return intelligentEmiReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentEmiReminderPrompt',
  input: {schema: IntelligentEmiReminderInputSchema},
  output: {schema: IntelligentEmiReminderOutputSchema},
  prompt: `You are an AI assistant specializing in finance.

You are tasked to determine whether to send a reminder to a customer about their upcoming EMI payment, when to send it, and what the content of the message should be. Consider minimizing customer annoyance.

Here is some information about the customer and their loan:
- Customer Name: {{customerName}}
- EMI Due Date: {{emiDueDate}}
- EMI Amount: {{emiAmount}}
- Loan Amount: {{loanAmount}}
- Outstanding Balance: {{outstandingBalance}}
- Payment History: {{paymentHistory}}
- Communication Preferences: {{customerCommunicationPreferences}}

Based on this information, please decide:
1. Should a reminder be sent? (shouldSendReminder: true/false)
2. If yes, when should the reminder be sent? (reminderTiming)
3. What should the reminder message say? (reminderMessage)
4. What communication channel should be used? (communicationChannel)

Ensure your output is formatted as a JSON object matching the schema.
`,
});

const intelligentEmiReminderFlow = ai.defineFlow(
  {
    name: 'intelligentEmiReminderFlow',
    inputSchema: IntelligentEmiReminderInputSchema,
    outputSchema: IntelligentEmiReminderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
