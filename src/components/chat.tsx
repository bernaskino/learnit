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
import { useMemo, useState } from "react";
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
  const isChatEmpty = messages.length == 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="relative mx-auto size-full h-full min-h-[600px] max-w-4xl rounded-lg border">
      <div className="flex h-full flex-col">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Response key={`${message.id}-${i}`}>
                            {part.text}
                          </Response>
                        );
                      default: {
                        // Render tool UI parts from the AI SDK (type starts with 'tool-')
                        const t = part as any;
                        if (
                          typeof t?.type === "string" &&
                          t.type.startsWith("tool-")
                        ) {
                          const isExerciseTool =
                            t.type === "tool-createExercise";
                          const isOutput = t.state === "output-available";
                          if (isExerciseTool && isOutput && t.output) {
                            try {
                              const data = t.output as ExerciseData;
                              if (data?.sentences && data?.words)
                                setExercise(data);
                            } catch {}
                          }
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
                                        <Button
                                          size="sm"
                                          onClick={() => setDrawerOpen(true)}
                                        >
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
            ))}
          </ConversationContent>
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
