
import React, { useMemo } from 'react';
import type { Piece, Square, PossibleMove } from '../types';
import { PieceIcon } from './icons/PieceIcon';

interface ChessboardProps {
    fen: string;
    onSquareClick: (square: Square) => void;
    possibleMoves: PossibleMove[];
    selectedSquare: Square | null;
}

const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const fenToBoard = (fen: string): (Piece | null)[][] => {
    const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    const [position] = fen.split(' ');
    let rank = 0;
    let file = 0;
    for (const char of position) {
        if (char === '/') {
            rank++;
            file = 0;
        } else if (/\d/.test(char)) {
            file += parseInt(char, 10);
        } else {
            const color = char === char.toUpperCase() ? 'w' : 'b';
            const type = char.toLowerCase() as Piece['type'];
            board[rank][file] = { type, color };
            file++;
        }
    }
    return board;
};


export const Chessboard: React.FC<ChessboardProps> = ({ fen, onSquareClick, possibleMoves, selectedSquare }) => {
    const board = useMemo(() => fenToBoard(fen), [fen]);
    const possibleMoveTos = useMemo(() => new Set(possibleMoves.map(m => m.to)), [possibleMoves]);

    return (
        <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 bg-stone-800 border-4 border-stone-700 rounded-lg shadow-2xl shadow-black/50 overflow-hidden">
            {board.map((row, rankIndex) =>
                row.map((piece, fileIndex) => {
                    const square = `${files[fileIndex]}${ranks[rankIndex]}` as Square;
                    const isLight = (rankIndex + fileIndex) % 2 !== 0;
                    
                    const isSelected = square === selectedSquare;
                    const isPossibleMove = possibleMoveTos.has(square);

                    return (
                        <div
                            key={square}
                            onClick={() => onSquareClick(square)}
                            className={`
                                relative flex items-center justify-center cursor-pointer group
                                ${isLight ? 'bg-stone-400' : 'bg-purple-900/70'}
                            `}
                        >
                            {/* Piece */}
                            {piece && <PieceIcon piece={piece} />}

                            {/* Selection Highlight */}
                             {isSelected && <div className="absolute inset-0 bg-cyan-400/50"></div>}

                            {/* Possible Move Indicator */}
                            {isPossibleMove && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={`
                                        rounded-full transition-opacity duration-200 
                                        ${piece ? 'w-full h-full bg-cyan-500/30 border-4 border-cyan-400' : 'w-1/3 h-1/3 bg-cyan-500/50'}
                                    `}></div>
                                </div>
                            )}

                        </div>
                    );
                })
            )}
        </div>
    );
};
