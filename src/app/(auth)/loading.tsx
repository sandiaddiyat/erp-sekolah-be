import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Skeleton className="h-96 w-full max-w-sm rounded-xl" />
    </div>
  );
}
