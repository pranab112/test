export function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-darker">
      <div className="text-center">
        <div className="spinner w-16 h-16 mx-auto mb-4" />
        <p className="text-primary-gold text-xl font-bold">Loading...</p>
      </div>
    </div>
  );
}
