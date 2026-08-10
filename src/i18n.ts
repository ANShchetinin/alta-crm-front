import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.name": "AltaCRM",
      "login.title": "Welcome to Alta CRM",
      "login.subtitle": "Log in to continue",
      "login.email": "Email address",
      "login.password": "Password",
      "login.button": "Sign In",
      "login.error": "Authentication failed. Please check your credentials.",
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
      "kanban.col.completed": "Completed",
      "kanban.modal.client": "Client",
      "kanban.modal.selectClient": "Select client",
      "kanban.modal.address": "Address",
      "kanban.modal.description": "Description",
      "kanban.modal.price": "Total Price (₽)",
      "kanban.modal.cancel": "Cancel",
      "clients.title": "Clients",
      "clients.addClient": "Add Client",
      "clients.search": "Search clients...",
      "clients.columns.name": "Name",
      "clients.columns.phone": "Phone",
      "clients.columns.createdAt": "Registered",
      "clients.columns.actions": "Actions",
      "clients.modal.addTitle": "Add New Client",
      "clients.modal.editTitle": "Edit Client",
      "clients.modal.name": "Full Name",
      "clients.modal.phone": "Phone Number",
      "clients.modal.cancel": "Cancel",
      "clients.modal.save": "Save"
    }
  },
  ru: {
    translation: {
      "app.name": "AltaCRM",
      "login.title": "Добро пожаловать в Alta CRM",
      "login.subtitle": "Войдите для продолжения",
      "login.email": "Электронная почта",
      "login.password": "Пароль",
      "login.button": "Войти",
      "login.error": "Неверный email или пароль.",
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
      "kanban.col.completed": "Завершено",
      "kanban.modal.client": "Клиент",
      "kanban.modal.selectClient": "Выберите клиента",
      "kanban.modal.address": "Адрес",
      "kanban.modal.description": "Описание задачи",
      "kanban.modal.price": "Стоимость (₽)",
      "kanban.modal.cancel": "Отмена",
      "clients.title": "Клиенты",
      "clients.addClient": "Добавить клиента",
      "clients.search": "Поиск клиентов...",
      "clients.columns.name": "ФИО",
      "clients.columns.phone": "Телефон",
      "clients.columns.createdAt": "Зарегистрирован",
      "clients.columns.actions": "Действия",
      "clients.modal.addTitle": "Новый клиент",
      "clients.modal.editTitle": "Редактировать клиента",
      "clients.modal.name": "Полное имя",
      "clients.modal.phone": "Номер телефона",
      "clients.modal.cancel": "Отмена",
      "clients.modal.save": "Сохранить"
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
