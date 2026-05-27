import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ListTodo, Target, CalendarDays, BarChart3, Settings,
  Plus, CheckCircle2, Circle, Search, Flame, Sparkles, Trophy, Brain,
  Download, Upload, Trash2, Pencil, ChevronUp, ChevronDown,
  TrendingUp, TrendingDown, Clock3, Focus, Dumbbell, MoreHorizontal,
  BookOpen, Briefcase, HeartPulse, BedDouble, Droplets, GripVertical,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar, LineChart, Line,
} from 'recharts';
import {
  isCloudSyncConfigured,
  pushStateToCloud,
  pullStateFromCloud,
} from './cloudSyncSupabase';

const STORAGE_KEY = 'disciplina-total-premium-v16';
const INDEXED_DB_NAME = 'disciplina-total-premium-db';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'app_state';
const SNAKE_IMG_SRC = `${import.meta.env.BASE_URL}ouroboros.png`;

const pad2 = (n) => String(n).padStart(2, '0');

const toLocalISODate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const parseISODateLocal = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const todayISO = () => toLocalISODate(new Date());

const uid = () => Math.random().toString(36).slice(2, 9);

const formatFullDate = (date = new Date(), locale = 'PT-BR') =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(typeof date === 'string' ? parseISODateLocal(date) : date);

const formatShort = (date, locale = 'PT-BR') =>
  new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(parseISODateLocal(date));

const offsetDate = (date, amount) => {
  const d = parseISODateLocal(date);
  d.setDate(d.getDate() + amount);
  return toLocalISODate(d);
};
const percentage = (n) => Math.max(0, Math.min(100, Math.round(n)));

const DEFAULT_PROFILE_CROP = { zoom: 1, x: 0, y: 0 };

function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeProfileCrop(crop = {}) {
  return {
    zoom: clampNumber(crop?.zoom, 1, 12, 1),
    x: clampNumber(crop?.x, -120, 120, 0),
    y: clampNumber(crop?.y, -120, 120, 0),
  };
}

function profileCropCss(crop = {}) {
  const normalized = normalizeProfileCrop(crop);
  return {
    '--profile-crop-x': `${normalized.x}%`,
    '--profile-crop-y': `${normalized.y}%`,
    '--profile-crop-zoom': normalized.zoom,
  };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load profile image'));
    img.src = src;
  });
}

async function createProfileCropDataUrl(src, crop = DEFAULT_PROFILE_CROP, outputSize = 720) {
  const normalized = normalizeProfileCrop(crop);
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const coverScale = Math.max(outputSize / img.naturalWidth, outputSize / img.naturalHeight);
  const scale = coverScale * normalized.zoom;
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const drawX = ((outputSize - drawWidth) / 2) + ((normalized.x / 100) * outputSize);
  const drawY = ((outputSize - drawHeight) / 2) + ((normalized.y / 100) * outputSize);

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}

const LEGACY_DISCIPLINE_LABELS = {
  danger: 'PIECE OF SHIT',
  warn: 'STAY FUCKING HARD',
  info: 'STAY HARD',
  success: 'LOCKED IN',
};

const DEFAULT_DISCIPLINE_LABELS_BY_LOCALE = {
  'PT-BR': {
    danger: 'EM CONSTRUÇÃO',
    warn: 'EM PROGRESSO',
    info: 'CONSISTENTE',
    success: 'ALTA PERFORMANCE',
  },
  'EN-US': {
    danger: 'BUILDING UP',
    warn: 'IN PROGRESS',
    info: 'CONSISTENT',
    success: 'HIGH PERFORMANCE',
  },
};

const DEFAULT_DISCIPLINE_LABELS = DEFAULT_DISCIPLINE_LABELS_BY_LOCALE['PT-BR'];

const LEGACY_DASHBOARD_QUOTE = {
  text: 'Quem vive só para o instante foge de si mesmo.',
  author: 'Friedrich Nietzsche',
};

const DEFAULT_DASHBOARD_QUOTES_BY_LOCALE = {
  'PT-BR': {
    text: 'Disciplina é transformar intenção em prática, um dia de cada vez.',
    author: 'Disciplina Total',
  },
  'EN-US': {
    text: 'Discipline turns intention into action, one day at a time.',
    author: 'Disciplina Total',
  },
};

const DEFAULT_DASHBOARD_QUOTE = DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['PT-BR'];

function getDefaultDisciplineLabels(locale = 'PT-BR') {
  return DEFAULT_DISCIPLINE_LABELS_BY_LOCALE[locale] || DEFAULT_DISCIPLINE_LABELS_BY_LOCALE['PT-BR'];
}

function isSameLabelSet(labels = {}, reference = {}) {
  return ['danger', 'warn', 'info', 'success'].every((tone) => String(labels?.[tone] || '') === String(reference?.[tone] || ''));
}

function isDefaultLabelSet(labels = {}) {
  return Object.values(DEFAULT_DISCIPLINE_LABELS_BY_LOCALE).some((reference) => isSameLabelSet(labels, reference));
}

function isLegacyDisciplineLabelSet(labels = {}) {
  return isSameLabelSet(labels, LEGACY_DISCIPLINE_LABELS);
}

function normalizeDisciplineLabels(labels = {}, locale = 'PT-BR') {
  const defaults = getDefaultDisciplineLabels(locale);
  if (!labels || typeof labels !== 'object' || isLegacyDisciplineLabelSet(labels)) return { ...defaults };
  return {
    danger: labels.danger ?? defaults.danger,
    warn: labels.warn ?? defaults.warn,
    info: labels.info ?? defaults.info,
    success: labels.success ?? defaults.success,
  };
}

function getDisciplineLabelsForDisplay(settings = {}, locale = 'PT-BR') {
  if (!settings.disciplineLabelsCustomized) return { ...getDefaultDisciplineLabels(locale) };
  return normalizeDisciplineLabels(settings.disciplineLabels, locale);
}

function getDefaultDashboardQuote(locale = 'PT-BR') {
  return DEFAULT_DASHBOARD_QUOTES_BY_LOCALE[locale] || DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['PT-BR'];
}

function normalizeDashboardQuotes(settings = {}) {
  const source = settings.dashboardQuotes && typeof settings.dashboardQuotes === 'object' ? settings.dashboardQuotes : {};
  const legacyText = settings.dashboardQuoteText;
  const legacyAuthor = settings.dashboardQuoteAuthor;
  const hasLegacyCustomQuote = typeof legacyText === 'string'
    && legacyText !== LEGACY_DASHBOARD_QUOTE.text
    && legacyText !== DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['PT-BR'].text
    && legacyText !== DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['EN-US'].text;

  return {
    'PT-BR': {
      text: source['PT-BR']?.text ?? (hasLegacyCustomQuote ? legacyText : DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['PT-BR'].text),
      author: source['PT-BR']?.author ?? (hasLegacyCustomQuote ? (legacyAuthor || '') : DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['PT-BR'].author),
    },
    'EN-US': {
      text: source['EN-US']?.text ?? (hasLegacyCustomQuote ? legacyText : DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['EN-US'].text),
      author: source['EN-US']?.author ?? (hasLegacyCustomQuote ? (legacyAuthor || '') : DEFAULT_DASHBOARD_QUOTES_BY_LOCALE['EN-US'].author),
    },
  };
}

function getDashboardQuote(settings = {}, locale = 'PT-BR') {
  const quotes = normalizeDashboardQuotes(settings);
  return quotes[locale] || quotes['PT-BR'];
}

function normalizeISODateInput(value, fallback = todayISO()) {
  if (!value) return fallback;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toLocalISODate(value);
  }

  const raw = String(value || '').trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${pad2(Number(brMatch[2]))}-${pad2(Number(brMatch[1]))}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return toLocalISODate(parsed);

  return fallback;
}

function normalizeEventRecord(event) {
  if (!event || typeof event !== 'object') return null;
  return {
    id: event.id || uid(),
    title: String(event.title || '').trim(),
    description: event.description || '',
    date: normalizeISODateInput(event.date),
    status: event.status === 'done' ? 'done' : 'pending',
  };
}

function getEventsForDate(state, date) {
  return (state.events || [])
    .map(normalizeEventRecord)
    .filter(Boolean)
    .filter((event) => event.title && event.date === date)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}


function normalizeTaskTimeInput(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '').replace('h', ':').replace('.', ':');
  const match = compact.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
  if (!match) return raw;

  const hours = Math.max(0, Math.min(23, Number(match[1] || 0)));
  const minutes = Math.max(0, Math.min(59, Number(match[2] || 0)));
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function taskTimeSortValue(value = '') {
  const normalized = normalizeTaskTimeInput(value);
  if (!/^\d{2}:\d{2}$/.test(normalized)) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours * 60) + minutes;
}

function sortTasksByTime(tasks) {
  return [...tasks].sort((a, b) => {
    const diff = taskTimeSortValue(a.time) - taskTimeSortValue(b.time);
    if (diff !== 0) return diff;
    return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
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
  const events = [];
  const history = previous.map((d, idx) => ({
    date: d,
    discipline: [88, 76, 91, 72, 81, 97][idx],
    tasksDone: [5, 4, 5, 4, 4, 6][idx],
    tasksTotal: 6,
  }));
  return {
    tasks, habits, events, history,
    reflections: { [date]: { note: '', whatWentWell: '', pending: '', improveTomorrow: '' } },
    settings: {
      userName: 'Christian', locale: 'PT-BR', dailyGoal: 80, weeklyGoal: 85,
      focusTask: 'Estudar 2 horas', cannotFailToday: 'Fechar o bloco de estudo profundo',
      weeklyGoals: ['Treinar 4x', 'Manter média acima de 85%', 'Revisar finanças 3x'],
      categories: ['saúde', 'espiritualidade', 'estudo', 'trabalho', 'pessoal', 'financeiro'],
      pomodoroFocusMin: 25, pomodoroShortBreakMin: 5, pomodoroLongBreakMin: 15,
      pomodoroCyclesBeforeLongBreak: 4, pomodoroSelectedSoundKey: 'white', pomodoroSavedSounds: [],
      devMode: false,
      disciplineLabelsCustomized: false,
      disciplineLabels: { ...DEFAULT_DISCIPLINE_LABELS },
      dashboardQuotes: normalizeDashboardQuotes(),
      dashboardQuoteText: DEFAULT_DASHBOARD_QUOTE.text,
      dashboardQuoteAuthor: DEFAULT_DASHBOARD_QUOTE.author,
    },
    appearance: {
      primary: '#60a5fa', accent: '#c084fc', themeMode: 'dark',
      backgroundImage: '', backgroundUrl: '', backgroundSize: 'cover',
      backgroundPosition: 'center', profileImage: '', profileOriginalImage: '', profileUrl: '', profileCrop: { ...DEFAULT_PROFILE_CROP }, profileImageCropped: false, radius: 24, blur: 20, overlay: 0.34,
    },
  };
}

function emptyState() {
  const base = sampleState();

  return {
    ...base,
    tasks: [],
    habits: [],
    events: [],
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
      profileImage: '',
      profileOriginalImage: '',
      profileUrl: '',
      profileCrop: { ...DEFAULT_PROFILE_CROP },
      profileImageCropped: false,
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
  const migratedSettings = migratePomodoroSettings({ ...base.settings, ...(parsed.settings || {}) });
  const incomingLabels = migratedSettings.disciplineLabels;
  const labelsWereLegacy = isLegacyDisciplineLabelSet(incomingLabels);
  const inferredCustomLabels = !!incomingLabels
    && typeof incomingLabels === 'object'
    && !labelsWereLegacy
    && !isDefaultLabelSet(incomingLabels);
  const disciplineLabelsCustomized = migratedSettings.disciplineLabelsCustomized ?? inferredCustomLabels;
  const dashboardQuotes = normalizeDashboardQuotes(migratedSettings);
  const settings = {
    ...migratedSettings,
    devMode: !!migratedSettings.devMode,
    disciplineLabelsCustomized: !!disciplineLabelsCustomized && !labelsWereLegacy,
    disciplineLabels: labelsWereLegacy ? { ...DEFAULT_DISCIPLINE_LABELS } : normalizeDisciplineLabels(incomingLabels),
    dashboardQuotes,
    dashboardQuoteText: dashboardQuotes['PT-BR'].text,
    dashboardQuoteAuthor: dashboardQuotes['PT-BR'].author,
  };

  const appearance = { ...base.appearance, ...(parsed.appearance || {}) };
  appearance.profileCrop = normalizeProfileCrop(appearance.profileCrop);

  return {
    ...base,
    ...parsed,
    settings,
    reflections: { ...base.reflections, ...(parsed.reflections || {}) },
    appearance,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTaskRecord) : base.tasks,
    habits: Array.isArray(parsed.habits) ? parsed.habits : base.habits,
    events: Array.isArray(parsed.events) ? parsed.events.map(normalizeEventRecord).filter(Boolean) : base.events,
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
    brandSubtitle: 'Painel pessoal de disciplina',
    creatorCredit: 'Site criado por Christian Lobo',
    creatorCreditLabel: 'Site criado por',
    creatorName: 'Christian Lobo',
    personalPanel: 'Painel pessoal de disciplina',
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
    allTasks: 'Todas as tarefas',
    moveUp: 'Subir hábito',
    moveDown: 'Descer hábito',
    nav: { dashboard: 'Dashboard', routine: 'Rotina do Dia', events: 'Eventos', habits: 'Hábitos', history: 'Histórico', stats: 'Estatísticas', pomodoro: 'Pomodoro', settings: 'Configurações' },
    mobileNav: { dashboard: 'Início', routine: 'Rotina', events: 'Eventos', habits: 'Hábitos', stats: 'Estat.', pomodoro: 'Pomodoro', settings: 'Ajustes', more: 'Mais' },
    streak: 'sequência',
    today: 'Hoje',
    goalPerDay: (count) => `meta ${count}/dia`,
    interfaceLanguage: 'Idioma da interface',
    profileAndGoals: 'Perfil, idioma e metas',
    profileAndGoalsSub: 'Ajustes principais do seu painel.',
    yourName: 'Seu nome',
    profilePhoto: 'Foto de perfil',
    profilePhotoSub: 'Essa imagem aparece na lateral do app, junto com o nome da pessoa.',
    editProfilePhoto: 'Ajustar foto',
    profileCropTitle: 'Ajustar foto de perfil',
    profileCropSub: 'Arraste a foto ou use os controles até o rosto ficar centralizado no círculo.',
    profileCropZoom: 'Zoom',
    profileCropZoomOut: 'Diminuir zoom',
    profileCropZoomIn: 'Aumentar zoom',
    profileCropHorizontal: 'Horizontal',
    profileCropVertical: 'Vertical',
    resetCrop: 'Centralizar',
    saveCrop: 'Salvar ajuste',
    uploadProfilePhoto: 'Carregar foto',
    removeProfilePhoto: 'Remover foto',
    profileImageUrlPlaceholder: 'Cole a URL da foto de perfil',
    applyProfileUrl: 'Aplicar foto',
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
    disciplineHelp: 'Hábitos usam progresso atual/meta, tarefas com subtarefas contam proporcionalmente e cada evento conta como 1 item no cálculo do dia.',
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
    brandSubtitle: 'Personal discipline panel',
    creatorCredit: 'Site created by Christian Lobo',
    creatorCreditLabel: 'Site created by',
    creatorName: 'Christian Lobo',
    personalPanel: 'Personal discipline panel',
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
    allTasks: 'All tasks',
    moveUp: 'Move habit up',
    moveDown: 'Move habit down',
    nav: { dashboard: 'Dashboard', routine: 'Daily routine', events: 'Events', habits: 'Habits', history: 'History', stats: 'Statistics', pomodoro: 'Pomodoro', settings: 'Settings' },
    mobileNav: { dashboard: 'Home', routine: 'Routine', events: 'Events', habits: 'Habits', stats: 'Stats', pomodoro: 'Pomodoro', settings: 'Settings', more: 'More' },
    streak: 'streak',
    today: 'Today',
    goalPerDay: (count) => `goal ${count}/day`,
    interfaceLanguage: 'Interface language',
    profileAndGoals: 'Profile, language and goals',
    profileAndGoalsSub: 'Main settings for your panel.',
    yourName: 'Your name',
    profilePhoto: 'Profile photo',
    profilePhotoSub: 'This image appears in the sidebar with the person’s name.',
    editProfilePhoto: 'Adjust photo',
    profileCropTitle: 'Adjust profile photo',
    profileCropSub: 'Drag the photo or use the controls until the face is centered inside the circle.',
    profileCropZoom: 'Zoom',
    profileCropZoomOut: 'Zoom out',
    profileCropZoomIn: 'Zoom in',
    profileCropHorizontal: 'Horizontal',
    profileCropVertical: 'Vertical',
    resetCrop: 'Center',
    saveCrop: 'Save adjustment',
    uploadProfilePhoto: 'Upload photo',
    removeProfilePhoto: 'Remove photo',
    profileImageUrlPlaceholder: 'Paste the profile photo URL',
    applyProfileUrl: 'Apply photo',
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
    fullHistory: 'Full history',
    historySub: 'View your pattern by calendar and list.',
    tasksCompleted: (done, total) => `${done}/${total} tasks completed`,
    fillMainFields: 'Fill in the main fields.',
    taskTitle: 'Title',
    category: 'Category',
    priority: 'Priority',
    time: 'Time',
    discipline: 'Discipline',
    disciplineHelp: 'Habits use current/target progress, tasks with subtasks count proportionally, and each event counts as 1 item in the daily score.',
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

function getDisciplineLabel(value, labels = DEFAULT_DISCIPLINE_LABELS) {
  const normalizedLabels = normalizeDisciplineLabels(labels);
  if (value <= 39) return { text: normalizedLabels.danger, tone: 'danger' };
  if (value <= 69) return { text: normalizedLabels.warn, tone: 'warn' };
  if (value <= 89) return { text: normalizedLabels.info, tone: 'info' };
  return { text: normalizedLabels.success, tone: 'success' };
}

function disciplineForDate(state, date) {
  const tasks = getTasksForDate(state, date);
  const habits = state.habits || [];
  const events = getEventsForDate(state, date);

  const getHabitProgress = (habit) => {
    const target = Math.max(1, Number(habit?.target || 1));
    const current = Math.max(0, Number(habit?.logs?.[date] || 0));
    return Math.max(0, Math.min(1, current / target));
  };

  const getTaskProgress = (task) => {
    const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];

    if (subtasks.length) {
      const doneCount = subtasks.filter((s) => s.done).length;
      return Math.max(task?.status === 'done' ? 1 : 0, doneCount / subtasks.length);
    }

    return task?.status === 'done' ? 1 : 0;
  };

  const getEventProgress = (event) => (event?.status === 'done' ? 1 : 0);

  const dailyItems = [
    ...tasks.map(getTaskProgress),
    ...habits.map(getHabitProgress),
    ...events.map(getEventProgress),
  ];

  if (!dailyItems.length) return 0;
  return percentage((dailyItems.reduce((sum, value) => sum + value, 0) / dailyItems.length) * 100);
}

function buildFullHistory(state) {
  const today = todayISO();
  const todayTasks = getTasksForDate(state, today);
  const todayEntry = {
    date: today,
    discipline: disciplineForDate(state, today),
    tasksDone: todayTasks.filter((t) => t.status === 'done').length,
    tasksTotal: todayTasks.length,
  };
  const filtered = state.history.filter((h) => h.date !== today);
  return [...filtered, todayEntry].sort((a, b) => a.date.localeCompare(b.date));
}

function getDateRange(lastDays) {
  const end = todayISO();
  return Array.from({ length: lastDays }, (_, idx) => offsetDate(end, -(lastDays - idx - 1)));
}
const getUpcomingRoutineDates = () =>
  Array.from({ length: 6 }, (_, idx) => offsetDate(todayISO(), idx + 1));
const getRoutineWindowDates = (startDate = todayISO(), length = 7) =>
  Array.from({ length }, (_, idx) => offsetDate(startDate, idx));
const getCenteredDateWindow = (anchorDate = todayISO(), length = 7) => {
  const safeLength = Math.max(1, Number(length || 7));
  const startOffset = -Math.floor(safeLength / 2);
  return Array.from({ length: safeLength }, (_, idx) => offsetDate(anchorDate || todayISO(), startOffset + idx));
};

const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_LABELS = {
  'PT-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  'EN-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function weekdayLabel(day, locale = 'PT-BR') {
  return (WEEKDAY_LABELS[locale] || WEEKDAY_LABELS['PT-BR'])[day] || '';
}

function getWeekdayFromISODate(isoDate) {
  return parseISODateLocal(isoDate).getDay();
}

function normalizeRepeatDays(days) {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
}

function isRecurringTask(task) {
  return normalizeRepeatDays(task?.repeatDays).length > 0;
}

function normalizeTaskRecord(task) {
  if (!task || typeof task !== 'object') return task;
  return {
    ...task,
    date: task.date || todayISO(),
    time: normalizeTaskTimeInput(task.time || ''),
    repeatDays: normalizeRepeatDays(task.repeatDays),
    occurrenceStatus: task.occurrenceStatus && typeof task.occurrenceStatus === 'object' ? task.occurrenceStatus : {},
    occurrenceSubtasks: task.occurrenceSubtasks && typeof task.occurrenceSubtasks === 'object' ? task.occurrenceSubtasks : {},
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
  };
}

function taskMatchesDate(task, date) {
  const normalizedTask = normalizeTaskRecord(task);
  if (!normalizedTask) return false;
  if (isRecurringTask(normalizedTask)) {
    const startsInFuture = normalizedTask.date > todayISO();
    const canShowOnDate = !startsInFuture || normalizedTask.date <= date;
    return canShowOnDate && normalizedTask.repeatDays.includes(getWeekdayFromISODate(date));
  }
  return normalizedTask.date === date;
}

function getTaskSubtasksForDate(task, date) {
  const normalizedTask = normalizeTaskRecord(task);
  const subtasks = Array.isArray(normalizedTask?.subtasks) ? normalizedTask.subtasks : [];

  if (!isRecurringTask(normalizedTask)) return subtasks;

  const dateSubtaskStatus = normalizedTask.occurrenceSubtasks?.[date] || {};
  return subtasks.map((subtask) => ({
    ...subtask,
    done: !!dateSubtaskStatus[subtask.id],
  }));
}

function getTaskStatusForDate(task, date) {
  const normalizedTask = normalizeTaskRecord(task);
  if (!normalizedTask) return 'pending';
  if (isRecurringTask(normalizedTask)) {
    const occurrenceStatus = normalizedTask.occurrenceStatus?.[date];
    if (occurrenceStatus) return occurrenceStatus;
    const subtasks = getTaskSubtasksForDate(normalizedTask, date);
    if (subtasks.length && subtasks.every((s) => s.done)) return 'done';
    return 'pending';
  }
  return normalizedTask.status || 'pending';
}

function setTaskStatusForDate(task, date, status) {
  const normalizedTask = normalizeTaskRecord(task);
  if (isRecurringTask(normalizedTask)) {
    const nextSubtasksForDate = (normalizedTask.subtasks || []).reduce((acc, subtask) => {
      acc[subtask.id] = status === 'done';
      return acc;
    }, {});

    return {
      ...normalizedTask,
      occurrenceStatus: {
        ...(normalizedTask.occurrenceStatus || {}),
        [date]: status,
      },
      occurrenceSubtasks: {
        ...(normalizedTask.occurrenceSubtasks || {}),
        [date]: nextSubtasksForDate,
      },
    };
  }
  return { ...normalizedTask, status };
}

function materializeTaskForDate(task, date) {
  const normalizedTask = normalizeTaskRecord(task);
  const subtasks = getTaskSubtasksForDate(normalizedTask, date);
  return {
    ...normalizedTask,
    effectiveDate: date,
    subtasks,
    status: getTaskStatusForDate(normalizedTask, date),
    isRecurringOccurrence: isRecurringTask(normalizedTask),
  };
}

function getTasksForDate(state, date) {
  return sortTasksByTime(
    (state.tasks || [])
      .map((task) => normalizeTaskRecord(task))
      .filter((task) => taskMatchesDate(task, date))
      .map((task) => materializeTaskForDate(task, date))
  );
}

function reorderListByIds(list, draggedId, targetId) {
  const fromIndex = list.findIndex((item) => item.id === draggedId);
  const toIndex = list.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
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
  const [syncKey, setSyncKey] = useState('');
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false);
  const [state, setState] = useState(sampleState());
  const [storageReady, setStorageReady] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showProfileCropModal, setShowProfileCropModal] = useState(false);
  const [profileCropDraft, setProfileCropDraft] = useState(DEFAULT_PROFILE_CROP);
  const [editingHabit, setEditingHabit] = useState(null);
  const [pomodoro, setPomodoro] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [pomodoroInfoOpen, setPomodoroInfoOpen] = useState(false);
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [pomodoroLinkNameDraft, setPomodoroLinkNameDraft] = useState('');
  const [pomodoroUrlDraft, setPomodoroUrlDraft] = useState('');
  const [historyDate, setHistoryDate] = useState(todayISO());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [routineView, setRoutineView] = useState('day');
  const [showDisciplineLabelEditor, setShowDisciplineLabelEditor] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: '', description: '', date: todayISO() });
  const [showEventForm, setShowEventForm] = useState(false);
  const [draggingHabitId, setDraggingHabitId] = useState(null);
  const [habitDropTargetId, setHabitDropTargetId] = useState(null);
  const fileRef = useRef(null);
  const bgUploadRef = useRef(null);
  const profileUploadRef = useRef(null);
  const toast = useToast();

  async function handleCloudUpload() {
  const key = String(syncKey || '').trim();

  if (!key) {
    toast.push(locale === 'EN-US' ? 'Enter a sync code' : 'Informe um código de sincronização');
    return;
  }

  if (!isCloudSyncConfigured()) {
    toast.push(locale === 'EN-US' ? 'Supabase not configured' : 'Supabase não configurado');
    return;
  }

  try {
    setCloudSyncBusy(true);
    await pushStateToCloud(key, state);
    toast.push(
      locale === 'EN-US' ? 'Sent to cloud successfully' : 'Enviado para a nuvem com sucesso'
    );
  } catch (err) {
    toast.push(
      locale === 'EN-US' ? 'Cloud upload failed' : 'Falha ao enviar para a nuvem',
      err?.message || ''
    );
  } finally {
    setCloudSyncBusy(false);
  }
}

  async function handleCloudDownload() {
    const key = String(syncKey || '').trim();

    if (!key) {
      toast.push(locale === 'EN-US' ? 'Enter a sync code' : 'Informe um código de sincronização');
      return;
    }

    if (!isCloudSyncConfigured()) {
      toast.push(locale === 'EN-US' ? 'Supabase not configured' : 'Supabase não configurado');
      return;
    }

    try {
      setCloudSyncBusy(true);
      const cloudData = await pullStateFromCloud(key);

      if (!cloudData || !cloudData.state) {
        toast.push(locale === 'EN-US' ? 'No cloud data found' : 'Nenhum dado encontrado na nuvem');
        return;
      }

      const merged = buildPersistedState(sampleState(), cloudData.state);
      setState(merged);
      toast.push(
        locale === 'EN-US' ? 'Loaded from cloud successfully' : 'Carregado da nuvem com sucesso'
      );
    } catch (err) {
      toast.push(
        locale === 'EN-US' ? 'Cloud download failed' : 'Falha ao baixar da nuvem',
        err?.message || ''
      );
    } finally {
      setCloudSyncBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const persistedState = await loadState();
      if (cancelled) return;

      // atualiza o estado assim que conseguir ler os dados salvos,
      // para o loading já refletir idioma/tema do usuário
      setState(persistedState);

      // mantém a animação visível por Xs para todos
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (cancelled) return;
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
  const displayUserName = String(state.settings.userName || '').trim();
  const sidebarTitle = displayUserName || (locale === 'EN-US' ? 'Your name' : 'Seu nome');
  const sidebarSubtitle = copy.personalPanel || copy.brandSubtitle;
  const profileImageSrc = state.appearance.profileImage || '';
  const profileOriginalImageSrc = state.appearance.profileOriginalImage || profileImageSrc;
  const profileCrop = normalizeProfileCrop(state.appearance.profileCrop);
  const profileDisplayCrop = state.appearance.profileImageCropped ? { ...DEFAULT_PROFILE_CROP } : profileCrop;
  const fullHistory = useMemo(() => buildFullHistory(state), [state]);
  const weekDates = getDateRange(7);
  const upcomingDates = getUpcomingRoutineDates();
  const routineWindowDates = getRoutineWindowDates(selectedDate, 7);
  const routineQuickDates = getCenteredDateWindow(selectedDate, 7);
  const weekSeries = weekDates.map((d) => ({ label: formatShort(d, locale), raw: d, disciplina: disciplineForDate(state, d) }));
  const monthSeries = getDateRange(30).map((d) => ({ label: formatShort(d, locale), raw: d, disciplina: disciplineForDate(state, d) }));

  const taskMatchesSearch = (task) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return String(task.title || '').toLowerCase().includes(term) || String(task.description || '').toLowerCase().includes(term);
  };

  const todayTasksRaw = getTasksForDate(state, todayISO());
  const todayTasks = sortTasksByTime(todayTasksRaw);
  const selectedDateTasks = sortTasksByTime(getTasksForDate(state, selectedDate));
  const filteredTasks = sortTasksByTime(selectedDateTasks.filter(taskMatchesSearch));
  const routineWeekBlocks = routineWindowDates.map((date) => ({
    date,
    tasks: getTasksForDate(state, date).filter(taskMatchesSearch),
  }));

  const todayDiscipline = disciplineForDate(state, todayISO());
  const devMode = !!state.settings.devMode;
  const disciplineLabels = getDisciplineLabelsForDisplay(state.settings, locale);
  const dashboardQuotes = normalizeDashboardQuotes(state.settings);
  const dashboardQuote = dashboardQuotes[locale] || dashboardQuotes['PT-BR'];
  const dashboardQuoteText = dashboardQuote.text;
  const dashboardQuoteAuthor = dashboardQuote.author;
  const disciplineMeta = getDisciplineLabel(todayDiscipline, disciplineLabels);
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
const todayEvents = getEventsForDate(state, todayISO());
const todayDoneEvents = todayEvents.filter((event) => event.status === 'done').length;
const weeklyGoals = (state.settings.weeklyGoals || []).map((goal) => goal.trim()).filter(Boolean);
const hasWeeklyGoals = weeklyGoals.length > 0;
const todayCompletedHabits = state.habits.filter((habit) => (habit.logs[todayISO()] || 0) >= Math.max(1, Number(habit.target || 1))).length;
const weekTasks = weekDates.flatMap((date) => getTasksForDate(state, date));
const weekDoneTasks = weekTasks.filter((task) => task.status === 'done').length;
const weekTotalTasks = weekTasks.length;
const weekCompletionRate = percentage(weekTotalTasks ? (weekDoneTasks / weekTotalTasks) * 100 : 0);
const daysAboveGoal = weekSeries.filter((item) => item.disciplina >= state.settings.dailyGoal).length;
const bestWeekDay = [...weekSeries].sort((a, b) => b.disciplina - a.disciplina)[0] || null;
const worstWeekDay = [...weekSeries].sort((a, b) => a.disciplina - b.disciplina)[0] || null;
const nextPendingTask = todayTasks.find((task) => task.status !== 'done') || null;
const weeklyTaskFlow = weekDates.map((date) => {
  const tasksForDay = getTasksForDate(state, date);
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

  if (!storageReady) {
    return (
      <LoadingScreen
        locale={locale}
        backgroundValue={backgroundValue}
        overlay={state.appearance.overlay}
        themeMode={state.appearance.themeMode}
        durationMs={2000}
      />
    );
  }

function updateState(updater) { setState((prev) => updater(prev)); }

  function setTaskStatus(taskId, status, taskDate = todayISO()) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const normalizedTask = normalizeTaskRecord(t);
        if (isRecurringTask(normalizedTask)) {
          return setTaskStatusForDate(normalizedTask, taskDate, status);
        }
        const subtasks = Array.isArray(normalizedTask.subtasks) ? normalizedTask.subtasks : [];
        if (!subtasks.length) return { ...normalizedTask, status };
        if (status === 'done') return { ...normalizedTask, status: 'done', subtasks: subtasks.map((s) => ({ ...s, done: true })) };
        return { ...normalizedTask, status, subtasks: subtasks.map((s) => ({ ...s, done: false })) };
      }),
    }));
    toast.push(status === 'done' ? (locale === 'EN-US' ? 'Task completed' : 'Tarefa concluída') : (locale === 'EN-US' ? 'Status updated' : 'Status atualizado'));
  }

  function toggleSubtask(taskId, subtaskId, taskDate = todayISO()) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const normalizedTask = normalizeTaskRecord(t);

        if (isRecurringTask(normalizedTask)) {
          const currentSubtasks = getTaskSubtasksForDate(normalizedTask, taskDate);
          const nextSubtasks = currentSubtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
          const allDone = nextSubtasks.length > 0 && nextSubtasks.every((s) => s.done);
          const dateStatusMap = nextSubtasks.reduce((acc, subtask) => {
            acc[subtask.id] = !!subtask.done;
            return acc;
          }, {});

          return {
            ...normalizedTask,
            occurrenceStatus: {
              ...(normalizedTask.occurrenceStatus || {}),
              [taskDate]: allDone ? 'done' : 'pending',
            },
            occurrenceSubtasks: {
              ...(normalizedTask.occurrenceSubtasks || {}),
              [taskDate]: dateStatusMap,
            },
          };
        }

        const subtasks = (normalizedTask.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
        const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
        return { ...normalizedTask, subtasks, status: allDone ? 'done' : normalizedTask.status === 'done' ? 'pending' : normalizedTask.status };
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
    const { effectiveDate, isRecurringOccurrence, ...taskBase } = normalizeTaskRecord(task);
    const copyTask = {
      ...taskBase,
      id: uid(),
      title: `${task.title} (${locale === 'EN-US' ? 'copy' : 'cópia'})`,
      occurrenceStatus: { ...(taskBase.occurrenceStatus || {}) },
    };
    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, copyTask] }));
    toast.push(locale === 'EN-US' ? 'Task duplicated' : 'Tarefa duplicada');
  }

  function openNewTask() {
    const baseTaskDate = page === 'routine' ? selectedDate : todayISO();
    setEditingTask({ id: uid(), title: '', description: '', category: 'pessoal', priority: 'média', time: '', status: 'pending', date: baseTaskDate, color: priorityColor('média'), subtasks: [], repeatDays: [], occurrenceStatus: {}, occurrenceSubtasks: {} });
    setShowTaskModal(true);
  }

  function saveTask(task) {
    const { effectiveDate, isRecurringOccurrence, ...taskBase } = task;
    const cleanedSubtasks = (taskBase.subtasks || []).filter((s) => (s.title || '').trim()).map((s) => ({ ...s, title: s.title.trim() }));
    const repeatDays = normalizeRepeatDays(taskBase.repeatDays);
    const templateSubtasks = repeatDays.length
      ? cleanedSubtasks.map((subtask) => ({ ...subtask, done: false }))
      : cleanedSubtasks;
    const normalizedTask = {
      ...taskBase,
      date: taskBase.date || todayISO(),
      time: normalizeTaskTimeInput(taskBase.time || ''),
      color: priorityColor(taskBase.priority),
      subtasks: templateSubtasks,
      repeatDays,
      occurrenceStatus: taskBase.occurrenceStatus && typeof taskBase.occurrenceStatus === 'object' ? taskBase.occurrenceStatus : {},
      occurrenceSubtasks: taskBase.occurrenceSubtasks && typeof taskBase.occurrenceSubtasks === 'object' ? taskBase.occurrenceSubtasks : {},
      status: repeatDays.length
        ? 'pending'
        : (cleanedSubtasks.length && cleanedSubtasks.every((s) => s.done) ? 'done' : taskBase.status === 'done' && cleanedSubtasks.length ? 'pending' : (taskBase.status || 'pending')),
    };
    updateState((prev) => {
      const exists = prev.tasks.some((t) => t.id === normalizedTask.id);
      const tasks = exists ? prev.tasks.map((t) => (t.id === normalizedTask.id ? normalizedTask : t)) : [...prev.tasks, normalizedTask];
      return { ...prev, tasks };
    });
    setShowTaskModal(false); setEditingTask(null); toast.push(locale === 'EN-US' ? 'Task saved' : 'Tarefa salva');
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

  function reorderHabits(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    updateState((prev) => ({ ...prev, habits: reorderListByIds(prev.habits, draggedId, targetId) }));
    toast.push(locale === 'EN-US' ? 'Habits reordered' : 'Hábitos reordenados');
  }

  function moveHabitByStep(habitId, direction) {
    updateState((prev) => {
      const index = prev.habits.findIndex((habit) => habit.id === habitId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.habits.length) return prev;
      const habits = [...prev.habits];
      const [removed] = habits.splice(index, 1);
      habits.splice(targetIndex, 0, removed);
      return { ...prev, habits };
    });
    toast.push(locale === 'EN-US' ? 'Habits reordered' : 'Hábitos reordenados');
  }

  function handleHabitDragStart(habitId) {
    setDraggingHabitId(habitId);
    setHabitDropTargetId(habitId);
  }

  function handleHabitDragOver(event, habitId) {
    event.preventDefault();
    if (!draggingHabitId || draggingHabitId === habitId) return;
    setHabitDropTargetId(habitId);
  }

  function handleHabitDrop(habitId) {
    if (draggingHabitId && draggingHabitId !== habitId) {
      reorderHabits(draggingHabitId, habitId);
    }
    setDraggingHabitId(null);
    setHabitDropTargetId(null);
  }

  function handleHabitDragEnd() {
    setDraggingHabitId(null);
    setHabitDropTargetId(null);
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
      try {
        const parsed = JSON.parse(String(reader.result));
        setState(buildPersistedState(sampleState(), parsed));
        toast.push(locale === 'EN-US' ? 'Backup imported' : 'Backup importado');
      }
      catch { toast.push(locale === 'EN-US' ? 'Invalid file' : 'Arquivo inválido'); }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    setState(emptyState());
    setShowResetModal(false);
    toast.push(copy.resetDone);
  }

  function setDisciplineLabel(tone, value) {
    updateState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        disciplineLabelsCustomized: true,
        disciplineLabels: {
          ...getDisciplineLabelsForDisplay(prev.settings, locale),
          [tone]: value,
        },
      },
    }));
  }

  function setDashboardQuoteValue(localeKey, field, value) {
    updateState((prev) => {
      const dashboardQuotes = normalizeDashboardQuotes(prev.settings);
      return {
        ...prev,
        settings: {
          ...prev.settings,
          dashboardQuotes: {
            ...dashboardQuotes,
            [localeKey]: {
              ...dashboardQuotes[localeKey],
              [field]: value,
            },
          },
        },
      };
    });
  }

  function saveEvent() {
    const normalizedEvent = normalizeEventRecord({
      ...eventDraft,
      date: eventDraft.date || selectedDate || todayISO(),
    });
    if (!normalizedEvent?.title) {
      toast.push(locale === 'EN-US' ? 'Give the event a name' : 'Dê um nome ao evento');
      return;
    }

    updateState((prev) => ({
      ...prev,
      events: [...(prev.events || []), normalizedEvent],
    }));
    setSelectedDate(normalizedEvent.date);
    setEventDraft({ title: '', description: '', date: normalizedEvent.date || selectedDate || todayISO() });
    setShowEventForm(false);
    toast.push(locale === 'EN-US' ? 'Event saved' : 'Evento salvo');
  }

  function toggleEventStatus(eventId) {
    updateState((prev) => ({
      ...prev,
      events: (prev.events || []).map((event) => (
        event.id === eventId
          ? { ...event, status: event.status === 'done' ? 'pending' : 'done' }
          : event
      )),
    }));
  }

  function removeEvent(eventId) {
    updateState((prev) => ({ ...prev, events: (prev.events || []).filter((event) => event.id !== eventId) }));
    toast.push(locale === 'EN-US' ? 'Event removed' : 'Evento removido');
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
    toast.push(locale === 'EN-US' ? 'Back to theme' : 'Voltando ao tema');
  }

  function openProfileCropEditor(crop = state.appearance.profileCrop) {
    const source = state.appearance.profileOriginalImage || state.appearance.profileImage;
    if (!source) {
      toast.push(locale === 'EN-US' ? 'Add a profile photo first' : 'Adicione uma foto primeiro');
      return;
    }
    setProfileCropDraft(normalizeProfileCrop(crop));
    setShowProfileCropModal(true);
  }

  function applyProfileFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const nextCrop = { ...DEFAULT_PROFILE_CROP };
      updateState((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          profileImage: result,
          profileOriginalImage: result,
          profileUrl: '',
          profileCrop: nextCrop,
          profileImageCropped: false,
        },
      }));
      setProfileCropDraft(nextCrop);
      setShowProfileCropModal(true);
      toast.push(locale === 'EN-US' ? 'Profile photo applied' : 'Foto de perfil aplicada');
    };
    reader.readAsDataURL(file);
  }

  function applyProfileUrl() {
    const url = (state.appearance.profileUrl || '').trim();
    if (!url) { toast.push(locale === 'EN-US' ? 'Paste a valid URL' : 'Cole uma URL válida'); return; }
    const nextCrop = { ...DEFAULT_PROFILE_CROP };
    updateState((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        profileImage: url,
        profileOriginalImage: url,
        profileUrl: url,
        profileCrop: nextCrop,
        profileImageCropped: false,
      },
    }));
    setProfileCropDraft(nextCrop);
    setShowProfileCropModal(true);
    toast.push(locale === 'EN-US' ? 'Profile photo applied' : 'Foto de perfil aplicada');
  }

  async function saveProfileCrop() {
    const nextCrop = normalizeProfileCrop(profileCropDraft);
    const source = state.appearance.profileOriginalImage || state.appearance.profileImage;

    try {
      const croppedImage = await createProfileCropDataUrl(source, nextCrop);
      updateState((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          profileImage: croppedImage,
          profileOriginalImage: source,
          profileCrop: nextCrop,
          profileImageCropped: true,
        },
      }));
    } catch {
      updateState((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          profileImage: source,
          profileOriginalImage: source,
          profileCrop: nextCrop,
          profileImageCropped: false,
        },
      }));
    }

    setShowProfileCropModal(false);
    toast.push(locale === 'EN-US' ? 'Profile photo adjusted' : 'Foto de perfil ajustada');
  }

  function clearProfileImage() {
    updateState((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        profileImage: '',
        profileOriginalImage: '',
        profileUrl: '',
        profileCrop: { ...DEFAULT_PROFILE_CROP },
        profileImageCropped: false,
      },
    }));
    setProfileCropDraft({ ...DEFAULT_PROFILE_CROP });
    setShowProfileCropModal(false);
    toast.push(locale === 'EN-US' ? 'Profile photo removed' : 'Foto de perfil removida');
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

  const pageBody = (() => {
if (page === 'dashboard') {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-top">
        <section className="glass hero-card dashboard-hero">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> {locale === 'EN-US' ? `Welcome back, ${state.settings.userName}` : `Bem-vindo de volta, ${state.settings.userName}`}</div>
            <h2>{locale === 'EN-US' ? `Your discipline today is ${todayDiscipline}%` : `Sua disciplina de hoje está em ${todayDiscipline}%`}</h2>
            <p
              className={cls(devMode && 'dev-editable-copy')}
              title={devMode ? (locale === 'EN-US' ? 'Edit this quote in Settings' : 'Edite esta frase nas Configurações') : undefined}
            >
              “{dashboardQuoteText}” — <strong>{dashboardQuoteAuthor}</strong>.
            </p>
            <div className="hero-tags">
              <button
                type="button"
                className={cls('pill', disciplineMeta.tone, devMode && 'discipline-label-button')}
                onClick={() => devMode && setShowDisciplineLabelEditor((value) => !value)}
                title={devMode ? (locale === 'EN-US' ? 'Click to edit discipline labels' : 'Clique para editar os labels da disciplina') : undefined}
              >
                <span className="discipline-label-text">{disciplineMeta.text}</span>
              </button>
              <span className="pill">{locale === 'EN-US' ? 'Goal' : 'Meta'}: {state.settings.dailyGoal}%</span>
              <span className="pill">{locale === 'EN-US' ? 'Streak' : 'Sequência'}: {streak} {locale === 'EN-US' ? 'days' : 'dias'}</span>
            </div>
            {devMode && showDisciplineLabelEditor ? (
              <div className="discipline-label-editor glass-inner">
                <div className="section-subtitle">{locale === 'EN-US' ? 'Edit the four discipline names.' : 'Edite os quatro nomes da disciplina.'}</div>
                <div className="form-grid compact-grid">
                  <Field label="0–39">
                    <input value={disciplineLabels.danger} onChange={(e) => setDisciplineLabel('danger', e.target.value)} />
                  </Field>
                  <Field label="40–69">
                    <input value={disciplineLabels.warn} onChange={(e) => setDisciplineLabel('warn', e.target.value)} />
                  </Field>
                  <Field label="70–89">
                    <input value={disciplineLabels.info} onChange={(e) => setDisciplineLabel('info', e.target.value)} />
                  </Field>
                  <Field label="90–100">
                    <input value={disciplineLabels.success} onChange={(e) => setDisciplineLabel('success', e.target.value)} />
                  </Field>
                </div>
              </div>
            ) : null}
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
          <section className="glass section-card dashboard-events-card">
            <SectionHeader
              title={locale === 'EN-US' ? 'Today events' : 'Eventos do dia'}
              subtitle={locale === 'EN-US' ? `${todayDoneEvents}/${todayEvents.length} completed today.` : `${todayDoneEvents}/${todayEvents.length} concluído(s) hoje.`}
              action={
                <button
                  className="ghost-btn"
                  onClick={() => {
                    const date = todayISO();
                    setSelectedDate(date);
                    setEventDraft({ title: '', description: '', date });
                    setShowEventForm(true);
                    setPage('events');
                  }}
                >
                  <Plus size={16} /> {locale === 'EN-US' ? 'Event' : 'Evento'}
                </button>
              }
            />
            {todayEvents.length ? (
              <div className="stack small-gap">
                {todayEvents.map((event) => (
                  <div key={event.id} className="task-mini-row event-row dashboard-event-row">
                    <button className="task-check" onClick={() => toggleEventStatus(event.id)}>
                      {event.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="task-mini-copy">
                      <div className={cls('row-title', event.status === 'done' && 'done')}>{event.title}</div>
                      <div className="row-sub">{event.description || (locale === 'EN-US' ? 'Counts as 1 discipline item' : 'Conta como 1 item no arco')}</div>
                    </div>
                    <span className={cls('pill', event.status === 'done' ? 'success' : 'warn')}>
                      {event.status === 'done' ? copy.done : copy.pendingBtn}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">
                <div className="row-title">{locale === 'EN-US' ? 'No events today.' : 'Sem eventos hoje.'}</div>
                <div className="row-sub">{locale === 'EN-US' ? 'Use the Events tab to add an important date.' : 'Use a aba Eventos para adicionar uma data importante.'}</div>
              </div>
            )}
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
  );
}

    if (page === 'routine') {
      return (
        <div className="stack large-gap">
          <section className="glass section-card routine-control-card">
            <SectionHeader
              title={locale === 'EN-US' ? 'Your operational board' : 'Seu painel operacional do dia'}
              subtitle={locale === 'EN-US' ? 'Choose the date, filter and register what was completed.' : 'Escolha a data, filtre e registre o que foi concluído.'}
              action={
                <button className="primary-btn routine-add-task-btn" onClick={openNewTask}>
                  <Plus size={16} /> {copy.newTask}
                </button>
              }
            />
            <div className="routine-command-row">
              <div className="search-box routine-search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'EN-US' ? 'Search task' : 'Buscar tarefa'} /></div>
              <div className="routine-mode-switch">
                <button type="button" className={cls(routineView === 'day' && 'active')} onClick={() => { setSelectedDate(todayISO()); setRoutineView('day'); }}>{locale === 'EN-US' ? 'Day' : 'Dia'}</button>
                <button type="button" className={cls(routineView === 'week' && 'active')} onClick={() => setRoutineView('week')}>{locale === 'EN-US' ? '7 days' : '7 dias'}</button>
              </div>
            </div>
            <div className="date-panel">
              <DateSelector
                value={selectedDate}
                locale={locale}
                discipline={disciplineForDate(state, selectedDate)}
                onChange={(date) => { setSelectedDate(date); setRoutineView('day'); }}
              />
              <DateStrip
                dates={routineQuickDates}
                value={selectedDate}
                locale={locale}
                onChange={(date) => { setSelectedDate(date); setRoutineView('day'); }}
                getMetric={(date) => `${disciplineForDate(state, date)}%`}
              />
            </div>
          </section>
          {routineView === 'day' ? (
            <div className="task-grid">
              {filteredTasks.length ? filteredTasks.map((task) => (
                <motion.div key={`${task.id}-${task.effectiveDate || task.date}`} layout className="glass task-card-premium">
                  <div className="task-card-body">
                    <button className="task-check" onClick={() => setTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done', task.effectiveDate || task.date)}>
                      {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="task-card-copy">
                      <div className={cls('task-card-title', task.status === 'done' && 'done')}>{task.title}</div>
                      <div className="task-card-meta">{categoryLabel(task.category, locale)} • {priorityLabel(task.priority, locale)} {task.time ? `• ${task.time}` : ''}{task.isRecurringOccurrence ? ` • ${locale === 'EN-US' ? 'recurring' : 'recorrente'}` : ''}</div>
                      {task.description && <p className="task-desc">{task.description}</p>}
                      {!!task.subtasks.length && (
                        <div className="subtask-list">
                          {task.subtasks.map((s) => (
                            <div key={s.id} className="subtask-item">
                              <button type="button" className={cls('subtask-toggle', s.done && 'done')} onClick={() => toggleSubtask(task.id, s.id, task.effectiveDate || task.date)}>{s.done ? '✓' : ''}</button>
                              <span className={cls(s.done && 'done')}>{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="task-actions-row">
                        <button className="ghost-btn" onClick={() => setTaskStatus(task.id, 'done', task.effectiveDate || task.date)}>{copy.done}</button>
                        <button className="ghost-btn" onClick={() => setTaskStatus(task.id, 'pending', task.effectiveDate || task.date)}>{copy.pendingBtn}</button>
                        <button className="ghost-btn" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}><Pencil size={14} /> {copy.edit}</button>
                        <button className="ghost-btn" onClick={() => duplicateTask(task)}>{copy.duplicate}</button>
                        <button className="danger-btn" onClick={() => removeTask(task.id)}><Trash2 size={14} /> {copy.delete}</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="glass section-card empty-state-card">
                  <div className="row-title">{locale === 'EN-US' ? 'Nothing scheduled for this date.' : 'Nada programado nesta data.'}</div>
                  <div className="row-sub">{locale === 'EN-US' ? 'Create a task for the selected day or use recurring weekdays.' : 'Crie uma tarefa para o dia selecionado ou use dias recorrentes.'}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="routine-week-list">
              {routineWeekBlocks.map(({ date, tasks }) => (
                <section key={date} className="glass section-card routine-day-group">
                  <div className="routine-day-header">
                    <div>
                      <div className="section-title">{formatFullDate(date, locale)}</div>
                      <div className="section-subtitle">{tasks.length} {locale === 'EN-US' ? 'task(s)' : 'tarefa(s)'}</div>
                    </div>
                    <span className="pill">{disciplineForDate(state, date)}%</span>
                  </div>
                  {tasks.length ? (
                    <div className="stack">
                      {tasks.map((task) => (
                        <div key={`${task.id}-${date}`} className="task-mini-row routine-week-item">
                          <button className="task-check" onClick={() => setTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done', date)}>
                            {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <div className="task-mini-copy">
                            <div className={cls('row-title', task.status === 'done' && 'done')}>{task.title}</div>
                            <div className="row-sub">{categoryLabel(task.category, locale)} • {priorityLabel(task.priority, locale)}{task.time ? ` • ${task.time}` : ''}</div>
                          </div>
                          <div className="task-actions-row compact-row">
                            <button className="ghost-btn compact" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}><Pencil size={14} /></button>
                            <button className="ghost-btn compact" onClick={() => duplicateTask(task)}>{copy.duplicate}</button>
                            <button className="danger-btn compact" onClick={() => removeTask(task.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-card compact-empty-state">
                      <div className="row-title">{locale === 'EN-US' ? 'No tasks on this day.' : 'Sem tarefas neste dia.'}</div>
                      <div className="row-sub">{locale === 'EN-US' ? 'Recurring routines selected in the modal also appear here automatically.' : 'Rotinas recorrentes escolhidas no modal também aparecem aqui automaticamente.'}</div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (page === 'events') {
      const normalizedEvents = (state.events || []).map(normalizeEventRecord).filter((event) => event?.title);
      const eventDates = [...new Set(normalizedEvents.map((event) => event.date))].sort();
      const eventQuickDates = getCenteredDateWindow(selectedDate, 7);
      const selectedEvents = getEventsForDate(state, selectedDate);

      return (
        <div className="stack large-gap">
          <section className="glass section-card">
            <SectionHeader
              title={locale === 'EN-US' ? 'Events' : 'Eventos'}
              subtitle={`${formatFullDate(selectedDate, locale)} · ${disciplineForDate(state, selectedDate)}%`}
              action={
                <button
                  className="primary-btn event-add-btn compact-panel-btn"
                  onClick={() => {
                    setEventDraft({ title: '', description: '', date: selectedDate || todayISO() });
                    setShowEventForm((prev) => !prev);
                  }}
                >
                  <Plus size={18} /> <span>{showEventForm ? (locale === 'EN-US' ? 'Close' : 'Fechar') : (locale === 'EN-US' ? 'Add event' : 'Adicionar evento')}</span>
                </button>
              }
            />
            <div className="date-panel event-selected-panel">
              <DateSelector
                value={selectedDate}
                locale={locale}
                discipline={disciplineForDate(state, selectedDate)}
                onChange={(date) => {
                  setSelectedDate(date);
                  setEventDraft((prev) => ({ ...prev, date }));
                }}
              />
              <DateStrip
                dates={eventQuickDates}
                value={selectedDate}
                locale={locale}
                onChange={(date) => {
                  setSelectedDate(date);
                  setEventDraft((prev) => ({ ...prev, date }));
                }}
                getMetric={(date) => `${getEventsForDate(state, date).length} ${locale === 'EN-US' ? 'event' : 'evento'}`}
              />
            </div>
            {showEventForm ? (
              <div className="event-inline-form glass-inner">
                <div className="event-selected-date-note">
                  <CalendarDays size={15} />
                  <span>{locale === 'EN-US' ? 'Saving on' : 'Salvando em'}: <strong>{formatFullDate(eventDraft.date || selectedDate, locale)}</strong></span>
                </div>
                <div className="event-form-grid inline-event-fields">
                  <Field label={locale === 'EN-US' ? 'Event name' : 'Nome do evento'}>
                    <input
                      value={eventDraft.title}
                      onChange={(e) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder={locale === 'EN-US' ? 'Example: exam, presentation, trip' : 'Ex.: prova, apresentação, viagem'}
                    />
                  </Field>
                  <Field label={locale === 'EN-US' ? 'Event date' : 'Data do evento'}>
                    <DateSelector
                      value={eventDraft.date || selectedDate}
                      locale={locale}
                      discipline={disciplineForDate(state, eventDraft.date || selectedDate)}
                      className="event-form-date-selector"
                      onChange={(date) => {
                        setEventDraft((prev) => ({ ...prev, date: normalizeISODateInput(date, eventDraft.date || selectedDate || todayISO()) }));
                      }}
                    />
                  </Field>
                </div>
                <div className="event-form-grid inline-event-note-row">
                  <Field label={locale === 'EN-US' ? 'Optional note' : 'Observação opcional'}>
                    <input
                      value={eventDraft.description}
                      onChange={(e) => setEventDraft((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder={locale === 'EN-US' ? 'Anything important about this date' : 'Algo importante sobre essa data'}
                    />
                  </Field>
                </div>
                <div className="event-panel-actions">
                  <button className="ghost-btn" onClick={() => setShowEventForm(false)}>{copy.cancel}</button>
                  <button className="primary-btn event-add-btn compact-panel-btn" onClick={saveEvent}><Plus size={18} /> <span>{locale === 'EN-US' ? 'Save event' : 'Salvar evento'}</span></button>
                </div>
              </div>
            ) : null}
            {selectedEvents.length ? (
              <div className="stack">
                {selectedEvents.map((event) => (
                  <div key={event.id} className="task-mini-row event-row">
                    <button className="task-check" onClick={() => toggleEventStatus(event.id)}>
                      {event.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="task-mini-copy">
                      <div className={cls('row-title', event.status === 'done' && 'done')}>{event.title}</div>
                      <div className="row-sub">
                        {formatShort(event.date, locale)}{event.description ? ` · ${event.description}` : ` · ${locale === 'EN-US' ? 'Counts as 1 discipline item' : 'Conta como 1 item no arco'}`}
                      </div>
                    </div>
                    <span className={cls('pill', event.status === 'done' ? 'success' : 'warn')}>
                      {event.status === 'done' ? copy.done : copy.pendingBtn}
                    </span>
                    <button className="danger-btn compact" onClick={() => removeEvent(event.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card compact-empty-state">
                <div className="row-title">{locale === 'EN-US' ? 'No events on this date.' : 'Sem eventos nesta data.'}</div>
                <div className="row-sub">{locale === 'EN-US' ? 'Use Add event to make it count as 1 item in the discipline arc.' : 'Clique em Adicionar evento para ele contar como 1 item no arco de disciplina.'}</div>
              </div>
            )}
          </section>

          <section className="glass section-card">
            <SectionHeader
              title={locale === 'EN-US' ? 'All events' : 'Todos os eventos'}
              subtitle={locale === 'EN-US' ? 'Open any date and mark what happened.' : 'Abra qualquer data e marque o que aconteceu.'}
            />
            {eventDates.length ? (
              <div className="routine-week-list">
                {eventDates.map((date) => {
                  const eventsForDate = getEventsForDate(state, date);
                  return (
                    <section key={date} className="glass-inner routine-day-group event-date-group">
                      <div className="routine-day-header">
                        <div>
                          <div className="section-title">{formatFullDate(date, locale)}</div>
                          <div className="section-subtitle">{eventsForDate.length} {locale === 'EN-US' ? 'event(s)' : 'evento(s)'}</div>
                        </div>
                        <button className="ghost-btn" onClick={() => setSelectedDate(date)}>{locale === 'EN-US' ? 'Open' : 'Abrir'}</button>
                      </div>
                      <div className="stack small-gap">
                        {eventsForDate.map((event) => (
                          <div key={event.id} className="task-mini-row event-row compact-event-row">
                            <button className="task-check" onClick={() => toggleEventStatus(event.id)}>
                              {event.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <div className="task-mini-copy">
                              <div className={cls('row-title', event.status === 'done' && 'done')}>{event.title}</div>
                              <div className="row-sub">{event.description || (locale === 'EN-US' ? 'Counts as 1 item' : 'Conta como 1 item')}</div>
                            </div>
                            <button className="danger-btn compact" onClick={() => removeEvent(event.id)}><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-card compact-empty-state">
                <div className="row-title">{locale === 'EN-US' ? 'No events registered yet.' : 'Nenhum evento cadastrado ainda.'}</div>
                <div className="row-sub">{locale === 'EN-US' ? 'Create the first one above.' : 'Crie o primeiro evento acima.'}</div>
              </div>
            )}
          </section>
        </div>
      );
    }

    if (page === 'habits') {
      return (
        <div className="stack large-gap">
          <div className="habit-grid-page">
            {state.habits.map((habit, index) => {
              const today = habit.logs[todayISO()] || 0;
              const pct = Math.min(100, Math.round((today / habit.target) * 100));
              const streakCount = calcHabitStreak(habit);
              const habitColor = state.appearance.primary;
              return (
                <section
                  key={habit.id}
                  className={cls('glass', 'section-card', 'habit-card-draggable', draggingHabitId === habit.id && 'dragging', habitDropTargetId === habit.id && draggingHabitId && draggingHabitId !== habit.id && 'drop-target')}
                  style={{ '--habit-color': habit.color, '--habit-color-soft': alphaColor(habit.color, '18'), '--habit-color-border': alphaColor(habit.color, '3D'), '--habit-color-done': alphaColor(habit.color, '70'), '--habit-color-partial': alphaColor(habit.color, '16'), '--habit-color-done-border': alphaColor(habit.color, 'C8'), '--habit-color-partial-border': alphaColor(habit.color, '33') }}
                  onDragOver={(event) => handleHabitDragOver(event, habit.id)}
                  onDrop={() => handleHabitDrop(habit.id)}
                >
                  <div className="habit-head-row">
                    <div className="habit-head-left">
                      <div className="habit-icon" style={{ background: `${habit.color}22`, color: habit.color }}>{habitIcons[habit.icon] || <Target size={16} />}</div>
                      <div><div className="section-title">{habit.title}</div><div className="section-subtitle">{categoryLabel(habit.category, locale)} • {copy.goalPerDay(habit.target)}</div></div>
                    </div>
                    <div className="habit-head-actions">
                      <span className="pill habit-streak-pill" style={{ background: alphaColor(habit.color, '18'), color: habit.color, borderColor: alphaColor(habit.color, '3D') }}>{copy.streak} {streakCount}</span>
                      <button className="ghost-btn compact round habit-drag-handle" type="button" draggable onDragStart={() => handleHabitDragStart(habit.id)} onDragEnd={handleHabitDragEnd} title={locale === 'EN-US' ? 'Drag to reorder habits' : 'Arraste para reordenar hábitos'} aria-label={copy.dragToReorder}><GripVertical size={16} /></button>
                      <button className="ghost-btn compact round" type="button" onClick={() => moveHabitByStep(habit.id, 'up')} title={copy.moveUp} aria-label={copy.moveUp} disabled={index === 0}><ChevronUp size={16} /></button>
                      <button className="ghost-btn compact round" type="button" onClick={() => moveHabitByStep(habit.id, 'down')} title={copy.moveDown} aria-label={copy.moveDown} disabled={index === state.habits.length - 1}><ChevronDown size={16} /></button>
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
              {sortTasksByTime(state.tasks.filter((t) => t.date === selected?.date)).map((task) => (
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

          <SectionHeader title={copy.profilePhoto} subtitle={copy.profilePhotoSub} />
          <div className="profile-settings-card glass-inner">
            <div className="profile-preview">
              <button type="button" className="profile-preview-avatar-btn" onClick={() => profileImageSrc && openProfileCropEditor()} disabled={!profileImageSrc} aria-label={copy.editProfilePhoto}>
                <ProfileAvatar src={profileImageSrc} alt={sidebarTitle} crop={profileDisplayCrop} className="profile-preview-avatar" />
              </button>
              <div className="profile-preview-copy">
                <strong>{sidebarTitle}</strong>
                <span>{sidebarSubtitle}</span>
              </div>
            </div>
            <div className="profile-photo-actions">
              <button className="ghost-btn" onClick={() => profileUploadRef.current?.click()}><Upload size={16} /> {copy.uploadProfilePhoto}</button>
              <input ref={profileUploadRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && applyProfileFile(e.target.files[0])} />
              <button className="ghost-btn" onClick={() => openProfileCropEditor()} disabled={!profileImageSrc}><Pencil size={16} /> {copy.editProfilePhoto}</button>
              <button className="ghost-btn" onClick={clearProfileImage}>{copy.removeProfilePhoto}</button>
            </div>
            <div className="quick-add">
              <input value={state.appearance.profileUrl || ''} onChange={(e) => updateState((prev) => ({ ...prev, appearance: { ...prev.appearance, profileUrl: e.target.value } }))} placeholder={copy.profileImageUrlPlaceholder} />
              <button className="primary-btn" onClick={applyProfileUrl}>{copy.applyProfileUrl}</button>
            </div>
          </div>

          <SectionHeader
            title={locale === 'EN-US' ? 'Dev mode' : 'Dev mode'}
            subtitle={locale === 'EN-US' ? 'Enable editing for discipline labels, quote and backdated testing.' : 'Ative para editar labels da disciplina, frase e testar datas anteriores.'}
          />
          <div className="stack small-gap dev-mode-panel">
            <label className="toggle-row glass-inner">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => updateState((prev) => ({ ...prev, settings: { ...prev.settings, devMode: e.target.checked } }))}
              />
              <span>{locale === 'EN-US' ? 'Enable dev mode' : 'Ativar dev mode'}</span>
            </label>
            {devMode ? (
              <div className="stack small-gap">
                <div className="form-grid">
                  <Field label={locale === 'EN-US' ? 'Dashboard quote PT-BR' : 'Frase do dashboard PT-BR'}>
                    <input
                      value={dashboardQuotes['PT-BR'].text}
                      onChange={(e) => setDashboardQuoteValue('PT-BR', 'text', e.target.value)}
                    />
                  </Field>
                  <Field label={locale === 'EN-US' ? 'Quote author PT-BR' : 'Autor da frase PT-BR'}>
                    <input
                      value={dashboardQuotes['PT-BR'].author}
                      onChange={(e) => setDashboardQuoteValue('PT-BR', 'author', e.target.value)}
                    />
                  </Field>
                  <Field label={locale === 'EN-US' ? 'Dashboard quote EN-US' : 'Frase do dashboard EN-US'}>
                    <input
                      value={dashboardQuotes['EN-US'].text}
                      onChange={(e) => setDashboardQuoteValue('EN-US', 'text', e.target.value)}
                    />
                  </Field>
                  <Field label={locale === 'EN-US' ? 'Quote author EN-US' : 'Autor da frase EN-US'}>
                    <input
                      value={dashboardQuotes['EN-US'].author}
                      onChange={(e) => setDashboardQuoteValue('EN-US', 'author', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="form-grid compact-grid">
                  <Field label="0–39">
                    <input value={disciplineLabels.danger} onChange={(e) => setDisciplineLabel('danger', e.target.value)} />
                  </Field>
                  <Field label="40–69">
                    <input value={disciplineLabels.warn} onChange={(e) => setDisciplineLabel('warn', e.target.value)} />
                  </Field>
                  <Field label="70–89">
                    <input value={disciplineLabels.info} onChange={(e) => setDisciplineLabel('info', e.target.value)} />
                  </Field>
                  <Field label="90–100">
                    <input value={disciplineLabels.success} onChange={(e) => setDisciplineLabel('success', e.target.value)} />
                  </Field>
                </div>
                <div className="row-sub">{locale === 'EN-US' ? 'Custom status labels stay the same in both languages; edit the PT-BR and EN-US quotes separately.' : 'Os labels customizados ficam iguais nos dois idiomas; edite a frase PT-BR e EN-US separadamente.'}</div>
              </div>
            ) : null}
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
          <SectionHeader
            title={locale === 'EN-US' ? 'Cloud sync' : 'Cloud sync'}
            subtitle={
              locale === 'EN-US'
                ? 'Use a code to upload or download your state from the cloud.'
                : 'Use um código para enviar ou baixar seu estado da nuvem.'
            }
          />
          <div className="stack">
            <input
              value={syncKey}
              onChange={(e) => setSyncKey(e.target.value)}
              placeholder={locale === 'EN-US' ? 'Enter your sync code' : 'Informe seu código de sincronização'}
            />
            <div className="split-2">
              <button className="ghost-btn" onClick={handleCloudUpload} disabled={cloudSyncBusy}>
                <Upload size={16} />
                {cloudSyncBusy ? (locale === 'EN-US' ? 'Sending...' : 'Enviando...') : (locale === 'EN-US' ? 'Send to cloud' : 'Enviar para a nuvem')}
              </button>
              <button className="ghost-btn" onClick={handleCloudDownload} disabled={cloudSyncBusy}>
                <Download size={16} />
                {cloudSyncBusy ? (locale === 'EN-US' ? 'Loading...' : 'Carregando...') : (locale === 'EN-US' ? 'Load from cloud' : 'Baixar da nuvem')}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  })();

  const mobileMainNavItems = [
    ['dashboard', <LayoutDashboard size={16} />, copy.mobileNav.dashboard],
    ['routine', <ListTodo size={16} />, copy.mobileNav.routine],
    ['events', <Sparkles size={16} />, copy.mobileNav.events],
    ['habits', <Target size={16} />, copy.mobileNav.habits],
  ];
  const mobileMoreNavItems = [
    ['history', <CalendarDays size={16} />, copy.nav.history],
    ['stats', <BarChart3 size={16} />, copy.mobileNav.stats],
    ['pomodoro', <Focus size={16} />, copy.mobileNav.pomodoro],
    ['settings', <Settings size={16} />, copy.mobileNav.settings],
  ];
  const mobileMoreActive = mobileMoreNavItems.some(([key]) => page === key);

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
          <div className={cls('brand-box', !profileImageSrc && 'brand-box-no-photo')}>
            {profileImageSrc ? (
              <ProfileAvatar src={profileImageSrc} alt={sidebarTitle} crop={profileDisplayCrop} className="brand-mark brand-mark-image profile-brand-avatar" />
            ) : null}
            <div>
              <div className="brand-title">{sidebarTitle}</div>
              <div className="brand-subtitle">{sidebarSubtitle}</div>
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
              ['events', copy.nav.events, <Sparkles size={16} />],
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
          <div className="sidebar-bottom-stack">
            {hasWeeklyGoals ? (
              <div className="week-focus glass-inner">
                <div className="section-title with-icon"><Sparkles size={16} /> {copy.weeklyFocus}</div>
                <p>{weeklyGoals.join(' · ')}</p>
              </div>
            ) : null}
            <div className="creator-credit glass-inner"><span>{copy.creatorCreditLabel}</span><strong>{copy.creatorName}</strong></div>
          </div>
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
              ) : page === 'events' ? (
                <button className="ghost-btn" onClick={() => { setEventDraft({ title: '', description: '', date: selectedDate || todayISO() }); setShowEventForm(true); }}><Plus size={16} /> {locale === 'EN-US' ? 'Event' : 'Evento'}</button>
              ) : page === 'habits' ? (
                <button className="ghost-btn" onClick={openNewHabit}><Plus size={16} /> {copy.newHabit}</button>
              ) : null}
              <button className="ghost-btn" onClick={() => setPage('settings')}><Settings size={16} /></button>
            </div>
          </header>
          <div className="page-content">{pageBody}</div>
          <AnimatePresence>
            {mobileMoreOpen ? (
              <motion.div
                className="mobile-more-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMoreOpen(false)}
              >
                <motion.div
                  className="mobile-more-sheet glass"
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mobile-more-title">{copy.mobileNav.more}</div>
                  <div className="mobile-more-grid">
                    {mobileMoreNavItems.map(([key, icon, label]) => (
                      <button
                        key={key}
                        className={cls('mobile-more-btn', page === key && 'active')}
                        onClick={() => { setPage(key); setMobileMoreOpen(false); }}
                      >
                        {icon}<span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mobile-creator-credit"><span>{copy.creatorCreditLabel}</span><strong>{copy.creatorName}</strong></div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <nav className="mobile-nav glass">
            {mobileMainNavItems.map(([key, icon, label]) => (
              <button key={key} className={cls('mobile-btn', page === key && 'active')} onClick={() => { setPage(key); setMobileMoreOpen(false); }}>
                {icon}<span>{label}</span>
              </button>
            ))}
            <button
              className={cls('mobile-btn', mobileMoreActive && 'active')}
              onClick={() => setMobileMoreOpen((value) => !value)}
            >
              <MoreHorizontal size={16} /><span>{copy.mobileNav.more}</span>
            </button>
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
      <ProfileCropModal
        open={showProfileCropModal}
        locale={locale}
        imageSrc={profileOriginalImageSrc}
        crop={profileCropDraft}
        onCropChange={setProfileCropDraft}
        onReset={() => setProfileCropDraft({ ...DEFAULT_PROFILE_CROP })}
        onClose={() => setShowProfileCropModal(false)}
        onSave={saveProfileCrop}
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

function monthKeyFromISO(isoDate = todayISO()) {
  const d = parseISODateLocal(isoDate || todayISO());
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function addMonthsToKey(monthKey, amount) {
  const [year, month] = String(monthKey || monthKeyFromISO()).split('-').map(Number);
  const d = new Date(year || new Date().getFullYear(), (month || 1) - 1 + amount, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthLabel(monthKey, locale = 'PT-BR') {
  const [year, month] = String(monthKey || monthKeyFromISO()).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, (month || 1) - 1, 1));
}

function getMonthGridDates(monthKey) {
  const [year, month] = String(monthKey || monthKeyFromISO()).split('-').map(Number);
  const first = new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    return toLocalISODate(d);
  });
}

function isSameMonthKey(isoDate, monthKey) {
  return monthKeyFromISO(isoDate) === monthKey;
}

function DateSelector({ value, onChange, locale = 'PT-BR', discipline = null, className = '' }) {
  const rootRef = useRef(null);
  const safeValue = value || todayISO();
  const isToday = safeValue === todayISO();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(monthKeyFromISO(safeValue));

  useEffect(() => {
    setVisibleMonth(monthKeyFromISO(safeValue));
  }, [safeValue]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setPickerOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [pickerOpen]);

  function commit(nextDate, keepOpen = false) {
    const normalized = normalizeISODateInput(nextDate || todayISO());
    onChange(normalized);
    setVisibleMonth(monthKeyFromISO(normalized));
    if (!keepOpen) setPickerOpen(false);
  }

  const title = isToday ? (locale === 'EN-US' ? 'Today' : 'Hoje') : formatFullDate(safeValue, locale);
  const subtitle = [safeValue, discipline !== null && discipline !== undefined ? `${discipline}%` : null].filter(Boolean).join(' · ');
  const monthDates = getMonthGridDates(visibleMonth);

  return (
    <div className={cls('date-selector', className, pickerOpen && 'open')} ref={rootRef}>
      <button type="button" className="date-nav-btn" onClick={() => commit(offsetDate(safeValue, -1))} aria-label={locale === 'EN-US' ? 'Previous day' : 'Dia anterior'}>‹</button>
      <button type="button" className="date-display-btn" onClick={() => setPickerOpen((prev) => !prev)} aria-expanded={pickerOpen}>
        <span className="date-display-icon"><CalendarDays size={18} /></span>
        <span className="date-display-copy">
          <span>{locale === 'EN-US' ? 'Selected date' : 'Data selecionada'}</span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </button>
      <button type="button" className="date-nav-btn" onClick={() => commit(offsetDate(safeValue, 1))} aria-label={locale === 'EN-US' ? 'Next day' : 'Próximo dia'}>›</button>

      {pickerOpen ? (
        <div className="custom-date-popover">
          <div className="custom-date-head">
            <button type="button" className="custom-date-month-btn" onClick={() => setVisibleMonth((month) => addMonthsToKey(month, -1))} aria-label={locale === 'EN-US' ? 'Previous month' : 'Mês anterior'}>‹</button>
            <div className="custom-date-month-title">
              <strong>{monthLabel(visibleMonth, locale)}</strong>
              <span>{locale === 'EN-US' ? 'Pick the day below' : 'Escolha o dia abaixo'}</span>
            </div>
            <button type="button" className="custom-date-month-btn" onClick={() => setVisibleMonth((month) => addMonthsToKey(month, 1))} aria-label={locale === 'EN-US' ? 'Next month' : 'Próximo mês'}>›</button>
          </div>

          <div className="custom-date-weekdays">
            {(WEEKDAY_LABELS[locale] || WEEKDAY_LABELS['PT-BR']).map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="custom-date-grid">
            {monthDates.map((date) => {
              const dayNumber = parseISODateLocal(date).getDate();
              const active = date === safeValue;
              const current = date === todayISO();
              const outside = !isSameMonthKey(date, visibleMonth);
              return (
                <button
                  key={date}
                  type="button"
                  className={cls('custom-date-day', active && 'active', current && 'today', outside && 'outside')}
                  onClick={() => commit(date)}
                >
                  <span>{dayNumber}</span>
                </button>
              );
            })}
          </div>

          <div className="custom-date-actions">
            <button type="button" className="custom-date-link" onClick={() => commit(todayISO(), true)}>{locale === 'EN-US' ? 'Today' : 'Hoje'}</button>
            <button type="button" className="custom-date-close" onClick={() => setPickerOpen(false)}>{locale === 'EN-US' ? 'Close' : 'Fechar'}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateStrip({ dates, value, onChange, locale = 'PT-BR', getMetric = null }) {
  return (
    <div className="date-strip">
      {dates.map((date) => {
        const isActive = date === value;
        const isToday = date === todayISO();
        const metric = getMetric ? getMetric(date) : null;
        return (
          <button
            key={date}
            type="button"
            className={cls('date-chip', isActive && 'active', isToday && 'today')}
            onClick={() => onChange(date)}
          >
            <span>{weekdayLabel(getWeekdayFromISODate(date), locale)}</span>
            <strong>{pad2(parseISODateLocal(date).getDate())}</strong>
            <small>{isToday ? (locale === 'EN-US' ? 'Today' : 'Hoje') : formatShort(date, locale)}</small>
            {metric ? <em>{metric}</em> : null}
          </button>
        );
      })}
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
      <button className="task-check" onClick={() => onSetTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done', task.effectiveDate || task.date)}>
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
function LoadingScreen({ locale = 'PT-BR', backgroundValue, overlay = 0.34, themeMode = 'dark', durationMs = 2000 }) {
  const isLightTheme = themeMode === 'light';

  return (
    <div
      className={cls('loading-screen', isLightTheme ? 'loading-screen--light' : 'loading-screen--dark')}
      style={{
        '--bg-image': backgroundValue,
        '--overlay': overlay,
        '--loading-duration-ms': durationMs,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="bg-base" />
      <div className="bg-overlay" />
      <div className="loading-screen-card glass">
        <img
          src={`${import.meta.env.BASE_URL}mahoraga.png`}
          alt="Disciplina Total"
          className="loading-screen-logo"
        />
        <div className="loading-screen-title">Disciplina Total</div>
        <div className="loading-screen-subtitle">
          {locale === 'EN-US'
            ? 'Loading your panel...'
            : 'Carregando seu painel...'}
        </div>
        <div className="loading-screen-progress">
          <div className="loading-screen-progress-bar" />
        </div>
      </div>
    </div>
  );
}

function ModalShell({ open, onClose, children, cardClassName = '', allowBackdropClose = false }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (allowBackdropClose && event.target === event.currentTarget) onClose?.(); }} role="presentation">
      <div className={cls('modal-card', 'glass', cardClassName)} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}


function ProfileAvatar({ src, alt = '', crop = DEFAULT_PROFILE_CROP, className = '' }) {
  return (
    <div className={cls('profile-avatar-shell', className, !src && 'profile-avatar-empty')}>
      {src ? (
        <div className="profile-avatar-crop-layer" style={profileCropCss(crop)}>
          <img src={src} alt={alt} className="profile-avatar-img" draggable={false} />
        </div>
      ) : null}
    </div>
  );
}

function ProfileCropModal({ open, onClose, imageSrc, crop, onCropChange, onReset, onSave, locale = 'PT-BR' }) {
  const copy = getCopy(locale);
  const draft = normalizeProfileCrop(crop);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const updateCrop = (key, value) => {
    onCropChange?.(normalizeProfileCrop({ ...draft, [key]: Number(value) }));
  };

  const nudgeCrop = (key, amount) => {
    onCropChange?.(normalizeProfileCrop({ ...draft, [key]: Number(draft[key] || 0) + amount }));
  };

  const startDrag = (event) => {
    if (!frameRef.current) return;
    event.preventDefault();
    const rect = frameRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: draft.x,
      baseY: draft.y,
      size: Math.max(1, Math.min(rect.width, rect.height)),
    };
    frameRef.current.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = ((event.clientX - drag.startX) / drag.size) * 100;
    const deltaY = ((event.clientY - drag.startY) / drag.size) * 100;
    onCropChange?.(normalizeProfileCrop({ ...draft, x: drag.baseX + deltaX, y: drag.baseY + deltaY }));
  };

  const stopDrag = (event) => {
    if (dragRef.current && frameRef.current) {
      frameRef.current.releasePointerCapture?.(dragRef.current.pointerId || event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <ModalShell open={open && !!imageSrc} onClose={onClose} cardClassName="profile-crop-modal" allowBackdropClose>
      <div className="modal-head">
        <div>
          <div className="section-title">{copy.profileCropTitle}</div>
          <div className="section-subtitle">{copy.profileCropSub}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={copy.close}>×</button>
      </div>

      <div className="profile-crop-stage">
        <img src={imageSrc} alt="" className="profile-crop-backdrop" />
        <div
          ref={frameRef}
          className={cls('profile-crop-frame', dragging && 'is-dragging')}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          <div className="profile-avatar-crop-layer profile-crop-live-layer" style={profileCropCss(draft)}>
            <img src={imageSrc} alt="" className="profile-crop-image" draggable={false} />
          </div>
          <div className="profile-crop-circle" />
        </div>
      </div>

      <div className="profile-crop-controls">
        <label className="crop-slider-row">
          <span>{copy.profileCropZoom}</span>
          <div className="crop-range-line crop-range-line-with-steps">
            <button type="button" className="crop-step-btn" onClick={() => nudgeCrop('zoom', -0.25)} aria-label={copy.profileCropZoomOut}>−</button>
            <input type="range" min="1" max="12" step="0.01" value={draft.zoom} onChange={(e) => updateCrop('zoom', e.target.value)} />
            <button type="button" className="crop-step-btn" onClick={() => nudgeCrop('zoom', 0.25)} aria-label={copy.profileCropZoomIn}>+</button>
            <strong className="crop-value">{draft.zoom.toFixed(1)}x</strong>
          </div>
        </label>
        <label className="crop-slider-row">
          <span>{copy.profileCropHorizontal}</span>
          <div className="crop-range-line">
            <input type="range" min="-120" max="120" step="1" value={draft.x} onChange={(e) => updateCrop('x', e.target.value)} />
            <strong className="crop-value">{Math.round(draft.x)}%</strong>
          </div>
        </label>
        <label className="crop-slider-row">
          <span>{copy.profileCropVertical}</span>
          <div className="crop-range-line">
            <input type="range" min="-120" max="120" step="1" value={draft.y} onChange={(e) => updateCrop('y', e.target.value)} />
            <strong className="crop-value">{Math.round(draft.y)}%</strong>
          </div>
        </label>
      </div>

      <div className="modal-actions crop-modal-actions">
        <button className="ghost-btn crop-secondary-action" onClick={onReset}>{copy.resetCrop}</button>
        <div className="crop-action-right">
          <button className="ghost-btn crop-secondary-action" onClick={onClose}>{copy.cancel}</button>
          <button className="primary-btn crop-save-action" onClick={onSave}>{copy.saveCrop}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function TaskModal({ open, onClose, task, onSave, categories, locale = 'PT-BR' }) {
  const copy = getCopy(locale);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!task) {
      setDraft(null);
      return;
    }

    const normalizedTask = normalizeTaskRecord(task);
    setDraft({
      ...normalizedTask,
      subtasks: normalizedTask.subtasks?.length ? normalizedTask.subtasks : [{ id: uid(), title: '', done: false }],
    });
  }, [task]);

  if (!open || !draft) return null;

  function updateSubtask(index, value) {
    setDraft((prev) => ({ ...prev, subtasks: prev.subtasks.map((s, i) => (i === index ? { ...s, title: value } : s)) }));
  }

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
    setDraft((prev) => {
      const subtasks = (prev.subtasks || []).filter((_, i) => i !== index);
      return { ...prev, subtasks: subtasks.length ? subtasks : [{ id: uid(), title: '', done: false }] };
    });
  }

  function toggleRepeatDay(day) {
    setDraft((prev) => {
      const current = normalizeRepeatDays(prev.repeatDays);
      const next = current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b);
      return { ...prev, repeatDays: next };
    });
  }

  return (
    <ModalShell open={open} onClose={onClose} allowBackdropClose={false}>
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
        <Field label={copy.time}><input value={draft.time || ''} onChange={(e) => setDraft({ ...draft, time: e.target.value })} placeholder="08:00" /></Field>
        <div className="field helper-card"><span>{copy.discipline}</span><small>{copy.disciplineHelp}</small></div>
        <div className="field weekday-field">
          <span>{locale === 'EN-US' ? 'Weekdays / recurring routine' : 'Dias da semana / rotina recorrente'}</span>
          <div className="weekday-selector">
            {WEEKDAY_ORDER.map((day) => (
              <button key={day} type="button" className={cls('weekday-chip', normalizeRepeatDays(draft.repeatDays).includes(day) && 'active')} onClick={() => toggleRepeatDay(day)}>
                {weekdayLabel(day, locale)}
              </button>
            ))}
          </div>
          <small>{locale === 'EN-US' ? 'Leave all days unselected for a one-time task. Select one or more days to make it appear automatically from the chosen start date onward.' : 'Deixe todos os dias desmarcados para uma tarefa avulsa. Selecione um ou mais dias para ela aparecer automaticamente a partir da data escolhida.'}</small>
        </div>
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
    </ModalShell>
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
    <ModalShell open={open} onClose={onClose} allowBackdropClose={false}>
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
            <option value="leitura">{locale === 'EN-US' ? 'Reading' : 'Leitura'}</option><option value="trabalho">{locale === 'EN-US' ? 'Work' : 'Trabalho'}</option><option value="espiritualidade">{locale === 'EN-US' ? 'Spirituality' : 'Espiritualidade'}</option><option value="saude">{locale === 'EN-US' ? 'Health' : 'Saúde'}</option><option value="foco">{locale === 'EN-US' ? 'Focus' : 'Foco'}</option>
          </select>
        </Field>
        <NumberField label={copy.goalPerDay('').trim()} min={1} value={draft.target || 1} onCommit={(value) => setDraft({ ...draft, target: value })} />
      </div>
      <div className="task-actions-row end">
        <button className="ghost-btn" onClick={onClose}>{locale === 'EN-US' ? 'Cancel' : 'Cancelar'}</button>
        <button className="primary-btn" onClick={() => draft.title?.trim() && onSave({ ...draft, title: draft.title.trim(), logs: draft.logs || { [todayISO()]: 0 } })}>{copy.save}</button>
      </div>
    </ModalShell>
  );
}

function ResetConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, locale = 'PT-BR' }) {
  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose} cardClassName="confirm-modal-card" allowBackdropClose={false}>
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
    </ModalShell>
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