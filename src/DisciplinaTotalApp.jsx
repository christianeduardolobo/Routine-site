import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ListTodo, Target, CalendarDays, BarChart3, Settings,
  Plus, CheckCircle2, Circle, Search, Flame, Sparkles, Trophy, Brain,
  Download, Upload, Trash2, Pencil, ChevronUp, ChevronDown,
  TrendingUp, TrendingDown, Clock3, Focus, Dumbbell,
  BookOpen, Briefcase, HeartPulse, BedDouble, Droplets,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar, LineChart, Line,
} from 'recharts';

const STORAGE_KEY = 'disciplina-total-premium-v16';
const INDEXED_DB_NAME = 'disciplina-total-premium-db';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'app_state';
const SNAKE_IMG_SRC = `${import.meta.env.BASE_URL}ouroboros.png`;

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);
const formatFullDate = (date = new Date(), locale = 'PT-BR') =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
const formatShort = (date, locale = 'PT-BR') => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(date + 'T00:00:00'));
const offsetDate = (date, amount) => {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
};
const percentage = (n) => Math.max(0, Math.min(100, Math.round(n)));

const WEEKDAY_KEYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAY_SHORT = {
  'PT-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  'EN-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function weekdayFromISO(date) {
  return new Date(`${date}T00:00:00`).getDay();
}

function taskMatchesDate(task, date) {
  if (Array.isArray(task.weekdays) && task.weekdays.length) {
    return task.weekdays.includes(weekdayFromISO(date));
  }
  return task.date === date;
}

function getTaskStatusForDate(task, date) {
  if (Array.isArray(task.weekdays) && task.weekdays.length) {
    return task.statusByDate?.[date] || 'pending';
  }
  return task.status || 'pending';
}

function getEffectiveSubtasksForDate(task, date) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const hasWeekdays = Array.isArray(task.weekdays) && task.weekdays.length > 0;

  if (!hasWeekdays) return subtasks;

  const dayMap = task.subtaskStatusByDate?.[date] || {};
  return subtasks.map((subtask) => ({
    ...subtask,
    done: Boolean(dayMap[subtask.id]),
  }));
}

function normalizeRecurringSubtaskStatusByDate(subtaskStatusByDate = {}, subtasks = [], statusByDate = {}) {
  const validIds = new Set(subtasks.map((subtask) => subtask.id));
  const normalized = {};

  Object.entries(subtaskStatusByDate || {}).forEach(([date, map]) => {
    const nextMap = {};
    Object.entries(map || {}).forEach(([subtaskId, done]) => {
      if (validIds.has(subtaskId) && done) nextMap[subtaskId] = true;
    });
    if (Object.keys(nextMap).length) normalized[date] = nextMap;
  });

  if (!Object.keys(normalized).length && subtasks.length) {
    Object.entries(statusByDate || {}).forEach(([date, status]) => {
      if (status === 'done') {
        normalized[date] = Object.fromEntries(subtasks.map((subtask) => [subtask.id, true]));
      }
    });
  }

  return normalized;
}

function normalizeTaskRecord(task) {
  const subtasks = (Array.isArray(task.subtasks) ? task.subtasks : []).map((subtask) => ({
    ...subtask,
    id: subtask.id || uid(),
    title: subtask.title || '',
    done: Boolean(subtask.done),
  }));
  const hasWeekdays = Array.isArray(task.weekdays) && task.weekdays.length > 0;

  if (!hasWeekdays) {
    return {
      ...task,
      subtasks,
    };
  }

  const normalizedStatusByDate = { ...(task.statusByDate || {}) };
  const normalizedSubtaskStatusByDate = normalizeRecurringSubtaskStatusByDate(
    task.subtaskStatusByDate || {},
    subtasks,
    normalizedStatusByDate,
  );

  return {
    ...task,
    weekdays: [...task.weekdays].sort((a, b) => a - b),
    subtasks: subtasks.map((subtask) => ({ ...subtask, done: false })),
    statusByDate: normalizedStatusByDate,
    subtaskStatusByDate: normalizedSubtaskStatusByDate,
    status: task.status || 'pending',
  };
}

function withEffectiveTaskStatus(task, date) {
  return {
    ...task,
    status: getTaskStatusForDate(task, date),
    subtasks: getEffectiveSubtasksForDate(task, date),
  };
}

function taskMatchesSearch(task, query) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    task.title.toLowerCase().includes(normalizedQuery) ||
    (task.description || '').toLowerCase().includes(normalizedQuery)
  );
}

function buildRemainingWeekDates(referenceDate = todayISO()) {
  const startDay = weekdayFromISO(referenceDate);
  const daysUntilEndOfWeek = 6 - startDay;
  return Array.from({ length: daysUntilEndOfWeek + 1 }, (_, index) => offsetDate(referenceDate, index));
}

function formatRoutineDayHeading(date, locale = 'PT-BR') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`));
}

function formatTaskWeekdays(task, locale = 'PT-BR') {
  const labels = WEEKDAY_SHORT[locale] || WEEKDAY_SHORT['PT-BR'];
  if (Array.isArray(task.weekdays) && task.weekdays.length) {
    return [...task.weekdays].sort((a, b) => a - b).map((day) => labels[day]).join(' • ');
  }
  if (task.date) {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${task.date}T00:00:00`));
  }
  return '';
}

function sortTasksByTime(tasks) {
  return [...tasks].sort((a, b) => {
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    return timeA.localeCompare(timeB);
  });
}

const themeGradients = {
  dark: 'linear-gradient(135deg,#070b18 0%,#10182d 44%,#211437 100%)',
  light: 'linear-gradient(135deg,#eef2ff 0%,#dfe8f4 100%)',
};

const habitIcons = {
  treino: <Dumbbell size={16} />,
  leitura: <BookOpen size={16} />,
  trabalho: <Briefcase size={16} />,
  espiritualidade: <Sparkles size={16} />,
  agua: <Droplets size={16} />,
  saude: <HeartPulse size={16} />,
  sono: <BedDouble size={16} />,
  foco: <Brain size={16} />,
};

function sampleState() {
  const date = todayISO();
  const previous = Array.from({ length: 6 }, (_, i) => offsetDate(date, -(i + 1))).reverse();
  const tasks = [
    { id: uid(), title: 'Treino de força', description: 'Treino principal do dia com foco em execução completa.', category: 'saúde', priority: 'alta', time: '06:30', status: 'done', date, color: '#10b981', subtasks: [{ id: uid(), title: 'Alongamento', done: true }, { id: uid(), title: 'Treino completo', done: true }] },
    { id: uid(), title: 'Leitura estratégica', description: '30 minutos de leitura com anotação.', category: 'estudo', priority: 'média', time: '08:00', status: 'done', date, color: '#60a5fa', subtasks: [{ id: uid(), title: 'Destacar 3 ideias', done: true }] },
    { id: uid(), title: 'Estudar 2 horas', description: 'Bloco profundo sem interrupções.', category: 'estudo', priority: 'crítica', time: '09:00', status: 'pending', date, color: '#f97316', subtasks: [{ id: uid(), title: '1º bloco de 50min', done: false }, { id: uid(), title: '2º bloco de 50min', done: false }] },
    { id: uid(), title: 'Oração e silêncio', description: 'Momento de centrar mente e espírito.', category: 'espiritualidade', priority: 'alta', time: '07:20', status: 'done', date, color: '#a78bfa', subtasks: [] },
    { id: uid(), title: 'Revisão de metas da semana', description: 'Checar avanço e ajustar prioridades.', category: 'trabalho', priority: 'média', time: '11:30', status: 'postponed', date, color: '#22c55e', subtasks: [] },
    { id: uid(), title: 'Organizar finanças', description: 'Conferir pagamentos e fluxo da semana.', category: 'financeiro', priority: 'alta', time: '18:00', status: 'pending', date, color: '#14b8a6', subtasks: [{ id: uid(), title: 'Atualizar planilha', done: false }] },
  ];
  const habits = [
    { id: uid(), title: 'Beber água', category: 'saúde', icon: 'agua', color: '#38bdf8', target: 8, logs: { [date]: 6, [previous[5]]: 8, [previous[4]]: 7, [previous[3]]: 8, [previous[2]]: 5, [previous[1]]: 8, [previous[0]]: 7 } },
    { id: uid(), title: 'Dormir cedo', category: 'saúde', icon: 'sono', color: '#818cf8', target: 1, logs: { [date]: 1, [previous[5]]: 1, [previous[4]]: 0, [previous[3]]: 1, [previous[2]]: 1, [previous[1]]: 0, [previous[0]]: 1 } },
    { id: uid(), title: 'Trabalho profundo', category: 'trabalho', icon: 'foco', color: '#f59e0b', target: 3, logs: { [date]: 1, [previous[5]]: 3, [previous[4]]: 2, [previous[3]]: 3, [previous[2]]: 3, [previous[1]]: 2, [previous[0]]: 3 } },
    { id: uid(), title: 'Leitura', category: 'estudo', icon: 'leitura', color: '#60a5fa', target: 1, logs: { [date]: 1, [previous[5]]: 1, [previous[4]]: 1, [previous[3]]: 0, [previous[2]]: 1, [previous[1]]: 1, [previous[0]]: 1 } },
    { id: uid(), title: 'Oração / espiritualidade', category: 'espiritualidade', icon: 'espiritualidade', color: '#c084fc', target: 1, logs: { [date]: 1, [previous[5]]: 1, [previous[4]]: 1, [previous[3]]: 1, [previous[2]]: 1, [previous[1]]: 1, [previous[0]]: 1 } },
  ];
  const history = previous.map((d, idx) => ({
    date: d,
    discipline: [88, 76, 91, 72, 81, 97][idx],
    tasksDone: [5, 4, 5, 4, 4, 6][idx],
    tasksTotal: 6,
  }));
  return {
    tasks, habits, history,
    reflections: { [date]: { note: '', whatWentWell: '', pending: '', improveTomorrow: '' } },
    settings: {
      userName: 'Christian', locale: 'PT-BR', dailyGoal: 80, weeklyGoal: 85,
      focusTask: 'Estudar 2 horas', cannotFailToday: 'Fechar o bloco de estudo profundo',
      weeklyGoals: ['Treinar 4x', 'Manter média acima de 85%', 'Revisar finanças 3x'],
      categories: ['saúde', 'espiritualidade', 'estudo', 'trabalho', 'pessoal', 'financeiro'],
      pomodoroFocusMin: 25, pomodoroShortBreakMin: 5, pomodoroLongBreakMin: 15,
      pomodoroCyclesBeforeLongBreak: 4, pomodoroSelectedSoundKey: 'white', pomodoroSavedSounds: [],
    },
    appearance: {
      primary: '#60a5fa', accent: '#c084fc', themeMode: 'dark',
      backgroundImage: '', backgroundUrl: '', backgroundSize: 'cover',
      backgroundPosition: 'center', radius: 24, blur: 20, overlay: 0.34,
    },
  };
}

function emptyState() {
  const base = sampleState();

  return {
    ...base,
    tasks: [],
    habits: [],
    history: [],
    reflections: {},
    settings: {
      ...base.settings,
      userName: '',
      focusTask: '',
      cannotFailToday: '',
      weeklyGoals: [],
      pomodoroSelectedSoundKey: 'white',
      pomodoroSavedSounds: [],
    },
    appearance: {
      ...base.appearance,
      backgroundImage: '',
      backgroundUrl: '',
    },
  };
}

function normalizeSavedSoundEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { id: uid(), name: shortUrlLabel(entry), url: entry };
  if (typeof entry === 'object' && entry.url) return { id: entry.id || uid(), name: entry.name || shortUrlLabel(entry.url), url: entry.url };
  return null;
}

function migratePomodoroSettings(settings = {}) {
  const savedFromNew = Array.isArray(settings.pomodoroSavedSounds) ? settings.pomodoroSavedSounds.map(normalizeSavedSoundEntry).filter(Boolean) : [];
  let savedSounds = savedFromNew;
  if (!savedSounds.length && Array.isArray(settings.pomodoroSavedUrls)) {
    savedSounds = settings.pomodoroSavedUrls.map(normalizeSavedSoundEntry).filter(Boolean);
  }
  const customUrl = settings.pomodoroCustomSoundUrl || '';
  if (customUrl && !savedSounds.some((item) => item.url === customUrl)) {
    savedSounds = [...savedSounds, { id: uid(), name: shortUrlLabel(customUrl), url: customUrl }];
  }
  let selectedSoundKey = settings.pomodoroSelectedSoundKey || 'white';
  if (!settings.pomodoroSelectedSoundKey) {
    if (settings.pomodoroSoundMode === 'none') selectedSoundKey = 'none';
    else if (settings.pomodoroSoundMode === 'lofi') selectedSoundKey = 'lofi';
    else if (settings.pomodoroSoundMode === 'custom' && customUrl) {
      const match = savedSounds.find((item) => item.url === customUrl);
      selectedSoundKey = match ? `saved:${match.id}` : 'white';
    }
  }
  return { ...settings, pomodoroSavedSounds: savedSounds, pomodoroSelectedSoundKey: selectedSoundKey };
}

function buildPersistedState(base, parsed) {
  return {
    ...base,
    ...parsed,
    settings: migratePomodoroSettings({ ...base.settings, ...(parsed.settings || {}) }),
    reflections: { ...base.reflections, ...(parsed.reflections || {}) },
    appearance: { ...base.appearance, ...(parsed.appearance || {}) },
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTaskRecord) : base.tasks,
    habits: Array.isArray(parsed.habits) ? parsed.habits : base.habits,
    history: Array.isArray(parsed.history) ? parsed.history : base.history,
  };
}

function supportsIndexedDB() {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

function openIndexedDb() {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDB()) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function readIndexedDbState() {
  const db = await openIndexedDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORE);
    const request = store.get(STORAGE_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Failed to read IndexedDB'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

async function writeIndexedDbState(state) {
  const db = await openIndexedDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORE);
    store.put(state, STORAGE_KEY);

    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => reject(transaction.error || new Error('Failed to write IndexedDB'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB write aborted'));
  });
}

async function loadState() {
  const base = sampleState();
  if (typeof window === 'undefined') return base;

  try {
    let parsed = null;

    if (supportsIndexedDB()) {
      parsed = await readIndexedDbState();
    }

    if (!parsed) {
      const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        parsed = JSON.parse(legacyRaw);
        if (supportsIndexedDB()) {
          await writeIndexedDbState(parsed);
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    }

    if (!parsed) return base;
    return buildPersistedState(base, parsed);
  } catch {
    try {
      const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
      if (!legacyRaw) return base;
      const parsed = JSON.parse(legacyRaw);
      return buildPersistedState(base, parsed);
    } catch {
      return base;
    }
  }
}

async function saveState(state) {
  if (typeof window === 'undefined') return;

  try {
    if (supportsIndexedDB()) {
      await writeIndexedDbState(state);
      return;
    }
  } catch {}

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const UI_COPY = {
  'PT-BR': {
    brandSubtitle: 'Controle, progresso e consistência',
    dailyGoal: 'Meta diária',
    personalRecord: 'Recorde pessoal',
    weeklyFocus: 'Foco da semana',
    done: 'Feita',
    pendingBtn: 'Pendente',
    edit: 'Editar',
    delete: 'Excluir',
    duplicate: 'Duplicar',
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    newTask: 'Nova tarefa',
    newHabit: 'Novo hábito',
    nav: { dashboard: 'Dashboard', routine: 'Rotina do Dia', habits: 'Hábitos', history: 'Histórico', stats: 'Estatísticas', pomodoro: 'Pomodoro', settings: 'Configurações' },
    mobileNav: { dashboard: 'Início', routine: 'Rotina', habits: 'Hábitos', stats: 'Estat.', pomodoro: 'Pomodoro', settings: 'Ajustes' },
    streak: 'sequência',
    today: 'Hoje',
    goalPerDay: (count) => `meta ${count}/dia`,
    interfaceLanguage: 'Idioma da interface',
    profileAndGoals: 'Perfil, idioma e metas',
    profileAndGoalsSub: 'Ajustes principais do seu painel.',
    yourName: 'Seu nome',
    dailyGoalPercent: 'Meta diária %',
    weeklyGoalPercent: 'Meta semanal %',
    themeBackground: 'Tema e background',
    themeBackgroundSub: 'Escolha entre claro, escuro ou use uma imagem sua.',
    dark: 'Escuro',
    light: 'Claro',
    uploadImage: 'Carregar imagem',
    removeImage: 'Remover imagem',
    imageUrlPlaceholder: 'Cole a URL de uma imagem',
    applyUrl: 'Aplicar URL',
    size: 'Tamanho',
    position: 'Posição',
    cover: 'Cobrir',
    contain: 'Conter',
    auto: 'Automático',
    center: 'Centro',
    top: 'Topo',
    bottom: 'Base',
    left: 'Esquerda',
    right: 'Direita',
    backupData: 'Dados e backup',
    backupDataSub: 'Exportar, importar e resetar.',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    resetAllData: 'Resetar todas as configurações',
    resetAllTitle: 'Resetar tudo?',
    resetAllDescription: 'Isso vai apagar todas as tarefas, hábitos, histórico, metas, reflexões e configurações salvas. Essa ação é sensível e não pode ser desfeita.',
    confirmReset: 'Confirmar reset',
    resetDone: 'Tudo foi resetado',
    weeklyGoals: 'Metas da semana',
    onePerLine: 'Uma por linha.',
    fullHistory: 'Histórico completo',
    historySub: 'Visualize seu padrão por calendário e por lista.',
    tasksCompleted: (done, total) => `${done}/${total} tarefas concluídas`,
    fillMainFields: 'Preencha os campos principais.',
    taskTitle: 'Título',
    category: 'Categoria',
    priority: 'Prioridade',
    time: 'Horário',
    discipline: 'Disciplina',
    disciplineHelp: 'Todas as tarefas valem igual no cálculo do dia.',
    description: 'Descrição',
    subtasks: 'Subtarefas',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
    taskDone: 'concluída',
    taskPending: 'pendente',
  },
  'EN-US': {
    brandSubtitle: 'Control, progress and consistency',
    dailyGoal: 'Daily goal',
    personalRecord: 'Personal record',
    weeklyFocus: 'Week focus',
    done: 'Done',
    pendingBtn: 'Pending',
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    newTask: 'New task',
    newHabit: 'New habit',
    nav: { dashboard: 'Dashboard', routine: 'Daily routine', habits: 'Habits', history: 'History', stats: 'Statistics', pomodoro: 'Pomodoro', settings: 'Settings' },
    mobileNav: { dashboard: 'Home', routine: 'Routine', habits: 'Habits', stats: 'Stats', pomodoro: 'Pomodoro', settings: 'Settings' },
    streak: 'streak',
    today: 'Today',
    goalPerDay: (count) => `goal ${count}/day`,
    interfaceLanguage: 'Interface language',
    profileAndGoals: 'Profile, language and goals',
    profileAndGoalsSub: 'Main settings for your panel.',
    yourName: 'Your name',
    dailyGoalPercent: 'Daily goal %',
    weeklyGoalPercent: 'Weekly goal %',
    themeBackground: 'Theme and background',
    themeBackgroundSub: 'Choose light, dark or use your own image.',
    dark: 'Dark',
    light: 'Light',
    uploadImage: 'Upload image',
    removeImage: 'Remove image',
    imageUrlPlaceholder: 'Paste an image URL',
    applyUrl: 'Apply URL',
    size: 'Size',
    position: 'Position',
    cover: 'Cover',
    contain: 'Contain',
    auto: 'Auto',
    center: 'Center',
    top: 'Top',
    bottom: 'Bottom',
    left: 'Left',
    right: 'Right',
    backupData: 'Data and backup',
    backupDataSub: 'Export, import and reset.',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    resetAllData: 'Reset all settings',
    resetAllTitle: 'Reset everything?',
    resetAllDescription: 'This will erase all tasks, habits, history, goals, reflections and saved settings. This is a sensitive action and cannot be undone.',
    confirmReset: 'Confirm reset',
    resetDone: 'Everything was reset',
    weeklyGoals: 'Weekly goals',
    onePerLine: 'One per line.',
    fullHistory: 'Full history',
    historySub: 'View your pattern by calendar and list.',
    tasksCompleted: (done, total) => `${done}/${total} tasks completed`,
    fillMainFields: 'Fill in the main fields.',
    taskTitle: 'Title',
    category: 'Category',
    priority: 'Priority',
    time: 'Time',
    discipline: 'Discipline',
    disciplineHelp: 'Every task has the same weight in the daily score.',
    description: 'Description',
    subtasks: 'Subtasks',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
    taskDone: 'done',
    taskPending: 'pending',
  },
};

function getCopy(locale = 'PT-BR') {
  return UI_COPY[locale] || UI_COPY['PT-BR'];
}

function categoryLabel(category, locale = 'PT-BR') {
  const labels = {
    'PT-BR': { saúde: 'saúde', espiritualidade: 'espiritualidade', estudo: 'estudo', trabalho: 'trabalho', pessoal: 'pessoal', financeiro: 'financeiro' },
    'EN-US': { saúde: 'health', espiritualidade: 'spirituality', estudo: 'study', trabalho: 'work', pessoal: 'personal', financeiro: 'finance' },
  };
  return (labels[locale] && labels[locale][category]) || category;
}

function priorityLabel(priority, locale = 'PT-BR') {
  const copy = getCopy(locale);
  return { baixa: copy.low, média: copy.medium, alta: copy.high, crítica: copy.critical }[priority] || priority;
}

function statusLabel(status, locale = 'PT-BR') {
  const copy = getCopy(locale);
  return { done: copy.taskDone, pending: copy.taskPending }[status] || status;
}

function alphaColor(hex, alpha = '22') {
  if (typeof hex !== 'string') return hex;
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) return `${hex}${alpha}`;
  return hex;
}

function getDisciplineLabel(value) {
  if (value <= 39) return { text: 'PIECE OF SHIT', tone: 'danger' };
  if (value <= 69) return { text: 'DONT FUCKING QUIT', tone: 'warn' };
  if (value <= 89) return { text: 'STAY HARD', tone: 'info' };
  return { text: 'LOCKED IN', tone: 'success' };
}

function getTasksForDate(state, date) {
  return state.tasks
    .filter((task) => taskMatchesDate(task, date))
    .map((task) => withEffectiveTaskStatus(task, date));
}

function disciplineForDate(state, date) {
  const tasks = getTasksForDate(state, date);
  const habits = state.habits;
  const taskPercent = tasks.length ? (tasks.filter((task) => task.status === 'done').length / tasks.length) * 100 : 0;
  const habitPercent = habits.length ? (habits.filter((habit) => (habit.logs[date] || 0) >= habit.target).length / habits.length) * 100 : 0;
  if (!tasks.length && !habits.length) return 0;
  if (tasks.length && habits.length) return percentage((taskPercent + habitPercent) / 2);
  return percentage(taskPercent || habitPercent);
}

function buildFullHistory(state) {
  const today = todayISO();
  const todayTasks = getTasksForDate(state, today);
  const todayEntry = {
    date: today,
    discipline: disciplineForDate(state, today),
    tasksDone: todayTasks.filter((task) => task.status === 'done').length,
    tasksTotal: todayTasks.length,
  };
  const filtered = state.history.filter((h) => h.date !== today);
  return [...filtered, todayEntry].sort((a, b) => a.date.localeCompare(b.date));
}

function getDateRange(lastDays) {
  const end = todayISO();
  return Array.from({ length: lastDays }, (_, idx) => offsetDate(end, -(lastDays - idx - 1)));
}

function cls(...parts) { return parts.filter(Boolean).join(' '); }
function toastId() { return Math.random().toString(36).slice(2, 8); }

function useToast() {
  const [items, setItems] = useState([]);
  function push(title, description = '') {
    const id = toastId();
    setItems((prev) => [...prev, { id, title, description }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2400);
  }
  return { items, push };
}


// ── OUROBOROS RING ───────────────────────────────────────────────────
function OuroborosRing({ value, tone }) {
  const canvasRef = useRef(null);
  const processedRef = useRef(null);
  const [ready, setReady] = useState(false);

  const toneColors = {
    danger: [239, 68, 68],
    warn: [245, 158, 11],
    info: [96, 165, 250],
    success: [34, 197, 94],
  };

  const [r, g, b] = toneColors[tone] || toneColors.info;

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';

    img.onload = () => {
      if (cancelled) return;

      const W = img.naturalWidth;
      const H = img.naturalHeight;

      const tmp = document.createElement('canvas');
      tmp.width = W;
      tmp.height = H;

      const tCtx = tmp.getContext('2d', { willReadFrequently: true });
      if (!tCtx) return;

      tCtx.clearRect(0, 0, W, H);
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = 'high';
      tCtx.drawImage(img, 0, 0, W, H);

      const imageData = tCtx.getImageData(0, 0, W, H);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        const alpha = d[i + 3];
        if (alpha === 0) continue;

        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;

        // branco quase total vira transparente
        if (avg >= 245) {
          d[i + 3] = 0;
          continue;
        }

        // cinza claro vira traço suave
        if (avg >= 205) {
          const ink = (245 - avg) / 40;
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
          d[i + 3] = Math.max(alpha, Math.round(ink * 255));
          continue;
        }

        // traço escuro vira preto
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = alpha;
      }

      tCtx.putImageData(imageData, 0, 0);
      processedRef.current = tmp;
      setReady(true);
    };

    img.src = SNAKE_IMG_SRC;

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current || !processedRef.current) return;

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;

    const draw = () => {
      const displaySize = Math.min(parent?.clientWidth || 260, 260);
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.round(displaySize * dpr);
      canvas.height = Math.round(displaySize * dpr);
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, displaySize, displaySize);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cx = displaySize / 2;
      const cy = displaySize / 2;

      // ajuste fino do anel
      const outerR = displaySize * 0.70;
      const innerR = displaySize * 0.200;

      // começo do progresso perto da cabeça
      const trackStartDeg = -110;

      // arco útil da cobra (deixa o gap do rabo sem preencher)
      const trackSweepDeg = 360;

      const start = (trackStartDeg * Math.PI) / 180;
      const totalSweep = (trackSweepDeg * Math.PI) / 180;
      const pct = Math.max(0, Math.min(100, value)) / 100;
      const activeSweep = totalSweep * pct;

      // base apagada da cobra toda
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.drawImage(processedRef.current, 0, 0, displaySize, displaySize);
      ctx.restore();

      // parte ativa em formato de arco, não pizza
      if (activeSweep > 0.0001) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, start, start + activeSweep, false);
        ctx.arc(cx, cy, innerR, start + activeSweep, start, true);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(processedRef.current, 0, 0, displaySize, displaySize);

        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`;
        ctx.fillRect(0, 0, displaySize, displaySize);

        ctx.restore();
      }
    };

    draw();

    let ro;
    if (typeof ResizeObserver !== 'undefined' && parent) {
      ro = new ResizeObserver(draw);
      ro.observe(parent);
    } else {
      window.addEventListener('resize', draw);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', draw);
    };
  }, [ready, value, r, g, b]);

  return (
    <div
      className="ouroboros-wrap"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      <div
        className="ouroboros-center"
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="ouroboros-number"
          style={{
            color: 'rgba(255,255,255,0.98)',
            textShadow: `0 0 20px rgba(${r},${g},${b},0.80), 0 2px 8px rgba(0,0,0,0.90)`,
          }}
        >
          {value}
        </span>

        <span
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            marginTop: '-4px',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          %
        </span>
      </div>
    </div>
  );
}

export default function DisciplinaTotalApp() {
  const [state, setState] = useState(sampleState());
  const [storageReady, setStorageReady] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [routineView, setRoutineView] = useState('today');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [pomodoro, setPomodoro] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [pomodoroInfoOpen, setPomodoroInfoOpen] = useState(false);
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [weeklyGoalsDraft, setWeeklyGoalsDraft] = useState(sampleState().settings.weeklyGoals.join('\n'));
  const [pomodoroLinkNameDraft, setPomodoroLinkNameDraft] = useState('');
  const [pomodoroUrlDraft, setPomodoroUrlDraft] = useState('');
  const [historyDate, setHistoryDate] = useState(todayISO());
  const fileRef = useRef(null);
  const bgUploadRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const persistedState = await loadState();
      if (cancelled) return;
      setState(persistedState);
      setStorageReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveState(state);
  }, [state, storageReady]);
  useEffect(() => {
    setWeeklyGoalsDraft((state.settings.weeklyGoals || []).join('\n'));
  }, [state.settings.weeklyGoals]);
  useEffect(() => {
    if (!pomodoroRunning) return;
    const t = setInterval(() => {
      setPomodoro((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setPomodoroRunning(false);
          if (pomodoroMode === 'focus') { setPomodoroCycles((c) => c + 1); toast.push('Foco concluído', 'Hora de fazer uma pausa.'); }
          else toast.push('Pausa concluída', 'Hora de voltar ao foco.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pomodoroRunning, pomodoroMode]);

  useEffect(() => {
    if (!pomodoroRunning) setPomodoro((prev) => (prev > 0 ? prev : (state.settings.pomodoroFocusMin || 25) * 60));
  }, [state.settings.pomodoroFocusMin]);

  const usingImageBackground = !!state.appearance.backgroundImage;
  const isLight = state.appearance.themeMode === 'light';
  const locale = state.settings.locale || 'PT-BR';
  const copy = getCopy(locale);
  const backgroundValue = usingImageBackground ? `url(${state.appearance.backgroundImage})` : themeGradients[state.appearance.themeMode || 'dark'];
  const fullHistory = useMemo(() => buildFullHistory(state), [state]);
  const weekDates = getDateRange(7);
  const weekSeries = weekDates.map((d) => ({ label: formatShort(d, locale), raw: d, disciplina: disciplineForDate(state, d) }));
  const monthSeries = getDateRange(30).map((d) => ({ label: formatShort(d, locale), raw: d, disciplina: disciplineForDate(state, d) }));

  const todayTasksRaw = state.tasks.filter((t) => taskMatchesDate(t, todayISO()));
  const todayTasks = sortTasksByTime(todayTasksRaw.map((task) => withEffectiveTaskStatus(task, todayISO())));
  const routineReferenceDate = todayISO();
  const routineWeekDates = buildRemainingWeekDates(routineReferenceDate);
  const filteredTasks = sortTasksByTime(
    state.tasks
      .filter((task) => taskMatchesDate(task, routineReferenceDate))
      .map((task) => withEffectiveTaskStatus(task, routineReferenceDate))
      .filter((task) => taskMatchesSearch(task, search))
  );
  const routineWeekGroups = routineWeekDates.map((date) => ({
    date,
    tasks: sortTasksByTime(
      state.tasks
        .filter((task) => taskMatchesDate(task, date))
        .map((task) => withEffectiveTaskStatus(task, date))
        .filter((task) => taskMatchesSearch(task, search))
    ),
  }));
  const visibleRoutineWeekGroups = routineWeekGroups.filter((group) => group.tasks.length > 0);

  const todayDiscipline = disciplineForDate(state, todayISO());
  const disciplineMeta = getDisciplineLabel(todayDiscipline);
  const doneCount = todayTasks.filter((t) => t.status === 'done').length;
  const pendingCount = todayTasks.filter((t) => t.status === 'pending').length;
  const weekAverage = percentage(weekSeries.reduce((sum, i) => sum + i.disciplina, 0) / weekSeries.length);
  const monthAverage = percentage(monthSeries.reduce((sum, i) => sum + i.disciplina, 0) / monthSeries.length);
  const generalAverage = percentage(fullHistory.reduce((sum, i) => sum + i.discipline, 0) / fullHistory.length);
  const record = Math.max(...fullHistory.map((i) => i.discipline));
  const streak = (() => {
    let s = 0;
    const vals = weekSeries.map((i) => i.disciplina);
    for (let i = vals.length - 1; i >= 0; i--) { if (vals[i] >= state.settings.dailyGoal) s++; else break; }
    return s;
  })();
  const lastDay = fullHistory[fullHistory.length - 2];
  const delta = lastDay ? todayDiscipline - lastDay.discipline : 0;
const top3 = sortTasksByTime([...todayTasks].sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority)).slice(0, 3));
const weeklyGoals = (state.settings.weeklyGoals || []).map((goal) => goal.trim()).filter(Boolean);
const hasWeeklyGoals = weeklyGoals.length > 0;
const todayCompletedHabits = state.habits.filter((habit) => (habit.logs[todayISO()] || 0) >= Math.max(1, Number(habit.target || 1))).length;
const weekTasks = weekDates.flatMap((date) => getTasksForDate(state, date).map((task) => ({ ...task, effectiveDate: date })));
const weekDoneTasks = weekTasks.filter((task) => task.status === 'done').length;
const weekTotalTasks = weekTasks.length;
const weekCompletionRate = percentage(weekTotalTasks ? (weekDoneTasks / weekTotalTasks) * 100 : 0);
const daysAboveGoal = weekSeries.filter((item) => item.disciplina >= state.settings.dailyGoal).length;
const bestWeekDay = [...weekSeries].sort((a, b) => b.disciplina - a.disciplina)[0] || null;
const worstWeekDay = [...weekSeries].sort((a, b) => a.disciplina - b.disciplina)[0] || null;
const nextPendingTask = todayTasks.find((task) => task.status !== 'done') || null;
const weeklyTaskFlow = weekDates.map((date) => {
  const tasksForDay = sortTasksByTime(getTasksForDate(state, date));
  const doneForDay = tasksForDay.filter((task) => task.status === 'done').length;
  return {
    label: formatShort(date),
    raw: date,
    abertas: tasksForDay.length,
    concluidas: doneForDay,
  };
});
const priorityCompletionData = ['crítica', 'alta', 'média', 'baixa']
  .map((priority) => {
    const items = weekTasks.filter((task) => task.priority === priority);
    const total = items.length;
    const entregues = items.filter((task) => task.status === 'done').length;
    return {
      name: priority,
      total,
      entregues,
      taxa: percentage(total ? (entregues / total) * 100 : 0),
    };
  })
  .filter((item) => item.total > 0);
const habitWindow = getDateRange(14);
const habitConsistencyData = state.habits
  .map((habit) => {
    const doneDays = habitWindow.filter((date) => (habit.logs[date] || 0) >= Math.max(1, Number(habit.target || 1))).length;
    return {
      name: habit.title.length > 18 ? `${habit.title.slice(0, 18)}…` : habit.title,
      consistencia: percentage((doneDays / habitWindow.length) * 100),
      dias: doneDays,
    };
  })
  .sort((a, b) => b.consistencia - a.consistencia)
  .slice(0, 6);
const chartGrid = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
const chartAxis = isLight ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.45)';
const mutedBarColor = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.22)';

function updateState(updater) { setState((prev) => updater(prev)); }

  function setTaskStatus(taskId, status, targetDate = todayISO()) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        const hasWeekdays = Array.isArray(t.weekdays) && t.weekdays.length > 0;

        if (hasWeekdays) {
          const nextDaySubtasks = Object.fromEntries(
            subtasks.map((subtask) => [subtask.id, status === 'done'])
          );

          return {
            ...t,
            statusByDate: { ...(t.statusByDate || {}), [targetDate]: status },
            subtaskStatusByDate: {
              ...(t.subtaskStatusByDate || {}),
              [targetDate]: nextDaySubtasks,
            },
          };
        }

        if (!subtasks.length) return { ...t, status };
        if (status === 'done') return { ...t, status: 'done', subtasks: subtasks.map((s) => ({ ...s, done: true })) };
        return { ...t, status, subtasks: subtasks.map((s) => ({ ...s, done: false })) };
      }),
    }));
    toast.push(status === 'done' ? 'Tarefa concluída' : 'Status atualizado');
  }

  function toggleSubtask(taskId, subtaskId, targetDate = todayISO()) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const hasWeekdays = Array.isArray(t.weekdays) && t.weekdays.length > 0;

        if (hasWeekdays) {
          const baseSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
          const currentDayMap = { ...(t.subtaskStatusByDate?.[targetDate] || {}) };
          currentDayMap[subtaskId] = !currentDayMap[subtaskId];

          const allDone = baseSubtasks.length > 0 && baseSubtasks.every((subtask) => Boolean(currentDayMap[subtask.id]));

          return {
            ...t,
            statusByDate: {
              ...(t.statusByDate || {}),
              [targetDate]: allDone ? 'done' : 'pending',
            },
            subtaskStatusByDate: {
              ...(t.subtaskStatusByDate || {}),
              [targetDate]: currentDayMap,
            },
          };
        }

        const subtasks = (t.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
        const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
        return { ...t, subtasks, status: allDone ? 'done' : t.status === 'done' ? 'pending' : t.status };
      }),
    }));
  }

  function incrementHabit(habitId, deltaValue) {
    updateState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const current = h.logs[todayISO()] || 0;
        const next = Math.max(0, Math.min(h.target || 1, current + deltaValue));
        return { ...h, logs: { ...h.logs, [todayISO()]: next } };
      }),
    }));
  }

  function removeTask(taskId) { updateState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) })); toast.push(locale === 'EN-US' ? 'Task removed' : 'Tarefa removida'); }
  function duplicateTask(task) {
    const copy = normalizeTaskRecord({
      ...task,
      id: uid(),
      title: `${task.title} (cópia)`,
      status: 'pending',
      statusByDate: {},
      subtaskStatusByDate: {},
      subtasks: (task.subtasks || []).map((subtask) => ({ ...subtask, done: false })),
    });
    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, copy] }));
    toast.push('Tarefa duplicada');
  }

  function openNewTask() {
    setEditingTask({
      id: uid(),
      title: '',
      description: '',
      category: 'pessoal',
      priority: 'média',
      time: '',
      status: 'pending',
      date: todayISO(),
      weekdays: [weekdayFromISO(todayISO())],
      statusByDate: {},
      subtaskStatusByDate: {},
      color: priorityColor('média'),
      subtasks: [],
    });
    setShowTaskModal(true);
  }

  function saveTask(task) {
    const cleanedSubtasks = (task.subtasks || [])
      .filter((s) => (s.title || '').trim())
      .map((s) => ({ ...s, id: s.id || uid(), title: s.title.trim() }));
    const hasWeekdays = Array.isArray(task.weekdays) && task.weekdays.length > 0;
    const normalizedTask = normalizeTaskRecord({
      ...task,
      date: task.date || todayISO(),
      weekdays: hasWeekdays ? [...task.weekdays].sort((a, b) => a - b) : [],
      statusByDate: hasWeekdays ? (task.statusByDate || {}) : {},
      subtaskStatusByDate: hasWeekdays
        ? normalizeRecurringSubtaskStatusByDate(task.subtaskStatusByDate || {}, cleanedSubtasks, task.statusByDate || {})
        : {},
      color: priorityColor(task.priority),
      subtasks: hasWeekdays
        ? cleanedSubtasks.map((subtask) => ({ ...subtask, done: false }))
        : cleanedSubtasks,
      status: cleanedSubtasks.length && cleanedSubtasks.every((s) => s.done) ? 'done' : task.status === 'done' && cleanedSubtasks.length ? 'pending' : task.status,
    });
    updateState((prev) => {
      const exists = prev.tasks.some((t) => t.id === normalizedTask.id);
      const tasks = exists ? prev.tasks.map((t) => (t.id === normalizedTask.id ? normalizedTask : t)) : [...prev.tasks, normalizedTask];
      return { ...prev, tasks };
    });
    setShowTaskModal(false); setEditingTask(null); toast.push('Tarefa salva');
  }

  function openNewHabit() {
    setEditingHabit({ id: uid(), title: '', category: 'saúde', icon: 'agua', color: '#38bdf8', target: 1, logs: { [todayISO()]: 0 } });
    setShowHabitModal(true);
  }

  function saveHabit(habit) {
    const normalizedHabit = { ...habit, title: (habit.title || '').trim(), target: Math.max(1, Number(habit.target || 1)), logs: habit.logs || { [todayISO()]: 0 }, color: habit.color || '#38bdf8' };
    if (!normalizedHabit.title) { toast.push(locale === 'EN-US' ? 'Give the habit a name' : 'Dê um nome ao hábito'); return; }
    updateState((prev) => {
      const exists = prev.habits.some((h) => h.id === normalizedHabit.id);
      const habits = exists ? prev.habits.map((h) => (h.id === normalizedHabit.id ? normalizedHabit : h)) : [...prev.habits, normalizedHabit];
      return { ...prev, habits };
    });
    setShowHabitModal(false); setEditingHabit(null); toast.push(locale === 'EN-US' ? 'Habit saved' : 'Hábito salvo');
  }

  function removeHabit(habitId) {
    updateState((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== habitId) }));
    toast.push(locale === 'EN-US' ? 'Habit removed' : 'Hábito removido');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `disciplina-total-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url); toast.push(locale === 'EN-US' ? 'Backup exported' : 'Backup exportado');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try { const parsed = JSON.parse(String(reader.result)); setState(parsed); toast.push(locale === 'EN-US' ? 'Backup imported' : 'Backup importado'); }
      catch { toast.push(locale === 'EN-US' ? 'Invalid file' : 'Arquivo inválido'); }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    setState(emptyState());
    setShowResetModal(false);
    toast.push(copy.resetDone);
  }

  function applyBackgroundFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundImage: result, backgroundUrl: '' } }));
      toast.push(locale === 'EN-US' ? 'Image applied' : 'Imagem aplicada');
    };
    reader.readAsDataURL(file);
  }

  function applyBackgroundUrl() {
    const url = (state.appearance.backgroundUrl || '').trim();
    if (!url) { toast.push(locale === 'EN-US' ? 'Paste a valid URL' : 'Cole uma URL válida'); return; }
    updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundImage: url, backgroundUrl: url } }));
    toast.push(locale === 'EN-US' ? 'Image applied' : 'Imagem aplicada');
  }

  function clearBackgroundImage() {
    updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundImage: '', backgroundUrl: '' } }));
    toast.push('Voltando ao tema');
  }

  function addPomodoroUrl() {
    const name = pomodoroLinkNameDraft.trim();
    const url = pomodoroUrlDraft.trim();
    if (!url) { toast.push(locale === 'EN-US' ? 'Paste a valid URL' : 'Cole uma URL válida'); return; }
    const nextSound = { id: uid(), name: name || shortUrlLabel(url), url };
    updateState((prev) => ({
      ...prev,
      settings: { ...prev.settings, pomodoroSavedSounds: [...(prev.settings.pomodoroSavedSounds || []).filter((item) => item.url !== url), nextSound], pomodoroSelectedSoundKey: `saved:${nextSound.id}` },
    }));
    setPomodoroLinkNameDraft(''); setPomodoroUrlDraft(''); toast.push(locale === 'EN-US' ? 'Link saved' : 'Link salvo');
  }

  function selectPomodoroSound(key) { updateState((prev) => ({ ...prev, settings: { ...prev.settings, pomodoroSelectedSoundKey: key } })); }

  function removePomodoroSound(id) {
    updateState((prev) => {
      const remaining = (prev.settings.pomodoroSavedSounds || []).filter((item) => item.id !== id);
      const currentKey = prev.settings.pomodoroSelectedSoundKey;
      const removedKey = `saved:${id}`;
      return { ...prev, settings: { ...prev.settings, pomodoroSavedSounds: remaining, pomodoroSelectedSoundKey: currentKey === removedKey ? 'white' : currentKey } };
    });
    toast.push('Link removido');
  }

  function applyPomodoroLength(kind) {
    const focus = Math.max(1, Number(state.settings.pomodoroFocusMin || 25));
    const shortBreak = Math.max(1, Number(state.settings.pomodoroShortBreakMin || 5));
    const longBreak = Math.max(1, Number(state.settings.pomodoroLongBreakMin || 15));
    const seconds = kind === 'focus' ? focus * 60 : kind === 'short' ? shortBreak * 60 : longBreak * 60;
    setPomodoroMode(kind === 'focus' ? 'focus' : 'break');
    setPomodoroRunning(false); setPomodoro(seconds);
  }

  function pomodoroNextBreakLabel() {
    const cyclesBeforeLong = Math.max(1, Number(state.settings.pomodoroCyclesBeforeLongBreak || 4));
    const nextCycle = pomodoroCycles + (pomodoroMode === 'focus' ? 1 : 0);
    return nextCycle % cyclesBeforeLong === 0 ? (locale === 'EN-US' ? 'Long break' : 'Pausa longa') : (locale === 'EN-US' ? 'Short break' : 'Pausa curta');
  }

  function insertNewLineValue(value, selectionStart, selectionEnd) {
    return value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd);
  }

  function renderRoutineTaskCard(task, targetDate) {
    return (
      <motion.div key={`${task.id}-${targetDate}`} layout className="glass task-card-premium">
        <div className="task-card-body">
          <button className="task-check" onClick={() => setTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done', targetDate)}>
            {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>
          <div className="task-card-copy">
            <div className={cls('task-card-title', task.status === 'done' && 'done')}>{task.title}</div>
            <div className="task-card-meta">
              {categoryLabel(task.category, locale)} • {priorityLabel(task.priority, locale)}
              {task.time ? ` • ${task.time}` : ''}
              {formatTaskWeekdays(task, locale) ? ` • ${formatTaskWeekdays(task, locale)}` : ''}
            </div>
            {task.description && <p className="task-desc">{task.description}</p>}
            {!!task.subtasks.length && (
              <div className="subtask-list">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="subtask-item">
                    <button type="button" className={cls('subtask-toggle', s.done && 'done')} onClick={() => toggleSubtask(task.id, s.id, targetDate)}>{s.done ? '✓' : ''}</button>
                    <span className={cls(s.done && 'done')}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="task-actions-row">
              <button className="ghost-btn" onClick={() => setTaskStatus(task.id, 'done', targetDate)}>{copy.done}</button>
              <button className="ghost-btn" onClick={() => setTaskStatus(task.id, 'pending', targetDate)}>{copy.pendingBtn}</button>
              <button className="ghost-btn" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}><Pencil size={14} /> {copy.edit}</button>
              <button className="ghost-btn" onClick={() => duplicateTask(task)}>{copy.duplicate}</button>
              <button className="danger-btn" onClick={() => removeTask(task.id)}><Trash2 size={14} /> {copy.delete}</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const pageBody = (() => {
if (page === 'dashboard') {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-top">
        <section className="glass hero-card dashboard-hero">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> {locale === 'EN-US' ? `Welcome back, ${state.settings.userName}` : `Bem-vindo de volta, ${state.settings.userName}`}</div>
            <h2>{locale === 'EN-US' ? `Your discipline today is ${todayDiscipline}%` : `Sua disciplina de hoje está em ${todayDiscipline}%`}</h2>
            <p>{locale === 'EN-US' ? <>“Whoever lives only for the instant runs away from oneself.” — <strong>Friedrich Nietzsche</strong>.</> : <>“Quem vive só para o instante foge de si mesmo.” — <strong>Friedrich Nietzsche</strong>.</>}</p>
            <div className="hero-tags">
              <span className={cls('pill', disciplineMeta.tone)}>{disciplineMeta.text}</span>
              <span className="pill">{locale === 'EN-US' ? 'Goal' : 'Meta'}: {state.settings.dailyGoal}%</span>
              <span className="pill">{locale === 'EN-US' ? 'Streak' : 'Sequência'}: {streak} {locale === 'EN-US' ? 'days' : 'dias'}</span>
            </div>
            <div className="progress-block">
              <div className="progress-head"><span>{locale === 'EN-US' ? 'Day progress' : 'Progresso do dia'}</span><strong>{todayDiscipline}%</strong></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${todayDiscipline}%` }} /></div>
            </div>
          </div>
          <div className="hero-metrics">
            <Metric icon={<ListTodo size={16} />} label={locale === 'EN-US' ? 'Tasks today' : 'Tarefas do dia'} value={todayTasks.length} />
            <Metric icon={<CheckCircle2 size={16} />} label={locale === 'EN-US' ? 'Completed' : 'Concluídas'} value={doneCount} />
            <Metric icon={<Target size={16} />} label={locale === 'EN-US' ? 'Completed habits' : 'Hábitos batidos'} value={`${todayCompletedHabits}/${state.habits.length}`} />
            <Metric icon={<Trophy size={16} />} label={locale === 'EN-US' ? 'Week average' : 'Média da semana'} value={`${weekAverage}%`} />
            <Metric icon={delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} label={locale === 'EN-US' ? 'Today vs yesterday' : 'Hoje vs ontem'} value={`${delta >= 0 ? '+' : ''}${delta}%`} />
          </div>
        </section>

        <section className="glass section-card centered dashboard-ring-card">
          <div className="ring-card-top">
            <div className="section-title ring-title">{locale === 'EN-US' ? 'Discipline arc' : 'Arco de disciplina'}</div>
            <OuroborosRing value={todayDiscipline} tone={disciplineMeta.tone} />
            <span className={cls('pill', disciplineMeta.tone)} style={{ marginTop: 4 }}>{disciplineMeta.text}</span>
          </div>
        </section>
      </div>

      <div className="dashboard-main-grid">
        <section className="glass section-card dashboard-routine-card">
          <SectionHeader
            title={locale === 'EN-US' ? 'Today routine' : 'Rotina de hoje'}
            action={<button className="ghost-btn" onClick={() => setPage('routine')}>{locale === 'EN-US' ? 'See all' : 'Ver tudo'}</button>}
          />
          {todayTasks.length ? (
            <div className="routine-preview-list">
              {todayTasks.map((task) => <TaskMiniRow key={task.id} task={task} locale={locale} onSetTaskStatus={setTaskStatus} />)}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="row-title">{locale === 'EN-US' ? 'Nothing scheduled for today.' : 'Nada programado para hoje.'}</div>
              <div className="row-sub">{locale === 'EN-US' ? 'Create a task and your dashboard starts to make sense right away.' : 'Crie uma tarefa e seu dashboard já começa a fazer sentido.'}</div>
            </div>
          )}
        </section>

        <section className="glass section-card">
          <SectionHeader
            title={locale === 'EN-US' ? 'Habits today' : 'Hábitos do dia'}
            subtitle={locale === 'EN-US' ? `${todayCompletedHabits}/${state.habits.length} hit the goal today.` : `${todayCompletedHabits}/${state.habits.length} bateram a meta hoje.`}
            action={<button className="ghost-btn" onClick={() => setPage('habits')}>{locale === 'EN-US' ? 'Open habits' : 'Abrir hábitos'}</button>}
          />
          <div className="stack">
            {state.habits.slice(0, 5).map((habit) => {
              const value = habit.logs[todayISO()] || 0;
              const pct = Math.min(100, Math.round((value / habit.target) * 100));
              return (
                <div key={habit.id} className="mini-habit" style={{ '--habit-color': habit.color, '--habit-color-soft': alphaColor(habit.color, '16') }}>
                  <div><div className="row-title">{habit.title}</div><div className="row-sub">{value}/{habit.target} {locale === 'EN-US' ? 'today' : 'hoje'}</div></div>
                  <div className="habit-stepper">
                    <button className="icon-btn" onClick={() => incrementHabit(habit.id, -1)}><ChevronDown size={16} /></button>
                    <strong>{value}</strong>
                    <button className="icon-btn" onClick={() => incrementHabit(habit.id, 1)}><ChevronUp size={16} /></button>
                  </div>
                  <div className="progress-track slim"><div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(135deg, ${habit.color}, ${alphaColor(habit.color, 'CC')})` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="dashboard-side-stack">
          <section className="glass section-card dashboard-quick-card">
            <SectionHeader title={locale === 'EN-US' ? 'Quick add' : 'Adição rápida'} subtitle={locale === 'EN-US' ? 'Throw a task into the system in seconds.' : 'Jogue uma tarefa no sistema em segundos.'} />
            <div className="quick-add-vertical">
              <input
                value={editingTask?.title || ''}
                onChange={(e) => setEditingTask({ ...(editingTask || {}), title: e.target.value })}
                placeholder={locale === 'EN-US' ? 'Ex.: review goals for 15 minutes' : 'Ex.: revisar metas por 15 minutos'}
              />
              <button className="primary-btn full-btn" onClick={() => {
                const title = (editingTask?.title || '').trim();
                if (!title) return;
                const task = { id: uid(), title, description: '', category: 'pessoal', priority: 'média', time: '', status: 'pending', date: todayISO(), subtasks: [] };
                updateState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
                setEditingTask(null); toast.push(locale === 'EN-US' ? 'Quickly added' : 'Adicionado rapidamente');
              }}>
                <Plus size={16} /> {locale === 'EN-US' ? 'Add' : 'Adicionar'}
              </button>
            </div>
          </section>

          <section className="glass section-card dashboard-weekly-card">
            <div className="section-head-row">
              <div>
                <div className="section-title with-icon"><Trophy size={16} /> {locale === 'EN-US' ? 'Weekly panel' : 'Painel semanal'}</div>
                <div className="section-subtitle">{locale === 'EN-US' ? 'Useful week summary, no dead space.' : 'Resumo útil da semana, sem espaço morto.'}</div>
              </div>
              <span className="pill">{daysAboveGoal}/7 {locale === 'EN-US' ? 'above goal' : 'acima da meta'}</span>
            </div>

            {hasWeeklyGoals ? (
              <div className="stack small-gap weekly-goal-list">
                {weeklyGoals.map((goal, idx) => (
                  <div key={idx} className="goal-chip goal-chip-inline">
                    <span className="goal-chip-index">{idx + 1}</span>
                    <span>{goal}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="weekly-summary-grid">
              <MiniStat label={locale === 'EN-US' ? 'Week average' : 'Média da semana'} value={`${weekAverage}%`} />
              <MiniStat label={locale === 'EN-US' ? 'Execution' : 'Execução'} value={`${weekCompletionRate}%`} />
              <MiniStat label={locale === 'EN-US' ? 'Completed' : 'Concluídas'} value={`${weekDoneTasks}/${weekTotalTasks || 0}`} />
              <MiniStat label={locale === 'EN-US' ? 'Record' : 'Recorde'} value={`${record}%`} />
            </div>

            <div className="insight-list">
              {bestWeekDay ? (
                <div className="simple-card">
                  <div className="row-title">{locale === 'EN-US' ? 'Best day' : 'Melhor dia'}</div>
                  <div className="row-sub">{formatShort(bestWeekDay.raw, locale)} • {bestWeekDay.disciplina}% {locale === 'EN-US' ? 'discipline' : 'de disciplina'}</div>
                </div>
              ) : null}

              <div className="simple-card">
                <div className="row-title">{locale === 'EN-US' ? 'Week rhythm' : 'Ritmo da semana'}</div>
                <div className="row-sub">{locale === 'EN-US' ? `${daysAboveGoal} out of 7 days stayed above the daily goal.` : `${daysAboveGoal} de 7 dias ficaram acima da meta diária.`}</div>
              </div>

              {nextPendingTask ? (
                <div className="simple-card">
                  <div className="row-title">{locale === 'EN-US' ? 'Next pending item' : 'Próxima pendência'}</div>
                  <div className="row-sub">{nextPendingTask.title}{nextPendingTask.time ? ` • ${nextPendingTask.time}` : ''}</div>
                </div>
              ) : (
                <div className="simple-card">
                  <div className="row-title">{locale === 'EN-US' ? 'Clean day' : 'Dia limpo'}</div>
                  <div className="row-sub">
                    {locale === "EN-US"
                      ? `Everything in today's panel has already been marked as done.`
                      : `Tudo que está no painel de hoje já foi marcado como feito.`}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <section className="glass section-card">
          <SectionHeader title={locale === 'EN-US' ? 'Week at a glance' : 'Semana em linha'} subtitle={locale === 'EN-US' ? 'Real discipline swings over the last 7 days.' : 'Oscilação real da disciplina nos últimos 7 dias.'} />
          <div className="chart-box compact-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekSeries}>
                <defs>
                  <linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="disciplina" name="Disciplina" stroke="var(--primary)" fill="url(#weekFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            {bestWeekDay ? <span className="pill success">{locale === 'EN-US' ? 'Best' : 'Melhor'}: {formatShort(bestWeekDay.raw, locale)} • {bestWeekDay.disciplina}%</span> : null}
            {worstWeekDay ? <span className="pill danger">{locale === 'EN-US' ? 'Weakest' : 'Mais fraco'}: {formatShort(worstWeekDay.raw, locale)} • {worstWeekDay.disciplina}%</span> : null}
          </div>
        </section>

        <section className="glass section-card">
          <SectionHeader
              title={locale === "EN-US" ? "Top 3 priorities" : "Top 3 prioridades"}
              subtitle={
                locale === "EN-US"
                  ? "What most supports the day's result."
                  : "O que mais sustenta o resultado do dia."
              }
              action={
                <button className="ghost-btn" onClick={openNewTask}>
                  <Plus size={16} /> {locale === "EN-US" ? "Task" : "Tarefa"}
                </button>
              }
          />
          {top3.length ? (
            <div className="stack">
              {top3.map((task, idx) => (
                <div key={task.id} className="priority-card">
                  <div className="priority-index">{idx + 1}</div>
                  <div className="priority-copy"><div className="row-title">{task.title}</div><div className="row-sub">{categoryLabel(task.category, locale)} • {priorityLabel(task.priority, locale)}</div></div>
                  <span className={cls('priority-pill', task.priority)}>{priorityLabel(task.priority, locale)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="row-title">{locale === 'EN-US' ? 'No priorities defined.' : 'Sem prioridades definidas.'}</div>
              <div className="row-sub">{locale === 'EN-US' ? 'Add tasks and the ranking appears here automatically.' : 'Adicione tarefas e o ranking aparece aqui automaticamente.'}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

    if (page === 'routine') {
      return (
        <div className="stack large-gap">
          <section className="glass section-card">
            <SectionHeader
              title={locale === 'EN-US' ? 'Your operational board' : 'Seu painel operacional do dia'}
              subtitle={locale === 'EN-US' ? 'Choose between today only or the remaining days of the week.' : 'Escolha entre ver só hoje ou os próximos dias da semana.'}
              action={<button className="primary-btn" onClick={openNewTask}><Plus size={16} /> {copy.newTask}</button>}
            />
            <div className="toolbar-row" style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="ghost-btn"
                  onClick={() => setRoutineView('today')}
                  style={routineView === 'today' ? { background: 'var(--primary)', color: '#000', borderColor: 'transparent', fontWeight: 800 } : undefined}
                >
                  {locale === 'EN-US' ? 'Task of the day' : 'Tarefa do dia'}
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => setRoutineView('week')}
                  style={routineView === 'week' ? { background: 'var(--primary)', color: '#000', borderColor: 'transparent', fontWeight: 800 } : undefined}
                >
                  {locale === 'EN-US' ? 'All tasks' : 'Todas as tarefas'}
                </button>
              </div>
              <div className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'EN-US' ? 'Search task' : 'Buscar tarefa'} /></div>
            </div>
          </section>

          {routineView === 'today' ? (
            <div className="task-grid">
              {filteredTasks.length ? filteredTasks.map((task) => renderRoutineTaskCard(task, routineReferenceDate)) : (
                <div className="empty-state-card">
                  <div className="row-title">{locale === 'EN-US' ? 'No routines scheduled for today.' : 'Nenhuma rotina programada para hoje.'}</div>
                  <div className="row-sub">{locale === 'EN-US' ? 'Create a task and mark the weekdays when it should appear in the panel.' : 'Crie uma tarefa e marque os dias da semana em que ela deve aparecer no painel.'}</div>
                </div>
              )}
            </div>
          ) : (
            visibleRoutineWeekGroups.length ? (
              <div className="stack large-gap">
                {visibleRoutineWeekGroups.map((group) => (
                  <section key={group.date} className="glass section-card">
                    <SectionHeader
                      title={formatRoutineDayHeading(group.date, locale)}
                      subtitle={locale === 'EN-US' ? `${group.tasks.length} task${group.tasks.length > 1 ? 's' : ''} scheduled.` : `${group.tasks.length} tarefa${group.tasks.length > 1 ? 's' : ''} programada${group.tasks.length > 1 ? 's' : ''}.`}
                    />
                    <div className="task-grid">
                      {group.tasks.map((task) => renderRoutineTaskCard(task, group.date))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">
                <div className="row-title">{locale === 'EN-US' ? 'No tasks found from today until the end of the week.' : 'Nenhuma tarefa encontrada de hoje até o fim da semana.'}</div>
                <div className="row-sub">{locale === 'EN-US' ? 'Use the recurring weekdays to make tasks appear on the correct days.' : 'Use os dias recorrentes para fazer as tarefas aparecerem nos dias certos.'}</div>
              </div>
            )
          )}
        </div>
      );
    }

    if (page === 'habits') {
      return (
        <div className="stack large-gap">
          <div className="habit-grid-page">
            {state.habits.map((habit) => {
              const today = habit.logs[todayISO()] || 0;
              const pct = Math.min(100, Math.round((today / habit.target) * 100));
              const streakCount = calcHabitStreak(habit);
              const habitColor = state.appearance.primary;
              return (
                <section key={habit.id} className="glass section-card" style={{ '--habit-color': habit.color, '--habit-color-soft': alphaColor(habit.color, '18'), '--habit-color-border': alphaColor(habit.color, '3D'), '--habit-color-done': alphaColor(habit.color, '70'), '--habit-color-partial': alphaColor(habit.color, '16'), '--habit-color-done-border': alphaColor(habit.color, 'C8'), '--habit-color-partial-border': alphaColor(habit.color, '33') }}>
                  <div className="habit-head-row">
                    <div className="habit-head-left">
                      <div className="habit-icon" style={{ background: `${habit.color}22`, color: habit.color }}>{habitIcons[habit.icon] || <Target size={16} />}</div>
                      <div><div className="section-title">{habit.title}</div><div className="section-subtitle">{categoryLabel(habit.category, locale)} • {copy.goalPerDay(habit.target)}</div></div>
                    </div>
                    <div className="habit-head-actions">
                      <span className="pill habit-streak-pill" style={{ background: alphaColor(habit.color, '18'), color: habit.color, borderColor: alphaColor(habit.color, '3D') }}>{copy.streak} {streakCount}</span>
                      <button className="ghost-btn compact" onClick={() => { setEditingHabit(habit); setShowHabitModal(true); }}><Pencil size={14} /> {copy.edit}</button>
                      <button className="danger-btn compact" onClick={() => removeHabit(habit.id)}><Trash2 size={14} /> {copy.delete}</button>
                    </div>
                  </div>
                  <div className="habit-page-body">
                    <div className="habit-side-card">
                      <div className="eyebrow">{copy.today}</div>
                      <div className="big-number">{today}/{habit.target}</div>
                      <div className="progress-track slim"><div className="progress-fill habit-progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(135deg, ${habit.color}, ${alphaColor(habit.color, 'CC')})` }} /></div>
                      <div className="habit-stepper spread">
                        <button className="icon-btn" onClick={() => incrementHabit(habit.id, -1)}><ChevronDown size={16} /></button>
                        <button className="icon-btn" onClick={() => incrementHabit(habit.id, 1)}><ChevronUp size={16} /></button>
                      </div>
                    </div>
                    <div className="habit-calendar">
                      {getDateRange(14).map((d) => {
                        const value = habit.logs[d] || 0;
                        const done = value >= habit.target;
                        return <div key={d} className={cls('habit-day', done ? 'done' : value > 0 ? 'partial' : '')} style={done ? { background: alphaColor(habit.color, '70'), borderColor: alphaColor(habit.color, 'C8') } : value > 0 ? { background: alphaColor(habit.color, '16'), borderColor: alphaColor(habit.color, '33') } : undefined} title={`${d}: ${value}/${habit.target}`} />;
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      );
    }

    if (page === 'history') {
      const selected = fullHistory.find((h) => h.date === historyDate) || fullHistory[fullHistory.length - 1];
      return (
        <div className="split-history">
          <section className="glass section-card">
            <SectionHeader title={copy.fullHistory} subtitle={copy.historySub} />
            <div className="history-grid">
              {fullHistory.map((day) => (
                <button key={day.date} className={cls('history-day-card', day.date === historyDate && 'active')} onClick={() => setHistoryDate(day.date)}>
                  <div>{formatShort(day.date, locale)}</div>
                  <strong>{day.discipline}%</strong>
                  <div className={cls('history-dot', day.discipline >= 80 ? 'good' : day.discipline >= 40 ? 'mid' : 'bad')} />
                </button>
              ))}
            </div>
            <div className="stack">
              {[...fullHistory].reverse().map((day) => (
                <button key={day.date} className="timeline-card" onClick={() => setHistoryDate(day.date)}>
                  <div>
                    <div className="row-title">{new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(day.date + 'T00:00:00'))}</div>
                    <div className="row-sub">{copy.tasksCompleted(day.tasksDone, day.tasksTotal)}</div>
                  </div>
                  <span className="pill">{day.discipline}%</span>
                </button>
              ))}
            </div>
          </section>
          <section className="glass section-card">
            <SectionHeader title={locale === 'EN-US' ? 'Day details' : 'Detalhes do dia'} subtitle={locale === 'EN-US' ? 'Saved summary for the selected day.' : 'Resumo salvo do dia selecionado.'} />
            <div className="detail-stat"><div className="eyebrow">{copy.discipline}</div><div className="big-number">{selected?.discipline || 0}%</div></div>
            <div className="stack small-gap">
              <div className="row-title">{locale === 'EN-US' ? 'Tasks' : 'Tarefas'}</div>
              {sortTasksByTime(getTasksForDate(state, selected?.date || todayISO())).map((task) => (
                <div key={task.id} className="simple-card">
                  <div className="row-title">{task.title}</div>
                  <div className="row-sub">{categoryLabel(task.category, locale)} • {statusLabel(task.status, locale)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

if (page === 'stats') {
  return (
    <div className="stack large-gap">
      <div className="stats-grid-top">
        <Metric icon={<BarChart3 size={16} />} label={locale === 'EN-US' ? 'Week average' : 'Média semanal'} value={`${weekAverage}%`} />
        <Metric icon={<CalendarDays size={16} />} label={locale === 'EN-US' ? 'Weekly execution' : 'Execução semanal'} value={`${weekCompletionRate}%`} />
        <Metric icon={<Trophy size={16} />} label={locale === 'EN-US' ? 'Overall average' : 'Média geral'} value={`${generalAverage}%`} />
        <Metric icon={<Flame size={16} />} label={locale === 'EN-US' ? 'Record / streak' : 'Recorde / sequência'} value={`${record}% • ${streak}d`} />
      </div>

      <div className="split-2">
        <section className="glass section-card">
          <SectionHeader title={locale === 'EN-US' ? 'Daily discipline (7 days)' : 'Disciplina diária (7 dias)'} subtitle={locale === 'EN-US' ? 'Real rises and drops in your week.' : 'Subidas e quedas reais da sua semana.'} />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekSeries}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="disciplina" name="Disciplina" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            {bestWeekDay ? <span className="pill success">{locale === 'EN-US' ? 'Best day' : 'Melhor dia'}: {formatShort(bestWeekDay.raw, locale)} • {bestWeekDay.disciplina}%</span> : null}
            {worstWeekDay ? <span className="pill danger">{locale === 'EN-US' ? 'Weakest' : 'Mais fraco'}: {formatShort(worstWeekDay.raw, locale)} • {worstWeekDay.disciplina}%</span> : null}
          </div>
        </section>

        <section className="glass section-card">
          <SectionHeader title={locale === 'EN-US' ? 'Task flow (7 days)' : 'Fluxo de tarefas (7 dias)'} subtitle={locale === 'EN-US' ? 'How many came in and how many turned into delivery.' : 'Quantas entraram e quantas viraram entrega.'} />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTaskFlow}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="abertas" name={locale === 'EN-US' ? 'Opened' : 'No dia'} fill={mutedBarColor} radius={[12, 12, 0, 0]} />
                <Bar dataKey="concluidas" name={locale === 'EN-US' ? 'Completed' : 'Concluídas'} fill="var(--primary)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span className="pill info">{locale === 'EN-US' ? 'Execution' : 'Execução'}: {weekCompletionRate}%</span>
            <span className="pill">{weekDoneTasks}/{weekTotalTasks || 0} {locale === 'EN-US' ? 'completed' : 'concluídas'}</span>
          </div>
        </section>
      </div>

      <div className="split-2">
        <section className="glass section-card">
          <SectionHeader title={locale === 'EN-US' ? 'Delivery by priority (7 days)' : 'Entrega por prioridade (7 dias)'} subtitle={locale === 'EN-US' ? 'Shows where you are turning effort into results.' : 'Mostra onde você está convertendo esforço em resultado.'} />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityCompletionData}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="name" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="taxa" name={locale === 'EN-US' ? 'Delivery rate %' : 'Taxa de entrega %'} fill="var(--accent)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            {priorityCompletionData.length ? priorityCompletionData.map((item) => (
              <span key={item.name} className="pill">{item.name}: {item.entregues}/{item.total}</span>
            )) : <span className="pill">{locale === 'EN-US' ? 'Not enough data this week' : 'Sem dados suficientes nesta semana'}</span>}
          </div>
        </section>

        <section className="glass section-card">
          <SectionHeader title={locale === 'EN-US' ? 'Habit consistency (14 days)' : 'Consistência dos hábitos (14 dias)'} subtitle={locale === 'EN-US' ? 'Which habits truly sustain your result.' : 'Quais hábitos realmente sustentam seu resultado.'} />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitConsistencyData}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="name" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="consistencia" name={locale === 'EN-US' ? 'Consistency %' : 'Consistência %'} fill="var(--primary)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span className="pill success">{locale === 'EN-US' ? 'Completed habits today' : 'Hábitos completos hoje'}: {todayCompletedHabits}/{state.habits.length}</span>
            {habitConsistencyData[0] ? <span className="pill info">{locale === 'EN-US' ? 'Most consistent' : 'Mais consistente'}: {habitConsistencyData[0].name}</span> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

    if (page === 'pomodoro') {
      return (
        <div className="stack large-gap">
          <PomodoroMainCard
            locale={locale}
            timer={pomodoro} running={pomodoroRunning} mode={pomodoroMode} cycles={pomodoroCycles}
            nextBreakLabel={pomodoroNextBreakLabel()} infoOpen={pomodoroInfoOpen} setInfoOpen={setPomodoroInfoOpen}
            selectedSoundKey={state.settings.pomodoroSelectedSoundKey || 'white'}
            savedSounds={state.settings.pomodoroSavedSounds || []}
            linkNameDraft={pomodoroLinkNameDraft} setLinkNameDraft={setPomodoroLinkNameDraft}
            urlDraft={pomodoroUrlDraft} setUrlDraft={setPomodoroUrlDraft}
            onSoundKeyChange={selectPomodoroSound} onAddSavedUrl={addPomodoroUrl} onRemoveSavedUrl={removePomodoroSound}
            config={{ focus: state.settings.pomodoroFocusMin, shortBreak: state.settings.pomodoroShortBreakMin, longBreak: state.settings.pomodoroLongBreakMin, cyclesBeforeLongBreak: state.settings.pomodoroCyclesBeforeLongBreak }}
            onConfigChange={(key, value) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }))}
            onToggleRun={() => setPomodoroRunning((v) => !v)}
            onSetFocus={() => applyPomodoroLength('focus')}
            onSetShortBreak={() => applyPomodoroLength('short')}
            onSetLongBreak={() => applyPomodoroLength('long')}
            onReset={() => { applyPomodoroLength(pomodoroMode === 'focus' ? 'focus' : 'short'); setPomodoroRunning(false); }}
          />
        </div>
      );
    }

    // Settings
    return (
      <div className="split-2 settings-layout">
        <section className="glass section-card">
          <SectionHeader title={copy.profileAndGoals} subtitle={copy.profileAndGoalsSub} />
          <div className="form-grid">
            <Field label={copy.yourName}><input value={state.settings.userName} onChange={(e) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, userName: e.target.value } }))} /></Field>
            <Field label={copy.interfaceLanguage}><select value={state.settings.locale || 'PT-BR'} onChange={(e) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, locale: e.target.value } }))}><option value="PT-BR">PT-BR</option><option value="EN-US">EN-US</option></select></Field>
            <NumberField label={copy.dailyGoalPercent} value={state.settings.dailyGoal} onCommit={(value) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, dailyGoal: value } }))} />
            <NumberField label={copy.weeklyGoalPercent} value={state.settings.weeklyGoal} onCommit={(value) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, weeklyGoal: value } }))} />
          </div>
          <SectionHeader title={copy.themeBackground} subtitle={copy.themeBackgroundSub} />
          <div className="stack small-gap">
            <div className="theme-toggle-row">
              <button className={cls('theme-chip', state.appearance.themeMode === 'dark' && 'active')} onClick={() => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, themeMode: 'dark' } }))}>{copy.dark}</button>
              <button className={cls('theme-chip', state.appearance.themeMode === 'light' && 'active')} onClick={() => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, themeMode: 'light' } }))}>{copy.light}</button>
            </div>
            <div className="upload-row">
              <button className="ghost-btn" onClick={() => bgUploadRef.current?.click()}><Upload size={16} /> {copy.uploadImage}</button>
              <input ref={bgUploadRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && applyBackgroundFile(e.target.files[0])} />
              <button className="ghost-btn" onClick={clearBackgroundImage}>{copy.removeImage}</button>
            </div>
            <div className="quick-add">
              <input value={state.appearance.backgroundUrl || ''} onChange={(e) => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundUrl: e.target.value } }))} placeholder={copy.imageUrlPlaceholder} />
              <button className="primary-btn" onClick={applyBackgroundUrl}>{copy.applyUrl}</button>
            </div>
            <div className="form-grid compact-grid">
              <Field label={copy.size}>
                <select value={state.appearance.backgroundSize || 'cover'} onChange={(e) => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundSize: e.target.value } }))}>
                  <option value="cover">{copy.cover}</option><option value="contain">{copy.contain}</option><option value="auto">{copy.auto}</option>
                </select>
              </Field>
              <Field label={copy.position}>
                <select value={state.appearance.backgroundPosition || 'center'} onChange={(e) => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, backgroundPosition: e.target.value } }))}>
                  <option value="center">{copy.center}</option><option value="top">{copy.top}</option><option value="bottom">{copy.bottom}</option><option value="left">{copy.left}</option><option value="right">{copy.right}</option>
                </select>
              </Field>
            </div>
          </div>
        </section>
        <section className="glass section-card">
          <SectionHeader title={copy.backupData} subtitle={copy.backupDataSub} />
          <div className="stack">
            <button className="ghost-btn" onClick={exportData}><Download size={16} /> {copy.exportJson}</button>
            <button className="ghost-btn" onClick={() => fileRef.current?.click()}><Upload size={16} /> {copy.importJson}</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <button className="danger-btn" onClick={() => setShowResetModal(true)}><Trash2 size={16} /> {copy.resetAllData}</button>
          </div>
          <SectionHeader title={copy.weeklyGoals} subtitle={copy.onePerLine} />
          <textarea
            className="weekly-goals-textarea"
            value={weeklyGoalsDraft}
            onChange={(e) => setWeeklyGoalsDraft(e.target.value)}
            onBlur={() => updateState((prev) => ({ ...prev, settings: { ...prev.settings, weeklyGoals: weeklyGoalsDraft.split('\n').map((line) => line.trim()).filter(Boolean) } }))}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.currentTarget;
                const nextValue = insertNewLineValue(target.value, target.selectionStart, target.selectionEnd);
                setWeeklyGoalsDraft(nextValue);
                requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = (target.selectionStart || 0) + 1; });
              }
            }}
          />
        </section>
      </div>
    );
  })();

  return (
    <div
      className={cls('discipline-app', isLight && 'light')}
      style={{
        '--primary': state.appearance.primary,
        '--accent': state.appearance.accent,
        '--radius': `${state.appearance.radius}px`,
        '--bg-image': backgroundValue,
        '--bg-size': state.appearance.backgroundSize || 'cover',
        '--bg-position': state.appearance.backgroundPosition || 'center',
        '--overlay': state.appearance.overlay,
        '--glass-blur': `${state.appearance.blur}px`,
      }}
    >
      <div className="bg-base" />
      <div className="bg-overlay" />
      <div className="app-frame">
        <aside className="sidebar glass">
          <div className="brand-box">
            <div className="brand-mark brand-mark-image">
              <img src={`${import.meta.env.BASE_URL}logo-sidebar.png`} alt="Disciplina Total" className="brand-logo-img" />
            </div>
            <div>
              <div className="brand-title">Disciplina Total</div>
              <div className="brand-subtitle">{copy.brandSubtitle}</div>
            </div>
          </div>
          <div className="goal-box">
            <div className="eyebrow">{copy.dailyGoal}</div>
            <div className="goal-number">{state.settings.dailyGoal}%</div>
            <div className="goal-sub"><Trophy size={14} /> {copy.personalRecord}: {record}%</div>
          </div>
          <nav className="side-nav">
            {[
              ['dashboard', copy.nav.dashboard, <LayoutDashboard size={16} />],
              ['routine', copy.nav.routine, <ListTodo size={16} />],
              ['habits', copy.nav.habits, <Target size={16} />],
              ['history', copy.nav.history, <CalendarDays size={16} />],
              ['stats', copy.nav.stats, <BarChart3 size={16} />],
              ['pomodoro', copy.nav.pomodoro, <Focus size={16} />],
              ['settings', copy.nav.settings, <Settings size={16} />],
            ].map(([key, label, icon]) => (
              <button key={key} className={cls('nav-btn', page === key && 'active')} onClick={() => setPage(key)}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </nav>
{hasWeeklyGoals ? (
  <div className="sidebar-bottom-stack">
    <div className="week-focus glass-inner">
      <div className="section-title with-icon"><Sparkles size={16} /> {copy.weeklyFocus}</div>
      <p>{weeklyGoals.join(' · ')}</p>
    </div>
  </div>
) : null}
        </aside>

        <main className="main-zone">
          <header className="topbar glass">
            <div>
              <div className="topbar-date">{formatFullDate(new Date(), locale)}</div>
              <h1>{titleByPage(page, locale)}</h1>
            </div>
            <div className="topbar-actions">
              {page === 'routine' ? (
                <button className="ghost-btn" onClick={openNewTask}><Plus size={16} /> {copy.newTask}</button>
              ) : page === 'habits' ? (
                <button className="ghost-btn" onClick={openNewHabit}><Plus size={16} /> {copy.newHabit}</button>
              ) : null}
              <button className="ghost-btn" onClick={() => setPage('settings')}><Settings size={16} /></button>
            </div>
          </header>
          <div className="page-content">{pageBody}</div>
          <nav className="mobile-nav glass">
            {[
              ['dashboard', <LayoutDashboard size={16} />, copy.mobileNav.dashboard],
              ['routine', <ListTodo size={16} />, copy.mobileNav.routine],
              ['habits', <Target size={16} />, copy.mobileNav.habits],
              ['stats', <BarChart3 size={16} />, copy.mobileNav.stats],
              ['pomodoro', <Focus size={16} />, copy.mobileNav.pomodoro],
              ['settings', <Settings size={16} />, copy.mobileNav.settings],
            ].map(([key, icon, label]) => (
              <button key={key} className={cls('mobile-btn', page === key && 'active')} onClick={() => setPage(key)}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>

      <TaskModal open={showTaskModal} locale={locale} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} task={editingTask} onSave={saveTask} categories={state.settings.categories} />
      <HabitModal open={showHabitModal} locale={locale} onClose={() => { setShowHabitModal(false); setEditingHabit(null); }} habit={editingHabit} onSave={saveHabit} categories={state.settings.categories} />
      <ResetConfirmModal
        open={showResetModal}
        locale={locale}
        title={copy.resetAllTitle}
        description={copy.resetAllDescription}
        confirmLabel={copy.confirmReset}
        cancelLabel={copy.cancel}
        onClose={() => setShowResetModal(false)}
        onConfirm={resetAll}
      />
      <ToastLayer items={toast.items} />
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────
function titleByPage(page, locale = 'PT-BR') {
  return getCopy(locale).nav[page];
}
function priorityValue(priority) { return { baixa: 1, média: 2, alta: 3, crítica: 4 }[priority] || 0; }
function priorityColor(priority) { return { baixa: '#64748b', média: '#60a5fa', alta: '#f59e0b', crítica: '#ef4444' }[priority] || '#60a5fa'; }
function groupBy(arr, keyFn) { return arr.reduce((acc, item) => { const key = keyFn(item); acc[key] = acc[key] || []; acc[key].push(item); return acc; }, {}); }
function calcHabitStreak(habit) {
  const dates = getDateRange(60);
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) { if ((habit.logs[dates[i]] || 0) >= habit.target) streak++; else break; }
  return streak;
}
function fmtTimer(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}
function shortUrlLabel(url) {
  try { const parsed = new URL(url); return `${parsed.hostname.replace('www.', '')} · ${parsed.pathname.slice(0, 18) || '/'}`; }
  catch { return url.slice(0, 40); }
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action = null }) {
  return (
    <div className="section-head-row">
      <div><div className="section-title">{title}</div>{subtitle && <div className="section-subtitle">{subtitle}</div>}</div>
      {action}
    </div>
  );
}
function Metric({ icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
function MiniStat({ label, value }) {
  return <div className="mini-stat"><div className="metric-label">{label}</div><div className="metric-value small">{value}</div></div>;
}
function TaskMiniRow({ task, onSetTaskStatus, locale = 'PT-BR' }) {
  return (
    <div className="task-mini-row">
      <button className="task-check" onClick={() => onSetTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done')}>
        {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <div className="task-mini-copy">
        <div className={cls('row-title', task.status === 'done' && 'done')}>{task.title}</div>
        <div className="row-sub">{categoryLabel(task.category, locale)}{task.time ? ` • ${task.time}` : ''}</div>
      </div>
      <span className={cls('priority-pill', task.priority)}>{priorityLabel(task.priority, locale)}</span>
    </div>
  );
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="row-sub">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: entry.color || 'var(--primary)' }} />
          {entry.name || entry.dataKey}: {entry.value}
        </div>
      ))}
    </div>
  );
}
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function NumberField({ label, value, onCommit, min = 0, placeholder = '' }) {
  const [localValue, setLocalValue] = useState(String(value ?? ''));
  useEffect(() => { setLocalValue(String(value ?? '')); }, [value]);
  function finalize() {
    const cleaned = String(localValue).replace(/\D/g, '');
    if (cleaned === '') { const fallback = Math.max(min, Number(value || min || 0)); setLocalValue(String(fallback)); onCommit(fallback); return; }
    const n = Math.max(min, Number(cleaned)); setLocalValue(String(n)); onCommit(n);
  }
  return (
    <Field label={label}>
      <input type="text" inputMode="numeric" value={localValue} placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value.replace(/\D/g, ''))}
        onBlur={finalize} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); finalize(); } }} />
    </Field>
  );
}
function TaskModal({ open, onClose, task, onSave, categories, locale = 'PT-BR' }) {
  const copy = getCopy(locale);
  const weekdayLabels = WEEKDAY_SHORT[locale] || WEEKDAY_SHORT['PT-BR'];
  const [draft, setDraft] = useState(null);
  useEffect(() => setDraft(task ? {
    ...task,
    date: task.date || todayISO(),
    weekdays: Array.isArray(task.weekdays) && task.weekdays.length ? task.weekdays : [weekdayFromISO(todayISO())],
    statusByDate: task.statusByDate || {},
    subtaskStatusByDate: task.subtaskStatusByDate || {},
    subtasks: task.subtasks?.length ? task.subtasks : [{ id: uid(), title: '', done: false }]
  } : null), [task]);
  if (!open || !draft) return null;
  function updateSubtask(index, value) { setDraft((prev) => ({ ...prev, subtasks: prev.subtasks.map((s, i) => (i === index ? { ...s, title: value } : s)) })); }
  function addSubtask(afterIndex = null) {
    setDraft((prev) => {
      const nextItem = { id: uid(), title: '', done: false };
      const subtasks = [...(prev.subtasks || [])];
      if (afterIndex === null || afterIndex >= subtasks.length - 1) subtasks.push(nextItem);
      else subtasks.splice(afterIndex + 1, 0, nextItem);
      return { ...prev, subtasks };
    });
  }
  function removeSubtask(index) {
    setDraft((prev) => { const subtasks = (prev.subtasks || []).filter((_, i) => i !== index); return { ...prev, subtasks: subtasks.length ? subtasks : [{ id: uid(), title: '', done: false }] }; });
  }
  return (
    <div className="modal-backdrop">
      <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
        <div className="section-head-row">
          <div><div className="section-title">{task?.title ? `${copy.edit} ${copy.taskTitle.toLowerCase()}` : copy.newTask}</div><div className="section-subtitle">{copy.fillMainFields}</div></div>
          <button className="ghost-btn" onClick={onClose}>{copy.close}</button>
        </div>
        <div className="form-grid">
          <Field label={copy.taskTitle}><input value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label={copy.category}>
            <select value={draft.category || 'pessoal'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{categoryLabel(c, locale)}</option>)}
            </select>
          </Field>
          <Field label={copy.priority}>
            <select value={draft.priority || 'média'} onChange={(e) => setDraft({ ...draft, priority: e.target.value, color: priorityColor(e.target.value) })}>
              <option value="baixa">{copy.low}</option><option value="média">{copy.medium}</option><option value="alta">{copy.high}</option><option value="crítica">{copy.critical}</option>
            </select>
          </Field>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <span>{locale === 'EN-US' ? 'Days of the week' : 'Dias da semana'}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {weekdayLabels.map((label, index) => {
                const active = (draft.weekdays || []).includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    className="ghost-btn compact"
                    onClick={() => {
                      const current = Array.isArray(draft.weekdays) ? draft.weekdays : [];
                      const weekdays = current.includes(index)
                        ? current.filter((day) => day !== index)
                        : [...current, index].sort((a, b) => a - b);
                      setDraft({ ...draft, weekdays });
                    }}
                    style={active ? { background: 'var(--primary)', color: '#000', borderColor: 'transparent', fontWeight: 800 } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <small style={{ color: 'var(--muted)' }}>
              {locale === 'EN-US'
                ? 'Mark the weekdays when this task should appear in the daily panel.'
                : 'Marque os dias da semana em que essa tarefa deve aparecer no painel diário.'}
            </small>
          </div>
          <Field label={copy.time}><input value={draft.time || ''} onChange={(e) => setDraft({ ...draft, time: e.target.value })} placeholder="08:00" /></Field>
          <div className="field helper-card"><span>{copy.discipline}</span><small>{copy.disciplineHelp}</small></div>
          <Field label={copy.description}><textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div className="field subtasks-editor">
            <span>{copy.subtasks}</span>
            <div className="subtask-editor-list">
              {(draft.subtasks || []).map((subtask, idx) => (
                <div key={subtask.id} className="subtask-editor-row">
                  <input value={subtask.title || ''} onChange={(e) => updateSubtask(idx, e.target.value)} placeholder={locale === 'EN-US' ? `Subtask ${idx + 1}` : `Subtarefa ${idx + 1}`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(idx); } }} />
                  <button type="button" className="ghost-btn compact round" onClick={() => addSubtask(idx)}>+</button>
                  <button type="button" className="danger-btn compact round" onClick={() => removeSubtask(idx)}>−</button>
                </div>
              ))}
            </div>
            <button type="button" className="ghost-btn" onClick={() => addSubtask()}><Plus size={14} /> {locale === 'EN-US' ? 'Add subtask' : 'Adicionar subtarefa'}</button>
          </div>
        </div>
        <div className="task-actions-row end">
          <button className="ghost-btn" onClick={onClose}>{locale === 'EN-US' ? 'Cancel' : 'Cancelar'}</button>
          <button className="primary-btn" onClick={() => draft.title?.trim() && onSave({ ...draft, title: draft.title.trim() })}>{copy.save}</button>
        </div>
      </div>
    </div>
  );
}
function PomodoroMainCard({ locale = 'PT-BR', timer, running, mode, cycles, nextBreakLabel, infoOpen, setInfoOpen, selectedSoundKey, savedSounds, linkNameDraft, setLinkNameDraft, urlDraft, setUrlDraft, onSoundKeyChange, onAddSavedUrl, onRemoveSavedUrl, config, onConfigChange, onToggleRun, onSetFocus, onSetShortBreak, onSetLongBreak, onReset }) {
  const [manageOpen, setManageOpen] = useState(false);
  function openSound() {
    const url = selectedSoundKey === 'white' ? 'https://youtu.be/2y6zdAbN9o8?si=lrtElUW1kb3OaBAo'
      : selectedSoundKey === 'lofi' ? 'https://www.youtube.com/live/SnX4knSvyko?si=vBQjuxrpCjKzLglU'
      : selectedSoundKey.startsWith('saved:') ? savedSounds.find((item) => `saved:${item.id}` === selectedSoundKey)?.url || '' : '';
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return (
    <section className="glass section-card pomodoro-main-card">
      <SectionHeader title={locale === 'EN-US' ? 'Focus mode / Pomodoro' : 'Modo foco / Pomodoro'} subtitle={locale === 'EN-US' ? 'Focus in short blocks, time your breaks and keep the rhythm.' : 'Foque em blocos curtos, cronometre as pausas e mantenha o ritmo.'} />
      <div className="pomodoro-main-top compact-top">
        <div><div className="pomodoro-time">{fmtTimer(timer)}</div><div className="pomodoro-subline">{locale === 'EN-US' ? `Mode: ${mode === 'focus' ? 'Focus' : 'Break'} • Next: ${nextBreakLabel}` : `Modo: ${mode === 'focus' ? 'Foco' : 'Pausa'} • Próxima: ${nextBreakLabel}`}</div></div>
        <div className="pomodoro-mode-badges">
          <span className={cls('pill', mode === 'focus' ? 'info' : 'warn')}>{mode === 'focus' ? (locale === 'EN-US' ? 'FOCUS' : 'FOCO') : (locale === 'EN-US' ? 'BREAK' : 'PAUSA')}</span>
          <span className="pill">{locale === 'EN-US' ? 'Cycles' : 'Ciclos'}: {cycles}</span>
        </div>
      </div>
      <div className="pomodoro-actions stretch compact-actions">
        <button className="ghost-btn" onClick={onSetFocus}>{locale === 'EN-US' ? 'Focus' : 'Foco'}</button>
        <button className="ghost-btn" onClick={onSetShortBreak}>{locale === 'EN-US' ? 'Short break' : 'Pausa curta'}</button>
        <button className="ghost-btn" onClick={onSetLongBreak}>{locale === 'EN-US' ? 'Long break' : 'Pausa longa'}</button>
        <button className="primary-btn" onClick={onToggleRun}>{running ? (locale === 'EN-US' ? 'Pause' : 'Pausar') : (locale === 'EN-US' ? 'Start' : 'Iniciar')}</button>
        <button className="ghost-btn" onClick={onReset}>{locale === 'EN-US' ? 'Reset' : 'Reiniciar'}</button>
      </div>
      <div className="pomodoro-config-grid main-grid compact-config-grid">
        <NumberField label={locale === 'EN-US' ? 'Focus (min)' : 'Foco (min)'} min={1} value={config.focus} onCommit={(v) => onConfigChange('pomodoroFocusMin', v)} />
        <NumberField label={locale === 'EN-US' ? 'Short break' : 'Pausa curta'} min={1} value={config.shortBreak} onCommit={(v) => onConfigChange('pomodoroShortBreakMin', v)} />
        <NumberField label={locale === 'EN-US' ? 'Long break' : 'Pausa longa'} min={1} value={config.longBreak} onCommit={(v) => onConfigChange('pomodoroLongBreakMin', v)} />
        <NumberField label={locale === 'EN-US' ? 'Cycles for long break' : 'Ciclos p/ pausa longa'} min={1} value={config.cyclesBeforeLongBreak} onCommit={(v) => onConfigChange('pomodoroCyclesBeforeLongBreak', v)} />
      </div>
      <div className="pomodoro-sound-box compact-sound-box">
        <div className="section-title small">{locale === 'EN-US' ? 'Support sound' : 'Som de apoio'}</div>
        <div className="section-subtitle no-top">{locale === 'EN-US' ? 'Choose a sound to follow your cycle.' : 'Escolha um som para acompanhar seu ciclo.'}</div>
        <div className="pomodoro-sound-row">
          <select value={selectedSoundKey} onChange={(e) => onSoundKeyChange(e.target.value)}>
            <option value="none">{locale === 'EN-US' ? 'No sound' : 'Sem som'}</option><option value="white">{locale === 'EN-US' ? 'White noise' : 'Ruído branco'}</option><option value="lofi">Lo-fi</option>
            {savedSounds.map((item) => <option key={item.id} value={`saved:${item.id}`}>{item.name}</option>)}
          </select>
          <button className="ghost-btn" onClick={openSound}>{locale === 'EN-US' ? 'Open sound' : 'Abrir som'}</button>
        </div>
        <div className="pomodoro-save-grid">
          <input value={linkNameDraft} onChange={(e) => setLinkNameDraft(e.target.value)} placeholder={locale === 'EN-US' ? 'Link name' : 'Nome do link'} />
          <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder={locale === 'EN-US' ? 'Paste the sound URL' : 'Cole a URL do som'} />
          <button className="primary-btn" onClick={onAddSavedUrl}>{locale === 'EN-US' ? 'Save link' : 'Salvar link'}</button>
        </div>
        {!!savedSounds.length && (
          <>
            <button className="pomodoro-info-toggle" onClick={() => setManageOpen((v) => !v)}>
              <span>{manageOpen ? (locale === 'EN-US' ? 'Hide links' : 'Ocultar links') : (locale === 'EN-US' ? 'Manage links' : 'Gerenciar links')}</span><span>{manageOpen ? '▴' : '▾'}</span>
            </button>
            {manageOpen && (
              <div className="saved-url-list compact-list">
                {savedSounds.map((item) => (
                  <div key={item.id} className={cls('saved-url-card compact-card', selectedSoundKey === `saved:${item.id}` && 'active')}>
                    <div className="saved-url-main compact-text"><span>{item.name}</span><small>{item.url}</small></div>
                    <div className="saved-url-actions">
                      <button className="ghost-btn compact" onClick={() => onSoundKeyChange(`saved:${item.id}`)}>{locale === 'EN-US' ? 'Use' : 'Usar'}</button>
                      <button className="danger-btn compact round" onClick={() => onRemoveSavedUrl(item.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button className="pomodoro-info-toggle" onClick={() => setInfoOpen((v) => !v)}>
        <span>{infoOpen ? (locale === 'EN-US' ? 'Hide information' : 'Ocultar informações') : (locale === 'EN-US' ? 'See more information' : 'Ver mais informações')}</span><span>{infoOpen ? '▴' : '▾'}</span>
      </button>
      {infoOpen && (
        <div className="pomodoro-info-box">
          <p>{locale === 'EN-US' ? 'Pomodoro alternates short blocks of concentration with planned breaks to sustain focus and avoid mental fatigue.' : 'O Pomodoro alterna blocos curtos de concentração com pausas planejadas para sustentar o foco e evitar fadiga mental.'}</p>
          <div className="pomodoro-links">
            <a href="https://www.pomodorotechnique.com/" target="_blank" rel="noreferrer">{locale === 'EN-US' ? 'Official site' : 'Site oficial'}</a>
            <a href="https://www.todoist.com/productivity-methods/pomodoro-technique" target="_blank" rel="noreferrer">{locale === 'EN-US' ? 'Why it works' : 'Por que funciona'}</a>
          </div>
        </div>
      )}
    </section>
  );
}
function HabitModal({ open, onClose, habit, onSave, categories, locale = 'PT-BR' }) {
  const copy = getCopy(locale);
  const [draft, setDraft] = useState(null);
  useEffect(() => setDraft(habit), [habit]);
  if (!open || !draft) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
        <div className="section-head-row">
          <div><div className="section-title">{habit?.title ? `${copy.edit} ${locale === 'EN-US' ? 'habit' : 'hábito'}` : copy.newHabit}</div><div className="section-subtitle">{locale === 'EN-US' ? 'Set goal, category and icon.' : 'Defina meta, categoria e ícone.'}</div></div>
          <button className="ghost-btn" onClick={onClose}>{copy.close}</button>
        </div>
        <div className="form-grid">
          <Field label={copy.taskTitle}><input value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label={copy.category}>
            <select value={draft.category || 'saúde'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{categoryLabel(c, locale)}</option>)}
            </select>
          </Field>
          <Field label={locale === 'EN-US' ? 'Icon' : 'Ícone'}>
            <select value={draft.icon || 'agua'} onChange={(e) => setDraft({ ...draft, icon: e.target.value })}>
              <option value="agua">{locale === 'EN-US' ? 'Water' : 'Água'}</option><option value="sono">{locale === 'EN-US' ? 'Sleep' : 'Sono'}</option><option value="treino">{locale === 'EN-US' ? 'Workout' : 'Treino'}</option>
              <option value="leitura">{locale === 'EN-US' ? 'Reading' : 'Leitura'}</option><option value="trabalho">{locale === 'EN-US' ? 'Work' : 'Trabalho'}</option>
              <option value="espiritualidade">{locale === 'EN-US' ? 'Spirituality' : 'Espiritualidade'}</option><option value="saude">{locale === 'EN-US' ? 'Health' : 'Saúde'}</option><option value="foco">{locale === 'EN-US' ? 'Focus' : 'Foco'}</option>
            </select>
          </Field>
          <NumberField label={copy.goalPerDay('').trim()} min={1} value={draft.target || 1} onCommit={(value) => setDraft({ ...draft, target: value })} />
        </div>
        <div className="task-actions-row end">
          <button className="ghost-btn" onClick={onClose}>{locale === 'EN-US' ? 'Cancel' : 'Cancelar'}</button>
          <button className="primary-btn" onClick={() => draft.title?.trim() && onSave({ ...draft, title: draft.title.trim(), logs: draft.logs || { [todayISO()]: 0 } })}>{copy.save}</button>
        </div>
      </div>
    </div>
  );
}
function ResetConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, locale = 'PT-BR' }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-icon danger">
          <Trash2 size={22} />
        </div>

        <div className="confirm-modal-content">
          <div className="section-title">{title}</div>
          <div className="section-subtitle confirm-modal-text">{description}</div>
        </div>

        <div className="task-actions-row end confirm-modal-actions">
          <button className="ghost-btn" onClick={onClose}>{cancelLabel || (locale === 'EN-US' ? 'Cancel' : 'Cancelar')}</button>
          <button className="danger-btn" onClick={onConfirm}>
            <Trash2 size={16} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastLayer({ items }) {
  return (
    <div className="toast-layer">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.96 }} className="toast-card">
            <div className="row-title">{item.title}</div>
            {item.description ? <div className="row-sub">{item.description}</div> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}