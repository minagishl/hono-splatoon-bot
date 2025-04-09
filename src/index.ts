import { Hono } from 'hono';
import type { Context } from 'hono';
import type { WebhookEvent } from '@line/bot-sdk';

const app = new Hono();

app.get('/', (c) => {
	return c.text('Hello Hono!');
});

app.post('/webhook', async (c) => {
	const events: WebhookEvent[] = await c.req.json().then((data) => data.events);
	const token = Deno.env.get('CHANNEL_ACCESS_TOKEN') ?? '';

	if (token === '') {
		return c.json({ message: 'Channel access token is not set' }, 500);
	}

	// Processes received events
	c.executionCtx.waitUntil(processEvents(events, token, c));

	return c.json({ message: 'Webhook received' }, 200);
});

async function processEvents(events: WebhookEvent[], token: string, c: Context) {
	await Promise.all(
		events.map(async (event) => {
			try {
				await console.log('test');
			} catch (err) {
				if (err instanceof Error) {
					console.error(err);
				}

				// Handle error
				return c.json({ message: 'Error processing event' }, 500);
			}
		})
	);
}

Deno.serve(app.fetch);
