import { Hono } from 'hono';
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

	return c.json({ message: 'Webhook received' }, 200);
});

Deno.serve(app.fetch);
