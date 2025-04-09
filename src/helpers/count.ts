export function countNext(text: string, maxCount: number): number {
	return Math.min(text.match(/次回|つぎ|次|ネクスト|next|NEXT/g)?.length ?? 0, maxCount);
}
