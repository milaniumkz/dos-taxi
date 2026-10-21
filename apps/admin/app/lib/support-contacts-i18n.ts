import { AdminLocale } from "./admin-i18n";

export type SupportContacts = {
  phone: string;
  whatsapp: string;
  email: string;
  telegram: string;
};

const labels = {
  ru: {
    title: "Контакты техподдержки",
    description: "Контакты для пассажиров и водителей. Пустое поле скрывает соответствующий способ связи. Редактировать может администратор.",
    phone: "Телефон поддержки",
    whatsapp: "Телефон WhatsApp",
    email: "Email поддержки",
    telegram: "Ссылка на Telegram",
    phoneHint: "Телефоны указывайте в международном формате: +77001234567. Telegram: https://t.me/username.",
    saved: "Контакты техподдержки сохранены",
    loadError: "Не удалось загрузить контакты техподдержки. Обновите страницу перед редактированием.",
  },
  kk: {
    title: "Техникалық қолдау байланыстары",
    description: "Жолаушылар мен жүргізушілерге арналған байланыстар. Бос өріс байланыс тәсілін жасырады. Тек әкімші өзгерте алады.",
    phone: "Қолдау телефоны",
    whatsapp: "WhatsApp телефоны",
    email: "Қолдау email мекенжайы",
    telegram: "Telegram сілтемесі",
    phoneHint: "Телефонды халықаралық пішімде енгізіңіз: +77001234567. Telegram: https://t.me/username.",
    saved: "Қолдау байланыстары сақталды",
    loadError: "Қолдау байланыстарын жүктеу мүмкін болмады. Өзгертпес бұрын бетті жаңартыңыз.",
  },
};

export function supportContactsLabels(locale: AdminLocale) {
  return labels[locale];
}
