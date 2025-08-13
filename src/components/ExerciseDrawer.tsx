"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExerciseData = {
  title: string;
  instructions: string;
  items: { id: string; sentence: string; answer: string }[];
};

export type ExerciseDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ExerciseData | null;
};

export function ExerciseDrawer({
  open,
  onOpenChange,
  exercise,
}: ExerciseDrawerProps) {
  const [placed, setPlaced] = useState<Record<string, string | null>>({});
  const [showResult, setShowResult] = useState(false);

  type BankEntry = { key: string; word: string };
  const initialBank: BankEntry[] = useMemo(() => {
    if (!exercise) return [];
    const counts: Record<string, number> = {};
    const entries = exercise.items.map((it) => {
      const c = counts[it.answer] || 0;
      counts[it.answer] = c + 1;
      return { key: `${it.answer}__${c}`, word: it.answer } as BankEntry;
    });
    return entries
      .map((e) => ({ e, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(({ e }) => e);
  }, [exercise]);

  const availableWords: BankEntry[] = useMemo(() => {
    const usedKeys = new Set(
      Object.values(placed).filter((v): v is string => !!v),
    );
    return initialBank.filter((be) => !usedKeys.has(be.key));
  }, [initialBank, placed]);

  const reset = () => {
    setPlaced({});
    setShowResult(false);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over) return;
    const data = active.data?.current as
      | { bankKey: string; word: string }
      | undefined;
    if (!data) return;
    const overId = String(over.id);
    if (overId.startsWith("slot-")) {
      const sentenceId = overId.replace("slot-", "");
      setPlaced((prev) => ({ ...prev, [sentenceId]: data.bankKey }));
    }
  };

  const correctness = useMemo(() => {
    if (!exercise) return {} as Record<string, boolean>;
    const map: Record<string, boolean> = {};
    for (const it of exercise.items) {
      const pickedKey = placed[it.id];
      const pickedWord = pickedKey ? pickedKey.split("__")[0] : null;
      map[it.id] = !!pickedWord && pickedWord === it.answer;
    }
    return map;
  }, [exercise, placed]);

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DrawerContent className="h-screen">
        <DrawerHeader className="mx-auto hidden md:block lg:max-w-1/3">
          <DrawerTitle className="text-xl text-balance md:text-2xl">
            {exercise?.title ?? "Exercise"}
          </DrawerTitle>
          <DrawerDescription className="text-base text-balance">
            {exercise?.instructions ??
              "Fill each gap by dragging the correct word."}
          </DrawerDescription>
        </DrawerHeader>

        <DndContext onDragEnd={onDragEnd}>
          <div className="mx-auto mt-2 w-fit space-y-4 overflow-clip overflow-y-auto bg-amber-400/10 p-4">
            <div className="space-y-3">
              {exercise?.items.map((it) => {
                const parts = (it.sentence || "").split("___");
                const bankKey = placed[it.id] ?? null;
                const pickedWord = bankKey
                  ? (initialBank.find((b) => b.key === bankKey)?.word ?? null)
                  : null;
                const isCorrect = showResult ? correctness[it.id] : undefined;
                return (
                  <div key={it.id} className="text-base">
                    <span>{parts[0] ?? ""} </span>
                    <DroppableSlot id={`slot-${it.id}`}>
                      <div
                        className={cn(
                          "inline-flex min-w-24 items-center justify-center rounded-md border px-2 py-1 align-middle",
                          !pickedWord && "text-muted-foreground",
                          showResult &&
                            pickedWord &&
                            isCorrect === true &&
                            "border-green-300 bg-green-100 text-green-800",
                          showResult &&
                            pickedWord &&
                            isCorrect === false &&
                            "border-red-300 bg-red-100 text-red-800",
                        )}
                      >
                        {pickedWord ?? "_____"}
                      </div>
                    </DroppableSlot>
                    <span> {parts[1] ?? ""}</span>
                    {pickedWord && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-7 px-2 text-xs"
                        onClick={() =>
                          setPlaced((prev) => ({ ...prev, [it.id]: null }))
                        }
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              {/* <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Words
              </h4> */}
              <div className="mt-2 flex flex-nowrap gap-2">
                {availableWords.map((be) => (
                  <DraggableWord key={be.key} bankKey={be.key} word={be.word} />
                ))}
              </div>
            </div>
          </div>
        </DndContext>

        <DrawerFooter className="mx-auto flex max-w-3xl min-w-full md:min-w-1/2">
          <Button variant="secondary" onClick={reset}>
            Repeat
          </Button>
          <Button onClick={() => setShowResult((v) => !v)}>
            {showResult ? "Hide Result" : "Show Result"}
          </Button>
          {/* <DrawerClose> */}
          {/* <Button variant="outline" >Close</Button> */}
          {/* Close */}
          {/* </DrawerClose> */}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DraggableWord({ bankKey, word }: { bankKey: string; word: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `bank-${bankKey}`,
      data: { bankKey, word },
    });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-secondary px-2 py-1 text-sm shadow-sm select-none active:cursor-grabbing",
        isDragging && "opacity-70",
      )}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      {word}
    </div>
  );
}

function DroppableSlot({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <span
      ref={setNodeRef}
      className={cn(isOver && "rounded-sm ring-2 ring-primary/50")}
    >
      {children}
    </span>
  );
}
