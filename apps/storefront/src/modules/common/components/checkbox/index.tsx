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
    <div className="clip-corner-cut-sm flex items-start gap-3 bg-surface-subtle/60 p-4 ring-1 ring-border">
      <Checkbox
        className="mt-0.5 rounded-none"
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
        className="text-sm font-medium leading-5 tracking-tight text-foreground"
        size="large"
      >
        {label}
      </Label>
    </div>
  );
};

export default CheckboxWithLabel;
