export default function TokenBar({ tokens }) {
  const remaining = tokens.bank - tokens.used;
  return (
    <div className="flex gap-1">
      <div className="text-sm text-gray-600 mr-2">
        Turns left: {remaining}/{tokens.bank}
      </div>
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
