"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Language = "pt" | "en";

const translations = {
  pt: {
    dashboard: "Dashboard",
    leads: "Leads",
    pipeline: "Pipeline",
    newLead: "Novo Lead",
    reminders: "Lembretes",
    briefing: "Briefing",
    reports: "Relatórios",
    import: "Importar CSV",
    settings: "Configurações",
    logout: "Sair",
    search: "Buscar leads...",
    overdue: "atrasado",
    today: "hoje",
    score: "Score",
    temperature: "Temperatura",
    stage: "Etapa",
    consultant: "Consultor",
    source: "Origem",
    city: "Cidade",
    course: "Curso",
    budget: "Orçamento",
    notes: "Notas",
    tasks: "Tarefas",
    timeline: "Timeline",
    payments: "Pagamentos",
    visa: "Visto",
    documents: "Documentos",
    save: "Salvar",
    cancel: "Cancelar",
    delete: "Excluir",
    edit: "Editar",
    add: "Adicionar",
    close: "Fechar",
    confirm: "Confirmar",
    name: "Nome",
    email: "E-mail",
    phone: "Telefone",
    whatsapp: "WhatsApp",
    hot: "Quente",
    warm: "Morno",
    cold: "Frio",
    appearance: "Aparência",
    language: "Idioma",
    theme: "Tema",
    darkNavy: "Dark Navy",
    darkGray: "Dark Cinza",
    deepBlack: "Deep Black",
    lightTheme: "Claro",
    portuguese: "Português",
    english: "English",
    loginTitle: "Entrar na sua conta",
    loginSubtitle: "Acesso exclusivo para consultores Hello Australia",
    username: "Usuário",
    password: "Senha",
    loginButton: "Entrar",
    loginError: "Usuário ou senha incorretos",
    loginHelp: "Problemas para acessar? Fale com o administrador do sistema.",
  },
  en: {
    dashboard: "Dashboard",
    leads: "Leads",
    pipeline: "Pipeline",
    newLead: "New Lead",
    reminders: "Reminders",
    briefing: "Briefing",
    reports: "Reports",
    import: "Import CSV",
    settings: "Settings",
    logout: "Log out",
    search: "Search leads...",
    overdue: "overdue",
    today: "today",
    score: "Score",
    temperature: "Temperature",
    stage: "Stage",
    consultant: "Consultant",
    source: "Source",
    city: "City",
    course: "Course",
    budget: "Budget",
    notes: "Notes",
    tasks: "Tasks",
    timeline: "Timeline",
    payments: "Payments",
    visa: "Visa",
    documents: "Documents",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    name: "Name",
    email: "E-mail",
    phone: "Phone",
    whatsapp: "WhatsApp",
    hot: "Hot",
    warm: "Warm",
    cold: "Cold",
    appearance: "Appearance",
    language: "Language",
    theme: "Theme",
    darkNavy: "Dark Navy",
    darkGray: "Dark Gray",
    deepBlack: "Deep Black",
    lightTheme: "Light",
    portuguese: "Português",
    english: "English",
    loginTitle: "Sign in to your account",
    loginSubtitle: "Exclusive access for Hello Australia consultants",
    username: "Username",
    password: "Password",
    loginButton: "Sign in",
    loginError: "Incorrect username or password",
    loginHelp: "Having trouble? Contact your system administrator.",
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "pt",
  setLanguage: () => {},
  t: (key) => translations.pt[key],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("pt");

  useEffect(() => {
    const saved = localStorage.getItem("crm-language") as Language | null;
    if (saved === "pt" || saved === "en") setLang(saved);
  }, []);

  function setLanguage(l: Language) {
    localStorage.setItem("crm-language", l);
    setLang(l);
  }

  function t(key: TranslationKey): string {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
