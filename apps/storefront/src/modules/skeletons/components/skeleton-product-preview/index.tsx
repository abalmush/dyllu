import { Container } from "@medusajs/ui";

const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      <Container className="aspect-[9/16] w-full bg-gray-100 bg-ui-bg-subtle" />
      <div className="text-base-regular mt-2 flex justify-between">
        <div className="h-6 w-2/5 bg-gray-100"></div>
        <div className="h-6 w-1/5 bg-gray-100"></div>
      </div>
    </div>
  );
};

export default SkeletonProductPreview;
