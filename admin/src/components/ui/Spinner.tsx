export default function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span role="status" aria-label="Loading" className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-32 text-ink-3">
      <Spinner />
    </div>
  );
}
