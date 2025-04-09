import type { TextMessage, FlexMessage, WebhookEvent } from '@line/bot-sdk';
import { getSchedules, getLocale } from '../cache.ts';
import { countNext } from './index.ts';

export async function createMessage(event: WebhookEvent): Promise<FlexMessage[]> {
	if (event.type !== 'message' || event.message.type !== 'text') {
		throw new Error('Not a text message');
	}

	const count = countNext(event.message.text, 3);

	const schedules = await getSchedules();
	const locale = await getLocale();

	const message: FlexMessage[] = [
		{
			type: 'flex',
			altText: 'Message',
			contents: {
				type: 'bubble',
				body: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text',
							text: 'ステージ情報',
							weight: 'bold',
							color: '#1DB446',
							size: 'sm',
						},
						{
							type: 'text',
							text: 'ナワバリバトル',
							weight: 'bold',
							size: 'xl',
							margin: 'sm',
						},

						{
							type: 'text' as 'span',
							text: formatDateRange(
								new Date(schedules.data.regularSchedules.nodes[count].startTime),
								new Date(schedules.data.regularSchedules.nodes[count].endTime)
							),
							size: 'xs',
							color: '#aaaaaa',
						},

						{
							type: 'separator' as const,
							margin: 'xxl',
						},
						{
							type: 'box' as const,
							layout: 'vertical' as const,
							contents: [
								{
									type: 'text' as 'span',
									text: 'ルール',
									size: 'md',
									weight: 'bold',
								},
								{
									type: 'text' as 'span',
									text: locale.rules[
										schedules.data.regularSchedules.nodes[count].regularMatchSetting?.vsRule
											.id as string
									].name,
									size: 'sm',
								},
							],
							spacing: 'sm',
							margin: 'xxl',
						},
						{
							type: 'separator',
							margin: 'xxl',
						},
						{
							type: 'box',
							layout: 'vertical',
							contents: [
								{
									type: 'text',
									text: 'ステージ',
									size: 'md',
									weight: 'bold',
								},
								...(schedules.data.regularSchedules.nodes[count].regularMatchSetting?.vsStages?.map(
									(stage) => ({
										type: 'text' as 'span',
										text: locale.stages[stage.id].name,
										size: 'sm',
										color: '#555555',
									})
								) || []),
							],
							spacing: 'sm',
							margin: 'xxl',
						},
					],
				},
				styles: {
					footer: {
						separator: true,
					},
				},
			},
		},
	];
	return message;
}

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

function formatDateRange(startDate: Date, endDate: Date): string {
	// Function to format the date
	const formatDate = (date: Date, hiddenWeek?: boolean): string => {
		// Convert the date to Asia/Tokyo time
		const tokyoTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

		const month = tokyoTime.getMonth() + 1;
		const day = tokyoTime.getDate();
		const hour = tokyoTime.getHours();
		const minute = tokyoTime.getMinutes().toString().padStart(2, '0');
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][tokyoTime.getDay()]; // Get the day of the week

		// If hiddenWeek is true, the day of the week is not displayed
		if (hiddenWeek) {
			return `${month}/${day} ${hour}:${minute}`;
		}

		return `${month}/${day}（${dayOfWeek}）${hour}:${minute}`;
	};

	// Format startDate and endDate and concatenate them
	return `${formatDate(startDate)} – ${formatDate(endDate, true)}`;
}
