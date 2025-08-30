
import React, { useEffect, useRef } from 'react';
import type { GameStatus } from '../types';

interface GameInfoProps {
    history: string[];
    turn: 'w' | 'b';
    onReset: () => void;
    gameStatus: GameStatus;
    /**
     * Current material count for white and black. Provided by useChessGame and
     * computed using piece values similar to llm_chess's helper【471605922165078†L245-L263】.
     */
    materialCount: { white: number; black: number };
    /**
     * The number of invalid moves the AI has attempted. When this reaches
     * maxInvalidMoves the AI forfeits【530007361670812†L53-L59】.
     */
    invalidMoveCount: number;
    /** Maximum total half moves before the game is forced to draw. */
    maxGameMoves: number;
    /** Maximum invalid moves allowed for the AI before forfeit. */
    maxInvalidMoves: number;
    /** The mode of AI opponent currently selected. */
    aiMode: 'gemini' | 'random';
}

export const GameInfo: React.FC<GameInfoProps> = ({ history, turn, onReset, gameStatus, materialCount, invalidMoveCount, maxGameMoves, maxInvalidMoves, aiMode }) => {
    const historyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const getStatusMessage = () => {
        // Provide more descriptive messages for custom end conditions
        if (gameStatus.isCheckmate) return `${gameStatus.winner === 'w' ? 'You Win!' : 'Gemini Wins!'}`;
        if (gameStatus.isStalemate) return "Stalemate";
        if (gameStatus.isDraw) return `Draw by ${gameStatus.reason}`;
        // When neither draw nor checkmate but there is a winner (forfeit), show that
        if (!gameStatus.isCheckmate && !gameStatus.isStalemate && !gameStatus.isDraw && gameStatus.winner) {
            return gameStatus.winner === 'w' ? 'Gemini forfeited' : 'You forfeited';
        }
        return turn === 'w' ? 'Your Turn' : `${aiMode === 'gemini' ? 'Gemini' : 'Random'}'s Turn`;
    };

    const statusMessage = getStatusMessage();
    const isPlayerTurn = turn === 'w' && !gameStatus.isCheckmate && !gameStatus.isDraw;

    return (
        <div className="bg-stone-900/50 border border-stone-700 rounded-lg p-4 flex flex-col h-full max-h-[calc(100vh-150px)] lg:max-h-full backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-2 text-center text-purple-400 glow-purple">Game Info</h2>
            
            <div className={`text-center p-2 mb-4 rounded-md text-lg font-semibold transition-colors ${isPlayerTurn ? 'bg-cyan-500/20 text-cyan-300' : 'bg-stone-800 text-slate-300'}`}>
                {statusMessage}
            </div>

            {/* Stats panel */}
            <div className="mb-4 text-sm text-slate-300 space-y-1">
                <div>
                    <span className="text-slate-400">Opponent:</span> {aiMode === 'gemini' ? 'Gemini' : 'Random'}
                </div>
                <div>
                    <span className="text-slate-400">Material:</span> White {materialCount.white} – Black {materialCount.black}
                </div>
                <div>
                    <span className="text-slate-400">AI Mistakes:</span> {invalidMoveCount}/{maxInvalidMoves}
                </div>
                <div>
                    <span className="text-slate-400">Moves:</span> {history.length}/{maxGameMoves}
                </div>
            </div>

            <h3 className="text-xl font-semibold mb-2 text-cyan-400 glow-cyan">Move History</h3>
            <div className="flex-grow bg-stone-950/70 p-2 rounded-md overflow-y-auto">
                <ol className="list-decimal list-inside text-slate-300 space-y-1">
                    {history.reduce<React.ReactNode[]>((acc, move, index) => {
                        if (index % 2 === 0) {
                            acc.push(
                                <li key={index / 2} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 p-1 rounded">
                                    <span className="text-slate-500">{index / 2 + 1}.</span>
                                    <span className="font-mono">{move}</span>
                                    <span className="font-mono text-slate-400">{history[index + 1] || '...'}</span>
                                </li>
                            );
                        }
                        return acc;
                    }, [])}
                </ol>
                <div ref={historyEndRef} />
            </div>

            <button
                onClick={onReset}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            >
                New Game
            </button>
        </div>
    );
};
