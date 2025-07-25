const colorMap = {
  agent: "bg-emerald-500 text-white",
  bystander: "bg-amber-300",
  assassin: "bg-red-600 text-white",
};

export default function Card({
  idx,
  word,
  revealed,
  privateColor,
  publicColor,
  onGuess,
  disabled,
}) {
  // show hidden info (outline) only to the owning player
  const outline =
    !revealed && privateColor !== "bystander"
      ? `ring-2 sm:ring-4 ${
          privateColor === "agent" ? "ring-emerald-400" : "ring-red-400"
        }`
      : "";

  const bg = revealed ? colorMap[publicColor] : "bg-neutral-200 hover:bg-white";

  return (
    <button
      onClick={() => onGuess(idx)}
      disabled={disabled || revealed}
      className={`aspect-square w-full min-h-12 sm:min-h-16 md:min-h-20 rounded-lg sm:rounded-xl shadow font-semibold flex items-center justify-center p-1 sm:p-2 text-center select-none transition text-xs sm:text-sm md:text-base ${bg} ${outline}`}
    >
      <span className="leading-tight break-words">{word}</span>
    </button>
  );
}
