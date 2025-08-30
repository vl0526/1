
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAiMove = async (fen: string, player: 'w' | 'b'): Promise<string> => {
  const turn = player === 'w' ? 'White' : 'Black';
  
  const prompt = `
You are a world-class chess engine, Super Grandmaster Gemini, with an ELO of 2300. Your task is to analyze the given chess position and determine the best possible move.

The current board state is represented in Forsyth-Edwards Notation (FEN).
FEN: "${fen}"

It is ${turn}'s turn to move.

Analyze the position carefully, considering tactical possibilities, positional advantages, and long-term strategy.

Your response MUST be ONLY the next move in Standard Algebraic Notation (SAN). For example: "e4", "Nf3", "Qxg7#". 
Do not provide any explanation, commentary, or any other text. Do not wrap the move in markdown or any other formatting.
Just the move.
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.3,
            topP: 0.9,
            // Disable thinking for faster, more instinctual chess moves suitable for a "blitz" feel.
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    const move = response.text.trim();
    console.log(`Gemini proposed move: ${move}`);
    return move;
  } catch (error) {
    console.error("Error getting move from Gemini:", error);
    // As a fallback, return a random move (this part would need the game instance, so we just throw)
    throw new Error("Failed to get move from AI");
  }
};

    /**
     * Request Gemini to choose the best move for the current position.
     *
     * This helper accepts the current FEN and a list of legal moves in UCI notation.
     * It prompts Gemini to select the best move from that list and to return a
     * JSON object with `from`, `to` and optional `promotion` fields. Returning
     * structured JSON makes it easier to parse the response and ensures that the
     * model doesn’t introduce additional text. If parsing fails or the model
     * returns invalid fields the function resolves to null.
     *
     * @param fen Current position in FEN notation.
     * @param player Which side to move ('w' for White or 'b' for Black).
     * @param legalMoves List of legal moves in UCI notation (e.g. ["e2e4", "g1f3"]).
     */
    export const getAiMoveJson = async (
      fen: string,
      player: 'w' | 'b',
      legalMoves: string[]
    ): Promise<{ from: string; to: string; promotion?: string } | null> => {
      const turn = player === 'w' ? 'White' : 'Black';
      const legalMovesList = legalMoves.join(', ');
      const prompt = `
You are a world-class chess engine, Super Grandmaster Gemini, with an ELO of 2300.
Your task is to analyse the given chess position and determine the best possible move.

The current board state is represented in Forsyth-Edwards Notation (FEN).
FEN: "${fen}"

It is ${turn}'s turn to move.

The following legal moves are available in UCI notation: ${legalMovesList}.
Pick the best move from this list. Respond with a JSON object containing the
fields "from" and "to" (lowercase squares) and an optional "promotion" field
(use "q" for queen promotion or leave it null). Do not provide any other
text, commentary or formatting. Only output the JSON object.
`;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            temperature: 0.3,
            topP: 0.9,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        const raw = response.text.trim();
        console.log(`Gemini proposed JSON move: ${raw}`);
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed.from === 'string' && typeof parsed.to === 'string') {
            const moveObj: { from: string; to: string; promotion?: string } = {
              from: parsed.from,
              to: parsed.to,
            };
            if (parsed.promotion && typeof parsed.promotion === 'string') {
              moveObj.promotion = parsed.promotion;
            }
            return moveObj;
          }
        } catch (err) {
          console.warn('Failed to parse JSON from Gemini:', err);
        }
        return null;
      } catch (error) {
        console.error('Error getting JSON move from Gemini:', error);
        return null;
      }
    };
