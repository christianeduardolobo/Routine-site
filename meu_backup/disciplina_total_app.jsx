import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Settings,
  CheckCircle2,
  Circle,
  Clock3,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Flame,
  Moon,
  Sun,
  Monitor,
  Target,
  Brain,
  Droplets,
  Dumbbell,
  BookOpen,
  Briefcase,
  HeartPulse,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Upload,
  Download,
  Image as ImageIcon,
  Layers3,
  TimerReset,
  Trophy,
  Sparkles,
  GripVertical,
  ChevronUp,
  ChevronDown,
  KanbanSquare,
  Focus,
  BadgeCheck,
  Bell,
  Palette,
  RefreshCcw,
  X,
  Save,
  Check,
  Calendar,
  ListTodo,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Wand2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

// =========================
// Helpers / Types
// =========================

type Page = "dashboard" | "routine" | "habits" | "history" | "stats" | "settings";
type Priority = "baixa" | "média" | "alta" | "crítica";
type TaskStatus = "pending" | "done" | "skipped" | "postponed";
type Density = "compact" | "normal" | "comfortable";
type CalcMode = "simple" | "weighted";
type ThemeMode = "light" | "dark" | "auto";
type BackgroundMode = "solid" | "gradient" | "url" | "preset";

type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  weight: number;
  time?: string;
  status: TaskStatus;
  recurring?: boolean;
  recurringDays?: number[];
  notes?: string;
  date: string;
  color: string;
  countsForDiscipline: boolean;
  subtasks: Subtask[];
  order: number;
};

type HabitLog = Record<string, number>;

type Habit = {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  frequency: "daily" | "weekly";
  target: number;
  weight: number;
  countsForDiscipline: boolean;
  notes?: string;
  logs: HabitLog;
};

type Reflection = {
  note: string;
  whatWentWell: string;
  pending: string;
  improveTomorrow: string;
};

type DaySnapshot = {
  date: string;
  tasks: Task[];
  habits: Array<{ habitId: string; count: number }>;
  discipline: number;
  reflection?: Reflection;
};

type BackgroundSettings = {
  mode: BackgroundMode;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  imageUrl: string;
  presetId: string;
  overlayOpacity: number;
  blur: number;
  darkness: number;
  size: "cover" | "contain" | "auto";
  position: string;
  repeat: boolean;
};

type Appearance = {
  themeMode: ThemeMode;
  primary: string;
  accent: string;
  radius: number;
  density: Density;
  font: "Inter" | "Manrope" | "Plus Jakarta Sans";
  reducedMotion: boolean;
  compactMode: boolean;
};

type SettingsState = {
  userName: string;
  dailyGoal: number;
  weeklyGoal: number;
  calculationMode: CalcMode;
  preferredPeriod: "morning" | "afternoon" | "night";
  motivationalPhrases: boolean;
  categories: string[];
  colorPresets: string[];
  focusTask: string;
  cannotFailToday: string;
  weeklyGoals: string[];
  notificationsEnabled: boolean;
};

type AppState = {
  tasks: Task[];
  habits: Habit[];
  history: DaySnapshot[];
  reflections: Record<string, Reflection>;
  settings: SettingsState;
  appearance: Appearance;
  background: BackgroundSettings;
};

const STORAGE_KEY = "disciplina-total-v1";
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowDateTimeLabel = () =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(new Date());
const cls = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
const uid = () => Math.random().toString(36).slice(2, 9);
const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const shortWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const priorityOrder: Record<Priority, number> = {
  baixa: 1,
  média: 2,
  alta: 3,
  crítica: 4,
};

const priorityClasses: Record<Priority, string> = {
  baixa: "bg-white/10 text-white/80 border-white/10",
  média: "bg-sky-500/15 text-sky-200 border-sky-300/20",
  alta: "bg-amber-500/15 text-amber-200 border-amber-300/20",
  crítica: "bg-rose-500/15 text-rose-200 border-rose-300/20",
};

const statusMeta: Record<TaskStatus, { label: string; dot: string }> = {
  pending: { label: "Pendente", dot: "bg-white/40" },
  done: { label: "Feita", dot: "bg-emerald-400" },
  skipped: { label: "Não feita", dot: "bg-rose-400" },
  postponed: { label: "Adiada", dot: "bg-amber-400" },
};

const habitIconMap: Record<string, React.ReactNode> = {
  treino: <Dumbbell className="h-4 w-4" />,
  leitura: <BookOpen className="h-4 w-4" />,
  trabalho: <Briefcase className="h-4 w-4" />,
  espiritualidade: <Sparkles className="h-4 w-4" />,
  água: <Droplets className="h-4 w-4" />,
  saúde: <HeartPulse className="h-4 w-4" />,
  sono: <BedDouble className="h-4 w-4" />,
  foco: <Brain className="h-4 w-4" />,
};

const bgPresets = [
  {
    id: "midnight-lux",
    name: "Midnight Lux",
    css: "linear-gradient(135deg, rgba(8,12,24,1) 0%, rgba(20,28,48,1) 45%, rgba(35,17,53,1) 100%)",
  },
  {
    id: "electric-depth",
    name: "Electric Depth",
    css: "linear-gradient(135deg, rgba(4,17,39,1) 0%, rgba(0,76,103,1) 50%, rgba(36,20,58,1) 100%)",
  },
  {
    id: "pure-fog",
    name: "Pure Fog",
    css: "linear-gradient(135deg, rgba(250,250,252,1) 0%, rgba(232,238,246,1) 100%)",
  },
  {
    id: "emerald-drift",
    name: "Emerald Drift",
    css: "linear-gradient(135deg, rgba(8,28,26,1) 0%, rgba(14,68,55,1) 52%, rgba(8,20,31,1) 100%)",
  },
  {
    id: "sunset-code",
    name: "Sunset Code",
    css: "linear-gradient(135deg, rgba(20,14,36,1) 0%, rgba(92,26,68,1) 55%, rgba(252,102,0,1) 100%)",
  },
  {
    id: "soft-gold",
    name: "Soft Gold",
    css: "linear-gradient(135deg, rgba(255,251,235,1) 0%, rgba(245,236,208,1) 100%)",
  },
];

const motivationalPhrases = [
  "Consistência silenciosa constrói resultados que o impulso não sustenta.",
  "Seu progresso aparece primeiro no padrão, depois no resultado.",
  "Hoje não precisa ser perfeito. Precisa ser executado.",
  "Disciplina é decidir com clareza quando a emoção quer negociar.",
  "A elegância da rotina está em repetir o que funciona.",
];

const sampleData = (): AppState => {
  const date = todayISO();
  const yesterday = offsetDate(date, -1);
  const before2 = offsetDate(date, -2);
  const before3 = offsetDate(date, -3);
  const before4 = offsetDate(date, -4);
  const before5 = offsetDate(date, -5);
  const before6 = offsetDate(date, -6);

  const tasks: Task[] = [
    {
      id: uid(),
      title: "Treino de força",
      description: "Treino principal do dia com foco em execução completa.",
      category: "saúde",
      priority: "alta",
      weight: 3,
      time: "06:30",
      status: "done",
      recurring: true,
      recurringDays: [1, 2, 4, 5],
      notes: "Progressão de carga semanal.",
      date,
      color: "#10b981",
      countsForDiscipline: true,
      subtasks: [
        { id: uid(), title: "Alongamento", done: true },
        { id: uid(), title: "Treino completo", done: true },
      ],
      order: 1,
    },
    {
      id: uid(),
      title: "Leitura estratégica",
      description: "30 minutos de leitura com anotação.",
      category: "estudo",
      priority: "média",
      weight: 2,
      time: "08:00",
      status: "done",
      recurring: true,
      recurringDays: [0, 1, 2, 3, 4, 5, 6],
      notes: "Livro atual: mentalidade e execução.",
      date,
      color: "#60a5fa",
      countsForDiscipline: true,
      subtasks: [{ id: uid(), title: "Destacar 3 ideias", done: true }],
      order: 2,
    },
    {
      id: uid(),
      title: "Estudar 2 horas",
      description: "Bloco profundo sem interrupções.",
      category: "estudo",
      priority: "crítica",
      weight: 4,
      time: "09:00",
      status: "pending",
      recurring: true,
      recurringDays: [1, 2, 3, 4, 5],
      notes: "Celular longe.",
      date,
      color: "#f97316",
      countsForDiscipline: true,
      subtasks: [
        { id: uid(), title: "1º bloco de 50min", done: false },
        { id: uid(), title: "2º bloco de 50min", done: false },
      ],
      order: 3,
    },
    {
      id: uid(),
      title: "Oração e silêncio",
      description: "Momento de centrar mente e espírito.",
      category: "espiritualidade",
      priority: "alta",
      weight: 2,
      time: "07:20",
      status: "done",
      recurring: true,
      recurringDays: [0, 1, 2, 3, 4, 5, 6],
      notes: "10 minutos.",
      date,
      color: "#a78bfa",
      countsForDiscipline: true,
      subtasks: [],
      order: 4,
    },
    {
      id: uid(),
      title: "Revisão de metas da semana",
      description: "Checar avanço e ajustar prioridades.",
      category: "trabalho",
      priority: "média",
      weight: 2,
      time: "11:30",
      status: "postponed",
      recurring: false,
      recurringDays: [],
      notes: "Reagendar para o fim da tarde.",
      date,
      color: "#22c55e",
      countsForDiscipline: true,
      subtasks: [],
      order: 5,
    },
    {
      id: uid(),
      title: "Organizar finanças",
      description: "Conferir pagamentos e fluxo da semana.",
      category: "financeiro",
      priority: "alta",
      weight: 3,
      time: "18:00",
      status: "pending",
      recurring: true,
      recurringDays: [1, 3, 5],
      notes: "15 minutos objetivos.",
      date,
      color: "#14b8a6",
      countsForDiscipline: true,
      subtasks: [{ id: uid(), title: "Atualizar planilha", done: false }],
      order: 6,
    },
  ];

  const habits: Habit[] = [
    {
      id: uid(),
      title: "Beber água",
      category: "saúde",
      icon: "água",
      color: "#38bdf8",
      frequency: "daily",
      target: 8,
      weight: 2,
      countsForDiscipline: true,
      logs: { [date]: 6, [yesterday]: 8, [before2]: 7, [before3]: 8, [before4]: 5, [before5]: 8, [before6]: 7 },
    },
    {
      id: uid(),
      title: "Dormir cedo",
      category: "saúde",
      icon: "sono",
      color: "#818cf8",
      frequency: "daily",
      target: 1,
      weight: 2,
      countsForDiscipline: true,
      logs: { [date]: 1, [yesterday]: 1, [before2]: 0, [before3]: 1, [before4]: 1, [before5]: 0, [before6]: 1 },
    },
    {
      id: uid(),
      title: "Trabalho profundo",
      category: "trabalho",
      icon: "foco",
      color: "#f59e0b",
      frequency: "daily",
      target: 3,
      weight: 3,
      countsForDiscipline: true,
      logs: { [date]: 1, [yesterday]: 3, [before2]: 2, [before3]: 3, [before4]: 3, [before5]: 2, [before6]: 3 },
    },
    {
      id: uid(),
      title: "Leitura",
      category: "estudo",
      icon: "leitura",
      color: "#60a5fa",
      frequency: "daily",
      target: 1,
      weight: 2,
      countsForDiscipline: true,
      logs: { [date]: 1, [yesterday]: 1, [before2]: 1, [before3]: 0, [before4]: 1, [before5]: 1, [before6]: 1 },
    },
    {
      id: uid(),
      title: "Oração / espiritualidade",
      category: "espiritualidade",
      icon: "espiritualidade",
      color: "#c084fc",
      frequency: "daily",
      target: 1,
      weight: 2,
      countsForDiscipline: true,
      logs: { [date]: 1, [yesterday]: 1, [before2]: 1, [before3]: 1, [before4]: 1, [before5]: 1, [before6]: 1 },
    },
  ];

  const history: DaySnapshot[] = [
    { date: before6, tasks: cloneTasksForDay(tasks, before6, ["done", "done", "done", "done", "done", "pending"]), habits: habitSnapshot(habits, before6), discipline: 88 },
    { date: before5, tasks: cloneTasksForDay(tasks, before5, ["done", "done", "pending", "done", "postponed", "done"]), habits: habitSnapshot(habits, before5), discipline: 76 },
    { date: before4, tasks: cloneTasksForDay(tasks, before4, ["done", "done", "done", "done", "pending", "done"]), habits: habitSnapshot(habits, before4), discipline: 91 },
    { date: before3, tasks: cloneTasksForDay(tasks, before3, ["done", "pending", "done", "done", "done", "skipped"]), habits: habitSnapshot(habits, before3), discipline: 72 },
    { date: before2, tasks: cloneTasksForDay(tasks, before2, ["done", "done", "done", "done", "postponed", "pending"]), habits: habitSnapshot(habits, before2), discipline: 81 },
    { date: yesterday, tasks: cloneTasksForDay(tasks, yesterday, ["done", "done", "done", "done", "done", "done"]), habits: habitSnapshot(habits, yesterday), discipline: 97 },
  ];

  return {
    tasks,
    habits,
    history,
    reflections: {
      [date]: {
        note: "Hoje exige presença e execução limpa.",
        whatWentWell: "Comecei o dia com consistência e direção.",
        pending: "Fechar o bloco de estudo e as finanças.",
        improveTomorrow: "Entrar mais cedo no foco profundo.",
      },
    },
    settings: {
      userName: "José",
      dailyGoal: 80,
      weeklyGoal: 85,
      calculationMode: "weighted",
      preferredPeriod: "morning",
      motivationalPhrases: true,
      categories: ["saúde", "espiritualidade", "estudo", "trabalho", "pessoal", "financeiro"],
      colorPresets: ["#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#c084fc", "#14b8a6"],
      focusTask: "Estudar 2 horas",
      cannotFailToday: "Fechar o bloco de estudo profundo",
      weeklyGoals: ["Treinar 4x", "Manter média acima de 85%", "Revisar finanças 3x"],
      notificationsEnabled: false,
    },
    appearance: {
      themeMode: "dark",
      primary: "#60a5fa",
      accent: "#c084fc",
      radius: 22,
      density: "normal",
      font: "Manrope",
      reducedMotion: false,
      compactMode: false,
    },
    background: {
      mode: "preset",
      solidColor: "#08101e",
      gradientFrom: "#08101e",
      gradientTo: "#1e293b",
      gradientAngle: 140,
      imageUrl: "",
      presetId: "midnight-lux",
      overlayOpacity: 0.4,
      blur: 18,
      darkness: 0.35,
      size: "cover",
      position: "center",
      repeat: false,
    },
  };
};

function cloneTasksForDay(tasks: Task[], date: string, statuses: TaskStatus[]) {
  return tasks.map((t, index) => ({ ...t, id: uid(), date, status: statuses[index] || "pending" }));
}

function habitSnapshot(habits: Habit[], date: string) {
  return habits.map((h) => ({ habitId: h.id, count: h.logs[date] || 0 }));
}

function offsetDate(date: string, amount: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

function percentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(date + "T00:00:00"));
}

function getDisciplineLabel(value: number) {
  if (value <= 39) return { label: "Recovery mode", color: "text-rose-300", tone: "bg-rose-500/15 border-rose-400/20" };
  if (value <= 69) return { label: "Building momentum", color: "text-amber-300", tone: "bg-amber-500/15 border-amber-400/20" };
  if (value <= 89) return { label: "Stay Hard", color: "text-sky-300", tone: "bg-sky-500/15 border-sky-400/20" };
  return { label: "Locked in", color: "text-emerald-300", tone: "bg-emerald-500/15 border-emerald-400/20" };
}

function buildBackgroundStyle(bg: BackgroundSettings) {
  const preset = bgPresets.find((p) => p.id === bg.presetId);
  const baseImage =
    bg.mode === "solid"
      ? undefined
      : bg.mode === "gradient"
      ? `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`
      : bg.mode === "preset"
      ? preset?.css
      : bg.imageUrl
      ? `url(${bg.imageUrl})`
      : undefined;

  return {
    background: bg.mode === "solid" ? bg.solidColor : undefined,
    backgroundImage: baseImage,
    backgroundSize: bg.mode === "url" ? bg.size : undefined,
    backgroundPosition: bg.mode === "url" ? bg.position : undefined,
    backgroundRepeat: bg.mode === "url" ? (bg.repeat ? "repeat" : "no-repeat") : undefined,
  } as React.CSSProperties;
}

function inferTheme(mode: ThemeMode) {
  if (mode === "auto") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }
  return mode;
}

function persistState(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): AppState {
  if (typeof window === "undefined") return sampleData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleData();
    return JSON.parse(raw);
  } catch {
    return sampleData();
  }
}

function useToast() {
  const [items, setItems] = useState<Array<{ id: string; title: string; description?: string }>>([]);
  const push = (title: string, description?: string) => {
    const id = uid();
    setItems((prev) => [...prev, { id, title, description }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2400);
  };
  return { items, push };
}

function disciplineForDate(state: AppState, date: string) {
  const tasks = state.tasks.filter((t) => t.date === date && t.countsForDiscipline);
  const habits = state.habits.filter((h) => h.countsForDiscipline);
  const calcMode = state.settings.calculationMode;

  let taskPercent = 0;
  if (tasks.length) {
    if (calcMode === "simple") {
      const concluded = tasks.filter((t) => t.status === "done").length;
      taskPercent = (concluded / tasks.length) * 100;
    } else {
      const total = tasks.reduce((sum, t) => sum + (t.weight || 1), 0);
      const done = tasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.weight || 1), 0);
      taskPercent = total ? (done / total) * 100 : 0;
    }
  }

  let habitPercent = 0;
  if (habits.length) {
    if (calcMode === "simple") {
      const total = habits.length;
      const done = habits.filter((h) => (h.logs[date] || 0) >= h.target).length;
      habitPercent = total ? (done / total) * 100 : 0;
    } else {
      const total = habits.reduce((sum, h) => sum + (h.weight || 1), 0);
      const done = habits
        .filter((h) => (h.logs[date] || 0) >= h.target)
        .reduce((sum, h) => sum + (h.weight || 1), 0);
      habitPercent = total ? (done / total) * 100 : 0;
    }
  }

  if (!tasks.length && !habits.length) return 0;
  if (tasks.length && habits.length) return percentage((taskPercent + habitPercent) / 2);
  return percentage(taskPercent || habitPercent);
}

function buildHistoryWithToday(state: AppState) {
  const date = todayISO();
  const todayValue = disciplineForDate(state, date);
  const others = state.history.filter((h) => h.date !== date);
  return [
    ...others,
    {
      date,
      tasks: state.tasks.filter((t) => t.date === date),
      habits: state.habits.map((h) => ({ habitId: h.id, count: h.logs[date] || 0 })),
      discipline: todayValue,
      reflection: state.reflections[date],
    },
  ].sort((a, b) => a.date.localeCompare(b.date));
}

function getStreak(values: number[], threshold: number) {
  let streak = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] >= threshold) streak++;
    else break;
  }
  return streak;
}

function bestAndWorst(history: DaySnapshot[]) {
  if (!history.length) return { best: null as DaySnapshot | null, worst: null as DaySnapshot | null };
  const sorted = [...history].sort((a, b) => a.discipline - b.discipline);
  return { worst: sorted[0], best: sorted[sorted.length - 1] };
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getDayOfWeek(date: string) {
  return new Date(date + "T00:00:00").getDay();
}

function getDateRange(lastDays: number) {
  const end = todayISO();
  return Array.from({ length: lastDays }).map((_, idx) => offsetDate(end, -(lastDays - idx - 1)));
}

// =========================
// Main App
// =========================

export default function DisciplinaTotalApp() {
  const [state, setState] = useState<AppState>(sampleData());
  const [page, setPage] = useState<Page>("dashboard");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [historyDate, setHistoryDate] = useState(todayISO());
  const [kanban, setKanban] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [pomodoro, setPomodoro] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [quickTask, setQuickTask] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bgUploadRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const interval = setInterval(() => {
      setPomodoro((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPomodoroRunning(false);
          toast.push("Ciclo concluído", "Seu bloco de foco terminou.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomodoroRunning]);

  const activeTheme = inferTheme(state.appearance.themeMode);
  const backgroundStyle = buildBackgroundStyle(state.background);
  const todayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === todayISO()).sort((a, b) => a.order - b.order || priorityOrder[b.priority] - priorityOrder[a.priority]),
    [state.tasks]
  );
  const filteredTodayTasks = useMemo(() => {
    return todayTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || (task.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || task.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [todayTasks, search, filterCategory]);

  const todayDiscipline = disciplineForDate(state, todayISO());
  const fullHistory = useMemo(() => buildHistoryWithToday(state), [state]);
  const last7Dates = getDateRange(7);
  const weekSeries = last7Dates.map((d) => ({ date: formatDate(d), raw: d, discipline: disciplineForDate(state, d) }));
  const monthSeries = getDateRange(30).map((d) => ({ date: formatDate(d), raw: d, discipline: disciplineForDate(state, d) }));
  const weekAverage = percentage(weekSeries.reduce((sum, i) => sum + i.discipline, 0) / weekSeries.length);
  const monthAverage = percentage(monthSeries.reduce((sum, i) => sum + i.discipline, 0) / monthSeries.length);
  const generalAverage = percentage(fullHistory.reduce((sum, i) => sum + i.discipline, 0) / (fullHistory.length || 1));
  const { best, worst } = bestAndWorst(fullHistory);
  const streak = getStreak(weekSeries.map((i) => i.discipline), state.settings.dailyGoal);
  const record = Math.max(...fullHistory.map((i) => i.discipline), 0);
  const todayLabel = getDisciplineLabel(todayDiscipline);
  const todayDoneCount = todayTasks.filter((t) => t.status === "done").length;
  const todayPendingCount = todayTasks.filter((t) => t.status === "pending").length;
  const todayPostponedCount = todayTasks.filter((t) => t.status === "postponed").length;
  const completionDelta = fullHistory.length >= 2 ? todayDiscipline - fullHistory[fullHistory.length - 2].discipline : 0;
  const productivityByHour = buildProductivityByHour(todayTasks);
  const byCategory = Object.entries(groupBy(todayTasks, (t) => t.category)).map(([name, items]) => ({ name, value: items.filter((i) => i.status === "done").length }));
  const byPriority = Object.entries(groupBy(todayTasks, (t) => t.priority)).map(([name, items]) => ({ name, value: items.filter((i) => i.status === "done").length }));
  const habitsDistribution = state.habits.map((h) => ({ name: h.title, value: Math.min(100, Math.round(((h.logs[todayISO()] || 0) / h.target) * 100)) }));
  const weekdayAverage = shortWeek.map((label, idx) => {
    const mappedIndex = idx === 6 ? 0 : idx + 1;
    const matched = fullHistory.filter((h) => getDayOfWeek(h.date) === mappedIndex);
    return {
      day: label,
      value: matched.length ? percentage(matched.reduce((sum, i) => sum + i.discipline, 0) / matched.length) : 0,
    };
  });

  const densityClass =
    state.appearance.density === "compact"
      ? "gap-3 text-[13px]"
      : state.appearance.density === "comfortable"
      ? "gap-6 text-[15px]"
      : "gap-4 text-sm";

  const baseFontClass =
    state.appearance.font === "Manrope"
      ? "[font-family:Manrope,ui-sans-serif,system-ui]"
      : state.appearance.font === "Plus Jakarta Sans"
      ? "[font-family:'Plus_Jakarta_Sans',ui-sans-serif,system-ui]"
      : "[font-family:Inter,ui-sans-serif,system-ui]";

  const updateState = (updater: (prev: AppState) => AppState) => setState((prev) => updater(prev));

  const addOrUpdateTask = (task: Task) => {
    updateState((prev) => {
      const exists = prev.tasks.some((t) => t.id === task.id);
      const tasks = exists ? prev.tasks.map((t) => (t.id === task.id ? task : t)) : [...prev.tasks, task];
      return { ...prev, tasks };
    });
    toast.push(editingTask ? "Tarefa atualizada" : "Tarefa criada", task.title);
    setTaskDialogOpen(false);
    setEditingTask(null);
  };

  const addOrUpdateHabit = (habit: Habit) => {
    updateState((prev) => {
      const exists = prev.habits.some((h) => h.id === habit.id);
      const habits = exists ? prev.habits.map((h) => (h.id === habit.id ? habit : h)) : [...prev.habits, habit];
      return { ...prev, habits };
    });
    toast.push(editingHabit ? "Hábito atualizado" : "Hábito criado", habit.title);
    setHabitDialogOpen(false);
    setEditingHabit(null);
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));
    toast.push(status === "done" ? "Tarefa concluída" : "Status atualizado");
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
            }
          : t
      ),
    }));
  };

  const deleteTask = (taskId: string) => {
    updateState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }));
    toast.push("Tarefa removida");
  };

  const duplicateTask = (task: Task) => {
    const copy = { ...task, id: uid(), title: `${task.title} (cópia)`, order: task.order + 0.1 };
    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, copy] }));
    toast.push("Tarefa duplicada", copy.title);
  };

  const moveTask = (taskId: string, direction: "up" | "down") => {
    const items = [...todayTasks];
    const index = items.findIndex((t) => t.id === taskId);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        const found = items.find((i) => i.id === task.id);
        return found ? { ...task, order: items.findIndex((i) => i.id === task.id) + 1 } : task;
      }),
    }));
  };

  const quickAddTask = () => {
    if (!quickTask.trim()) return;
    const newTask: Task = {
      id: uid(),
      title: quickTask.trim(),
      description: "",
      category: "pessoal",
      priority: "média",
      weight: 1,
      time: "",
      status: "pending",
      recurring: false,
      recurringDays: [],
      notes: "",
      date: todayISO(),
      color: state.appearance.primary,
      countsForDiscipline: true,
      subtasks: [],
      order: todayTasks.length + 1,
    };
    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setQuickTask("");
    toast.push("Adicionado rapidamente", newTask.title);
  };

  const incrementHabit = (habitId: string, delta: number) => {
    updateState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const current = h.logs[todayISO()] || 0;
        const next = Math.max(0, current + delta);
        return { ...h, logs: { ...h.logs, [todayISO()]: next } };
      }),
    }));
  };

  const deleteHabit = (habitId: string) => {
    updateState((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== habitId) }));
    toast.push("Hábito removido");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disciplina-total-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push("Backup exportado");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setState(parsed);
        toast.push("Backup importado com sucesso");
      } catch {
        toast.push("Erro ao importar", "Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    setState(sampleData());
    toast.push("Dados restaurados", "O app voltou ao estado inicial.");
  };

  const resetToday = () => {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.date === todayISO() ? { ...t, status: "pending" } : t)),
      habits: prev.habits.map((h) => ({ ...h, logs: { ...h.logs, [todayISO()]: 0 } })),
      reflections: { ...prev.reflections, [todayISO()]: { note: "", whatWentWell: "", pending: "", improveTomorrow: "" } },
    }));
    toast.push("Dia atual resetado");
  };

  const resetHistory = () => {
    updateState((prev) => ({ ...prev, history: [] }));
    toast.push("Histórico limpo");
  };

  const applyBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateState((prev) => ({
        ...prev,
        background: { ...prev.background, mode: "url", imageUrl: String(reader.result) },
      }));
      toast.push("Background aplicado");
    };
    reader.readAsDataURL(file);
  };

  const pageContent = () => {
    switch (page) {
      case "dashboard":
        return (
          <DashboardPage
            state={state}
            todayTasks={todayTasks}
            todayDiscipline={todayDiscipline}
            todayDoneCount={todayDoneCount}
            todayPendingCount={todayPendingCount}
            todayPostponedCount={todayPostponedCount}
            weekSeries={weekSeries}
            weekAverage={weekAverage}
            streak={streak}
            label={todayLabel}
            fullHistory={fullHistory}
            completionDelta={completionDelta}
            onSetPage={setPage}
            onOpenTask={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            onSetTaskStatus={setTaskStatus}
            onIncrementHabit={incrementHabit}
            onSaveReflection={(reflection) =>
              updateState((prev) => ({ ...prev, reflections: { ...prev.reflections, [todayISO()]: reflection } }))
            }
            onQuickAddTask={quickAddTask}
            quickTask={quickTask}
            setQuickTask={setQuickTask}
            pomodoro={pomodoro}
            setPomodoro={setPomodoro}
            pomodoroRunning={pomodoroRunning}
            setPomodoroRunning={setPomodoroRunning}
          />
        );
      case "routine":
        return (
          <RoutinePage
            state={state}
            filteredTodayTasks={filteredTodayTasks}
            search={search}
            setSearch={setSearch}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            kanban={kanban}
            setKanban={setKanban}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskDialogOpen(true);
            }}
            onOpenTask={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            onDeleteTask={deleteTask}
            onDuplicateTask={duplicateTask}
            onSetTaskStatus={setTaskStatus}
            onMoveTask={moveTask}
            onToggleSubtask={toggleSubtask}
          />
        );
      case "habits":
        return (
          <HabitsPage
            habits={state.habits}
            onIncrementHabit={incrementHabit}
            onOpenNew={() => {
              setEditingHabit(null);
              setHabitDialogOpen(true);
            }}
            onEditHabit={(habit) => {
              setEditingHabit(habit);
              setHabitDialogOpen(true);
            }}
            onDeleteHabit={deleteHabit}
          />
        );
      case "history":
        return (
          <HistoryPage
            history={fullHistory}
            state={state}
            selectedDate={historyDate}
            onSelectDate={setHistoryDate}
          />
        );
      case "stats":
        return (
          <StatsPage
            weekSeries={weekSeries}
            monthSeries={monthSeries}
            byCategory={byCategory}
            byPriority={byPriority}
            weekdayAverage={weekdayAverage}
            habitsDistribution={habitsDistribution}
            productivityByHour={productivityByHour}
            best={best}
            worst={worst}
            weekAverage={weekAverage}
            monthAverage={monthAverage}
            generalAverage={generalAverage}
            streak={streak}
            record={record}
          />
        );
      case "settings":
        return (
          <SettingsPage
            state={state}
            updateState={updateState}
            exportData={exportData}
            resetAll={resetAll}
            resetToday={resetToday}
            resetHistory={resetHistory}
            fileInputRef={fileInputRef}
            importData={importData}
            bgUploadRef={bgUploadRef}
            applyBackgroundUpload={applyBackgroundUpload}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cls(
        "min-h-screen w-full overflow-hidden transition-colors duration-500",
        activeTheme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900",
        baseFontClass
      )}
      style={{
        ...backgroundStyle,
        ["--primary" as any]: state.appearance.primary,
        ["--accent" as any]: state.appearance.accent,
        ["--radius" as any]: `${state.appearance.radius}px`,
      }}
    >
      <div className="pointer-events-none fixed inset-0" style={{ backdropFilter: `blur(${state.background.blur}px)` }} />
      <div
        className={cls("fixed inset-0", activeTheme === "dark" ? "bg-black" : "bg-white")}
        style={{ opacity: state.background.overlayOpacity + state.background.darkness * 0.35 }}
      />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar page={page} setPage={setPage} state={state} mobileSidebar={mobileSidebar} setMobileSidebar={setMobileSidebar} />

        <div className="flex min-h-screen w-full flex-1 flex-col">
          <Header
            page={page}
            onAddTask={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            onOpenSettings={() => setPage("settings")}
            state={state}
            onOpenSidebar={() => setMobileSidebar(true)}
          />

          <main className={cls("flex-1 px-4 pb-28 pt-4 md:px-6 lg:px-8", densityClass)}>{pageContent()}</main>

          <MobileNav page={page} setPage={setPage} />

          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            className="fixed bottom-24 right-4 z-30 h-14 rounded-full px-5 shadow-2xl md:bottom-8 md:right-8"
            style={{ background: state.appearance.primary }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        categories={state.settings.categories}
        onSubmit={addOrUpdateTask}
        primary={state.appearance.primary}
      />

      <HabitDialog
        open={habitDialogOpen}
        onOpenChange={(open) => {
          setHabitDialogOpen(open);
          if (!open) setEditingHabit(null);
        }}
        habit={editingHabit}
        categories={state.settings.categories}
        onSubmit={addOrUpdateHabit}
        primary={state.appearance.primary}
      />

      <ToastLayer items={toast.items} />
    </div>
  );
}

// =========================
// Layout
// =========================

function GlassCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cls("rounded-[var(--radius)] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl", className)}>{children}</div>
  );
}

function Sidebar({
  page,
  setPage,
  state,
  mobileSidebar,
  setMobileSidebar,
}: {
  page: Page;
  setPage: (page: Page) => void;
  state: AppState;
  mobileSidebar: boolean;
  setMobileSidebar: (open: boolean) => void;
}) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "routine", label: "Rotina do Dia", icon: ListTodo },
    { key: "habits", label: "Hábitos", icon: Target },
    { key: "history", label: "Histórico", icon: CalendarDays },
    { key: "stats", label: "Estatísticas", icon: BarChart3 },
    { key: "settings", label: "Configurações", icon: Settings },
  ] as const;

  const content = (
    <div className="flex h-full w-[280px] flex-col gap-4 px-4 py-5">
      <GlassCard className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">Disciplina Total</div>
            <div className="text-xs text-white/65">Controle, progresso e consistência</div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
          <div className="text-xs text-white/60">Meta diária</div>
          <div className="mt-1 text-2xl font-semibold">{state.settings.dailyGoal}%</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
            <Trophy className="h-3.5 w-3.5" />
            Recorde pessoal: {Math.max(0, ...buildHistoryWithToday(state).map((d) => d.discipline))}%
          </div>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setPage(item.key as Page);
                setMobileSidebar(false);
              }}
              className={cls(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all",
                active ? "bg-white/15 text-white shadow-lg" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4" />
            Foco da semana
          </div>
          <p className="text-sm text-white/75">{state.settings.weeklyGoals.join(" · ")}</p>
        </GlassCard>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden border-r border-white/10 bg-black/15 md:block">{content}</aside>

      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 h-screen border-r border-white/10 bg-slate-950/90 md:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Header({
  page,
  onAddTask,
  onOpenSettings,
  state,
  onOpenSidebar,
}: {
  page: Page;
  onAddTask: () => void;
  onOpenSettings: () => void;
  state: AppState;
  onOpenSidebar: () => void;
}) {
  const activeTheme = inferTheme(state.appearance.themeMode);
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="md:hidden" onClick={onOpenSidebar}>
            <Layers3 className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-sm text-white/60">{nowDateTimeLabel()}</div>
            <h1 className="text-2xl font-semibold tracking-tight capitalize">{titleByPage(page)}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden md:flex" onClick={onAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
          <Button variant="outline" size="icon" onClick={onOpenSettings}>
            <Palette className="h-4 w-4" />
          </Button>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/75">
            {activeTheme === "dark" ? "Dark" : "Light"} mode
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home" },
    { key: "routine", icon: ListTodo, label: "Rotina" },
    { key: "habits", icon: Target, label: "Hábitos" },
    { key: "stats", icon: BarChart3, label: "Stats" },
    { key: "settings", icon: Settings, label: "Ajustes" },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key as Page)}
              className={cls(
                "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] transition",
                active ? "bg-white/15 text-white" : "text-white/60"
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function titleByPage(page: Page) {
  return {
    dashboard: "Dashboard",
    routine: "Rotina do dia",
    habits: "Hábitos",
    history: "Histórico",
    stats: "Estatísticas",
    settings: "Configurações",
  }[page];
}

// =========================
// Dashboard
// =========================

function DashboardPage({
  state,
  todayTasks,
  todayDiscipline,
  todayDoneCount,
  todayPendingCount,
  todayPostponedCount,
  weekSeries,
  weekAverage,
  streak,
  label,
  fullHistory,
  completionDelta,
  onSetPage,
  onOpenTask,
  onSetTaskStatus,
  onIncrementHabit,
  onSaveReflection,
  onQuickAddTask,
  quickTask,
  setQuickTask,
  pomodoro,
  setPomodoro,
  pomodoroRunning,
  setPomodoroRunning,
}: any) {
  const reflection = state.reflections[todayISO()] || { note: "", whatWentWell: "", pending: "", improveTomorrow: "" };
  const phrase = state.settings.motivationalPhrases
    ? motivationalPhrases[(todayDiscipline + state.settings.userName.length) % motivationalPhrases.length]
    : "";
  const top3 = todayTasks
    .sort((a: Task, b: Task) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, 3);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
      <div className="space-y-6">
        <GlassCard className="overflow-hidden p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div>
              <div className="mb-2 flex items-center gap-2 text-white/65">
                <Sparkles className="h-4 w-4" />
                Bem-vindo de volta, {state.settings.userName}
              </div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Sua disciplina de hoje está em {todayDiscipline}%</h2>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Clareza visual, controle real e progresso mensurável. O objetivo não é parecer produtivo — é executar.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Badge className={cls("rounded-full border px-3 py-1 text-sm", label.tone, label.color)}>{label.label}</Badge>
                <Badge className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/80">Meta: {state.settings.dailyGoal}%</Badge>
                <Badge className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/80">Streak: {streak} dias</Badge>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                  <span>Progresso do dia</span>
                  <span>{todayDiscipline}%</span>
                </div>
                <Progress value={todayDiscipline} className="h-3 bg-white/10" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard icon={<ListTodo className="h-4 w-4" />} label="Tarefas do dia" value={todayTasks.length} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídas" value={todayDoneCount} />
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pendentes" value={todayPendingCount} />
              <MetricCard icon={<RefreshCcw className="h-4 w-4" />} label="Adiadas" value={todayPostponedCount} />
              <MetricCard icon={<Flame className="h-4 w-4" />} label="Média da semana" value={`${weekAverage}%`} />
              <MetricCard icon={completionDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} label="Hoje vs ontem" value={`${completionDelta >= 0 ? "+" : ""}${completionDelta}%`} />
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Rotina de hoje</div>
                <div className="text-sm text-white/60">Prioridades, execução e feedback visual.</div>
              </div>
              <Button variant="outline" onClick={() => onSetPage("routine")}>
                Ver tudo
              </Button>
            </div>

            <div className="space-y-3">
              {todayTasks.slice(0, 5).map((task: Task) => (
                <TaskMiniRow key={task.id} task={task} onSetTaskStatus={onSetTaskStatus} />
              ))}
              {!todayTasks.length && <EmptyState icon={<ListTodo className="h-5 w-5" />} title="Sem tarefas hoje" description="Adicione sua primeira tarefa para começar o painel do dia." />}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Hábitos do dia</div>
                <div className="text-sm text-white/60">Marcação rápida e consistência visual.</div>
              </div>
              <Button variant="outline" onClick={() => onSetPage("habits")}>
                Abrir hábitos
              </Button>
            </div>

            <div className="space-y-3">
              {state.habits.slice(0, 5).map((habit: Habit) => {
                const value = habit.logs[todayISO()] || 0;
                const percent = Math.min(100, Math.round((value / habit.target) * 100));
                return (
                  <div key={habit.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{habit.title}</div>
                        <div className="text-xs text-white/60">{value}/{habit.target} hoje</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => onIncrementHabit(habit.id, -1)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <div className="w-10 text-center text-sm font-semibold">{value}</div>
                        <Button size="icon" variant="outline" onClick={() => onIncrementHabit(habit.id, 1)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={percent} className="h-2 bg-white/10" />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Semana em linha</div>
                <div className="text-sm text-white/60">Disciplina diária dos últimos 7 dias.</div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekSeries}>
                  <defs>
                    <linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="discipline" stroke="var(--primary)" fill="url(#weekFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Top 3 prioridades</div>
                <div className="text-sm text-white/60">O que sustenta seu dia.</div>
              </div>
              <Button variant="outline" onClick={onOpenTask}>
                <Plus className="mr-2 h-4 w-4" />
                Tarefa
              </Button>
            </div>
            <div className="space-y-3">
              {top3.map((task: Task, index: number) => (
                <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-white/60">{task.category} • {task.priority}</div>
                  </div>
                  <Badge className={cls("border", priorityClasses[task.priority])}>{task.priority}</Badge>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-white/10 p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">Não posso falhar nisso hoje</div>
                <div className="font-medium">{state.settings.cannotFailToday}</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Anel de disciplina</div>
              <div className="text-sm text-white/60">Status instantâneo do dia.</div>
            </div>
            <Badge className={cls("border", label.tone, label.color)}>{label.label}</Badge>
          </div>
          <DisciplineRing value={todayDiscipline} label="Hoje" />
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Quick add</div>
              <div className="text-sm text-white/60">Jogue uma tarefa no sistema em segundos.</div>
            </div>
            <Wand2 className="h-4 w-4 text-white/50" />
          </div>
          <div className="flex gap-2">
            <Input value={quickTask} onChange={(e) => setQuickTask(e.target.value)} placeholder="Ex.: revisar metas por 15 minutos" />
            <Button onClick={onQuickAddTask} style={{ background: "var(--primary)" }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Modo foco / Pomodoro</div>
              <div className="text-sm text-white/60">Bloco rápido para execução profunda.</div>
            </div>
            <Focus className="h-4 w-4 text-white/50" />
          </div>
          <div className="text-center">
            <div className="text-5xl font-semibold tracking-tight">{fmtTimer(pomodoro)}</div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" onClick={() => setPomodoro((prev: number) => Math.max(5 * 60, prev - 5 * 60))}>-5min</Button>
              <Button variant="outline" onClick={() => setPomodoro((prev: number) => prev + 5 * 60)}>+5min</Button>
              <Button onClick={() => setPomodoroRunning((v: boolean) => !v)} style={{ background: "var(--primary)" }}>
                {pomodoroRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button variant="outline" onClick={() => { setPomodoro(25 * 60); setPomodoroRunning(false); }}>
                <TimerReset className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Reflexão do dia</div>
              <div className="text-sm text-white/60">Fechamento elegante e útil.</div>
            </div>
            <StickyNote className="h-4 w-4 text-white/50" />
          </div>
          <div className="space-y-3">
            <Textarea value={reflection.note} onChange={(e) => onSaveReflection({ ...reflection, note: e.target.value })} placeholder="Observações do dia" />
            <Textarea value={reflection.whatWentWell} onChange={(e) => onSaveReflection({ ...reflection, whatWentWell: e.target.value })} placeholder="O que fiz bem hoje" />
            <Textarea value={reflection.pending} onChange={(e) => onSaveReflection({ ...reflection, pending: e.target.value })} placeholder="O que ficou pendente" />
            <Textarea value={reflection.improveTomorrow} onChange={(e) => onSaveReflection({ ...reflection, improveTomorrow: e.target.value })} placeholder="O que melhorar amanhã" />
          </div>
        </GlassCard>

        {!!phrase && (
          <GlassCard className="p-5">
            <div className="text-sm uppercase tracking-[0.22em] text-white/45">Frase do dia</div>
            <p className="mt-2 text-lg font-medium text-white/90">{phrase}</p>
          </GlassCard>
        )}

        <GlassCard className="p-5">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-4 w-4" /> Painel semanal
          </div>
          <div className="space-y-3 text-sm text-white/75">
            {state.settings.weeklyGoals.map((goal: string, idx: number) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2">{goal}</div>
            ))}
          </div>
          <Separator className="my-4 bg-white/10" />
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Últimos 7 dias" value={`${Math.round(weekAverage)}%`} />
            <MiniStat label="Recorde" value={`${Math.max(...fullHistory.map((d) => d.discipline), 0)}%`} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">{icon}</div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TaskMiniRow({ task, onSetTaskStatus }: { task: Task; onSetTaskStatus: (id: string, status: TaskStatus) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
      <button onClick={() => onSetTaskStatus(task.id, task.status === "done" ? "pending" : "done")}>
        {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-white/40" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cls("font-medium", task.status === "done" && "text-white/55 line-through")}>{task.title}</div>
        <div className="text-xs text-white/60">{task.category} {task.time ? `• ${task.time}` : ""}</div>
      </div>
      <Badge className={cls("border", priorityClasses[task.priority])}>{task.priority}</Badge>
    </div>
  );
}

function DisciplineRing({ value, label }: { value: number; label: string }) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (value / 100) * circumference;
  return (
    <div className="flex items-center justify-center py-3">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-semibold tracking-tight">{value}%</div>
          <div className="mt-1 text-sm text-white/60">{label}</div>
        </div>
      </div>
    </div>
  );
}

// =========================
// Routine
// =========================

function RoutinePage({
  state,
  filteredTodayTasks,
  search,
  setSearch,
  filterCategory,
  setFilterCategory,
  kanban,
  setKanban,
  focusMode,
  setFocusMode,
  onEditTask,
  onOpenTask,
  onDeleteTask,
  onDuplicateTask,
  onSetTaskStatus,
  onMoveTask,
  onToggleSubtask,
}: any) {
  const groups = {
    pending: filteredTodayTasks.filter((t: Task) => t.status === "pending"),
    done: filteredTodayTasks.filter((t: Task) => t.status === "done"),
    postponed: filteredTodayTasks.filter((t: Task) => t.status === "postponed"),
    skipped: filteredTodayTasks.filter((t: Task) => t.status === "skipped"),
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold">Seu painel operacional do dia</div>
            <div className="text-sm text-white/60">Filtre, priorize, execute e registre.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input className="pl-9" placeholder="Buscar tarefa" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {state.settings.categories.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setKanban((v: boolean) => !v)}>
              <KanbanSquare className="mr-2 h-4 w-4" />
              {kanban ? "Lista" : "Kanban"}
            </Button>
            <Button variant="outline" onClick={() => setFocusMode((v: boolean) => !v)}>
              <Focus className="mr-2 h-4 w-4" />
              {focusMode ? "Normal" : "Foco"}
            </Button>
            <Button onClick={onOpenTask} style={{ background: "var(--primary)" }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        </div>
      </GlassCard>

      {!kanban ? (
        <div className={cls("grid gap-4", focusMode ? "lg:grid-cols-1" : "lg:grid-cols-2") }>
          {filteredTodayTasks.length ? (
            filteredTodayTasks
              .filter((task: Task) => (focusMode ? task.priority === "crítica" || task.priority === "alta" : true))
              .map((task: Task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onDuplicate={onDuplicateTask}
                  onSetTaskStatus={onSetTaskStatus}
                  onMoveTask={onMoveTask}
                  onToggleSubtask={onToggleSubtask}
                />
              ))
          ) : (
            <EmptyState icon={<ListTodo className="h-5 w-5" />} title="Nada encontrado" description="Tente outro filtro ou crie uma nova tarefa." />
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {Object.entries(groups).map(([key, tasks]) => (
            <GlassCard key={key} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{statusMeta[key as TaskStatus].label}</div>
                <Badge className="border border-white/10 bg-white/10">{(tasks as Task[]).length}</Badge>
              </div>
              <div className="space-y-3">
                {(tasks as Task[]).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 text-xs text-white/60">{task.category} • {task.priority}</div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "done")}>Feita</Button>
                      <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "postponed")}>Adiar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onDuplicate, onSetTaskStatus, onMoveTask, onToggleSubtask }: any) {
  const [expanded, setExpanded] = useState(false);
  const status = statusMeta[task.status];
  return (
    <motion.div layout className="overflow-hidden rounded-[var(--radius)] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
      <div className="border-l-4 p-4 md:p-5" style={{ borderLeftColor: task.color }}>
        <div className="flex items-start gap-3">
          <button className="mt-0.5" onClick={() => onSetTaskStatus(task.id, task.status === "done" ? "pending" : "done")}>
            {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-white/35" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className={cls("text-lg font-semibold tracking-tight", task.status === "done" && "text-white/55 line-through")}>{task.title}</h3>
              <Badge className={cls("border", priorityClasses[task.priority])}>{task.priority}</Badge>
              <Badge className="border border-white/10 bg-white/10 text-white/80">{task.category}</Badge>
              <Badge className="border border-white/10 bg-white/5 text-white/65">peso {task.weight}</Badge>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-white/60">
              {task.time && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.time}</span>}
              <span className="flex items-center gap-2"><span className={cls("h-2.5 w-2.5 rounded-full", status.dot)} />{status.label}</span>
              {task.recurring && <span>Recorrente</span>}
            </div>
            {!!task.description && <p className="text-sm text-white/70">{task.description}</p>}

            {!!task.subtasks.length && (
              <div className="mt-4 space-y-2">
                {task.subtasks.map((subtask: Subtask) => (
                  <label key={subtask.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm text-white/80">
                    <input type="checkbox" checked={subtask.done} onChange={() => onToggleSubtask(task.id, subtask.id)} />
                    <span className={cls(subtask.done && "text-white/45 line-through")}>{subtask.title}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "done")}>Feita</Button>
              <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "pending")}>Pendente</Button>
              <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "postponed")}>Adiar</Button>
              <Button size="sm" variant="outline" onClick={() => onSetTaskStatus(task.id, "skipped")}>Não fiz</Button>
              <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>{expanded ? "Menos" : "Mais"}</Button>
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Separator className="my-4 bg-white/10" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(task)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => onDuplicate(task)}><Copy className="mr-2 h-3.5 w-3.5" />Duplicar</Button>
                    <Button size="sm" variant="outline" onClick={() => onMoveTask(task.id, "up")}><ChevronUp className="mr-2 h-3.5 w-3.5" />Subir</Button>
                    <Button size="sm" variant="outline" onClick={() => onMoveTask(task.id, "down")}><ChevronDown className="mr-2 h-3.5 w-3.5" />Descer</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =========================
// Habits
// =========================

function HabitsPage({ habits, onIncrementHabit, onOpenNew, onEditHabit, onDeleteHabit }: any) {
  const dates = getDateRange(14);
  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Módulo de hábitos</div>
            <div className="text-sm text-white/60">Consistência por hábito, meta e progressão visual.</div>
          </div>
          <Button onClick={onOpenNew} style={{ background: "var(--primary)" }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo hábito
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {habits.length ? (
          habits.map((habit: Habit) => {
            const today = habit.logs[todayISO()] || 0;
            const percent = Math.min(100, Math.round((today / habit.target) * 100));
            const streak = calcHabitStreak(habit);
            return (
              <GlassCard key={habit.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10" style={{ background: `${habit.color}22`, color: habit.color }}>
                      {habitIconMap[habit.icon] || <Target className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{habit.title}</div>
                      <div className="text-sm text-white/60">{habit.category} • meta {habit.target}/{habit.frequency === "daily" ? "dia" : "semana"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => onEditHabit(habit)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => onDeleteHabit(habit.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[0.9fr,1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="text-xs text-white/60">Hoje</div>
                    <div className="mt-1 text-3xl font-semibold">{today}/{habit.target}</div>
                    <div className="mt-2">
                      <Progress value={percent} className="h-2 bg-white/10" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => onIncrementHabit(habit.id, -1)}><ChevronDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => onIncrementHabit(habit.id, 1)}><ChevronUp className="h-4 w-4" /></Button>
                      <Badge className="border border-white/10 bg-white/10">streak {streak}</Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="mb-3 text-xs text-white/60">Calendário de consistência</div>
                    <div className="grid grid-cols-7 gap-2">
                      {dates.map((date) => {
                        const value = habit.logs[date] || 0;
                        const done = value >= habit.target;
                        return (
                          <div key={date} className="space-y-1 text-center">
                            <div className="text-[10px] text-white/45">{dayNames[getDayOfWeek(date)].slice(0, 1)}</div>
                            <div
                              title={`${date}: ${value}/${habit.target}`}
                              className={cls(
                                "h-8 rounded-lg border border-white/10",
                                done ? "bg-emerald-500/60" : value > 0 ? "bg-amber-500/35" : "bg-white/5"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <EmptyState icon={<Target className="h-5 w-5" />} title="Sem hábitos cadastrados" description="Crie hábitos diários ou semanais para acompanhar consistência." />
        )}
      </div>
    </div>
  );
}

function calcHabitStreak(habit: Habit) {
  const dates = getDateRange(60);
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const value = habit.logs[dates[i]] || 0;
    if (value >= habit.target) streak++;
    else break;
  }
  return streak;
}

// =========================
// History
// =========================

function HistoryPage({ history, state, selectedDate, onSelectDate }: any) {
  const [query, setQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("all");

  const selected = history.find((h: DaySnapshot) => h.date === selectedDate) || history[history.length - 1];
  const filtered = history.filter((h: DaySnapshot) => {
    const matchesQuery = query ? h.tasks.some((t) => t.title.toLowerCase().includes(query.toLowerCase())) : true;
    const matchesDiscipline =
      disciplineFilter === "all"
        ? true
        : disciplineFilter === "strong"
        ? h.discipline >= 80
        : disciplineFilter === "medium"
        ? h.discipline >= 40 && h.discipline < 80
        : h.discipline < 40;
    return matchesQuery && matchesDiscipline;
  });

  const monthGrid = buildMonthGrid(history);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <div className="space-y-6">
        <GlassCard className="p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold">Histórico completo</div>
              <div className="text-sm text-white/60">Visualize seu padrão por calendário e por lista.</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input className="pl-9" placeholder="Buscar por tarefa" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="strong">Fortes</SelectItem>
                  <SelectItem value="medium">Médios</SelectItem>
                  <SelectItem value="weak">Fracos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {shortWeek.map((d) => (
              <div key={d} className="pb-1 text-center text-xs text-white/45">{d}</div>
            ))}
            {monthGrid.map((item, idx) => (
              <button
                key={idx}
                className={cls(
                  "rounded-2xl border p-3 text-left transition",
                  item?.date === selectedDate ? "border-white/30 bg-white/10" : "border-white/10 bg-black/10 hover:bg-white/5"
                )}
                onClick={() => item?.date && onSelectDate(item.date)}
              >
                {item ? (
                  <>
                    <div className="text-sm font-medium">{new Date(item.date + "T00:00:00").getDate()}</div>
                    <div className={cls("mt-2 h-2 rounded-full", dayDisciplineColor(item.discipline))} />
                    <div className="mt-2 text-[11px] text-white/60">{item.discipline}%</div>
                  </>
                ) : (
                  <div className="h-full min-h-[70px] rounded-xl border border-dashed border-white/5" />
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Linha do tempo</div>
          <div className="space-y-3">
            {filtered.slice().reverse().map((day: DaySnapshot) => (
              <button key={day.date} onClick={() => onSelectDate(day.date)} className="w-full rounded-2xl border border-white/10 bg-black/15 p-4 text-left transition hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(day.date + "T00:00:00"))}</div>
                    <div className="text-sm text-white/60">{day.tasks.filter((t) => t.status === "done").length}/{day.tasks.length} tarefas • {day.habits.filter((h) => h.count > 0).length} hábitos marcados</div>
                  </div>
                  <Badge className="border border-white/10 bg-white/10">{day.discipline}%</Badge>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Detalhes do dia</div>
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="text-sm text-white/60">Disciplina</div>
                <div className="text-3xl font-semibold">{selected.discipline}%</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Tarefas</div>
                <div className="space-y-2">
                  {selected.tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-white/60">{task.category} • {statusMeta[task.status].label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Hábitos</div>
                <div className="space-y-2">
                  {selected.habits.map((log: any) => {
                    const habit = state.habits.find((h: Habit) => h.id === log.habitId);
                    if (!habit) return null;
                    return (
                      <div key={habit.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="font-medium">{habit.title}</div>
                        <div className="text-xs text-white/60">{log.count}/{habit.target}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Reflexão</div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/75">
                  {selected.reflection?.note || state.reflections[selected.date]?.note || "Sem reflexão registrada."}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Calendar className="h-5 w-5" />} title="Sem registro selecionado" description="Escolha um dia no calendário para abrir o resumo." />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function buildMonthGrid(history: DaySnapshot[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells: Array<DaySnapshot | null> = Array.from({ length: startWeekday }).map(() => null);
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day).toISOString().slice(0, 10);
    cells.push(history.find((h) => h.date === date) || { date, tasks: [], habits: [], discipline: 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayDisciplineColor(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 40) return "bg-amber-400";
  if (value > 0) return "bg-rose-400";
  return "bg-white/20";
}

// =========================
// Stats
// =========================

function StatsPage({ weekSeries, monthSeries, byCategory, byPriority, weekdayAverage, habitsDistribution, productivityByHour, best, worst, weekAverage, monthAverage, generalAverage, streak, record }: any) {
  const radarData = weekdayAverage;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<BarChart3 className="h-4 w-4" />} label="Média semanal" value={`${weekAverage}%`} />
        <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Média mensal" value={`${monthAverage}%`} />
        <MetricCard icon={<BadgeCheck className="h-4 w-4" />} label="Média geral" value={`${generalAverage}%`} />
        <MetricCard icon={<Flame className="h-4 w-4" />} label="Recorde / streak" value={`${record}% • ${streak}d`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Disciplina diária (7 dias)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekSeries}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="discipline" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Disciplina mensal (30 dias)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthSeries}>
                <defs>
                  <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="discipline" stroke="var(--accent)" fill="url(#monthFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Conclusão por categoria">
          <SimpleBar data={byCategory} dataKey="value" xKey="name" />
        </ChartCard>
        <ChartCard title="Conclusão por prioridade">
          <SimpleBar data={byPriority} dataKey="value" xKey="name" />
        </ChartCard>
        <ChartCard title="Distribuição de hábitos">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={habitsDistribution} dataKey="value" nameKey="name" outerRadius={95} innerRadius={55} paddingAngle={5}>
                  {habitsDistribution.map((_: any, index: number) => (
                    <Cell key={index} fill={index % 2 === 0 ? "var(--primary)" : "var(--accent)"} fillOpacity={0.8 - index * 0.05} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Média por dia da semana">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="day" stroke="rgba(255,255,255,0.55)" />
                <PolarRadiusAxis angle={90} stroke="rgba(255,255,255,0.25)" />
                <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Horários com maior produtividade">
          <SimpleBar data={productivityByHour} dataKey="value" xKey="hour" />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="p-5">
          <div className="mb-3 text-lg font-semibold">Melhor e pior dia</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Melhor</div>
              <div className="mt-1 text-2xl font-semibold">{best?.discipline ?? 0}%</div>
              <div className="text-sm text-emerald-100/70">{best ? formatDate(best.date) : "-"}</div>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-rose-200/70">Pior</div>
              <div className="mt-1 text-2xl font-semibold">{worst?.discipline ?? 0}%</div>
              <div className="text-sm text-rose-100/70">{worst ? formatDate(worst.date) : "-"}</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-3 text-lg font-semibold">Heatmap simples</div>
          <div className="grid grid-cols-10 gap-2">
            {monthSeries.map((item: any) => (
              <div key={item.raw} title={`${item.raw}: ${item.discipline}%`} className={cls("h-8 rounded-lg border border-white/10", dayDisciplineColor(item.discipline))} />
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 text-lg font-semibold">{title}</div>
      {children}
    </GlassCard>
  );
}

function SimpleBar({ data, dataKey, xKey }: { data: any[]; dataKey: string; xKey: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey={xKey} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={dataKey} radius={[12, 12, 0, 0]} fill="var(--primary)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-sm text-white shadow-2xl">
      <div className="mb-1 text-white/55">{label}</div>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color || "var(--primary)" }} />
          <span>{entry.name || entry.dataKey}: {entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// =========================
// Settings
// =========================

function SettingsPage({ state, updateState, exportData, resetAll, resetToday, resetHistory, fileInputRef, importData, bgUploadRef, applyBackgroundUpload }: any) {
  const bg = state.background;
  const appearance = state.appearance;
  const settings = state.settings;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
      <div className="space-y-6">
        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Perfil e metas</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Seu nome">
              <Input value={settings.userName} onChange={(e) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, userName: e.target.value } }))} />
            </Field>
            <Field label="Meta diária %">
              <Input type="number" value={settings.dailyGoal} onChange={(e) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, dailyGoal: Number(e.target.value || 0) } }))} />
            </Field>
            <Field label="Meta semanal %">
              <Input type="number" value={settings.weeklyGoal} onChange={(e) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, weeklyGoal: Number(e.target.value || 0) } }))} />
            </Field>
            <Field label="Modo de cálculo">
              <Select value={settings.calculationMode} onValueChange={(value: CalcMode) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, calculationMode: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simples</SelectItem>
                  <SelectItem value="weighted">Ponderado por peso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Período preferido">
              <Select value={settings.preferredPeriod} onValueChange={(value: any) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, preferredPeriod: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manhã</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="night">Noite</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Frases motivacionais">
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3">
                <span className="text-sm text-white/75">Ativar</span>
                <Switch checked={settings.motivationalPhrases} onCheckedChange={(checked) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, motivationalPhrases: checked } }))} />
              </div>
            </Field>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Tema e aparência</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Modo">
              <Select value={appearance.themeMode} onValueChange={(value: ThemeMode) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, themeMode: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="auto">Automático</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fonte">
              <Select value={appearance.font} onValueChange={(value: any) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, font: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Manrope">Manrope</SelectItem>
                  <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cor principal">
              <Input type="color" value={appearance.primary} onChange={(e) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, primary: e.target.value } }))} />
            </Field>
            <Field label="Cor de destaque">
              <Input type="color" value={appearance.accent} onChange={(e) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, accent: e.target.value } }))} />
            </Field>
            <Field label={`Raio dos componentes: ${appearance.radius}px`}>
              <Slider value={[appearance.radius]} min={8} max={30} step={1} onValueChange={(v) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, radius: v[0] } }))} />
            </Field>
            <Field label="Densidade">
              <Select value={appearance.density} onValueChange={(value: Density) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, density: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compacta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="comfortable">Confortável</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reduzir animações">
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3">
                <span className="text-sm text-white/75">Ativar</span>
                <Switch checked={appearance.reducedMotion} onCheckedChange={(checked) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, reducedMotion: checked } }))} />
              </div>
            </Field>
            <Field label="Modo compacto global">
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3">
                <span className="text-sm text-white/75">Ativar</span>
                <Switch checked={appearance.compactMode} onCheckedChange={(checked) => updateState((prev: AppState) => ({ ...prev, appearance: { ...prev.appearance, compactMode: checked } }))} />
              </div>
            </Field>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Background premium</div>
          <Tabs value={bg.mode} onValueChange={(value: any) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, mode: value } }))}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="solid">Cor</TabsTrigger>
              <TabsTrigger value="gradient">Gradiente</TabsTrigger>
              <TabsTrigger value="preset">Preset</TabsTrigger>
              <TabsTrigger value="url">Imagem</TabsTrigger>
            </TabsList>

            <TabsContent value="solid" className="mt-4 space-y-4">
              <Field label="Cor sólida">
                <Input type="color" value={bg.solidColor} onChange={(e) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, solidColor: e.target.value } }))} />
              </Field>
            </TabsContent>

            <TabsContent value="gradient" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cor inicial">
                  <Input type="color" value={bg.gradientFrom} onChange={(e) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, gradientFrom: e.target.value } }))} />
                </Field>
                <Field label="Cor final">
                  <Input type="color" value={bg.gradientTo} onChange={(e) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, gradientTo: e.target.value } }))} />
                </Field>
              </div>
              <Field label={`Ângulo: ${bg.gradientAngle}°`}>
                <Slider value={[bg.gradientAngle]} min={0} max={360} step={1} onValueChange={(v) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, gradientAngle: v[0] } }))} />
              </Field>
            </TabsContent>

            <TabsContent value="preset" className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {bgPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, presetId: preset.id } }))}
                    className={cls(
                      "overflow-hidden rounded-3xl border p-2 text-left transition",
                      bg.presetId === preset.id ? "border-white/30" : "border-white/10"
                    )}
                  >
                    <div className="h-24 rounded-2xl" style={{ backgroundImage: preset.css }} />
                    <div className="px-1 pt-2 text-sm font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-4 space-y-4">
              <Field label="URL da imagem">
                <Input value={bg.imageUrl} placeholder="https://..." onChange={(e) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, imageUrl: e.target.value } }))} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => bgUploadRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                <input ref={bgUploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && applyBackgroundUpload(e.target.files[0])} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tamanho">
                  <Select value={bg.size} onValueChange={(value: any) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, size: value } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Posição">
                  <Select value={bg.position} onValueChange={(value: string) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, position: value } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Repetir">
                  <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3">
                    <span className="text-sm text-white/75">Repeat</span>
                    <Switch checked={bg.repeat} onCheckedChange={(checked) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, repeat: checked } }))} />
                  </div>
                </Field>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-5 bg-white/10" />

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={`Overlay: ${Math.round(bg.overlayOpacity * 100)}%`}>
              <Slider value={[bg.overlayOpacity]} min={0} max={1} step={0.01} onValueChange={(v) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, overlayOpacity: v[0] } }))} />
            </Field>
            <Field label={`Blur: ${bg.blur}px`}>
              <Slider value={[bg.blur]} min={0} max={30} step={1} onValueChange={(v) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, blur: v[0] } }))} />
            </Field>
            <Field label={`Camada escura/clara: ${Math.round(bg.darkness * 100)}%`}>
              <Slider value={[bg.darkness]} min={0} max={0.7} step={0.01} onValueChange={(v) => updateState((prev: AppState) => ({ ...prev, background: { ...prev.background, darkness: v[0] } }))} />
            </Field>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Prévia do tema</div>
          <div className="rounded-[30px] border border-white/10 p-4">
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/60">Preview</div>
                  <div className="text-xl font-semibold">Disciplina Total</div>
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ background: appearance.primary }} />
                  <div className="h-4 w-4 rounded-full" style={{ background: appearance.accent }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="mb-2 text-sm text-white/60">Disciplina do dia</div>
                <div className="text-3xl font-semibold">84%</div>
                <Progress value={84} className="mt-3 h-2 bg-white/10" />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Dados e backup</div>
          <div className="grid gap-3">
            <Button variant="outline" onClick={exportData}><Download className="mr-2 h-4 w-4" />Exportar JSON</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar JSON</Button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <Button variant="outline" onClick={resetToday}><RefreshCcw className="mr-2 h-4 w-4" />Resetar dia atual</Button>
            <Button variant="outline" onClick={resetHistory}><Trash2 className="mr-2 h-4 w-4" />Resetar histórico</Button>
            <Button variant="destructive" onClick={resetAll}><RefreshCcw className="mr-2 h-4 w-4" />Restaurar dados de exemplo</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 text-lg font-semibold">Categorias e preferências</div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((cat: string) => (
                <Badge key={cat} className="border border-white/10 bg-white/10 px-3 py-1">{cat}</Badge>
              ))}
            </div>
            <Textarea
              value={settings.weeklyGoals.join("\n")}
              onChange={(e) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, weeklyGoals: e.target.value.split("\n").filter(Boolean) } }))}
              placeholder="Uma meta por linha"
            />
            <Field label="Notificações locais">
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3">
                <span className="text-sm text-white/75">Ativar</span>
                <Switch checked={settings.notificationsEnabled} onCheckedChange={(checked) => updateState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: checked } }))} />
              </div>
            </Field>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-white/70">{label}</Label>
      {children}
    </div>
  );
}

// =========================
// Dialogs / Utilities
// =========================

function TaskDialog({ open, onOpenChange, task, categories, onSubmit, primary }: any) {
  const [draft, setDraft] = useState<Task>(emptyTask(primary));
  useEffect(() => {
    setDraft(task || emptyTask(primary));
  }, [task, primary, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Preencha os campos principais, peso e recorrência.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Field label="Título"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Categoria">
            <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={draft.priority} onValueChange={(value: Priority) => setDraft({ ...draft, priority: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="média">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Peso"><Input type="number" min={1} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value || 1) })} /></Field>
          <Field label="Horário opcional"><Input value={draft.time || ""} placeholder="08:00" onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field>
          <Field label="Data"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Cor"><Input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></Field>
          <Field label="Conta para disciplina">
            <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-white/10 dark:bg-black/15">
              <span className="text-sm">Ativar</span>
              <Switch checked={draft.countsForDiscipline} onCheckedChange={(checked) => setDraft({ ...draft, countsForDiscipline: checked })} />
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição"><Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Observações"><Textarea value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
          <Field label="Recorrente">
            <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-white/10 dark:bg-black/15">
              <span className="text-sm">Ativar</span>
              <Switch checked={!!draft.recurring} onCheckedChange={(checked) => setDraft({ ...draft, recurring: checked })} />
            </div>
          </Field>
          <Field label="Dias da semana (0-6)">
            <Input value={(draft.recurringDays || []).join(",")} placeholder="1,2,3,4,5" onChange={(e) => setDraft({ ...draft, recurringDays: e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)) })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Subtarefas (uma por linha)">
              <Textarea
                value={draft.subtasks.map((s) => s.title).join("\n")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    subtasks: e.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((title, idx) => ({ id: draft.subtasks[idx]?.id || uid(), title, done: draft.subtasks[idx]?.done || false })),
                  })
                }
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => draft.title.trim() && onSubmit({ ...draft, title: draft.title.trim() })} style={{ background: "var(--primary)" }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyTask(primary: string): Task {
  return {
    id: uid(),
    title: "",
    description: "",
    category: "pessoal",
    priority: "média",
    weight: 1,
    time: "",
    status: "pending",
    recurring: false,
    recurringDays: [],
    notes: "",
    date: todayISO(),
    color: primary,
    countsForDiscipline: true,
    subtasks: [],
    order: 999,
  };
}

function HabitDialog({ open, onOpenChange, habit, categories, onSubmit, primary }: any) {
  const [draft, setDraft] = useState<Habit>(emptyHabit(primary));
  useEffect(() => {
    setDraft(habit || emptyHabit(primary));
  }, [habit, primary, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{habit ? "Editar hábito" : "Novo hábito"}</DialogTitle>
          <DialogDescription>Defina meta, peso e frequência.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Field label="Título"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Categoria">
            <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Meta"><Input type="number" min={1} value={draft.target} onChange={(e) => setDraft({ ...draft, target: Number(e.target.value || 1) })} /></Field>
          <Field label="Peso"><Input type="number" min={1} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value || 1) })} /></Field>
          <Field label="Frequência">
            <Select value={draft.frequency} onValueChange={(value: any) => setDraft({ ...draft, frequency: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ícone">
            <Select value={draft.icon} onValueChange={(value: any) => setDraft({ ...draft, icon: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="treino">Treino</SelectItem>
                <SelectItem value="leitura">Leitura</SelectItem>
                <SelectItem value="trabalho">Trabalho</SelectItem>
                <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                <SelectItem value="água">Água</SelectItem>
                <SelectItem value="saúde">Saúde</SelectItem>
                <SelectItem value="sono">Sono</SelectItem>
                <SelectItem value="foco">Foco</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cor"><Input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></Field>
          <Field label="Conta para disciplina">
            <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-white/10 dark:bg-black/15">
              <span className="text-sm">Ativar</span>
              <Switch checked={draft.countsForDiscipline} onCheckedChange={(checked) => setDraft({ ...draft, countsForDiscipline: checked })} />
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => draft.title.trim() && onSubmit({ ...draft, title: draft.title.trim() })} style={{ background: "var(--primary)" }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyHabit(primary: string): Habit {
  return {
    id: uid(),
    title: "",
    category: "pessoal",
    icon: "foco",
    color: primary,
    frequency: "daily",
    target: 1,
    weight: 1,
    countsForDiscipline: true,
    logs: {},
  };
}

function ToastLayer({ items }: { items: Array<{ id: string; title: string; description?: string }> }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-xl"
          >
            <div className="font-medium">{item.title}</div>
            {item.description && <div className="mt-1 text-sm text-white/65">{item.description}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">{icon}</div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{description}</div>
    </GlassCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function fmtTimer(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildProductivityByHour(tasks: Task[]) {
  const buckets = [
    { hour: "06-09", value: 0 },
    { hour: "09-12", value: 0 },
    { hour: "12-15", value: 0 },
    { hour: "15-18", value: 0 },
    { hour: "18-21", value: 0 },
    { hour: "21+", value: 0 },
  ];
  tasks.filter((t) => t.status === "done" && t.time).forEach((task) => {
    const hour = Number((task.time || "0:0").split(":")[0]);
    const idx = hour < 9 ? 0 : hour < 12 ? 1 : hour < 15 ? 2 : hour < 18 ? 3 : hour < 21 ? 4 : 5;
    buckets[idx].value += 1;
  });
  return buckets;
}
