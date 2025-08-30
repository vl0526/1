import React from 'react';
import type { Piece } from '../../types';
import { WhitePawn, WhiteRook, WhiteKnight, WhiteBishop, WhiteQueen, WhiteKing } from './WhitePieces';
import { BlackPawn, BlackRook, BlackKnight, BlackBishop, BlackQueen, BlackKing } from './BlackPieces';

interface PieceIconProps {
  piece: Piece;
}

export const PieceIcon: React.FC<PieceIconProps> = ({ piece }) => {
  const { type, color } = piece;
  
  const pieceMap = {
    w: { p: WhitePawn, r: WhiteRook, n: WhiteKnight, b: WhiteBishop, q: WhiteQueen, k: WhiteKing },
    b: { p: BlackPawn, r: BlackRook, n: BlackKnight, b: BlackBishop, q: BlackQueen, k: BlackKing },
  };

  const Component = pieceMap[color][type];

  // Apply a glow effect matching the UI theme colors (cyan for white, purple for black)
  const glowClass = color === 'w'
    ? 'drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]' // Cyan glow
    : 'drop-shadow-[0_0_4px_rgba(168,85,247,0.8)]'; // Purple glow

  return (
    <div className={`w-[85%] h-[85%] z-10 transition-all duration-300 ${glowClass}`}>
      <Component />
    </div>
  );
};
