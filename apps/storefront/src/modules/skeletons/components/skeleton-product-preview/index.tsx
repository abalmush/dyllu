import { Skeleton } from "@/components/atoms/skeleton";

const SkeletonProductPreview = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="aspect-square w-full rounded-xl" />
    <Skeleton className="h-3 w-1/3 rounded-full" />
    <Skeleton className="h-4 w-2/3 rounded-md" />
    <Skeleton className="h-5 w-1/2 rounded-md" />
  </div>
);

export default SkeletonProductPreview;
