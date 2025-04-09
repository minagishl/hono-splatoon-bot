import type { TextMessage, FlexMessage, WebhookEvent } from '@line/bot-sdk';
import type { Schedules } from 'splatnet3-types/splatoon3ink';
import { getSchedules, getLocale } from '../cache.ts';
import { countNext } from './index.ts';

export async function createMessage(event: WebhookEvent): Promise<TextMessage[] | FlexMessage[]> {
	if (event.type !== 'message' || event.message.type !== 'text') {
		throw new Error('Not a text message');
	}

	const text = event.message.text.toLowerCase();
	const count = countNext(text, 3);

	const schedules = await getSchedules();
	const locale = await getLocale();

	let matchType: string;
	interface VsRule {
		vsRule: { id: string };
	}

	interface CoopSetting {
		boss?: { id: string };
		coopStage?: { id: string };
		weapons?: Array<{ __splatoon3ink_id: string }>;
	}

	type MatchSetting = VsRule | CoopSetting;

	interface ScheduleData {
		[key: string]: MatchSetting;
	}

	let scheduleData:
		| Schedules['data']['regularSchedules']['nodes'][number]
		| Schedules['data']['bankaraSchedules']['nodes'][number]
		| Schedules['data']['xSchedules']['nodes'][number]
		| Schedules['data']['eventSchedules']['nodes'][number]
		| (Schedules['data']['coopGroupingSchedule']['regularSchedules']['nodes'][number] &
				ScheduleData);
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
	} else if (text.includes('サモラン')) {
		matchType = 'coop';
		scheduleData = schedules.data.coopGroupingSchedule.regularSchedules.nodes[count];
		matchSettingKey = 'setting';
		title = 'サーモンラン';
	} else {
		throw new Error('Invalid match type');
	}

	if (!scheduleData) {
		const message: TextMessage[] = [
			{
				type: 'text' as const,
				text: '指定されたスケジュールが見つかりませんでした',
			},
		];
		return message;
	}

	const message: FlexMessage[] = [
		{
			type: 'flex',
			altText: title,
			contents: {
				type: 'bubble' as const,
				body: {
					type: 'box' as const,
					layout: 'vertical' as const,
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
								if (
									'timePeriods' in scheduleData &&
									Array.isArray(scheduleData.timePeriods) &&
									scheduleData.timePeriods.length > 0 &&
									'startTime' in scheduleData.timePeriods[0] &&
									'endTime' in scheduleData.timePeriods[0]
								) {
									const currentPeriod = scheduleData.timePeriods[0];
									return formatDateRange(
										new Date(currentPeriod.startTime),
										new Date(currentPeriod.endTime)
									);
								}
								if ('startTime' in scheduleData && 'endTime' in scheduleData) {
									return formatDateRange(
										new Date(scheduleData.startTime),
										new Date(scheduleData.endTime)
									);
								}
								return 'N/A';
							})(),
							size: 'xs' as const,
							color: '#aaaaaa',
						},
						{
							type: 'separator' as const,
							margin: 'xxl' as const,
						},
						{
							type: 'box' as const,
							layout: 'vertical' as const,
							contents: [
								{
									type: 'text' as const,
									text: (() => {
										if (matchType === 'coop') {
											return 'オカシラシャケ';
										}
										return 'ルール';
									})(),
									size: 'md' as const,
									weight: 'bold' as const,
								},
								{
									type: 'text' as const,
									text: (() => {
										if (matchType === 'coop') {
											const setting = (scheduleData as ScheduleData)[matchSettingKey];
											if ('boss' in setting && setting.boss?.id) {
												return locale.bosses[setting.boss.id]?.name ?? 'N/A';
											} else {
												return 'N/A';
											}
										} else {
											const setting =
												matchType === 'event' && 'leagueMatchSetting' in scheduleData
													? scheduleData.leagueMatchSetting
													: matchType === 'bankara'
													? scheduleData[matchSettingKey as keyof typeof scheduleData][
															title.includes('チャレンジ') ? 0 : 1
													  ]
													: scheduleData[matchSettingKey as keyof typeof scheduleData];
											if ('vsRule' in setting && setting.vsRule?.id) {
												return locale.rules[setting.vsRule.id]?.name ?? 'N/A';
											} else {
												return 'N/A';
											}
										}
									})(),
									size: 'sm' as const,
								},
							],
							spacing: 'sm' as const,
							margin: 'xxl' as const,
						},
						{
							type: 'separator' as const,
							margin: 'xxl' as const,
						},
						{
							type: 'box' as const,
							layout: 'vertical' as const,
							contents: [
								{
									type: 'text' as const,
									text: 'ステージ',
									size: 'md' as const,
									weight: 'bold' as const,
								},
								...(matchType === 'coop'
									? (() => {
											const setting = (scheduleData as ScheduleData)[matchSettingKey];
											if (
												!('coopStage' in setting) ||
												!setting.coopStage?.id ||
												!locale.stages[setting.coopStage.id]
											) {
												return [
													{
														type: 'text' as const,
														text: 'N/A',
														size: 'sm' as const,
														color: '#555555',
													},
												];
											}
											return [
												{
													type: 'text' as const,
													text: locale.stages[setting.coopStage.id].name,
													size: 'sm' as const,
													color: '#555555',
												},
											];
									  })()
									: (matchType === 'event' && 'leagueMatchSetting' in scheduleData
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
							spacing: 'sm' as const,
							margin: 'xxl' as const,
						},
						...(matchType === 'coop'
							? [
									{
										type: 'separator' as const,
										margin: 'xxl' as const,
									},
									{
										type: 'box' as const,
										layout: 'vertical' as const,
										contents: [
											{
												type: 'text' as const,
												text: '支給ブキ',
												size: 'md' as const,
												weight: 'bold' as const,
											},
											...(() => {
												const setting = (scheduleData as ScheduleData)[matchSettingKey];
												if (!('weapons' in setting) || !setting.weapons?.length) {
													return [
														{
															type: 'text' as const,
															text: 'N/A',
															size: 'sm' as const,
															color: '#555555',
														},
													];
												}
												return setting.weapons.map((weapon: { __splatoon3ink_id: string }) => ({
													type: 'text' as const,
													text: locale.weapons[weapon.__splatoon3ink_id]?.name ?? 'N/A',
													size: 'sm' as const,
													color: '#555555',
												}));
											})(),
										],
										spacing: 'sm' as const,
										margin: 'xxl' as const,
									},
							  ]
							: []),
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
