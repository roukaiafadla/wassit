/**
 * Generic placeholder for pages that don't have real logic yet.
 * Swap these out one at a time as you work through the build order.
 */
export default function PageStub({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-left">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      
    </div>
  );
}
