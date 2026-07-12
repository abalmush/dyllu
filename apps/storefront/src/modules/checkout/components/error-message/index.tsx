const ErrorMessage = ({
  error,
  "data-testid": dataTestid,
}: {
  error?: string | null;
  "data-testid"?: string;
}) => {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pt-2 text-sm font-medium text-destructive"
      data-testid={dataTestid}
    >
      <span>{error}</span>
    </div>
  );
};

export default ErrorMessage;
