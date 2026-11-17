import type { Agent } from '../src/types.js'

export type ModelMode = 'simulation' | 'live'

export function modelMode(): ModelMode {
  return process.env.MODEL_PROVIDER === 'openai-compatible' ? 'live' : 'simulation'
}

export async function complete(agent: Agent, userPrompt: string): Promise<string> {
  const baseUrl = (process.env.MODEL_BASE_URL ?? 'http://localhost:11434/v1').replace(/\/$/, '')
  const model = process.env.MODEL_NAME ?? agent.core.model
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.MODEL_API_KEY ? { Authorization: `Bearer ${process.env.MODEL_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content: [
            agent.core.prompt,
            `Твоя зона: ${agent.lane}.`,
            `Контекст: ${agent.core.context}`,
            `Доступные инструменты: ${agent.core.tools.join(', ')}.`,
            'Отвечай по-русски, кратко и только из своей зоны ответственности.',
          ].join('\n'),
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Модель вернула HTTP ${response.status}`)
  const body = await response.json() as { choices?: { message?: { content?: string } }[] }
  const text = body.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Модель вернула пустой ответ')
  return text
}
