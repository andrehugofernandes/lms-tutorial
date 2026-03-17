"use client";

import { 
  BarChart, 
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

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Painel do Professor</h1>
          <p className="text-slate-500 font-medium">Gerencie seus cursos, capítulos e conteúdos.</p>
        </div>
        <div className="flex items-center gap-x-2">
           <Link href="/teacher/create">
            <Button className="bg-sky-700 hover:bg-sky-800">
               <PlusCircle className="h-4 w-4 mr-2" />
               Novo Curso
            </Button>
           </Link>
           <Button variant="outline" className="border-slate-300">
              <List className="h-4 w-4 mr-2" />
              Nova Categoria
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex items-center gap-x-4 shadow-sm">
           <IconBadge icon={BookOpen} variant="default" />
           <div>
              <p className="text-sm font-semibold text-slate-700">{stats.totalCourses} Cursos Criados</p>
              <p className="text-xs text-slate-500">Gestão de conteúdo</p>
           </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-x-4 shadow-sm">
           <IconBadge icon={CheckCircle} variant="success" />
           <div>
              <p className="text-sm font-semibold text-emerald-700">{stats.publishedCourses} Publicados</p>
              <p className="text-xs text-emerald-500">Visíveis para alunos</p>
           </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-x-4 shadow-sm">
           <IconBadge icon={FileEdit} variant="default" />
           <div>
              <p className="text-sm font-semibold text-amber-700">{stats.draftCourses} Rascunhos</p>
              <p className="text-xs text-amber-500">Em edição</p>
           </div>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-x-4 shadow-sm">
           <IconBadge icon={AlertCircle} variant="default" />
           <div>
              <p className="text-sm font-semibold text-rose-700">{stats.pendingChapters} Pendentes</p>
              <p className="text-xs text-rose-500">Capítulos sem vídeo</p>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
         <h2 className="text-xl font-bold text-slate-800">Meus Cursos</h2>
         
         {courses.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-300 rounded-2xl text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full">
                <Layout className="h-10 w-10 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-800">Você ainda não criou nenhum curso</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Comece agora mesmo a criar seu conteúdo e compartilhe seu conhecimento com o mundo.
                </p>
              </div>
              <Link href="/teacher/create">
                <Button variant="default" className="bg-sky-700 hover:bg-sky-800">
                  Criar Primeiro Curso
                </Button>
              </Link>
           </div>
         ) : (
           <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b text-slate-500 font-semibold text-sm uppercase tracking-wider">
                       <tr>
                          <th className="px-6 py-4">Curso</th>
                          <th className="px-6 py-4">Categoria</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Capítulos</th>
                          <th className="px-6 py-4">Atualizado em</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                       {courses.map((course) => (
                         <tr key={course.id} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-x-3">
                                  {course.imageUrl ? (
                                    <img src={course.imageUrl} className="h-10 w-16 object-cover rounded-md border" />
                                  ) : (
                                    <div className="h-10 w-16 bg-slate-100 rounded-md border flex items-center justify-center">
                                       <Layout className="h-4 w-4 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="font-semibold block max-w-[200px] truncate">{course.title}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                                  {course.category?.name || "Sem Categoria"}
                               </Badge>
                            </td>
                            <td className="px-6 py-4">
                               {course.isPublished ? (
                                 <Badge className="bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Publicado
                                 </Badge>
                               ) : (
                                 <Badge className="bg-slate-100 text-slate-600 border-none hover:bg-slate-100">
                                    <FileEdit className="h-3 w-3 mr-1" /> Rascunho
                                 </Badge>
                               )}
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-y-1">
                                  <span className="text-xs font-medium">{course.chapters.length} Capítulos</span>
                                  <Progress value={(course.chapters.filter((c: any) => c.isPublished).length / (course.chapters.length || 1)) * 100} className="h-1 w-24" />
                               </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                               {format(new Date(course.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-x-2">
                                  <Link href={`/teacher/courses/${course.id}`}>
                                    <Button variant="default" size="sm" className="bg-sky-700 hover:bg-sky-800">
                                       Gerenciar
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                           <MoreVertical className="h-4 w-4" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                        <Link href={`/teacher/courses/${course.id}`}>
                                          <DropdownMenuItem>
                                             <Pencil className="h-4 w-4 mr-2" /> Editar
                                          </DropdownMenuItem>
                                        </Link>
                                        <DropdownMenuItem className="text-rose-600">
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

// Custom icon logic replaced with standard Lucide import to fix build types
