export type AgentRole = 'lead' | 'architect' | 'engineer' | 'reviewer'
export type AgentStatus = 'idle' | 'working' | 'waiting'
export type TaskStatus = 'backlog' | 'analysis' | 'development' | 'review' | 'done'

export interface Agent {
  id: string
  name: string
  role: AgentRole
  lane: string
  color: string
  icon: string
  status: AgentStatus
  core: {
    context: string
    model: string
    prompt: string
    tools: string[]
  }
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  ownerId: string
  priority: 'обычный' | 'важный' | 'срочный'
  createdAt: string
}

export interface Message {
  id: string
  agentId: string | 'human' | 'system'
  text: string
  createdAt: string
  room: 'team'
}

export interface Decision {
  id: string
  title: string
  description: string
  requestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface FactoryState {
  factory: { name: string; mission: string; mode: 'simulation' | 'live'; running: boolean }
  agents: Agent[]
  tasks: Task[]
  messages: Message[]
  decisions: Decision[]
  activity: { id: string; text: string; createdAt: string; tone: 'neutral' | 'success' | 'warning' }[]
}
