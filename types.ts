export type Piece = {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
};

export type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'}`;

export type PossibleMove = {
    to: Square;
    flags: string;
};

export type GameStatus = {
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    winner: 'w' | 'b' | 'draw' | null;
    reason: string;
};

// This tells TypeScript that a global 'Chess' constructor exists,
// which is loaded from the chess.js CDN script.
declare global {
  const Chess: new (fen?: string) => ChessInstance;
}

// A minimal interface for the parts of chess.js we use
export interface ChessInstance {
  fen(): string;
  turn(): 'w' | 'b';
  move(move: string | { from: string; to: string; promotion?: string }): { san: string, flags: string } | null;
  // Fix: Overload `moves` to support calls with and without arguments/options.
  // This signature is for verbose moves for a specific square.
  moves(options: { square: string, verbose: true }): { to: string, flags: string }[];
  // This signature covers non-verbose calls (all moves or for a square) which return strings.
  moves(options?: { square?: string; verbose?: false }): string[];
  in_check(): boolean;
  in_checkmate(): boolean;
  in_stalemate(): boolean;
  in_draw(): boolean;
  in_threefold_repetition(): boolean;
  insufficient_material(): boolean;
  // Fix: Make `options` parameter optional to allow `history()` call without arguments.
  history(options?: { verbose: false }): string[];
  board(): (Piece | null)[][];
  reset(): void;
  load(fen: string): boolean;
  square_color(square: Square): 'light' | 'dark' | null;
}
