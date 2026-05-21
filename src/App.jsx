import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CalendarClock,
  Check,
  Download,
  Droplets,
  Edit2,
  FileDown,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquareWarning,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Waves,
  X,
} from "lucide-react";

const STORAGE_KEY = "falaj-records-v3";
const ISSUE_STORAGE_KEY = "falaj-issues-v1";
const OLD_STORAGE_KEYS = ["falaj-records-v2", "falaj-records"];
const ADMIN_PASSWORD = "Asdf@#$1234";
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const emptyRecord = {
  name: "",
  number: "",
  day: "",
  date: "",
  time: "",
  period: "نهار",
  raddahName: "",
  durationHours: "2",
  durationMinutes: "0",
  notes: "",
};

const emptyIssue = {
  title: "",
  type: "صيانة",
  priority: "متوسطة",
  status: "مفتوح",
  date: "",
  owner: "",
  details: "",
};

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeRecord = (record) => ({
  ...emptyRecord,
  ...record,
  id: record.id || crypto.randomUUID(),
  raddahName: record.raddahName || record.type || "ردة غير محددة",
  period: record.period === "ليل" ? "ليل" : "نهار",
  durationHours: String(record.durationHours ?? emptyRecord.durationHours),
  durationMinutes: String(record.durationMinutes ?? emptyRecord.durationMinutes),
});

const getInitialRecords = () => {
  const current = safeParse(localStorage.getItem(STORAGE_KEY), null);
  if (Array.isArray(current)) return current.map(normalizeRecord);

  for (const key of OLD_STORAGE_KEYS) {
    const saved = safeParse(localStorage.getItem(key), null);
    if (Array.isArray(saved)) return saved.map(normalizeRecord);
  }

  return [
    {
      ...emptyRecord,
      id: crypto.randomUUID(),
      name: "سعيد بن راشد",
      number: "101",
      day: "الخميس",
      date: new Date().toISOString().slice(0, 10),
      time: "18:00",
      period: "ليل",
      raddahName: "الردة الرئيسية",
      durationHours: "2",
      durationMinutes: "0",
      notes: "سقية تجريبية يمكن تعديلها من الإدارة.",
    },
  ];
};

const getInitialIssues = () => {
  const saved = safeParse(localStorage.getItem(ISSUE_STORAGE_KEY), null);
  if (Array.isArray(saved)) return saved;
  return [
    {
      ...emptyIssue,
      id: crypto.randomUUID(),
      title: "فحص بوابة التوزيع",
      type: "صيانة",
      priority: "متوسطة",
      status: "مفتوح",
      date: new Date().toISOString().slice(0, 10),
      owner: "وكيل الفلج",
      details: "التأكد من سهولة فتح وإغلاق البوابة قبل بداية الردات المسائية.",
    },
  ];
};

const toDateTime = (record) => {
  if (!record.date || !record.time) return null;
  const value = new Date(`${record.date}T${record.time}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const formatDuration = (ms) => {
  const safeMs = Math.max(0, ms);
  const hours = Math.floor(safeMs / 3600000);
  const mins = Math.floor((safeMs % 3600000) / 60000);
  const secs = Math.floor((safeMs % 60000) / 1000);
  return [hours, mins, secs].map((item) => item.toString().padStart(2, "0")).join(":");
};

const getDurationMinutes = (record) => {
  const hours = Number(record.durationHours || 0);
  const minutes = Number(record.durationMinutes || 0);
  const total = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  return Math.max(0, Math.round(total));
};

const formatHoursMinutes = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours && mins) return `${hours} ساعة و${mins} دقيقة`;
  if (hours) return `${hours} ساعة`;
  return `${mins} دقيقة`;
};

const formatRemainingHoursMinutes = (ms) => formatHoursMinutes(Math.ceil(Math.max(0, ms) / 60000));

const formatDate = (dateText) => {
  if (!dateText) return "-";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(`${dateText}T12:00`));
};

const downloadText = (filename, text, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function App() {
  const [view, setView] = useState("public");
  const [records, setRecords] = useState(getInitialRecords);
  const [issues, setIssues] = useState(getInitialIssues);
  const [form, setForm] = useState(emptyRecord);
  const [issueForm, setIssueForm] = useState(emptyIssue);
  const [editingId, setEditingId] = useState(null);
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [now, setNow] = useState(new Date());
  const notificationTimers = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => () => {
    notificationTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const processedRecords = useMemo(() => {
    const sorted = records
      .map((record) => {
        const start = toDateTime(record);
        return {
          ...record,
          startDateTime: start,
          startMs: start?.getTime() ?? 0,
        };
      })
      .filter((record) => record.startDateTime)
      .sort((a, b) => a.startMs - b.startMs);

    return sorted.map((record, index) => {
      const next = sorted[index + 1];
      const durationMinutes = getDurationMinutes(record);
      const explicitEnd = durationMinutes > 0 ? record.startMs + durationMinutes * 60 * 1000 : null;
      const fallbackEnd = record.startMs + 24 * 60 * 60 * 1000;
      const endMs = explicitEnd ?? next?.startMs ?? fallbackEnd;
      const actualDurationMinutes = Math.max(0, Math.round((endMs - record.startMs) / 60000));
      return {
        ...record,
        endMs,
        endDateTime: new Date(endMs),
        durationTotalMinutes: actualDurationMinutes,
        durationLabel: formatHoursMinutes(actualDurationMinutes),
        remainingLabel: formatRemainingHoursMinutes(endMs - now.getTime()),
      };
    });
  }, [now, records]);

  const currentStatus = useMemo(() => {
    const nowMs = now.getTime();
    const current = processedRecords.find((record) => nowMs >= record.startMs && nowMs < record.endMs);
    const next = processedRecords.find((record) => record.startMs > nowMs);
    const completedToday = processedRecords.filter((record) => {
      const sameDay = new Date(record.startMs).toDateString() === now.toDateString();
      return sameDay && record.endMs <= nowMs;
    }).length;

    return {
      current,
      next,
      completedToday,
      timeRemaining: current ? formatDuration(current.endMs - nowMs) : null,
      currentRemainingLabel: current ? formatRemainingHoursMinutes(current.endMs - nowMs) : null,
      nextTimeRemaining: next ? formatDuration(next.startMs - nowMs) : null,
      nextStartsAfterLabel: next ? formatRemainingHoursMinutes(next.startMs - nowMs) : null,
      isEndingSoon: current ? current.endMs - nowMs <= 15 * 60 * 1000 : false,
    };
  }, [now, processedRecords]);

  const currentProgress = useMemo(() => {
    if (!currentStatus.current) return 0;
    const total = currentStatus.current.endMs - currentStatus.current.startMs;
    if (total <= 0) return 0;
    const elapsed = now.getTime() - currentStatus.current.startMs;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [currentStatus.current, now]);

  const upcomingRecords = useMemo(
    () => processedRecords.filter((record) => record.endMs >= now.getTime()).slice(0, 12),
    [now, processedRecords],
  );

  const conflicts = useMemo(() => {
    const warnings = [];
    for (let index = 0; index < processedRecords.length - 1; index += 1) {
      const current = processedRecords[index];
      const next = processedRecords[index + 1];
      const gapMinutes = Math.round((next.startMs - current.startMs) / 60000);
      if (gapMinutes < 15) {
        warnings.push(`الفاصل بين ${current.name} و${next.name} أقل من 15 دقيقة.`);
      }
      if (current.name === next.name && current.date === next.date) {
        warnings.push(`${current.name} لديه أكثر من ردة في نفس اليوم.`);
      }
    }
    return warnings;
  }, [processedRecords]);

  const stats = useMemo(() => {
    const todayText = now.toISOString().slice(0, 10);
    const todayRecords = processedRecords.filter((record) => record.date === todayText);
    const openIssues = issues.filter((issue) => issue.status !== "مغلق").length;
    const nightRecords = processedRecords.filter((record) => record.period === "ليل").length;
    return {
      total: records.length,
      today: todayRecords.length,
      openIssues,
      nightRecords,
    };
  }, [issues, now, processedRecords, records.length]);

  const setFormDate = (date) => {
    const day = date ? DAY_NAMES[new Date(`${date}T12:00`).getDay()] : "";
    setForm((current) => ({ ...current, date, day }));
  };

  const validateForm = () => {
    if (!form.name.trim() || !form.number.trim() || !form.date || !form.time || !form.raddahName.trim()) {
      return "يرجى تعبئة الاسم، الرقم، اسم الردة، التاريخ، ووقت البداية.";
    }

    const candidate = normalizeRecord({ ...form, id: editingId || "candidate" });
    const candidateStart = toDateTime(candidate)?.getTime();
    const durationMinutes = getDurationMinutes(candidate);
    const duplicate = records.find(
      (record) =>
        record.id !== editingId &&
        record.date === candidate.date &&
        record.time === candidate.time &&
        record.raddahName.trim() === candidate.raddahName.trim(),
    );

    if (!candidateStart) return "التاريخ أو الوقت غير صحيح.";
    if (durationMinutes <= 0) return "يرجى إدخال مدة الفلج بالساعات أو الدقائق.";
    if (Number(candidate.durationMinutes) > 59) return "الدقائق يجب أن تكون بين 0 و59.";
    if (duplicate) return "يوجد سجل آخر بنفس الردة والتاريخ والوقت.";
    return "";
  };

  const handleSave = () => {
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    const payload = normalizeRecord(form);
    if (editingId) {
      setRecords((current) => current.map((record) => (record.id === editingId ? { ...payload, id: editingId } : record)));
    } else {
      setRecords((current) => [...current, { ...payload, id: crypto.randomUUID() }]);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm(emptyRecord);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("هل تريد حذف هذا السجل؟")) {
      setRecords((current) => current.filter((record) => record.id !== id));
    }
  };

  const handleIssueSave = () => {
    if (!issueForm.title.trim() || !issueForm.date) {
      alert("يرجى كتابة عنوان البلاغ وتاريخه.");
      return;
    }

    if (editingIssueId) {
      setIssues((current) => current.map((issue) => (issue.id === editingIssueId ? { ...issueForm, id: editingIssueId } : issue)));
    } else {
      setIssues((current) => [...current, { ...issueForm, id: crypto.randomUUID() }]);
    }

    setIssueForm(emptyIssue);
    setEditingIssueId(null);
  };

  const enablePersonalNotifications = async (items) => {
    if (!("Notification" in window)) {
      alert("المتصفح لا يدعم الإشعارات.");
      return;
    }

    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      alert("لم يتم تفعيل الإشعارات. يرجى السماح بها من المتصفح.");
      return;
    }

    notificationTimers.current.forEach((timer) => clearTimeout(timer));
    notificationTimers.current = [];

    const nowMs = Date.now();
    const futureItems = items.filter((record) => record.startMs > nowMs);
    futureItems.forEach((record) => {
      const beforeDelay = record.startMs - nowMs - 15 * 60 * 1000;
      const startDelay = record.startMs - nowMs;
      const showNotice = (title, body) => new Notification(title, { body, tag: `falaj-${record.id}-${title}` });

      if (beforeDelay > 0 && beforeDelay < 2147483647) {
        notificationTimers.current.push(setTimeout(() => {
          showNotice("اقترب موعد الفلج", `${record.name} - ${record.raddahName} بعد 15 دقيقة. مدة الفلج ${record.durationLabel}.`);
        }, beforeDelay));
      }

      if (startDelay > 0 && startDelay < 2147483647) {
        notificationTimers.current.push(setTimeout(() => {
          showNotice("بدأ موعد الفلج", `${record.name}، دورك الآن في ${record.raddahName}.`);
        }, startDelay));
      }
    });

    alert(futureItems.length > 0 ? `تم تفعيل إشعارات ${futureItems.length} ردة قادمة.` : "لا توجد ردات قادمة لتفعيل إشعاراتها.");
  };

  const exportCsv = () => {
    const header = ["الاسم", "الرقم", "الردة", "اليوم", "التاريخ", "الوقت", "الفترة", "ملاحظات"];
    const rows = processedRecords.map((record) =>
      [record.name, record.number, record.raddahName, record.day, record.date, record.time, record.period, record.notes]
        .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
        .join(","),
    );
    downloadText("falaj-schedule.csv", [header.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
  };

  const exportBackup = () => {
    downloadText(
      `falaj-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ records, issues, exportedAt: new Date().toISOString() }, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const payload = safeParse(String(reader.result), null);
      if (!payload || !Array.isArray(payload.records)) {
        alert("ملف النسخة الاحتياطية غير صحيح.");
        return;
      }
      setRecords(payload.records.map(normalizeRecord));
      if (Array.isArray(payload.issues)) setIssues(payload.issues);
      alert("تم استيراد النسخة الاحتياطية بنجاح.");
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const renderPill = (text, tone = "slate") => {
    const tones = {
      brand: "bg-brand-100 text-brand-800",
      amber: "bg-amber-100 text-amber-800",
      red: "bg-red-100 text-red-700",
      indigo: "bg-indigo-100 text-indigo-700",
      slate: "bg-slate-100 text-slate-700",
    };
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{text}</span>;
  };

  const renderPublicDashboard = () => (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={Droplets} label="إجمالي الردات" value={stats.total} tone="brand" />
        <StatCard icon={CalendarClock} label="ردات اليوم" value={stats.today} tone="indigo" />
        <StatCard icon={Waves} label="ردات ليلية" value={stats.nightRecords} tone="amber" />
        <StatCard icon={MessageSquareWarning} label="بلاغات مفتوحة" value={stats.openIssues} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div
          className={`water-card relative overflow-hidden rounded-3xl p-6 text-white shadow-xl md:p-8 ${
            currentStatus.current
              ? currentStatus.isEndingSoon
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : "bg-gradient-to-br from-brand-500 to-brand-800"
              : "bg-gradient-to-br from-slate-500 to-slate-700"
          }`}
        >
          <Droplets className="absolute -left-8 -top-8 h-40 w-40 opacity-10" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {renderPill("الحالة الحالية", "brand")}
              {currentStatus.isEndingSoon && (
                <span className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                  <BellRing className="h-4 w-4" /> تنبيه: الردة أوشكت على الانتهاء
                </span>
              )}
              {currentStatus.current && !currentStatus.isEndingSoon && (
                <span className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                  <BellRing className="h-4 w-4" /> المتبقي: {currentStatus.currentRemainingLabel}
                </span>
              )}
            </div>

            {currentStatus.current ? (
              <div className="mt-8">
                <p className="text-sm opacity-90">الآن يسقي</p>
                <h1 className="mt-2 text-4xl font-black md:text-5xl">{currentStatus.current.name}</h1>
                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <InfoBox label="الردة" value={currentStatus.current.raddahName} />
                  <InfoBox label="الوقت المتبقي" value={currentStatus.timeRemaining} dir="ltr" />
                  <InfoBox label="بالساعة والدقيقة" value={currentStatus.currentRemainingLabel} />
                  <InfoBox label="ينتهي عند" value={currentStatus.current.endDateTime.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })} />
                </div>
                <div className="mt-6 rounded-2xl bg-white/20 p-4 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold">
                    <span>تقدم الردة الحالية</span>
                    <span dir="ltr">{currentProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${currentProgress}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 py-8 text-center">
                <Waves className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <h1 className="text-3xl font-black">لا توجد ردة نشطة الآن</h1>
                {currentStatus.next && <p className="mt-3 opacity-85">تبدأ الردة القادمة بعد {currentStatus.nextTimeRemaining}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-indigo-700">
            <CalendarClock className="h-5 w-5" />
            <h2 className="text-xl font-black">التالي في الجدول</h2>
          </div>
          {currentStatus.next ? (
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-slate-900">{currentStatus.next.name}</h3>
              <p className="text-slate-600">ردة: <strong>{currentStatus.next.raddahName}</strong></p>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">الموعد</p>
                <p className="mt-1 font-bold text-slate-800">
                  {currentStatus.next.day}، {formatDate(currentStatus.next.date)} - <span dir="ltr">{currentStatus.next.time}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm text-slate-500">تنبيه التالي</p>
                <p className="mt-1 font-bold text-slate-800">
                  يبدأ بعد {currentStatus.nextStartsAfterLabel}، ومدة الفلج {currentStatus.next.durationLabel}
                </p>
              </div>
              {currentStatus.next.notes && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{currentStatus.next.notes}</p>}
            </div>
          ) : (
            <EmptyState icon={Calendar} text="لا توجد سجلات قادمة." />
          )}
        </div>
      </section>

      {conflicts.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="mb-3 flex items-center gap-2 font-black">
            <AlertTriangle className="h-5 w-5" /> ملاحظات تحتاج مراجعة
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {conflicts.slice(0, 4).map((warning) => (
              <p key={warning} className="rounded-2xl bg-white/70 p-3 text-sm">{warning}</p>
            ))}
          </div>
        </section>
      )}

      <ScheduleTable records={upcomingRecords} currentId={currentStatus.current?.id} />
    </div>
  );

  const renderMySchedule = () => {
    const query = searchQuery.trim();
    const myRecords = query
      ? processedRecords.filter((record) => record.name.includes(query) || String(record.number).includes(query))
      : [];
    const nowMs = now.getTime();

    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900">جدولي الشخصي</h2>
          <p className="mt-2 text-slate-500">ابحث بالاسم أو الرقم لمعرفة الردات القادمة والتنبيهات المرتبطة بك.</p>
        </div>

        <div className="relative mx-auto my-8 max-w-xl">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="اكتب الاسم أو الرقم..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-4 pr-12 text-lg outline-none transition focus:border-brand-500"
          />
        </div>

        {query && (
          <div className="space-y-3">
            {myRecords.length > 0 ? (
              <>
                <div className="personal-summary rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">تم العثور على {myRecords.length} ردة مرتبطة بهذا البحث.</p>
                  <p className="mt-1 text-sm text-slate-500">تظهر النتائج بالاسم أو الرقم، وتشمل الردات الحالية والقادمة والسابقة.</p>
                  <button onClick={() => enablePersonalNotifications(myRecords)} className="notify-button mt-3">
                    <BellRing className="h-4 w-4" /> تفعيل إشعارات هذه النتائج
                  </button>
                </div>
                {myRecords.map((record) => {
                const isCurrent = currentStatus.current?.id === record.id;
                const isNext = currentStatus.next?.id === record.id;
                const isFuture = record.startMs > nowMs;
                const isPast = record.endMs <= nowMs;
                const notice = isCurrent
                  ? `تنبيه: دورك الآن، المتبقي ${record.remainingLabel}.`
                  : isNext
                    ? `تنبيه: أنت التالي، تبدأ بعد ${formatRemainingHoursMinutes(record.startMs - nowMs)}.`
                    : isFuture
                      ? `تنبيه: ردة قادمة بعد ${formatRemainingHoursMinutes(record.startMs - nowMs)}.`
                      : "هذه الردة انتهت.";
                const noticeTone = isCurrent ? "brand" : isNext ? "indigo" : isFuture ? "amber" : "slate";
                return (
                  <div key={record.id} className={`personal-card rounded-2xl border-2 p-5 ${isCurrent ? "border-brand-500 bg-brand-50" : isNext ? "border-indigo-300 bg-indigo-50" : "border-slate-100 bg-white"}`}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">{record.name}</h3>
                          {isCurrent && renderPill("دورك الآن", "brand")}
                          {isNext && renderPill("أنت التالي", "indigo")}
                          {isFuture && !isNext && renderPill("قادمة", "amber")}
                          {isPast && renderPill("انتهت", "slate")}
                        </div>
                        <div className={`personal-notice mt-3 ${noticeTone}`}>
                          <BellRing className="h-4 w-4" />
                          <span>{notice}</span>
                        </div>
                        <div className="personal-details mt-4">
                          <InfoLine label="الاسم" value={record.name} />
                          <InfoLine label="الرقم" value={record.number} dir="ltr" />
                          <InfoLine label="اسم الردة" value={record.raddahName} />
                          <InfoLine label="اليوم والتاريخ" value={`${record.day}، ${formatDate(record.date)}`} />
                          <InfoLine label="بداية الردة" value={record.time} dir="ltr" />
                          <InfoLine label="نهاية الردة" value={record.endDateTime.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })} />
                          <InfoLine label="مدة الفلج" value={record.durationLabel} />
                          <InfoLine label="المتبقي" value={isPast ? "انتهت" : formatRemainingHoursMinutes(record.endMs - nowMs)} />
                        </div>
                        {record.notes && <p className="mt-2 text-sm text-slate-500">{record.notes}</p>}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center">
                        <p className="text-xs text-slate-500">وقت البداية</p>
                        <p className="text-2xl font-black text-brand-700" dir="ltr">{record.time}</p>
                      </div>
                    </div>
                  </div>
                );
                })}
              </>
            ) : (
              <EmptyState icon={Search} text="لم يتم العثور على سجلات بهذا الاسم أو الرقم." />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAdminAuth = () => (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-black text-slate-900">دخول الإدارة</h2>
      <p className="mb-6 mt-2 text-slate-500">هذه الصفحة مخصصة لوكيل الفلج ومن يقوم بإدارة السجل.</p>
      <input
        type="password"
        placeholder="كلمة المرور"
        value={adminPass}
        onChange={(event) => setAdminPass(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && adminPass === ADMIN_PASSWORD) setIsAdminAuth(true);
        }}
        className="mb-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center outline-none focus:border-brand-500"
      />
      <button
        onClick={() => {
          if (adminPass === ADMIN_PASSWORD) setIsAdminAuth(true);
          else alert("كلمة المرور غير صحيحة.");
        }}
        className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-700"
      >
        دخول
      </button>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Settings className="h-6 w-6 text-brand-700" /> إدارة الفلج
          </h2>
          <p className="mt-1 text-slate-500">إضافة الردات، مراقبة التعارضات، وتوثيق الصيانة والبلاغات.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="admin-action"><FileDown className="h-4 w-4" /> CSV</button>
          <button onClick={exportBackup} className="admin-action"><Download className="h-4 w-4" /> نسخة احتياطية</button>
          <label className="admin-action cursor-pointer">
            <Upload className="h-4 w-4" /> استيراد
            <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
          </label>
          <button onClick={() => setIsAdminAuth(false)} className="admin-action text-red-600"><LogOut className="h-4 w-4" /> خروج</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-900">
            {editingId ? <Edit2 className="h-5 w-5 text-brand-700" /> : <Plus className="h-5 w-5 text-brand-700" />}
            {editingId ? "تعديل ردة" : "إضافة ردة جديدة"}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="الاسم">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" />
            </Field>
            <Field label="رقم المالك">
              <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} className="field" />
            </Field>
            <Field label="اسم الردة">
              <input value={form.raddahName} onChange={(event) => setForm({ ...form, raddahName: event.target.value })} className="field" placeholder="مثال: الردة الرئيسية" />
            </Field>
            <Field label="الفترة">
              <select value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} className="field">
                <option value="نهار">نهار</option>
                <option value="ليل">ليل</option>
              </select>
            </Field>
            <Field label="التاريخ">
              <input type="date" value={form.date} onChange={(event) => setFormDate(event.target.value)} className="field" />
            </Field>
            <Field label="وقت البداية">
              <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="field" />
            </Field>
            <Field label="مدة الفلج - ساعات">
              <input
                type="number"
                min="0"
                value={form.durationHours}
                onChange={(event) => setForm({ ...form, durationHours: event.target.value })}
                className="field"
                placeholder="مثال: 2"
              />
            </Field>
            <Field label="مدة الفلج - دقائق">
              <input
                type="number"
                min="0"
                max="59"
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                className="field"
                placeholder="مثال: 30"
              />
            </Field>
            <Field label="اليوم">
              <select value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })} className="field">
                <option value="">اختر اليوم</option>
                {DAY_NAMES.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات">
              <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="field" placeholder="تعليمات أو ملاحظات مختصرة" />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleSave} className="primary-button">
              {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "حفظ التعديل" : "حفظ الردة"}
            </button>
            {editingId && <button onClick={resetForm} className="secondary-button"><X className="h-4 w-4" /> إلغاء</button>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-900">
            <MessageSquareWarning className="h-5 w-5 text-amber-600" /> بلاغات ومهام الصيانة
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="field" placeholder="عنوان البلاغ" value={issueForm.title} onChange={(event) => setIssueForm({ ...issueForm, title: event.target.value })} />
            <input type="date" className="field" value={issueForm.date} onChange={(event) => setIssueForm({ ...issueForm, date: event.target.value })} />
            <select className="field" value={issueForm.type} onChange={(event) => setIssueForm({ ...issueForm, type: event.target.value })}>
              <option>صيانة</option>
              <option>تنظيف</option>
              <option>نزاع دور</option>
              <option>ملاحظة عامة</option>
            </select>
            <select className="field" value={issueForm.priority} onChange={(event) => setIssueForm({ ...issueForm, priority: event.target.value })}>
              <option>منخفضة</option>
              <option>متوسطة</option>
              <option>عالية</option>
            </select>
            <input className="field" placeholder="المسؤول" value={issueForm.owner} onChange={(event) => setIssueForm({ ...issueForm, owner: event.target.value })} />
            <select className="field" value={issueForm.status} onChange={(event) => setIssueForm({ ...issueForm, status: event.target.value })}>
              <option>مفتوح</option>
              <option>قيد المتابعة</option>
              <option>مغلق</option>
            </select>
            <textarea className="field md:col-span-2" rows="3" placeholder="تفاصيل مختصرة" value={issueForm.details} onChange={(event) => setIssueForm({ ...issueForm, details: event.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleIssueSave} className="primary-button">{editingIssueId ? "تحديث البلاغ" : "حفظ البلاغ"}</button>
            {editingIssueId && <button onClick={() => { setIssueForm(emptyIssue); setEditingIssueId(null); }} className="secondary-button">إلغاء</button>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-slate-900">كل السجلات ({records.length})</h3>
          <div className="max-h-[540px] space-y-3 overflow-y-auto pl-2">
            {processedRecords.map((record) => (
              <div key={record.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 md:flex-row md:items-center">
                <div>
                  <h4 className="font-black text-slate-900">{record.name} <span className="text-sm font-normal text-slate-500">({record.raddahName})</span></h4>
                  <p className="mt-1 text-sm text-slate-500">{record.day}، {formatDate(record.date)} | <span dir="ltr">{record.time}</span> | {record.period} | المدة: {record.durationLabel}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm(record); setEditingId(record.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="icon-button" aria-label="تعديل"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(record.id)} className="icon-button text-red-600" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {processedRecords.length === 0 && <EmptyState icon={Calendar} text="لا توجد سجلات بعد." />}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-slate-900">البلاغات ({issues.length})</h3>
          <div className="max-h-[540px] space-y-3 overflow-y-auto pl-2">
            {issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-slate-900">{issue.title}</h4>
                    <p className="mt-1 text-sm text-slate-500">{issue.type} | {formatDate(issue.date)} | {issue.owner || "بدون مسؤول"}</p>
                  </div>
                  {renderPill(issue.status, issue.status === "مغلق" ? "slate" : issue.priority === "عالية" ? "red" : "amber")}
                </div>
                {issue.details && <p className="mt-3 text-sm text-slate-600">{issue.details}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setIssueForm(issue); setEditingIssueId(issue.id); }} className="text-sm font-bold text-brand-700">تعديل</button>
                  <button onClick={() => setIssues((current) => current.filter((item) => item.id !== issue.id))} className="text-sm font-bold text-red-600">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="aesthetic-shell min-h-screen bg-slate-50 pb-12 font-cairo text-slate-800">
      <div className="ambient-wave" />
      <nav className="nav-glass sticky top-0 z-50 mb-8 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-4 md:flex-row md:px-8">
          <div className="brand-lockup flex items-center gap-2 text-2xl font-black text-brand-700">
            <span className="brand-mark"><Droplets className="h-7 w-7" /></span>
            <span>
              نظام إدارة الفلج
              <small>{new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(now)}</small>
            </span>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            <NavButton active={view === "public"} onClick={() => setView("public")} icon={LayoutDashboard} label="الرئيسية" />
            <NavButton active={view === "my-schedule"} onClick={() => setView("my-schedule")} icon={CalendarClock} label="جدولي" />
            <NavButton active={view === "admin"} onClick={() => setView("admin")} icon={ShieldCheck} label="الإدارة" danger />
          </div>
        </div>
      </nav>

      <main className="px-4">
        {view === "public" && renderPublicDashboard()}
        {view === "my-schedule" && renderMySchedule()}
        {view === "admin" && (isAdminAuth ? renderAdminDashboard() : renderAdminAuth())}
      </main>

      <a
        className="whatsapp-float"
        href="https://wa.me/96896017822"
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل واتساب مع المشرف"
        title="تواصل مع المشرف"
      >
        <MessageCircle className="h-6 w-6" />
        <span>المشرف</span>
      </a>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${
        active ? `bg-white shadow-sm ${danger ? "text-red-600" : "text-brand-700"}` : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    brand: "bg-brand-100 text-brand-800",
    indigo: "bg-indigo-100 text-indigo-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`stat-icon mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoBox({ label, value, dir }) {
  return (
    <div className="rounded-2xl bg-black/10 p-4 backdrop-blur">
      <p className="mb-1 text-xs opacity-80">{label}</p>
      <p className="text-xl font-black" dir={dir}>{value}</p>
    </div>
  );
}

function InfoLine({ label, value, dir }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong dir={dir}>{value || "-"}</strong>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="py-10 text-center text-slate-400">
      <Icon className="mx-auto mb-3 h-12 w-12 opacity-40" />
      <p>{text}</p>
    </div>
  );
}

function ScheduleTable({ records, currentId }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-900">
        <Calendar className="h-5 w-5 text-brand-700" /> الجدول القادم
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-right">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="rounded-tr-xl p-4 font-bold">الاسم</th>
              <th className="p-4 font-bold">الردة</th>
              <th className="p-4 font-bold">الموعد</th>
              <th className="p-4 font-bold">البداية</th>
              <th className="p-4 font-bold">المدة المتوقعة</th>
              <th className="rounded-tl-xl p-4 font-bold">الفترة</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className={`border-b border-slate-100 transition hover:bg-slate-50 ${record.id === currentId ? "bg-brand-50" : ""}`}>
                <td className="p-4 font-black text-slate-900">
                  {record.name}
                  {record.id === currentId && <span className="mr-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">الآن</span>}
                </td>
                <td className="p-4 text-slate-600">{record.raddahName}</td>
                <td className="p-4 text-slate-600">{record.day}، {formatDate(record.date)}</td>
                <td className="p-4 font-bold text-slate-800" dir="ltr">{record.time}</td>
                <td className="p-4 text-slate-600">{record.durationLabel}</td>
                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.period === "نهار" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>
                    {record.period}
                  </span>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan="6">
                  <EmptyState icon={Calendar} text="الجدول فارغ." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
