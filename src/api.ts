import type { Agent, FactoryState } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Ошибка сервера' }))
    throw new Error(body.error ?? 'Ошибка сервера')
  }
  return response.json()
}

export const api = {
  state: () => request<FactoryState>('/state'),
  run: (goal: string) => request<FactoryState>('/run', { method: 'POST', body: JSON.stringify({ goal }) }),
  send: (text: string) => request<FactoryState>('/messages', { method: 'POST', body: JSON.stringify({ text }) }),
  decide: (id: string, action: 'approve' | 'reject') =>
    request<FactoryState>(`/decisions/${id}`, { method: 'POST', body: JSON.stringify({ action }) }),
  updateAgent: (agent: Agent) =>
    request<FactoryState>(`/agents/${agent.id}`, { method: 'PUT', body: JSON.stringify(agent) }),
  reset: () => request<FactoryState>('/reset', { method: 'POST' }),
}
