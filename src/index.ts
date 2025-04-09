import { Hono } from 'hono';
import type { Context } from 'hono';
import type { WebhookEvent } from '@line/bot-sdk';

// Helper function
import { createMessage, replyMessage } from './helpers/message.ts';

const app = new Hono();

app.get('/', (c) => {
	return c.text('Hello Hono!');
});

app.post('/webhook', async (c) => {
	const events: WebhookEvent[] = await c.req.json().then((data) => data.events);
	const accessToken = Deno.env.get('CHANNEL_ACCESS_TOKEN') ?? '';

	if (accessToken === '') {
		return c.json({ message: 'Channel access token is not set' }, 500);
	}

	// Processes received events
	processEvents(events, accessToken, c);

	return c.json({ message: 'Webhook received' }, 200);
});

async function processEvents(events: WebhookEvent[], accessToken: string, c: Context) {
	await Promise.all(
		events.map(async (event) => {
			try {
				if (event.type !== 'message' || event.message.type !== 'text') {
					return c.json({ message: 'Not a text message' }, 200);
				}

				const message = await createMessage(event, accessToken);

				// Check if the message is a valid object
				if (message) {
					await replyMessage(event.replyToken, message, accessToken);
				}
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
