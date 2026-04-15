"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Loader2, PlusCircle, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Note {
  id: string;
  content: string;
  timestamp: number | null;
  createdAt: string;
}

interface ChapterNotesProps {
  courseId: string;
  chapterId: string;
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
}

export const ChapterNotes = ({
  courseId,
  chapterId,
  getCurrentTime,
  seekTo,
}: ChapterNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`/api/courses/${courseId}/chapters/${chapterId}/notes`);
      setNotes(response.data);
    } catch {
      toast.error("Failed to fetch notes");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [chapterId]);

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      const timestamp = getCurrentTime();
      const response = await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/notes`, {
        content,
        timestamp,
      });

      setNotes([response.data, ...notes]);
      setContent("");
      toast.success("Note saved!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-y-4 mt-6">
      <div className="flex flex-col gap-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-x-2">
          Meu Caderno de Notas <PlusCircle className="h-4 w-4 text-sky-700" />
        </h3>
        <Textarea
          placeholder="Faça uma anotação sobre este momento da aula..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
          className="bg-slate-50 border-slate-200 focus:bg-white transition"
        />
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={isLoading || !content.trim()}
            size="sm"
            className="bg-sky-700 hover:bg-sky-800"
          >
            Salvar Nota
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sky-700" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Nenhuma nota ainda. Comece a escrever enquanto assiste!
          </p>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-3 bg-slate-50/50 border-slate-200 group">
              <div className="flex flex-col gap-y-1">
                <div className="flex items-center justify-between">
                  {note.timestamp !== null && (
                    <button
                      onClick={() => seekTo(note.timestamp!)}
                      className="text-xs font-bold text-sky-700 flex items-center gap-x-1 hover:underline"
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime(note.timestamp)}
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
