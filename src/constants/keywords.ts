export const MATCH_KEYWORDS = {
	REGULAR: ['レギュラー', 'ナワバリ', 'regular', 'バトル'],
	BANKARA_CHALLENGE: ['バンカラ'],
	BANKARA_OPEN: ['バンカラ', 'オープン'],
	X_MATCH: ['x'],
	EVENT: ['イベント', 'event'],
	SALMON_RUN: ['しゃけ', 'シャケ', 'サーモン', 'salmon', 'サモラン', 'バイト', 'シフト'],
} as const;

export type MatchType = keyof typeof MATCH_KEYWORDS;

/**
 * Find matching match type based on input text
 * @param text Input text to check
 * @returns Matching match type or null if no match found
 */
export function findMatchType(text: string): MatchType | null {
	const lowercaseText = text.toLowerCase();

	// Special case for Bankara Open which requires both keywords
	if (MATCH_KEYWORDS.BANKARA_OPEN.every((keyword) => lowercaseText.includes(keyword))) {
		return 'BANKARA_OPEN';
	}

	// Check other match types
	for (const [matchType, keywords] of Object.entries(MATCH_KEYWORDS)) {
		// Skip Bankara Open as it's handled above
		if (matchType === 'BANKARA_OPEN') continue;

		// For Bankara Challenge, ensure 'オープン' is not present
		if (matchType === 'BANKARA_CHALLENGE' && lowercaseText.includes('オープン')) continue;

		if (keywords.some((keyword) => lowercaseText.includes(keyword))) {
			return matchType as MatchType;
		}
	}

	return null;
}
