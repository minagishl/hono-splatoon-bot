import type { TextMessage, FlexMessage, WebhookEvent } from '@line/bot-sdk';
import type { Schedules } from 'splatnet3-types/splatoon3ink';
import { getSchedules, getLocale } from '../cache.ts';
import { countNext } from './index.ts';

export async function createMessage(event: WebhookEvent): Promise<FlexMessage[]> {
	if (event.type !== 'message' || event.message.type !== 'text') {
		throw new Error('Not a text message');
	}

	const text = event.message.text.toLowerCase();
	const count = countNext(text, 3);

	const schedules = await getSchedules();
	const locale = await getLocale();

	let matchType: string;
	let scheduleData:
		| Schedules['data']['regularSchedules']['nodes'][number]
		| Schedules['data']['bankaraSchedules']['nodes'][number]
		| Schedules['data']['xSchedules']['nodes'][number]
		| Schedules['data']['eventSchedules']['nodes'][number];
	let matchSettingKey: string;
	let title: string;

	// Determine the match type based on the text
	if (text.includes('レギュラー') || text.includes('ナワバリ')) {
		matchType = 'regular';
		scheduleData = schedules.data.regularSchedules.nodes[count];
		matchSettingKey = 'regularMatchSetting';
		title = 'ナワバリマッチ';
	} else if (text.includes('バンカラ') && !text.includes('オープン')) {
		matchType = 'bankara';
		scheduleData = schedules.data.bankaraSchedules.nodes[count];
		matchSettingKey = 'bankaraMatchSettings';
		title = 'バンカラマッチ（チャレンジ）';
	} else if (text.includes('バンカラ') && text.includes('オープン')) {
		matchType = 'bankara';
		scheduleData = schedules.data.bankaraSchedules.nodes[count];
		matchSettingKey = 'bankaraMatchSettings';
		title = 'バンカラマッチ（オープン）';
	} else if (text.includes('x')) {
		matchType = 'x';
		scheduleData = schedules.data.xSchedules.nodes[count];
		matchSettingKey = 'xMatchSetting';
		title = 'Xマッチ';
	} else if (text.includes('イベント')) {
		matchType = 'event';
		scheduleData = schedules.data.eventSchedules.nodes[count];
		matchSettingKey = 'eventMatchSetting';
		title = 'イベントマッチ';
	} else {
		throw new Error('Invalid match type');
	}

	if (!scheduleData) {
		throw new Error('No schedule data available');
	}

	const message: FlexMessage[] = [
		{
			type: 'flex',
			altText: title,
			contents: {
				type: 'bubble',
				body: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text' as const,
							text: 'ステージ情報',
							weight: 'bold' as const,
							color: '#1DB446',
							size: 'sm' as const,
						},
						{
							type: 'text' as const,
							text: title,
							weight: 'bold' as const,
							size: 'xl' as const,
							margin: 'sm' as const,
						},
						{
							type: 'text' as const,
							text: (() => {
								if ('timePeriods' in scheduleData) {
									const currentPeriod = scheduleData.timePeriods[0];
									return formatDateRange(
										new Date(currentPeriod.startTime),
										new Date(currentPeriod.endTime)
									);
								}
								return formatDateRange(
									new Date(scheduleData.startTime),
									new Date(scheduleData.endTime)
								);
							})(),
							size: 'xs' as const,
							color: '#aaaaaa',
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
									type: 'text' as const,
									text: 'ルール',
									size: 'md' as const,
									weight: 'bold' as const,
								},
								{
									type: 'text' as const,
									text: (() => {
										const setting =
											matchType === 'event' && 'leagueMatchSetting' in scheduleData
												? scheduleData.leagueMatchSetting
												: matchType === 'bankara'
												? scheduleData[matchSettingKey as keyof typeof scheduleData][
														title.includes('チャレンジ') ? 0 : 1
												  ]
												: scheduleData[matchSettingKey as keyof typeof scheduleData];
										if (!setting?.vsRule?.id || !locale.rules[setting.vsRule.id]) return 'N/A';
										return locale.rules[setting.vsRule.id].name;
									})(),
									size: 'sm' as const,
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
									type: 'text' as const,
									text: 'ステージ',
									size: 'md' as const,
									weight: 'bold' as const,
								},
								...((matchType === 'event' && 'leagueMatchSetting' in scheduleData
									? (scheduleData.leagueMatchSetting as { vsStages: Array<{ id: string }> })
											?.vsStages
									: matchType === 'bankara'
									? (
											scheduleData[matchSettingKey as keyof typeof scheduleData][
												title.includes('チャレンジ') ? 0 : 1
											] as {
												vsStages: Array<{ id: string }>;
											}
									  )?.vsStages
									: (
											scheduleData[matchSettingKey as keyof typeof scheduleData] as {
												vsStages: Array<{ id: string }>;
											}
									  )?.vsStages
								)?.map((stage) => ({
									type: 'text' as const,
									text: locale.stages[stage.id]?.name ?? 'N/A',
									size: 'sm' as const,
									color: '#555555',
								})) ?? []),
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
