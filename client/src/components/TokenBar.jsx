export default function TokenBar({ tokens }) {
  const remaining = tokens.bank - tokens.used.length;
  return (
    <div className="flex gap-1">
      {Array.from({ length: tokens.bank }).map((_, i) => (
        <div
          key={i}
          className={`h-5 w-5 rounded-full ${
            i < remaining ? "bg-emerald-400" : "bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
