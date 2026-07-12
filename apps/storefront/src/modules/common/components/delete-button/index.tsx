import { deleteLineItem } from "@lib/data/cart";
import { Spinner, Trash } from "@medusajs/icons";
import { clx } from "@lib/ui-compat";
import { useState } from "react";

const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    await deleteLineItem(id).catch(() => {
      setIsDeleting(false);
    });
  };

  return (
    <div
      className={clx(
        "text-small-regular flex items-center justify-between",
        className
      )}
    >
      <button
        type="button"
        disabled={isDeleting}
        aria-busy={isDeleting}
        className="flex cursor-pointer items-center gap-x-2 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-wait disabled:opacity-55"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  );
};

export default DeleteButton;
