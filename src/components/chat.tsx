"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput as Input,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputModelSelectItem,
  PromptInputModelSelect,
} from "@/components/ai-elements/prompt-input";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { ExerciseDrawer, type ExerciseData } from "@/components/ExerciseDrawer";

const ConversationDemo = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);

  // Track processed exercises to prevent duplicate setExercise calls
  const processedExercises = useRef(new Set<string>());

  // Memoize computed values to prevent unnecessary re-renders
  const isChatEmpty = useMemo(() => messages.length === 0, [messages.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) {
        sendMessage({ text: input });
        setInput("");
      }
    },
    [input, sendMessage],
  );

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  // Extract exercise data from messages using useEffect to prevent render-loop side effects
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        const t = part as any;
        if (
          typeof t?.type === "string" &&
          t.type === "tool-createExercise" &&
          t.state === "output-available" &&
          t.output
        ) {
          try {
            const data = t.output as ExerciseData;
            const exerciseId = `${message.id}-${data.title}`;

            if (
              data?.items &&
              Array.isArray(data.items) &&
              !processedExercises.current.has(exerciseId)
            ) {
              processedExercises.current.add(exerciseId);
              setExercise(data);
            }
          } catch (error) {
            console.warn("Failed to parse exercise data:", error);
          }
        }
      }
    }
  }, [messages]);

  // Memoize the message rendering to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    return messages.map((message) => (
      <Message from={message.role} key={message.id}>
        <MessageContent>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return (
                  <Response key={`${message.id}-${i}`}>{part.text}</Response>
                );
              default: {
                // Render tool UI parts from the AI SDK (type starts with 'tool-')
                const t = part as any;
                if (typeof t?.type === "string" && t.type.startsWith("tool-")) {
                  const isExerciseTool = t.type === "tool-createExercise";
                  const isOutput = t.state === "output-available";

                  return (
                    <Tool key={`${message.id}-${i}`} defaultOpen>
                      <ToolHeader type={t.type} state={t.state} />
                      <ToolContent>
                        <ToolInput input={t.input} />
                        <ToolOutput
                          errorText={t.errorText}
                          output={
                            isExerciseTool && isOutput ? (
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={handleOpenDrawer}>
                                  Open Exercise
                                </Button>
                              </div>
                            ) : undefined
                          }
                        />
                      </ToolContent>
                    </Tool>
                  );
                }
                return null;
              }
            }
          })}
        </MessageContent>
      </Message>
    ));
  }, [messages, handleOpenDrawer]);

  return (
    <div className="relative mx-auto size-full h-full min-h-[600px] max-w-4xl rounded-lg border">
      <div className="flex h-full flex-col">
        <Conversation className="pb-20">
          <ConversationContent>{renderedMessages}</ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Input
          onSubmit={handleSubmit}
          className={cn(
            "absolute bottom-8 left-1/2 mt-4 w-full max-w-2xl -translate-x-1/2",
            "transition-all duration-500 ease-in-out",
            {
              "bottom-1/2": isChatEmpty,
            },
          )}
        >
          <PromptInputTextarea
            value={input}
            placeholder="What would you like to learn?"
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12 !text-base"
          />
          {/* <PromptInputToolbar>
            <PromptInputTools /> */}
          {/* <PromptInputModelSelectItem value={"gpt-5"}>
                  GPT-5
                </PromptInputModelSelectItem> */}
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute right-1 bottom-1"
          />
          {/* </PromptInputToolbar> */}
        </Input>

        <ExerciseDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          exercise={exercise}
        />
      </div>
    </div>
  );
};

export default ConversationDemo;
