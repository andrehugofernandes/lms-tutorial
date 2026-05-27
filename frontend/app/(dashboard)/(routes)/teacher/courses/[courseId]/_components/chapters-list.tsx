"use client";

import type { Chapter } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Gamepad2, Grip, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ChaptersListProps {
  items: Chapter[];
  onReorder: (updateData: { id: string; position: number }[]) => void;
  onEdit: (id: string) => void;
}

export const ChaptersList = ({
  items,
  onReorder,
  onEdit,
}: ChaptersListProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [chapters, setChapters] = useState(items);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setChapters(items);
  }, [items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const startIndex = Math.min(result.source.index, result.destination.index);
    const endIndex = Math.max(result.source.index, result.destination.index);

    const updatedChapters = items.slice(startIndex, endIndex + 1);

    setChapters(items);

    const bulkUpdateData = updatedChapters.map((chapter) => ({
      id: chapter.id,
      position: items.findIndex((item) => item.id === chapter.id),
    }));

    onReorder(bulkUpdateData);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="chapters">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {chapters.map((chapter, index) => (
              <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                {(provided) => (
                  <div
                    className="mb-3 flex items-center gap-x-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition hover:border-primary/60"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <div
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      {...provided.dragHandleProps}
                    >
                      <Grip className="h-5 w-5" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-base font-medium">
                      {chapter.title}
                    </span>
                    <div className="ml-auto flex items-center gap-x-2">
                      {chapter.isFree && (
                        <Badge className="border-none bg-primary text-primary-foreground hover:bg-primary">
                          Free
                        </Badge>
                      )}
                      {(chapter as any).quiz && (
                        <Badge className="border border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">
                          <Gamepad2 className="mr-1 h-3 w-3" />
                          Quiz
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          "border border-border bg-muted text-muted-foreground hover:bg-muted",
                          chapter.isPublished &&
                            "border-sky-500/50 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
                        )}
                      >
                        {chapter.isPublished ? "Publicado" : "Rascunho"}
                      </Badge>
                      <Pencil
                        onClick={() => onEdit(chapter.id)}
                        className="h-4 w-4 cursor-pointer text-muted-foreground transition hover:text-primary"
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
