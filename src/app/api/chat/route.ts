import {
  streamText,
  UIMessage,
  convertToModelMessages,
  generateObject,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    messages: convertToModelMessages(messages),
    toolChoice: "auto",
    tools: {
      createExercise: {
        description:
          "Create a gap-fill exercise. Use when the user has specified what to learn (topic, language, level). Return a structured exercise with an items array: each item has a sentence with a single gap marked as ___, its correct answer word, and a unique id.",
        parameters: z.object({
          topic: z
            .string()
            .describe(
              "The learning topic and context, e.g. 'German definite and indefinite articles in nominative'",
            ),
          language: z
            .string()
            .optional()
            .describe("Target language for the exercise, e.g. 'German'."),
          level: z
            .string()
            .optional()
            .describe("Proficiency or difficulty, e.g. 'A2' or 'beginner'."),
          numSentences: z
            .number()
            .int()
            .min(3)
            .max(12)
            .default(6)
            .describe("Number of sentences to generate."),
        }),
        execute: async ({ topic, language, level, numSentences }) => {
          const ExerciseSchema = z.object({
            title: z.string(),
            instructions: z.string(),
            items: z
              .array(
                z.object({
                  id: z.string(),
                  sentence: z.string().describe("Sentence with single gap ___"),
                  answer: z.string().describe("Correct word for the gap"),
                }),
              )
              .min(1),
          });

          const { object } = await generateObject({
            model: openai("gpt-4.1-mini"),
            schema: ExerciseSchema,
            system:
              "You are an educational content generator. Produce clean, appropriate exercises only. Keep sentences short and clear. Each sentence must contain exactly one gap marked by three underscores (___).",
            prompt: `Create a gap-fill exercise about "${topic}"${language ? ` in ${language}` : ""}${level ? ` for level ${level}` : ""}. Generate ${numSentences ?? 6} sentences. Each sentence must contain exactly one gap marked by three underscores (___). Provide a unique id and the exact missing word in 'answer'. Return only valid JSON matching the schema.`,
          });

          return object;
        },
      },
    },
    system:
      "You are a helpful learning assistant. Clarify the user's learning goal, then automatically call the createExercise tool once you have enough information (topic, language, level, number of sentences). Keep replies concise and focused.",
  });

  return result.toUIMessageStreamResponse();
}
