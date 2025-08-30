
import React from 'react';
import type { GameStatus } from '../types';

interface GameOverModalProps {
    status: GameStatus;
    onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ status, onPlayAgain }) => {
    
    // Determine modal title based on status. If the AI forfeited (custom status
    // with a winner but not checkmate/draw), we still want to emphasise the
    // victory for the human player.
    const getTitle = () => {
        if (status.isCheckmate) {
            return status.winner === 'w' ? "Victory!" : "Defeat!";
        }
        if (!status.isDraw && !status.isStalemate && status.winner) {
            return status.winner === 'w' ? "Victory!" : "Defeat!";
        }
        return "Game Over";
    };

    const getMessage = () => {
        if (status.isCheckmate) {
            return `You have ${status.winner === 'w' ? 'defeated' : 'been defeated by'} the Grandmaster!`;
        }
        if (!status.isDraw && !status.isStalemate && status.winner) {
            // Custom reason such as forfeit
            return status.reason;
        }
        return `The game is a draw due to ${status.reason}.`;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-stone-900 border-2 border-purple-500 rounded-xl shadow-2xl shadow-purple-900/50 p-8 text-center max-w-sm w-full transform animate-scale-in">
                <h2 className={`text-4xl font-bold mb-4 ${status.winner === 'w' ? 'text-cyan-400 glow-cyan' : 'text-purple-400 glow-purple'}`}>
                    {getTitle()}
                </h2>
                <p className="text-slate-300 text-lg mb-8">{getMessage()}</p>
                <button
                    onClick={onPlayAgain}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                >
                    Play Again
                </button>
            </div>
            <style>
                {`
                    @keyframes fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes scale-in {
                        from { transform: scale(0.9); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                    .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
                `}
            </style>
        </div>
    );
};
