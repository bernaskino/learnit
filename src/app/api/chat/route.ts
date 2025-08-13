import {
  streamText,
  UIMessage,
  convertToModelMessages,
  generateObject,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

//https://ai-sdk.dev/elements/examples/chatbot
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const CreateExerciseParams = z.object({
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
  });

  const createExercise = {
    description:
      "Create a gap-fill exercise. Use when the user has specified what to learn (topic, language, level). Return a structured exercise with sentences containing a single gap and the list of draggable words.",
    parameters: CreateExerciseParams,
    execute: async ({
      topic,
      language,
      level,
      numSentences,
    }: z.infer<typeof CreateExerciseParams>) => {
      const ExerciseSchema = z.object({
        title: z.string(),
        instructions: z.string(),
        words: z.array(z.string()).min(1),
        sentences: z
          .array(
            z.object({
              id: z.string(),
              before: z.string(),
              after: z.string(),
              answer: z.string(),
            }),
          )
          .min(1),
      });

      const { object } = await generateObject({
        model: openai("gpt-4.1-mini"),
        schema: ExerciseSchema,
        system:
          "You are an educational content generator. Produce clean, appropriate exercises only. Make sentences short and clear. Ensure words contain all correct answers plus 2-5 plausible distractors. Avoid duplicates.",
        prompt: `Create a gap-fill exercise about "${topic}"${language ? ` in ${language}` : ""}${level ? ` for level ${level}` : ""}. Generate ${numSentences} sentences. Each sentence must be split into 'before' and 'after' around a single missing word 'answer'. The combined pool 'words' must include all answers and a few plausible distractors from the same topic. Return only valid JSON matching the schema.`,
      });

      return object;
    },
  } as const;

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    messages: convertToModelMessages(messages),
    toolChoice: "auto",
    tools: { createExercise },
    system:
      "You are a helpful learning assistant. Clarify the user's learning goal, then automatically call the createExercise tool once you have enough information (topic, language, level, number of sentences). Keep replies concise and focused.",
  });

  return result.toUIMessageStreamResponse();
}
