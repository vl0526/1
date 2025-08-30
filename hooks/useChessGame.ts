
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChessInstance, GameStatus, PossibleMove, Square, Piece } from '../types';
import { getAiMove, getAiMoveJson } from '../services/geminiService';

const thinkingMessages = [
    "Contemplating the optimal sequence...",
    "Calculating millions of variations...",
    "Analyzing positional nuances...",
    "Evaluating tactical possibilities...",
    "Accessing grandmaster knowledge banks...",
    "Predicting your strategy...",
];

/**
 * Custom hook for managing a chess game against an AI. Inspired by the logic
 * found in Maxim Saplin's llm_chess project which establishes limits on the
 * number of moves per game and the number of failed attempts by an AI before
 * forcing a forfeit【530007361670812†L53-L59】. This hook adds the following
 * enhancements:
 *   - Tracks the material (piece) count for each side using piece values
 *     similar to the llm_chess `calculate_material_count` helper【471605922165078†L245-L263】.
 *   - Counts the number of times the AI returns an illegal move and declares
 *     the player the winner if the AI exceeds a maximum number of invalid moves【530007361670812†L53-L59】.
 *   - Enforces a maximum number of moves per game; if this limit is reached
 *     the game is declared a draw【530007361670812†L53-L59】.
 *   - Supports selecting between two AI opponents: a Gemini‑powered model or
 *     a simple random move generator.
 */
export const useChessGame = (options?: { aiMode?: 'gemini' | 'random'; maxGameMoves?: number; maxInvalidMoves?: number }) => {
    // Configurable constants with sensible defaults inspired by llm_chess
    const MAX_GAME_MOVES = options?.maxGameMoves ?? 200; // total half‑moves before draw【530007361670812†L53-L59】
    const MAX_INVALID_MOVES = options?.maxInvalidMoves ?? 3; // invalid AI replies before forfeit【530007361670812†L53-L59】
    const aiMode = options?.aiMode ?? 'gemini';

    const [game, setGame] = useState<ChessInstance>(new Chess());
    const [fen, setFen] = useState(game.fen());
    const [history, setHistory] = useState<string[]>([]);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiThinkingMessage, setAiThinkingMessage] = useState(thinkingMessages[0]);
    // Track material counts for white and black
    const [materialCount, setMaterialCount] = useState<{ white: number; black: number }>({ white: 0, black: 0 });
    // Track how many invalid moves the AI attempted
    const [invalidMoveCount, setInvalidMoveCount] = useState<number>(0);
    // Allow manual override of the game status (for forfeit or max moves)
    const [manualGameStatus, setManualGameStatus] = useState<GameStatus | null>(null);

    /**
     * Computes the current material for both sides based on the board.
     * Piece values mirror those used in llm_chess: pawns 1, knights/bishops 3,
     * rooks 5 and queens 9【471605922165078†L245-L263】.
     */
    const computeMaterialCount = useCallback((board: (Piece | null)[][]) => {
        const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        let white = 0;
        let black = 0;
        for (const row of board) {
            for (const piece of row) {
                if (piece) {
                    const val = pieceValues[piece.type] ?? 0;
                    if (piece.color === 'w') white += val; else black += val;
                }
            }
        }
        return { white, black };
    }, []);

    // Derive the game status. If a manual override exists, use it. Otherwise
    // consult the chess.js instance for checkmate, stalemate or draw.
    const gameStatus: GameStatus = useMemo(() => {
        if (manualGameStatus) return manualGameStatus;
        if (game.in_checkmate()) {
            return { isCheckmate: true, isStalemate: false, isDraw: false, winner: game.turn() === 'w' ? 'b' : 'w', reason: 'Checkmate' };
        }
        if (game.in_stalemate()) {
            return { isCheckmate: false, isStalemate: true, isDraw: true, winner: 'draw', reason: 'Stalemate' };
        }
        if (game.in_draw()) {
            let reason = 'Draw';
            if (game.in_threefold_repetition()) reason = 'Threefold Repetition';
            if (game.insufficient_material()) reason = 'Insufficient Material';
            return { isCheckmate: false, isStalemate: false, isDraw: true, winner: 'draw', reason };
        }
        return { isCheckmate: false, isStalemate: false, isDraw: false, winner: null, reason: '' };
    }, [fen, game, manualGameStatus]);

    // Memoize possible moves for the currently selected square
    const possibleMoves = useMemo(() => {
        if (!selectedSquare) return [];
        const moves = game.moves({ square: selectedSquare, verbose: true });
        return moves.map(move => ({ to: move.to as Square, flags: move.flags }));
    }, [selectedSquare, game]);

    /**
     * Executes a move on the internal chess board. Returns true if the move
     * succeeded. Also updates FEN, move history and material count.
     */
    const makeMove = useCallback((move: string | { from: string; to: string; promotion?: string }) => {
        const result = game.move(move);
        if (result) {
            setFen(game.fen());
            setHistory(game.history());
            // Update material after every successful move
            const boardArr = game.board() as (Piece | null)[][];
            setMaterialCount(computeMaterialCount(boardArr));
            return true;
        }
        return false;
    }, [game, computeMaterialCount]);

    /**
     * Determines and makes the AI's move. When aiMode is 'gemini' it calls
     * Gemini via getAiMoveJson and falls back to a random move on failure. When
     * aiMode is 'random' it simply chooses a random legal move. Any invalid
     * AI reply increments invalidMoveCount and triggers a forfeit when the
     * maximum is exceeded【530007361670812†L53-L59】.
     */
    const makeAiMove = useCallback(async () => {
        if (game.turn() === 'b' && !gameStatus.isCheckmate && !gameStatus.isDraw && !manualGameStatus) {
            setIsAiThinking(true);
            try {
                let moveToMake: string | { from: string; to: string; promotion?: string } | null = null;
                if (aiMode === 'gemini') {
                    const verboseMoves = game.moves({ verbose: true }) as any[];
                    const legalMoves = verboseMoves.map(m => m.from + m.to + (m.promotion ? m.promotion : ''));
                    const aiMoveJson = await getAiMoveJson(game.fen(), 'b', legalMoves);
                    if (aiMoveJson) {
                        moveToMake = aiMoveJson;
                    } else {
                        // AI returned invalid JSON; mark as invalid
                        setInvalidMoveCount(prev => prev + 1);
                    }
                }
                if (aiMode === 'random' || moveToMake === null) {
                    const moves = game.moves();
                    const randomMove = moves[Math.floor(Math.random() * moves.length)];
                    moveToMake = randomMove;
                }
                if (moveToMake) {
                    const moveResult = makeMove(moveToMake);
                    if (!moveResult) {
                        // AI attempted an illegal move; increment invalid count and fallback
                        setInvalidMoveCount(prev => prev + 1);
                        const moves = game.moves();
                        const randomMove = moves[Math.floor(Math.random() * moves.length)];
                        makeMove(randomMove);
                    }
                }
            } catch (error) {
                console.error("Failed to get AI move, making a random move:", error);
                // Count this as an invalid attempt for the AI
                setInvalidMoveCount(prev => prev + 1);
                const moves = game.moves();
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                makeMove(randomMove);
            } finally {
                setIsAiThinking(false);
            }
        }
    }, [aiMode, game, gameStatus, makeMove, manualGameStatus]);

    // Trigger the AI move automatically whenever it's Gemini's turn (black)
    useEffect(() => {
        if (game.turn() === 'b' && !manualGameStatus) {
            const timer = setTimeout(() => makeAiMove(), 500);
            return () => clearTimeout(timer);
        }
    }, [fen, makeAiMove, game, manualGameStatus]);

    // Rotate the AI thinking messages while the AI is computing
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isAiThinking) {
            intervalId = setInterval(() => {
                setAiThinkingMessage(thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)]);
            }, 2000);
        }
        return () => clearInterval(intervalId);
    }, [isAiThinking]);

    /**
     * Handles clicks on the chessboard squares. When the player's turn it
     * either selects a piece or attempts to move it. Auto‑promotion to queen
     * is applied. If the move succeeds material counts are updated by
     * makeMove().
     */
    const handleSquareClick = (square: Square) => {
        if (game.turn() !== 'w' || gameStatus.isCheckmate || gameStatus.isDraw || manualGameStatus) return;
        if (selectedSquare) {
            const moveSuccess = makeMove({ from: selectedSquare, to: square, promotion: 'q' });
            if (!moveSuccess) {
                // Selecting a piece on a wrong square just changes the selection
                setSelectedSquare(square);
            } else {
                setSelectedSquare(null);
            }
        } else {
            const movesForSquare = game.moves({ square, verbose: true });
            if (movesForSquare.length > 0) {
              setSelectedSquare(square);
            }
        }
    };

    /**
     * Resets the game to its initial state. Also clears manual overrides and
     * counters.
     */
    const resetGame = useCallback(() => {
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
        setHistory([]);
        setSelectedSquare(null);
        setIsAiThinking(false);
        setManualGameStatus(null);
        setInvalidMoveCount(0);
        const boardArr = newGame.board() as (Piece | null)[][];
        setMaterialCount(computeMaterialCount(boardArr));
    }, [computeMaterialCount]);

    // Watchers for invalid moves and maximum move limit. When the AI commits
    // too many invalid moves we set a manual game status awarding the win to
    // the player. Likewise if the game exceeds MAX_GAME_MOVES (half moves), a
    // draw is declared【530007361670812†L53-L59】.
    useEffect(() => {
        // Invalid moves → forfeit
        if (!manualGameStatus && invalidMoveCount >= MAX_INVALID_MOVES) {
            setManualGameStatus({
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                winner: 'w',
                reason: 'Gemini forfeited after too many invalid moves',
            });
        }
        // Max moves → draw
        if (!manualGameStatus && history.length >= MAX_GAME_MOVES) {
            setManualGameStatus({
                isCheckmate: false,
                isStalemate: false,
                isDraw: true,
                winner: 'draw',
                reason: 'Max moves reached',
            });
        }
    }, [invalidMoveCount, history.length, MAX_INVALID_MOVES, MAX_GAME_MOVES, manualGameStatus]);

    return {
        game,
        fen,
        history,
        gameStatus,
        possibleMoves,
        selectedSquare,
        isAiThinking,
        aiThinkingMessage,
        handleSquareClick,
        resetGame,
        materialCount,
        invalidMoveCount,
        maxGameMoves: MAX_GAME_MOVES,
        maxInvalidMoves: MAX_INVALID_MOVES,
    };
};
