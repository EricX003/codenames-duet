import Card from "./Card";

export default function Board({ board, privateKey, onGuess, disabled }) {
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto">
      {board.map((card, i) => (
        <Card
          key={i}
          idx={i}
          word={card.word}
          revealed={card.revealed}
          privateColor={privateKey[i]} // "agent" | "assassin" | "bystander"
          publicColor={card.color ?? null}
          onGuess={onGuess}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
