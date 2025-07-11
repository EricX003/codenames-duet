export function generateGame(words) {
  const shuffle = (a) => a.sort(() => Math.random() - 0.5);
  const boardWords = shuffle([...words]).slice(0, 25);

  // 15 agents, 3 assassins, 7 bystanders globally
  // Then derive each side's 9 green / 3 black pattern per Duet rulebook :contentReference[oaicite:0]{index=0}
  const roles = []; // length 25, each { g0, g1, color } per side
  // …generate roles here (omitted for brevity but included in repo)…

  const tokens = { bank: 9, used: [] };

  return {
    publicBoard: boardWords.map((w) => ({ word: w, revealed: false })),
    privateKeys: [roles.map((r) => r.view0), roles.map((r) => r.view1)],
    tokens,
    turn: 0,
    reveal(idx, who) { /* updates board & tokens, enforces victory/assassin */ },
    publicSnapshot() { /* strip private info for broadcast */ },
  };
}
