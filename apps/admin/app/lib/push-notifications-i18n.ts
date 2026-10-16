import { AdminLocale } from "./admin-i18n";
export function pushLabels(locale: AdminLocale) {
  return locale === "kk"
    ? {
        title: "Push-хабарламалар",
        description: "Жолаушылар мен жүргізушілерге хабарлама жіберу.",
        audience: "Алушылар",
        all: "Барлығы",
        passenger: "Жолаушылар",
        driver: "Жүргізушілер",
        subject: "Тақырып",
        body: "Хабарлама мәтіні",
        send: "Жіберу",
        history: "Жіберу тарихы",
        devices: "Белсенді құрылғылар",
        queued: "Құрылғыларға кезекке қойылды",
        unavailable: "Push қызметі қолжетімсіз. Кейінірек қайталаңыз.",
        empty: "Әзірге хабарламалар жіберілген жоқ.",
        saved: "Хабарлама жіберу кезегіне қосылды.",
        date: "Күні",
        pending: "Жіберу аяқталған жоқ",
        retry: "Жіберуді жалғастыру",
      }
    : {
        title: "Push-уведомления",
        description: "Отправка уведомлений пассажирам и водителям.",
        audience: "Получатели",
        all: "Все",
        passenger: "Пассажиры",
        driver: "Водители",
        subject: "Заголовок",
        body: "Текст уведомления",
        send: "Отправить",
        history: "История отправок",
        devices: "Активные устройства",
        queued: "Поставлено в очередь для устройств",
        unavailable: "Сервис push недоступен. Попробуйте позже.",
        empty: "Уведомления ещё не отправлялись.",
        saved: "Уведомление поставлено в очередь отправки.",
        date: "Дата",
        pending: "Отправка не завершена",
        retry: "Продолжить отправку",
      };
}
export type PushCampaign = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "passenger" | "driver";
  status: string;
  queuedDevices: number;
  createdAt: string;
};
export type PushCampaigns = {
  items: PushCampaign[];
  devices: { all: number; passenger: number; driver: number };
};
