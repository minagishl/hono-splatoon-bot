import { Coop, Festivals, Schedules } from 'splatnet3-types/splatoon3ink';
import { Locale } from './types/locale.ts';

// Open Deno KV once and reuse it for all cache accesses
const kvPromise = Deno.openKv();

export async function getCachedData<T>(cacheKey: string, fetchUrl: string): Promise<T> {
	const kv = await kvPromise;
	const now = new Date();
	const currentHour = now.getHours();

	// The key for Deno KV is saved as ["cache", cacheKey]
	const cachedEntry = await kv.get<{ data: T; timestamp: number }>(['cache', cacheKey]);

	if (cachedEntry.value) {
		const cached = cachedEntry.value;
		const cachedHour = new Date(cached.timestamp).getHours();
		if (cachedHour === currentHour) {
			console.log(`Cache hit for ${cacheKey}`);
			return cached.data;
		} else {
			console.log(
				`Cache outdated for ${cacheKey}: cached hour = ${cachedHour}, current hour = ${currentHour}`
			);
		}
	} else {
		console.log(`No cache found for ${cacheKey}`);
	}

	// Fetch the data from the URL
	const resp = await fetch(fetchUrl, {
		headers: {
			'User-Agent': 'hono-splatoon-bot (Contact: https://x.com/minagishl)',
		},
	});
	if (!resp.ok) {
		throw new Error(`Failed to fetch data from ${fetchUrl}`);
	}
	const data: T = await resp.json();
	// Update the cache with the current timestamp
	await kv.set(['cache', cacheKey], { data, timestamp: now.getTime() });
	console.log(`Cache updated for ${cacheKey}`);
	return data;
}

// Get co-op information (with cache applied)
export async function getCoop() {
	const url = 'https://splatoon3.ink/data/coop.json';
	return await getCachedData<Coop>('coop', url);
}

// Get festival information (with cache applied)
export async function getFestivals() {
	const url = 'https://splatoon3.ink/data/festivals.json';
	return await getCachedData<Festivals>('festivals', url);
}

// Get schedule information (with cache applied)
export async function getSchedules() {
	const url = 'https://splatoon3.ink/data/schedules.json';
	return await getCachedData<Schedules>('schedules', url);
}

// Get locale (ja-JP) information (with cache applied)
export async function getLocale() {
	const url = 'https://splatoon3.ink/data/locale/ja-JP.json';
	return await getCachedData<Locale>('locale_ja_JP', url);
}
