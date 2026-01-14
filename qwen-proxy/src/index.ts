/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	QWEN_API_KEY: string
}

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS })
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })
		}

		if (!env.QWEN_API_KEY) {
			return new Response('Missing QWEN_API_KEY', { status: 500, headers: CORS_HEADERS })
		}

		let body: any
		try {
			body = await request.json()
		} catch {
			return new Response('Bad Request', { status: 400, headers: CORS_HEADERS })
		}

		const upstream = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.QWEN_API_KEY}`,
			},
			body: JSON.stringify({
				model: body?.model || 'qwen-turbo',
				stream: body?.stream ?? false,
				messages: body?.messages || [],
			}),
		})

		const headers = new Headers(upstream.headers)
		headers.set('Access-Control-Allow-Origin', '*')
		headers.set('Access-Control-Allow-Headers', 'Content-Type')
		headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')

		return new Response(upstream.body, {
			status: upstream.status,
			headers,
		})
	},
} satisfies ExportedHandler<Env>;
