"use client";

import { 
  CheckCircle, 
  FileEdit, 
  Layout, 
  List, 
  PlusCircle, 
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { InfoCard } from "./info-card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface TeacherDashboardProps {
  courses: any[];
  stats: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    pendingChapters: number;
  }
}

export const TeacherDashboard = ({
  courses,
  stats
}: TeacherDashboardProps) => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCategory = async () => {
    try {
      setIsLoading(true);
      if (!categoryName.trim()) {
        toast.error("O nome da categoria não pode ser vazio.");
        return;
      }
      await axios.post("/api/categories", {
        name: categoryName.trim(),
      });
      toast.success("Nova categoria criada com sucesso!");
      setCategoryName("");
      setIsDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Erro ao criar categoria.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight uppercase">Painel do <span className="text-primary">Professor</span></h1>
          <p className="text-muted-foreground font-medium text-lg mt-1">Gerencie seus cursos, capítulos e conteúdos.</p>
        </div>
        <div className="flex items-center gap-x-3">
           <Link href="/teacher/create">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
               <PlusCircle className="h-5 w-5 mr-2" />
               Novo Curso
            </Button>
           </Link>
           
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                 <Button variant="outline" className="rounded-full font-bold border-border text-foreground hover:bg-card">
                    <List className="h-5 w-5 mr-2" />
                    Nova Categoria
                 </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111111] border-border/50 text-white rounded-3xl max-w-md shadow-2xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-white">Nova Categoria</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4 py-4">
                    <p className="text-muted-foreground font-medium text-sm">
                       Crie uma nova categoria para organizar seus cursos.
                    </p>
                    <Input
                       placeholder="Ex.: Desenvolvimento Web, Marketing, Design..."
                       value={categoryName}
                       onChange={(e) => setCategoryName(e.target.value)}
                       className="border-[#333333] bg-black text-white placeholder:text-[#7A7A7A] focus-visible:ring-primary rounded-xl py-6"
                       disabled={isLoading}
                    />
                 </div>
                 <DialogFooter className="gap-y-2 sm:gap-y-0">
                    <Button
                       variant="ghost"
                       onClick={() => setIsDialogOpen(false)}
                       disabled={isLoading}
                       className="text-[#B5B5B5] hover:bg-[#181818] hover:text-white rounded-full font-bold px-6"
                    >
                       Cancelar
                    </Button>
                    <Button
                       onClick={handleCreateCategory}
                       disabled={isLoading || !categoryName.trim()}
                       className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                       Criar Categoria
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <InfoCard
           variant="info"
           icon={BookOpen}
           label="Cursos Criados"
           numberOfItems={stats.totalCourses}
           actionText="Gestão de conteúdo"
         />
         <InfoCard
           variant="success"
           icon={CheckCircle}
           label="Publicados"
           numberOfItems={stats.publishedCourses}
           actionText="Visíveis para alunos"
         />
         <InfoCard
           variant="gold"
           icon={FileEdit}
           label="Rascunhos"
           numberOfItems={stats.draftCourses}
           actionText="Em edição"
         />
         <InfoCard
           variant="warning"
           icon={AlertCircle}
           label="Pendentes"
           numberOfItems={stats.pendingChapters}
           actionText="Capítulos sem vídeo"
         />
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
         <h2 className="text-2xl font-bold text-foreground">Meus Cursos</h2>
         
         {courses.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl text-center space-y-6 shadow-sm">
              <div className="bg-primary/10 p-6 rounded-full">
                <Layout className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Você ainda não criou nenhum curso</h3>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  Comece agora mesmo a criar seu conteúdo e compartilhe seu conhecimento com o mundo.
                </p>
              </div>
              <Link href="/teacher/create">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-8 py-6 text-md mt-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  Criar Primeiro Curso
                </Button>
              </Link>
           </div>
         ) : (
           <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-card/50 border-b border-border/50 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                       <tr>
                          <th className="px-6 py-5">Curso</th>
                          <th className="px-6 py-5">Categoria</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5">Capítulos</th>
                          <th className="px-6 py-5">Atualizado em</th>
                          <th className="px-6 py-5 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 text-foreground">
                       {courses.map((course) => (
                         <tr key={course.id} className="hover:bg-card/50 transition">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-x-4">
                                  {course.imageUrl ? (
                                    <img src={course.imageUrl} className="h-12 w-20 object-cover rounded-lg border border-border/50" />
                                  ) : (
                                    <div className="h-12 w-20 bg-background/50 rounded-lg border border-border/50 flex items-center justify-center">
                                       <Layout className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="font-bold block max-w-[200px] truncate text-lg">{course.title}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant="outline" className="bg-background text-foreground border-border">
                                  {course.category?.name || "Sem Categoria"}
                               </Badge>
                            </td>
                            <td className="px-6 py-4">
                               {course.isPublished ? (
                                 <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 font-bold">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Publicado
                                 </Badge>
                               ) : (
                                 <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 font-bold">
                                    <FileEdit className="h-3 w-3 mr-1" /> Rascunho
                                 </Badge>
                               )}
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-y-2">
                                  <span className="text-xs font-bold text-muted-foreground">{course.chapters.length} Capítulos</span>
                                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden w-24">
                                    <div 
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${(course.chapters.filter((c: any) => c.isPublished).length / (course.chapters.length || 1)) * 100}%` }}
                                    />
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                               {format(new Date(course.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-x-2">
                                  <Link href={`/teacher/courses/${course.id}`}>
                                    <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 rounded-full font-bold">
                                       Gerenciar
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-card">
                                           <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                                        <Link href={`/teacher/courses/${course.id}`}>
                                          <DropdownMenuItem className="cursor-pointer hover:bg-card">
                                             <Pencil className="h-4 w-4 mr-2 text-primary" /> Editar
                                          </DropdownMenuItem>
                                        </Link>
                                        <DropdownMenuItem className="text-rose-500 cursor-pointer hover:bg-rose-500/10">
                                           <Trash className="h-4 w-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

