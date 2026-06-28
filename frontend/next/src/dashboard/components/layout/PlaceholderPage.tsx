export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="page-title">{title}</h2>
      <p className="page-placeholder-note">This section is coming in a later milestone.</p>
    </div>
  );
}
