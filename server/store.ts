import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FactoryState } from '../src/types.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const statePath = join(root, 'data', 'state.json')

const now = () => new Date().toISOString()

export function initialState(): FactoryState {
  return {
    factory: {
      name: 'StzeHarness',
      mission: 'Превращать цели человека в проверенные инженерные результаты',
      mode: 'simulation',
      running: false,
    },
    agents: [
      {
        id: 'lead', name: 'Лид', role: 'lead', lane: 'Оркестрация', color: '#f2647c', icon: '◆', status: 'idle',
        core: {
          context: 'Цель фабрики, состояние задач, сообщения команды и решения человека.',
          model: 'Симулятор (позже: ваша модель)',
          prompt: 'Разделяй цель на независимые этапы. Назначай владельцев. Запрашивай решение человека только при реальной развилке.',
          tools: ['Команда', 'Очередь решений', 'Декомпозиция'],
        },
      },
      {
        id: 'architect', name: 'Архитектор', role: 'architect', lane: 'Система и риски', color: '#8c7cff', icon: '⌘', status: 'idle',
        core: {
          context: 'Требования, ограничения и принятые архитектурные решения.',
          model: 'Симулятор (позже: ваша модель)',
          prompt: 'Проектируй минимальную устойчивую архитектуру. Явно называй компромиссы, интерфейсы и риски.',
          tools: ['Файлы', 'Диаграммы', 'Поиск'],
        },
      },
      {
        id: 'engineer', name: 'Инженер', role: 'engineer', lane: 'Реализация', color: '#37c98b', icon: '</>', status: 'idle',
        core: {
          context: 'План архитектора, кодовая база, критерии готовности и последние замечания ревью.',
          model: 'Симулятор (позже: ваша модель)',
          prompt: 'Реализуй небольшой проверяемый инкремент. Не объявляй готовность без запуска проверок.',
          tools: ['Терминал', 'Редактор', 'Тесты'],
        },
      },
      {
        id: 'reviewer', name: 'Ревьюер', role: 'reviewer', lane: 'Качество и доказательства', color: '#f1ad4c', icon: '✓', status: 'idle',
        core: {
          context: 'Задача, критерии готовности, изменения инженера и результаты тестов.',
          model: 'Симулятор (позже: ваша модель)',
          prompt: 'Ищи реальные дефекты и пробелы в доказательствах. Блокируй выпуск только по конкретной причине.',
          tools: ['Тесты', 'Diff', 'Чек-листы'],
        },
      },
    ],
    tasks: [],
    messages: [
      { id: crypto.randomUUID(), agentId: 'system', room: 'team', text: 'Фабрика готова. Опишите цель — Лид соберёт командный маршрут.', createdAt: now() },
    ],
    decisions: [],
    activity: [
      { id: crypto.randomUUID(), text: 'Создана пустая фабрика с четырьмя специализациями', createdAt: now(), tone: 'success' },
    ],
  }
}

let state: FactoryState | undefined

async function persist(next: FactoryState) {
  await mkdir(dirname(statePath), { recursive: true })
  await writeFile(statePath, JSON.stringify(next, null, 2), 'utf8')
}

export async function getState() {
  if (state) return state
  try {
    state = JSON.parse(await readFile(statePath, 'utf8')) as FactoryState
  } catch {
    state = initialState()
    await persist(state)
  }
  return state
}

export async function setState(next: FactoryState) {
  state = next
  await persist(next)
  return next
}

export async function resetState() {
  return setState(initialState())
}
