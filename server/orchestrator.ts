import type { FactoryState, Message, Task } from '../src/types.js'
import { complete, modelMode } from './model.js'

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

const addMessage = (state: FactoryState, agentId: Message['agentId'], text: string) => {
  state.messages.push({ id: uid(), agentId, text, room: 'team', createdAt: now() })
}

const task = (title: string, description: string, status: Task['status'], ownerId: string, priority: Task['priority'] = 'обычный'): Task => ({
  id: uid(), title, description, status, ownerId, priority, createdAt: now(),
})

export function simulateRun(source: FactoryState, goal: string): FactoryState {
  const state = structuredClone(source)
  state.factory.running = true
  addMessage(state, 'human', goal)
  addMessage(state, 'lead', `Принял цель: «${goal}». Формирую короткий маршрут и распределяю зоны ответственности.`)
  state.tasks.push(
    task('Уточнить границы результата', `Сформулировать критерии готовности для: ${goal}`, 'analysis', 'lead', 'важный'),
    task('Спроектировать решение', 'Определить компоненты, контракты и основные риски.', 'analysis', 'architect'),
    task('Собрать первый инкремент', 'Реализовать минимальный сквозной сценарий после архитектурной записки.', 'backlog', 'engineer'),
    task('Проверить доказательства', 'Проверить результат по критериям, тестам и рискам.', 'backlog', 'reviewer'),
  )
  addMessage(state, 'architect', '@Лид беру архитектуру. Сначала зафиксирую границы компонентов и один главный риск.')
  addMessage(state, 'engineer', '@Архитектор жду контракт. Подготовлю минимальный сквозной инкремент без лишней инфраструктуры.')
  addMessage(state, 'reviewer', '@Лид составлю проверяемые критерии и сверю их с итоговым инкрементом.')
  state.decisions.unshift({
    id: uid(),
    title: 'Подтвердить критерий готовности',
    description: `Считать цель «${goal}» выполненной, когда есть работающий сквозной сценарий, проверка и краткий журнал решений?`,
    requestedBy: 'lead', status: 'pending', createdAt: now(),
  })
  state.activity.unshift({ id: uid(), text: 'Лид запустил командный маршрут из четырёх этапов', createdAt: now(), tone: 'success' })
  state.factory.running = false
  return state
}

export async function runFactory(source: FactoryState, goal: string): Promise<FactoryState> {
  const state = simulateRun(source, goal)
  const mode = modelMode()
  state.factory.mode = mode
  if (mode === 'simulation') return state

  const roles = ['architect', 'engineer', 'reviewer'] as const
  const requests = {
    architect: `Цель: ${goal}\nДай архитектурную записку: компоненты, контракты, главный риск и критерий готовности.`,
    engineer: `Цель: ${goal}\nПредложи минимальный сквозной инкремент и команды проверки.`,
    reviewer: `Цель: ${goal}\nСоставь проверяемый чек-лист приёмки и назови один возможный блокер.`,
  }
  for (const id of roles) {
    const agent = state.agents.find((item) => item.id === id)
    if (!agent) continue
    try {
      addMessage(state, id, await complete(agent, requests[id]))
    } catch (error) {
      addMessage(state, 'system', `${agent.name}: ${error instanceof Error ? error.message : 'ошибка модели'}. Симуляция продолжает работать.`)
    }
  }
  return state
}

const simulatedReplies: Record<string, (text: string) => string> = {
  lead: (text) => `Принял сообщение: «${text}». Сверю его с текущим маршрутом и подключу нужную специализацию.`,
  architect: () => 'Смотрю на это из архитектурной зоны: уточню границы, контракты и риск, затем передам Инженеру.',
  engineer: () => 'Смотрю на это из зоны реализации: сформирую минимальный проверяемый инкремент и команды проверки.',
  reviewer: () => 'Смотрю на это из зоны качества: проверю критерии, доказательства и возможный блокер выпуска.',
}

export async function teamMessage(source: FactoryState, text: string): Promise<FactoryState> {
  const state = structuredClone(source)
  addMessage(state, 'human', text)
  const lower = text.toLocaleLowerCase('ru-RU')
  const mentioned = state.agents.filter((agent) =>
    lower.includes(`@${agent.name.toLocaleLowerCase('ru-RU')}`) || lower.includes(`@${agent.id}`),
  )
  const targets = mentioned.length ? mentioned : state.agents.filter((agent) => agent.id === 'lead')
  for (const agent of targets) {
    if (modelMode() === 'live') {
      try { addMessage(state, agent.id, await complete(agent, text)) }
      catch (error) { addMessage(state, 'system', `${agent.name}: ${error instanceof Error ? error.message : 'ошибка модели'}`) }
    } else {
      addMessage(state, agent.id, simulatedReplies[agent.id]?.(text) ?? 'Принял. Отвечу из своей зоны ответственности.')
    }
  }
  state.activity.unshift({ id: uid(), text: `Сообщение направлено: ${targets.map((a) => a.name).join(', ')}`, createdAt: now(), tone: 'neutral' })
  return state
}

export function resolveDecision(source: FactoryState, id: string, action: 'approve' | 'reject'): FactoryState {
  const state = structuredClone(source)
  const decision = state.decisions.find((item) => item.id === id)
  if (!decision) throw new Error('Решение не найдено')
  decision.status = action === 'approve' ? 'approved' : 'rejected'
  const approved = action === 'approve'
  addMessage(state, 'human', `${approved ? 'Одобрено' : 'Отклонено'}: ${decision.title}`)
  addMessage(state, 'lead', approved
    ? 'Решение принято. Команда продолжает работу по согласованным критериям.'
    : 'Решение отклонено. Останавливаю зависимые задачи и пересобираю критерии.')
  if (approved) {
    const analysis = state.tasks.filter((item) => item.status === 'analysis')
    analysis.forEach((item) => { item.status = 'done' })
    const next = state.tasks.find((item) => item.ownerId === 'engineer' && item.status === 'backlog')
    if (next) next.status = 'development'
  }
  state.activity.unshift({ id: uid(), text: `Решение «${decision.title}» ${approved ? 'одобрено' : 'отклонено'}`, createdAt: now(), tone: approved ? 'success' : 'warning' })
  return state
}
