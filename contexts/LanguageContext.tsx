"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Language = "pt" | "en";

const translations = {
  pt: {
    // navigation
    dashboard: "Dashboard",
    leads: "Leads",
    pipeline: "Pipeline",
    newLead: "Nova Lead",
    reminders: "Lembretes",
    briefing: "Briefing",
    reports: "Relatórios",
    import: "Importar CSV",
    importCsv: "Importar CSV",
    settings: "Configurações",
    logout: "Sair",
    // buttons
    save: "Salvar",
    cancel: "Cancelar",
    delete: "Excluir",
    edit: "Editar",
    back: "Voltar",
    next: "Próximo",
    close: "Fechar",
    confirm: "Confirmar",
    add: "Adicionar",
    export: "Exportar",
    // form labels
    fullName: "Nome Completo",
    phone: "Telefone / WhatsApp",
    email: "E-mail",
    country: "País de Origem",
    currentLocation: "Localização Atual",
    courseInterest: "Interesse de Curso",
    preferredCity: "Cidade Preferida",
    budget: "Orçamento",
    source: "Origem",
    temperature: "Temperatura",
    consultant: "Consultor",
    notes: "Observações",
    stage: "Estágio",
    score: "Score",
    city: "Cidade",
    course: "Curso",
    whatsapp: "WhatsApp",
    // temperature
    hot: "Quente",
    warm: "Morno",
    cold: "Frio",
    // table headers
    name: "Nome",
    visaExpiry: "Venc. Visto",
    created: "Criado",
    // dashboard
    totalLeads: "Total de Leads",
    hotLeads: "Leads Quentes",
    meetingsScheduled: "Reuniões Agendadas",
    closedWon: "Fechados",
    waitingReply: "Aguardando Resposta",
    // common
    loading: "Carregando...",
    noLeadsFound: "Nenhuma lead encontrada",
    saveChanges: "Salvar alterações",
    search: "Buscar leads...",
    filter: "Filtrar",
    overdue: "atrasado",
    today: "hoje",
    // lead detail
    contactHistory: "Histórico de Contato",
    tasks: "Tarefas",
    timeline: "Timeline",
    payments: "Pagamentos",
    documents: "Documentos",
    // visa
    visaStatus: "Status do Visto",
    visaType: "Tipo de Visto",
    visaExpiryDate: "Vencimento do Visto",
    offshore: "Offshore",
    onshore: "Onshore",
    daysLeft: "dias restantes",
    expired: "Vencido",
    visa: "Visto",
    // group
    couple: "Casal",
    family: "Família",
    primaryStudent: "Estudante Principal",
    linkGroup: "Vincular",
    unlinkGroup: "Desvincular",
    // alerts
    visaExpiringSoon: "Vistos vencendo em breve",
    forgottenLeads: "Leads sem contato",
    // settings
    profile: "Perfil",
    security: "Segurança",
    users: "Usuários",
    agency: "Agência",
    notifications: "Notificações",
    appearance: "Aparência",
    data: "Dados",
    theme: "Tema",
    language: "Idioma",
    changePassword: "Alterar Senha",
    currentPassword: "Senha atual",
    newPassword: "Nova senha",
    // themes
    darkNavy: "Dark Navy",
    darkGray: "Dark Cinza",
    deepBlack: "Deep Black",
    lightTheme: "Claro",
    portuguese: "Português",
    english: "English",
    // import
    mapColumns: "Mapear Colunas",
    detectRows: "linhas detectadas",
    // pipeline
    noLeads: "Nenhum lead",
    moveGroup: "Grupo movido para",
    // reminders
    addReminder: "Novo Lembrete",
    // login
    loginTitle: "Entrar na sua conta",
    loginSubtitle: "Acesso exclusivo para consultores Hello Australia",
    username: "Usuário",
    password: "Senha",
    loginButton: "Entrar",
    loginError: "Usuário ou senha incorretos",
    loginHelp: "Problemas para acessar? Fale com o administrador do sistema.",
  },
  en: {
    // navigation
    dashboard: "Dashboard",
    leads: "Leads",
    pipeline: "Pipeline",
    newLead: "New Lead",
    reminders: "Reminders",
    briefing: "Briefing",
    reports: "Reports",
    import: "Import CSV",
    importCsv: "Import CSV",
    settings: "Settings",
    logout: "Log out",
    // buttons
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    close: "Close",
    confirm: "Confirm",
    add: "Add",
    export: "Export",
    // form labels
    fullName: "Full Name",
    phone: "Phone / WhatsApp",
    email: "E-mail",
    country: "Country of Origin",
    currentLocation: "Current Location",
    courseInterest: "Course Interest",
    preferredCity: "Preferred City",
    budget: "Budget",
    source: "Source",
    temperature: "Temperature",
    consultant: "Consultant",
    notes: "Notes",
    stage: "Stage",
    score: "Score",
    city: "City",
    course: "Course",
    whatsapp: "WhatsApp",
    // temperature
    hot: "Hot",
    warm: "Warm",
    cold: "Cold",
    // table headers
    name: "Name",
    visaExpiry: "Visa Expiry",
    created: "Created",
    // dashboard
    totalLeads: "Total Leads",
    hotLeads: "Hot Leads",
    meetingsScheduled: "Meetings Scheduled",
    closedWon: "Closed Won",
    waitingReply: "Waiting Reply",
    // common
    loading: "Loading...",
    noLeadsFound: "No leads found",
    saveChanges: "Save changes",
    search: "Search leads...",
    filter: "Filter",
    overdue: "overdue",
    today: "today",
    // lead detail
    contactHistory: "Contact History",
    tasks: "Tasks",
    timeline: "Timeline",
    payments: "Payments",
    documents: "Documents",
    // visa
    visaStatus: "Visa Status",
    visaType: "Visa Type",
    visaExpiryDate: "Visa Expiry Date",
    offshore: "Offshore",
    onshore: "Onshore",
    daysLeft: "days left",
    expired: "Expired",
    visa: "Visa",
    // group
    couple: "Couple",
    family: "Family",
    primaryStudent: "Primary Student",
    linkGroup: "Link",
    unlinkGroup: "Unlink",
    // alerts
    visaExpiringSoon: "Visas expiring soon",
    forgottenLeads: "Leads without contact",
    // settings
    profile: "Profile",
    security: "Security",
    users: "Users",
    agency: "Agency",
    notifications: "Notifications",
    appearance: "Appearance",
    data: "Data",
    theme: "Theme",
    language: "Language",
    changePassword: "Change Password",
    currentPassword: "Current password",
    newPassword: "New password",
    // themes
    darkNavy: "Dark Navy",
    darkGray: "Dark Gray",
    deepBlack: "Deep Black",
    lightTheme: "Light",
    portuguese: "Português",
    english: "English",
    // import
    mapColumns: "Map Columns",
    detectRows: "rows detected",
    // pipeline
    noLeads: "No leads",
    moveGroup: "Group moved to",
    // reminders
    addReminder: "New Reminder",
    // login
    loginTitle: "Sign in to your account",
    loginSubtitle: "Exclusive access for Hello Australia consultants",
    username: "Username",
    password: "Password",
    loginButton: "Sign In",
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
