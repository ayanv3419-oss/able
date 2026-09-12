/** Presentational wrapper that keeps every settings section visually distinct. */
export function SettingsSection({
  children,
  description,
  title,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-border/60 border-b pb-10 last:border-b-0 last:pb-0">
      <div>
        <h2 className="font-medium text-lg">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
