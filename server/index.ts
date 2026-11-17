import express from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { getState, resetState, setState } from './store.js'
import { resolveDecision, runFactory, teamMessage } from './orchestrator.js'
import type { Agent } from '../src/types.js'

const app = express()
const port = Number(process.env.PORT ?? 4310)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: process.env.MODEL_PROVIDER ?? 'mock' }))
app.get('/api/state', async (_req, res) => res.json(await getState()))

app.post('/api/run', async (req, res) => {
  const parsed = z.object({ goal: z.string().trim().min(3).max(1000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Опишите цель минимум тремя символами' })
  res.json(await setState(await runFactory(await getState(), parsed.data.goal)))
})

app.post('/api/messages', async (req, res) => {
  const parsed = z.object({ text: z.string().trim().min(1).max(2000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Сообщение пустое или слишком длинное' })
  res.json(await setState(await teamMessage(await getState(), parsed.data.text)))
})

app.post('/api/decisions/:id', async (req, res) => {
  const parsed = z.object({ action: z.enum(['approve', 'reject']) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Неизвестное действие' })
  try { res.json(await setState(resolveDecision(await getState(), req.params.id, parsed.data.action))) }
  catch (error) { res.status(404).json({ error: error instanceof Error ? error.message : 'Решение не найдено' }) }
})

app.put('/api/agents/:id', async (req, res) => {
  const state = structuredClone(await getState())
  const index = state.agents.findIndex((agent) => agent.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'Агент не найден' })
  const incoming = req.body as Agent
  state.agents[index] = { ...state.agents[index], ...incoming, id: state.agents[index].id }
  state.activity.unshift({ id: crypto.randomUUID(), text: `Обновлено ядро агента «${state.agents[index].name}»`, createdAt: new Date().toISOString(), tone: 'neutral' })
  res.json(await setState(state))
})

app.post('/api/reset', async (_req, res) => res.json(await resetState()))

app.use(express.static(join(root, 'dist')))
app.get('/*splat', (_req, res) => res.sendFile(join(root, 'dist', 'index.html')))

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`StzeHarness запущен: http://localhost:${port}`))
}

export default app
