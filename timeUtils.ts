export const getCairoDate = (): Date => {
  const now = new Date();
  const cairoString = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  return new Date(cairoString);
};

export const getHijriDateString = (): string => {
  const date = getCairoDate();
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const getGregorianDateString = (): string => {
  const date = getCairoDate();
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

// Adjusted for Alexandria, Egypt (approximate average for current season)
// For a real app, this should be dynamic.
const FAJR_HOUR = 5;
const FAJR_MINUTE = 10;

export const getFajrStatus = (): { isOpen: boolean; message: string; fajrTime: string, nextFajrCountdown: string } => {
  const now = getCairoDate();
  
  // Set today's Fajr time
  const fajrToday = new Date(now);
  fajrToday.setHours(FAJR_HOUR, FAJR_MINUTE, 0, 0);

  // Window: -30 mins to +60 mins
  const windowStart = new Date(fajrToday.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(fajrToday.getTime() + 60 * 60 * 1000);

  const formatTime = (d: Date) => d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Real Logic Active
  if (now >= windowStart && now <= windowEnd) {
    return {
      isOpen: true,
      message: `الوقت متاح الآن لتسجيل صلاة الفجر. يغلق التسجيل الساعة ${formatTime(windowEnd)}`,
      fajrTime: formatTime(fajrToday),
      nextFajrCountdown: ''
    };
  } else if (now < windowStart) {
    const diffMs = windowStart.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return {
      isOpen: false,
      message: `لم يحن موعد التسجيل بعد. يفتح قبل الفجر بـ ٣٠ دقيقة (${formatTime(windowStart)}).`,
      fajrTime: formatTime(fajrToday),
      nextFajrCountdown: `${hours > 0 ? hours + ' ساعة و ' : ''}${mins} دقيقة`
    };
  } else {
    return {
      isOpen: false,
      message: `انتهى وقت تسجيل صلاة الفجر لهذا اليوم. الموعد القادم فجر الغد إن شاء الله.`,
      fajrTime: formatTime(fajrToday),
      nextFajrCountdown: 'موعدنا غداً'
    };
  }
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const isYesterday = (d1: Date, d2: Date): boolean => {
  const yesterday = new Date(d1);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(yesterday, d2);
};