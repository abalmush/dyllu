import { Checkbox, Label } from "@lib/ui-compat";
import React from "react";

type CheckboxProps = {
  checked?: boolean;
  onChange?: () => void;
  label: string;
  name?: string;
  "data-testid"?: string;
};

const CheckboxWithLabel: React.FC<CheckboxProps> = ({
  checked = true,
  onChange,
  label,
  name,
  "data-testid": dataTestId,
}) => {
  const id = React.useId();

  return (
    <div className="clip-corner-cut-sm bg-surface-subtle/60 ring-border flex items-center gap-4 p-4 ring-1">
      <Checkbox
        className="rounded-none"
        id={id}
        role="checkbox"
        type="button"
        checked={checked}
        aria-checked={checked}
        onClick={onChange}
        name={name}
        data-testid={dataTestId}
      />
      <Label
        htmlFor={id}
        className="text-foreground text-sm leading-5 font-medium tracking-tight"
        size="large"
      >
        {label}
      </Label>
    </div>
  );
};

export default CheckboxWithLabel;
