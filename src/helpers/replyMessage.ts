import type { TextMessage, FlexMessage } from '@line/bot-sdk';

export async function replyMessage(
	replyToken: string,
	messages: TextMessage[] | FlexMessage[],
	accessToken: string
): Promise<void> {
	await fetch('https://api.line.me/v2/bot/message/reply', {
		body: JSON.stringify({ replyToken, messages }),
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
	});
}
