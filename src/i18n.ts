import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.name": "AltaCRM",
      "login.title": "Sign in to your workspace",
      "login.email": "Email address",
      "login.password": "Password",
      "login.button": "Sign In",
      "login.noAccount": "Don't have an account?",
      "login.requestAccess": "Request access",
      "nav.orders": "Orders Board",
      "nav.clients": "Clients",
      "nav.storage": "Storage",
      "nav.settings": "Settings",
      "nav.signout": "Sign Out",
      "kanban.title": "Orders Board",
      "kanban.addOrder": "Add Order",
      "kanban.addColumn": "Add Column",
      "kanban.col.new": "New Orders",
      "kanban.col.progress": "In Progress",
      "kanban.col.completed": "Completed"
    }
  },
  ru: {
    translation: {
      "app.name": "AltaCRM",
      "login.title": "Войдите в рабочее пространство",
      "login.email": "Email адрес",
      "login.password": "Пароль",
      "login.button": "Войти",
      "login.noAccount": "Нет аккаунта?",
      "login.requestAccess": "Запросить доступ",
      "nav.orders": "Доска заявок",
      "nav.clients": "Клиенты",
      "nav.storage": "Склад",
      "nav.settings": "Настройки",
      "nav.signout": "Выйти",
      "kanban.title": "Доска заявок",
      "kanban.addOrder": "Создать заявку",
      "kanban.addColumn": "Добавить колонку",
      "kanban.col.new": "Новые",
      "kanban.col.progress": "В работе",
      "kanban.col.completed": "Завершено"
    }
  }
};

// Retrieve language from localStorage or default to ru
const savedLang = localStorage.getItem('altacrm_lang') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
