"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { AlertTriangle, Loader2, MessageSquare, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ForumPost {
  id: string;
  userId: string;
  content: string;
  authorName: string;
  isMine: boolean;
  createdAt: string;
}

interface ChapterForumProps {
  courseId: string;
  chapterId: string;
}

export const ChapterForum = ({ courseId, chapterId }: ChapterForumProps) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [content, setContent] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(
        `/api/courses/${courseId}/chapters/${chapterId}/forum`
      );
      setPosts(response.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [chapterId]);

  const createPost = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      setIsPosting(true);
      const response = await axios.post(
        `/api/courses/${courseId}/chapters/${chapterId}/forum`,
        { content: trimmed }
      );
      setPosts((current) => [response.data, ...current]);
      setContent("");
      toast.success("Mensagem publicada.");
    } catch (error: any) {
      toast.error(error?.response?.data || "Erro ao publicar mensagem.");
    } finally {
      setIsPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await axios.delete(
        `/api/courses/${courseId}/chapters/${chapterId}/forum/${postId}`
      );
      setPosts((current) => current.filter((post) => post.id !== postId));
      toast.success("Mensagem apagada.");
    } catch {
      toast.error("Erro ao apagar mensagem.");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#222] dark:bg-[#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
            <MessageSquare className="h-5 w-5 text-yellow-500" />
            Forum da aula
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tire duvidas e compartilhe ideias com outros alunos.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Textarea
          value={content}
          maxLength={1200}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escreva uma pergunta, resposta ou comentario sobre esta aula..."
          disabled={isPosting}
          className="min-h-[110px] resize-none border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-yellow-500/50 dark:border-[#222] dark:bg-[#0a0a0a] dark:text-slate-200"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{content.length}/1200</span>
          <Button
            onClick={createPost}
            disabled={isPosting || !content.trim()}
            className="bg-yellow-500 text-black hover:bg-yellow-400"
          >
            {isPosting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publicar
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Forum indisponivel no momento.
          </div>
        ) : posts.length ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#222] dark:bg-[#0a0a0a]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {post.authorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
                {post.isMine && (
                  <button
                    type="button"
                    onClick={() => deletePost(post.id)}
                    className="rounded-full border border-red-500/30 p-2 text-red-500 transition hover:bg-red-500 hover:text-white"
                    aria-label="Apagar mensagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                {post.content}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600 dark:border-[#333] dark:text-slate-400">
            Seja o primeiro a iniciar a conversa desta aula.
          </div>
        )}
      </div>
    </div>
  );
};
