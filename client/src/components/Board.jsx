import Card from "./Card";

export default function Board({ board, privateKey, onGuess, disabled }) {
  return (
    <div className="grid grid-cols-5 gap-3 w-fit">
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
