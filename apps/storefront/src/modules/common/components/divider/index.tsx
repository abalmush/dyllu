import { clx } from "@lib/ui-compat";

const Divider = ({ className }: { className?: string }) => (
  <div
    className={clx("mt-1 h-px w-full border-b border-gray-200", className)}
  />
);

export default Divider;
