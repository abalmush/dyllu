const Radio = ({
  checked,
  "data-testid": dataTestId,
}: {
  checked: boolean;
  "data-testid"?: string;
}) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className="group relative grid size-5 place-items-center outline-none"
      data-testid={dataTestId || "radio-button"}
    >
      <span
        className={`grid size-4 place-items-center rounded-full border transition-colors ${
          checked
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background text-transparent"
        }`}
      >
        <span className="size-1.5 rounded-full bg-current" />
      </span>
    </button>
  );
};

export default Radio;
