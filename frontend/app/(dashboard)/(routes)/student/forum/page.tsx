"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, MessageSquare, Trash2 } from "lucide-react";

interface ForumPost {
  id: string;
  userId: string;
  courseId: string;
  chapterId: string;
  content: string;
  authorName: string;
  courseTitle: string;
  chapterTitle: string;
  isMine: boolean;
  createdAt: string;
}

export default function StudentForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("/api/student/forum");
        setPosts(response.data);
        setError(null);
      } catch {
        setError("Nao foi possivel carregar o forum agora. Verifique se o backend esta iniciado e tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const deletePost = async (post: ForumPost) => {
    try {
      await axios.delete(
        `/api/courses/${post.courseId}/chapters/${post.chapterId}/forum/${post.id}`
      );
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success("Mensagem apagada.");
    } catch {
      toast.error("Erro ao apagar mensagem.");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF9F00]/30 bg-[#FF9F00]/10">
            <MessageSquare className="h-7 w-7 text-[#FF9F00]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground">Fórum dos alunos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe as conversas das trilhas em que você está matriculado.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF9F00]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {post.authorName}
                    {post.isMine ? " (você)" : ""}
                  </p>
                  <Link
                    href={`/courses/${post.courseId}/chapters/${post.chapterId}`}
                    className="mt-1 block truncate text-xs font-semibold text-[#FF9F00] hover:underline"
                  >
                    {post.courseTitle} | {post.chapterTitle}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
                {post.isMine && (
                  <button
                    type="button"
                    onClick={() => deletePost(post)}
                    className="rounded-full border border-red-500/30 p-2 text-red-500 transition hover:bg-red-500 hover:text-white"
                    aria-label="Apagar mensagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Ainda não há mensagens nas suas trilhas.
        </div>
      )}
    </div>
  );
}
