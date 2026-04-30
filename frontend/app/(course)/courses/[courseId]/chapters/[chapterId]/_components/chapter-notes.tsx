"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Loader2, PlusCircle, Trash2, Clock, Lightbulb } from "lucide-react";
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
    <div className="flex flex-col gap-y-4 bg-[#111] border border-[#222] rounded-xl p-6">
      <div className="flex flex-col gap-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-x-2 text-white">
          Minhas anotações <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Privado</span>
        </h3>
        
        <div className="relative">
          <Textarea
            placeholder="Registre aqui suas ideias, dúvidas e aprendizados..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
            className="bg-[#0a0a0a] border-[#222] focus-visible:ring-yellow-500/50 text-slate-200 min-h-[120px] transition-all resize-none shadow-inner"
          />
          <div className="absolute bottom-3 right-3">
            <Button
              onClick={onSubmit}
              disabled={isLoading || !content.trim()}
              size="sm"
              className="bg-transparent border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors"
            >
              Salvar anotação
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-x-2 text-xs text-slate-400">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-500 font-semibold">Dica:</span> anotar melhora sua retenção e acelera seu aprendizado.
        </div>
      </div>

      {notes.length > 0 && <Separator className="bg-[#222] my-2" />}

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4 bg-[#0a0a0a] border-[#222] hover:border-yellow-500/30 transition-colors group rounded-lg">
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  {note.timestamp !== null && (
                    <button
                      onClick={() => seekTo(note.timestamp!)}
                      className="text-xs font-bold text-yellow-500 flex items-center gap-x-1 hover:underline bg-yellow-500/10 px-2 py-1 rounded"
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime(note.timestamp)}
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
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
