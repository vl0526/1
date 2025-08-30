
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { GameInfo } from './components/GameInfo';
import { GameOverModal } from './components/GameOverModal';
import { useChessGame } from './hooks/useChessGame';
import type { GameStatus } from './types';

const MuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const UnmuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" />
    </svg>
);


export default function App() {
    // Allow the user to choose between the Gemini opponent and a simple random move generator.
    const [aiMode, setAiMode] = useState<'gemini' | 'random'>('gemini');

    const {
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
        maxGameMoves,
        maxInvalidMoves,
    } = useChessGame({ aiMode });

    const [isMuted, setIsMuted] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const moveAudioRef = useRef<HTMLAudioElement | null>(null);
    const captureAudioRef = useRef<HTMLAudioElement | null>(null);
    const checkAudioRef = useRef<HTMLAudioElement | null>(null);
    const endAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://vgmsite.com/soundtracks/portal-2-exile-vilify/bfmryqtc/11.%20Exile%20Vilify.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.1;

        moveAudioRef.current = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
        captureAudioRef.current = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
        checkAudioRef.current = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3');
        endAudioRef.current = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3');

    }, []);

    const toggleMute = () => {
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            } else {
                audioRef.current.pause();
            }
        }
        setIsMuted(!isMuted);
    };

    const playSound = useCallback((soundType: 'move' | 'capture' | 'check' | 'end') => {
        if (isMuted) return;
        let audioToPlay: HTMLAudioElement | null = null;
        switch(soundType) {
            case 'move': audioToPlay = moveAudioRef.current; break;
            case 'capture': audioToPlay = captureAudioRef.current; break;
            case 'check': audioToPlay = checkAudioRef.current; break;
            case 'end': audioToPlay = endAudioRef.current; break;
        }
        if (audioToPlay) {
            audioToPlay.currentTime = 0;
            audioToPlay.play().catch(e => console.error("Sound effect failed:", e));
        }
    }, [isMuted]);

    useEffect(() => {
        if (gameStatus.isCheckmate || gameStatus.isStalemate || gameStatus.isDraw) {
            playSound('end');
        } else if (game.in_check()) {
            playSound('check');
        } else if (history.length > 0) {
            const lastMove = history[history.length - 1];
            if (lastMove.includes('x')) {
                playSound('capture');
            } else {
                playSound('move');
            }
        }
    }, [history, gameStatus, playSound, game]);


    return (
        <main className="min-h-screen bg-stone-950 font-sans text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.1)_0%,_transparent_50%)]"></div>
            <div className="absolute top-4 right-4 z-20">
                <button onClick={toggleMute} className="p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/70 transition-colors">
                    {isMuted ? <UnmuteIcon /> : <MuteIcon />}
                </button>
            </div>
            <header className="text-center mb-4 md:mb-6 z-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-purple-400 glow-purple">
                    GEMINI GRANDMASTER
                </h1>
                <p className="text-cyan-400 glow-cyan">ELO 2300</p>
                {/* Opponent selector */}
                <div className="mt-3 flex justify-center items-center gap-2">
                    <label className="text-sm text-slate-400" htmlFor="opponent-select">Opponent:</label>
                    <select
                        id="opponent-select"
                        value={aiMode}
                        onChange={(e) => {
                            const mode = e.target.value as 'gemini' | 'random';
                            // On change, reset the game and update AI mode
                            setAiMode(mode);
                            resetGame();
                        }}
                        className="bg-stone-800/50 text-slate-200 p-1 rounded-md border border-stone-700 focus:outline-none"
                    >
                        <option value="gemini">Gemini</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            </header>

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">
                <div className="lg:col-span-2 flex items-center justify-center">
                    <div className="relative w-full max-w-[calc(100vh-200px)] aspect-square">
                       <Chessboard
                            fen={fen}
                            onSquareClick={handleSquareClick}
                            possibleMoves={possibleMoves}
                            selectedSquare={selectedSquare}
                        />
                         {isAiThinking && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
                                <p className="text-cyan-300 mt-4 text-lg font-semibold tracking-wider">{aiThinkingMessage}</p>
                            </div>
                        )}
                    </div>
                </div>

                <GameInfo
                    history={history}
                    turn={game.turn()}
                    onReset={resetGame}
                    gameStatus={gameStatus}
                    materialCount={materialCount}
                    invalidMoveCount={invalidMoveCount}
                    maxGameMoves={maxGameMoves}
                    maxInvalidMoves={maxInvalidMoves}
                    aiMode={aiMode}
                />
            </div>
            
            { (gameStatus.isCheckmate || gameStatus.isStalemate || gameStatus.isDraw) && 
                <GameOverModal 
                    status={gameStatus}
                    onPlayAgain={resetGame}
                />
            }
        </main>
    );
}
