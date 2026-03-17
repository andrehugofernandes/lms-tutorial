import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-4 p-8">
      <div className="animate-pulse flex flex-col items-center gap-y-4">
        <div className="h-16 w-16 bg-sky-200 rounded-full" />
        <div className="h-8 w-64 bg-slate-200 rounded-md" />
        <div className="h-4 w-48 bg-slate-100 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
