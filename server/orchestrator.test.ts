import { describe, expect, it } from 'vitest'
import { initialState } from './store.js'
import { resolveDecision, simulateRun, teamMessage } from './orchestrator.js'

describe('симулятор фабрики', () => {
  it('декомпозирует цель и создаёт запрос человеку', () => {
    const state = simulateRun(initialState(), 'Собрать сервис заметок')
    expect(state.tasks).toHaveLength(4)
    expect(state.decisions[0].status).toBe('pending')
    expect(state.messages.some((item) => item.agentId === 'architect')).toBe(true)
  })

  it('после одобрения двигает работу к инженеру', () => {
    const state = simulateRun(initialState(), 'Собрать сервис заметок')
    const approved = resolveDecision(state, state.decisions[0].id, 'approve')
    expect(approved.decisions[0].status).toBe('approved')
    expect(approved.tasks.find((item) => item.ownerId === 'engineer')?.status).toBe('development')
  })

  it('в комнате отвечает только упомянутый специалист', async () => {
    const state = await teamMessage(initialState(), '@Архитектор проверь границы')
    expect(state.messages.at(-1)?.agentId).toBe('architect')
    expect(state.messages.some((item) => item.agentId === 'engineer')).toBe(false)
  })
})
