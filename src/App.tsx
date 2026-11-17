import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bot, Boxes, Check, ChevronRight, CircleDot, Command, Factory,
  Gauge, LayoutDashboard, MessageSquare, Play, RotateCcw, Save, Settings2,
  ShieldCheck, Sparkles, UserRound, X, Zap,
} from 'lucide-react'
import { api } from './api'
import type { Agent, FactoryState, TaskStatus } from './types'

type View = 'overview' | 'team' | 'tasks' | 'chat' | 'decisions' | 'settings'

const nav: { id: View; label: string; icon: typeof Gauge }[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'team', label: 'Команда', icon: Bot },
  { id: 'tasks', label: 'Поток задач', icon: Boxes },
  { id: 'chat', label: 'Комната команды', icon: MessageSquare },
  { id: 'decisions', label: 'Решения человека', icon: ShieldCheck },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
]

const taskMeta: Record<TaskStatus, { label: string; color: string }> = {
  backlog: { label: 'Очередь', color: '#6c7384' },
  analysis: { label: 'Анализ', color: '#8c7cff' },
  development: { label: 'Разработка', color: '#37c98b' },
  review: { label: 'Проверка', color: '#f1ad4c' },
  done: { label: 'Готово', color: '#5ec8ff' },
}

const fmt = (value: string) => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

function App() {
  const [state, setState] = useState<FactoryState | null>(null)
  const [view, setView] = useState<View>('overview')
  const [goal, setGoal] = useState('')
  const [message, setMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.state().then(setState).catch((e) => setError(e.message)) }, [])
  const pending = useMemo(() => state?.decisions.filter((d) => d.status === 'pending').length ?? 0, [state])

  async function act(fn: () => Promise<FactoryState>) {
    setBusy(true); setError('')
    try { setState(await fn()) } catch (e) { setError(e instanceof Error ? e.message : 'Неизвестная ошибка') }
    finally { setBusy(false) }
  }

  if (!state) return <div className="splash"><Factory size={34} /><span>{error || 'Запускаем фабрику…'}</span></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Factory size={20} /></div><div><strong>StzeHarness</strong><span>АГЕНТНАЯ ФАБРИКА</span></div></div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              <Icon size={17} /><span>{label}</span>
              {id === 'decisions' && pending > 0 && <b>{pending}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-line"><span className="pulse" /><div><strong>Симуляция</strong><small>Модель не подключена</small></div></div>
          <button className="ghost full" onClick={() => act(api.reset)} disabled={busy}><RotateCcw size={15} /> Сбросить фабрику</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><span className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span><h1>{nav.find((n) => n.id === view)?.label}</h1></div>
          <div className="header-actions"><div className="health"><CircleDot size={14} /> Система готова</div><button className="avatar"><UserRound size={17} /></button></div>
        </header>
        {error && <div className="error-banner"><X size={16} />{error}</div>}

        <div className="content">
          {view === 'overview' && <Overview state={state} goal={goal} setGoal={setGoal} busy={busy} run={() => goal.trim() && act(() => api.run(goal.trim())).then(() => setGoal(''))} go={setView} />}
          {view === 'team' && <Team state={state} edit={setSelectedAgent} />}
          {view === 'tasks' && <Tasks state={state} />}
          {view === 'chat' && <Chat state={state} message={message} setMessage={setMessage} busy={busy} send={() => message.trim() && act(() => api.send(message.trim())).then(() => setMessage(''))} />}
          {view === 'decisions' && <Decisions state={state} decide={(id, action) => act(() => api.decide(id, action))} busy={busy} />}
          {view === 'settings' && <Settings />}
        </div>
      </main>
      {selectedAgent && <AgentDrawer agent={selectedAgent} close={() => setSelectedAgent(null)} save={(agent) => act(() => api.updateAgent(agent)).then(() => setSelectedAgent(null))} />}
    </div>
  )
}

function Overview({ state, goal, setGoal, busy, run, go }: { state: FactoryState; goal: string; setGoal: (v: string) => void; busy: boolean; run: () => void; go: (v: View) => void }) {
  const done = state.tasks.filter((t) => t.status === 'done').length
  const pending = state.decisions.filter((d) => d.status === 'pending').length
  return <>
    <section className="hero-panel">
      <div className="hero-copy"><span className="hero-kicker"><Sparkles size={14} /> ЕДИНАЯ ТОЧКА УПРАВЛЕНИЯ</span><h2>Поставьте цель.<br /><em>Команда соберёт маршрут.</em></h2><p>Лид разделит работу между специалистами, а к вам вернутся только решения, которые действительно требуют человека.</p></div>
      <div className="goal-box"><label>Новая цель фабрики</label><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Например: спроектировать и собрать API для базы знаний…" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }} /><div><span>Ctrl + Enter для запуска</span><button onClick={run} disabled={busy || goal.trim().length < 3}><Play size={15} fill="currentColor" /> {busy ? 'Запускаю…' : 'Запустить команду'}</button></div></div>
    </section>
    <section className="metrics">
      <Metric icon={Bot} value={state.agents.length} label="специалиста" hint="каждый со своим ядром" tone="purple" />
      <Metric icon={Activity} value={state.tasks.length} label="задач в потоке" hint={`${done} завершено`} tone="green" />
      <Metric icon={ShieldCheck} value={pending} label="ждут решения" hint="человек рядом с контуром" tone="orange" />
      <Metric icon={Zap} value="0" label="вызовов модели" hint="работает симулятор" tone="blue" />
    </section>
    <section className="dashboard-grid">
      <div className="panel span-2"><PanelTitle icon={Command} title="Живая команда" action="Открыть команду" onClick={() => go('team')} /><div className="agent-flow">{state.agents.map((agent, i) => <div className="flow-wrap" key={agent.id}>{i > 0 && <ChevronRight className="flow-arrow" size={18} />}<div className="mini-agent" style={{ '--agent': agent.color } as React.CSSProperties}><span>{agent.icon}</span><div><strong>{agent.name}</strong><small>{agent.lane}</small></div><i /></div></div>)}</div></div>
      <div className="panel"><PanelTitle icon={Activity} title="Активность" /><div className="activity-list">{state.activity.slice(0, 4).map((a) => <div key={a.id}><i className={a.tone} /><p>{a.text}<span>{fmt(a.createdAt)}</span></p></div>)}</div></div>
      <div className="panel span-2"><PanelTitle icon={Boxes} title="Последние задачи" action="Весь поток" onClick={() => go('tasks')} /><TaskTable state={state} limit={4} /></div>
      <div className="panel"><PanelTitle icon={ShieldCheck} title="Контур человека" action={pending ? 'Рассмотреть' : undefined} onClick={() => go('decisions')} />{pending ? <div className="decision-teaser"><div className="decision-count">{pending}</div><p>Команда ждёт вашего решения, прежде чем двигаться дальше.</p></div> : <div className="empty-small"><Check size={22} /> Нет блокирующих решений</div>}</div>
    </section>
  </>
}

function Metric({ icon: Icon, value, label, hint, tone }: { icon: typeof Bot; value: string | number; label: string; hint: string; tone: string }) {
  return <div className={`metric ${tone}`}><div className="metric-icon"><Icon size={19} /></div><div><strong>{value}</strong><span>{label}</span><small>{hint}</small></div></div>
}

function PanelTitle({ icon: Icon, title, action, onClick }: { icon: typeof Bot; title: string; action?: string; onClick?: () => void }) {
  return <div className="panel-title"><div><Icon size={16} /><h3>{title}</h3></div>{action && <button onClick={onClick}>{action}<ChevronRight size={14} /></button>}</div>
}

function Team({ state, edit }: { state: FactoryState; edit: (a: Agent) => void }) {
  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">МАЛАЯ СПЕЦИАЛИЗИРОВАННАЯ КОМАНДА</span><h2>Одна модель — разные способности</h2><p>У каждого агента собственные контекст, модель, промпт и инструменты. Именно специализация делает команду устойчивой.</p></div></div><div className="team-grid">{state.agents.map((a) => <article className="agent-card" key={a.id} style={{ '--agent': a.color } as React.CSSProperties}><div className="agent-head"><span className="agent-glyph">{a.icon}</span><div><small>{a.role === 'lead' ? 'ОРКЕСТРАТОР' : 'СПЕЦИАЛИСТ'}</small><h3>{a.name}</h3><p>{a.lane}</p></div><i>Готов</i></div><div className="core-four"><Core label="Контекст" value={a.core.context} /><Core label="Модель" value={a.core.model} /><Core label="Промпт" value={a.core.prompt} /><Core label="Инструменты" value={a.core.tools.join(' · ')} /></div><button className="outline" onClick={() => edit(a)}><Settings2 size={15} /> Настроить ядро</button></article>)}</div></div>
}

function Core({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><p>{value}</p></div> }

function Tasks({ state }: { state: FactoryState }) {
  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">ПРОЗРАЧНЫЙ КОНВЕЙЕР</span><h2>Поток задач фабрики</h2><p>Каждая единица работы имеет владельца и проверяемое состояние.</p></div></div><div className="kanban">{(Object.keys(taskMeta) as TaskStatus[]).map((status) => <div className="kanban-col" key={status}><div className="kanban-title"><span style={{ background: taskMeta[status].color }} />{taskMeta[status].label}<b>{state.tasks.filter((t) => t.status === status).length}</b></div>{state.tasks.filter((t) => t.status === status).map((t) => { const owner = state.agents.find((a) => a.id === t.ownerId); return <article className="task-card" key={t.id}><small className={`priority ${t.priority}`}>{t.priority}</small><h4>{t.title}</h4><p>{t.description}</p><div><span style={{ background: owner?.color }}>{owner?.icon}</span>{owner?.name}</div></article> })}</div>)}</div></div>
}

function TaskTable({ state, limit }: { state: FactoryState; limit?: number }) {
  const tasks = limit ? state.tasks.slice(0, limit) : state.tasks
  if (!tasks.length) return <div className="empty-row">Поток пока пуст — поставьте первую цель.</div>
  return <div className="task-table">{tasks.map((t) => { const owner = state.agents.find((a) => a.id === t.ownerId); return <div key={t.id}><span className="task-status" style={{ '--status': taskMeta[t.status].color } as React.CSSProperties}>{taskMeta[t.status].label}</span><p><strong>{t.title}</strong><small>{t.description}</small></p><span className="owner-dot" style={{ background: owner?.color }}>{owner?.icon}</span><em>{owner?.name}</em></div> })}</div>
}

function Chat({ state, message, setMessage, busy, send }: { state: FactoryState; message: string; setMessage: (v: string) => void; busy: boolean; send: () => void }) {
  return <div className="chat-layout"><section className="chat-main"><div className="chat-heading"><div><h2>Комната команды</h2><p>Общий социальный контракт: упомянутый агент отвечает из своей зоны ответственности.</p></div><span><span className="pulse" /> {state.agents.length} агента</span></div><div className="messages">{state.messages.map((m) => { const a = state.agents.find((x) => x.id === m.agentId); return <div className={`message ${m.agentId === 'human' ? 'human' : ''} ${m.agentId === 'system' ? 'system' : ''}`} key={m.id}>{m.agentId !== 'system' && <span className="message-avatar" style={{ background: a?.color }}>{m.agentId === 'human' ? <UserRound size={15} /> : a?.icon}</span>}<div><div><strong>{m.agentId === 'human' ? 'Вы' : a?.name ?? 'Система'}</strong><time>{fmt(m.createdAt)}</time></div><p>{m.text}</p></div></div>})}</div><div className="composer"><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Сообщение команде… Используйте @имя для адресного запроса" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} /><button disabled={busy || !message.trim()} onClick={send}><Play size={16} fill="currentColor" /></button></div></section><aside className="chat-aside"><h3>Социальный контракт</h3><p>Если сообщение упоминает тебя — ответь. Вноси вклад только из своей специализации. Явно передавай работу следующему агенту. Не скрывай развилки, требующие человека.</p><div className="contract-rule"><span>1</span>Зона ответственности прежде инициативы</div><div className="contract-rule"><span>2</span>Передача через @упоминание</div><div className="contract-rule"><span>3</span>Результат должен иметь доказательство</div></aside></div>
}

function Decisions({ state, decide, busy }: { state: FactoryState; decide: (id: string, action: 'approve' | 'reject') => void; busy: boolean }) {
  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">ЧЕЛОВЕК РЯДОМ С КОНТУРОМ</span><h2>Только важные развилки</h2><p>Агенты работают самостоятельно, а сюда поднимают решения, где нужна ответственность человека.</p></div></div><div className="decision-list">{state.decisions.length === 0 && <div className="big-empty"><ShieldCheck size={34} /><h3>Очередь решений пуста</h3><p>После запуска цели Лид добавит сюда первую контрольную точку.</p></div>}{state.decisions.map((d) => { const a = state.agents.find((x) => x.id === d.requestedBy); return <article className={`decision-card ${d.status}`} key={d.id}><div className="decision-state"><ShieldCheck size={18} /><span>{d.status === 'pending' ? 'ТРЕБУЕТ РЕШЕНИЯ' : d.status === 'approved' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}</span></div><h3>{d.title}</h3><p>{d.description}</p><div className="decision-meta"><span style={{ background: a?.color }}>{a?.icon}</span>Запросил: {a?.name}<time>{fmt(d.createdAt)}</time></div>{d.status === 'pending' && <div className="decision-actions"><button className="reject" disabled={busy} onClick={() => decide(d.id, 'reject')}><X size={16} /> Отклонить</button><button disabled={busy} onClick={() => decide(d.id, 'approve')}><Check size={16} /> Одобрить</button></div>}</article>})}</div></div>
}

function Settings() { return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">ПОДКЛЮЧЕНИЕ ИНТЕЛЛЕКТА</span><h2>Модели подключаются последними</h2><p>Сейчас фабрика полностью демонстрирует оркестрацию в симуляционном режиме. Позже укажите OpenAI-совместимый endpoint — Ollama, vLLM, LM Studio или собственный шлюз.</p></div></div><div className="settings-card"><div className="setting-row"><div className="setting-icon"><Zap size={18} /></div><div><h3>Провайдер моделей</h3><p>Через переменные окружения, без хранения ключей в браузере.</p></div><span className="tag">Симулятор</span></div><div className="code-block">MODEL_PROVIDER=openai-compatible<br />MODEL_BASE_URL=http://localhost:11434/v1<br />MODEL_API_KEY=ваш-ключ<br />MODEL_NAME=ваша-модель</div><p className="note">Адаптер намеренно изолирован от интерфейса: вы сможете сменить модель, не перестраивая команду и её рабочий процесс.</p></div></div> }

function AgentDrawer({ agent, close, save }: { agent: Agent; close: () => void; save: (a: Agent) => void }) {
  const [draft, setDraft] = useState(structuredClone(agent))
  return <div className="drawer-backdrop" onMouseDown={close}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ЧЕТЫРЕ ЯДРА АГЕНТА</span><h2>{draft.name}</h2></div><button onClick={close}><X size={20} /></button></div><label>Имя<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Специализация<input value={draft.lane} onChange={(e) => setDraft({ ...draft, lane: e.target.value })} /></label><label>Контекст<textarea value={draft.core.context} onChange={(e) => setDraft({ ...draft, core: { ...draft.core, context: e.target.value } })} /></label><label>Модель<input value={draft.core.model} onChange={(e) => setDraft({ ...draft, core: { ...draft.core, model: e.target.value } })} /></label><label>Системный промпт<textarea className="tall" value={draft.core.prompt} onChange={(e) => setDraft({ ...draft, core: { ...draft.core, prompt: e.target.value } })} /></label><label>Инструменты<input value={draft.core.tools.join(', ')} onChange={(e) => setDraft({ ...draft, core: { ...draft.core, tools: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} /></label><button className="save-btn" onClick={() => save(draft)}><Save size={16} /> Сохранить ядро</button></aside></div>
}

export default App
