import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { SearchInput } from "@/components/search-input";

import { Categories } from "./_components/categories";
import { getCourses } from "@/actions/get-courses";
import { CoursesList } from "@/components/courses-list";
import { serverApi } from "@/lib/server-api";

interface SearchPageProps {
  searchParams: Promise<{
    title: string;
    categoryId: string;
  }>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const [categories, courses] = await Promise.all([
    serverApi("/api/categories"),
    getCourses({
      userId,
      ...resolvedSearchParams,
    }),
  ]);

  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchInput />
      </div>
      <div className="p-6 space-y-4">
        <Categories items={categories} />
        <CoursesList items={courses} />
      </div>
    </>
  );
};

export default SearchPage;
