import type { PipelineStage, PhaseGroup } from "@/types";

export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; phase: PhaseGroup; color: string; bg: string; dot: string; order: number }
> = {
  new_lead:             { label: "New Lead",                        phase: "leads",      color: "text-slate-300",   bg: "bg-slate-500/20 border-slate-500/30",   dot: "bg-slate-400",   order: 1 },
  first_contact:        { label: "First Contact",                   phase: "leads",      color: "text-blue-300",    bg: "bg-blue-500/20 border-blue-500/30",     dot: "bg-blue-400",    order: 2 },
  waiting_response:     { label: "Waiting for Response",            phase: "qualifying", color: "text-cyan-300",    bg: "bg-cyan-500/20 border-cyan-500/30",     dot: "bg-cyan-400",    order: 3 },
  meeting_scheduled:    { label: "Meeting Scheduled",               phase: "qualifying", color: "text-indigo-300",  bg: "bg-indigo-500/20 border-indigo-500/30", dot: "bg-indigo-400",  order: 4 },
  quotation_prepared:   { label: "Quotation Prepared",              phase: "qualifying", color: "text-violet-300",  bg: "bg-violet-500/20 border-violet-500/30", dot: "bg-violet-400",  order: 5 },
  followup:             { label: "Follow-up",                       phase: "proposal",   color: "text-orange-300",  bg: "bg-orange-500/20 border-orange-500/30", dot: "bg-orange-400",  order: 6 },
  student_said_yes:     { label: "Student Said Yes",                phase: "proposal",   color: "text-amber-300",   bg: "bg-amber-500/20 border-amber-500/30",   dot: "bg-amber-400",   order: 7 },
  application_sent:     { label: "Application Sent to School",      phase: "enrollment", color: "text-purple-300",  bg: "bg-purple-500/20 border-purple-500/30", dot: "bg-purple-400",  order: 8 },
  offer_letter_received:{ label: "Offer Letter Received",           phase: "enrollment", color: "text-fuchsia-300", bg: "bg-fuchsia-500/20 border-fuchsia-500/30",dot: "bg-fuchsia-400",order: 9 },
  contract_sent:        { label: "Offer Letter + Contract Sent",    phase: "enrollment", color: "text-pink-300",    bg: "bg-pink-500/20 border-pink-500/30",     dot: "bg-pink-400",    order: 10 },
  documents_signed:     { label: "Student Signed Documents",        phase: "enrollment", color: "text-rose-300",    bg: "bg-rose-500/20 border-rose-500/30",     dot: "bg-rose-400",    order: 11 },
  read_carefully_email: { label: '"Read Carefully" Email Sent',     phase: "enrollment", color: "text-sky-300",     bg: "bg-sky-500/20 border-sky-500/30",       dot: "bg-sky-400",     order: 12 },
  first_payment:        { label: "First Payment for CoE",           phase: "payments",   color: "text-yellow-300",  bg: "bg-yellow-500/20 border-yellow-500/30", dot: "bg-yellow-400",  order: 13 },
  school_deposit:       { label: "School Deposit Confirmed",        phase: "payments",   color: "text-lime-300",    bg: "bg-lime-500/20 border-lime-500/30",     dot: "bg-lime-400",    order: 14 },
  oshc_payment:         { label: "OSHC Payment Collected",          phase: "payments",   color: "text-teal-300",    bg: "bg-teal-500/20 border-teal-500/30",     dot: "bg-teal-400",    order: 15 },
  oshc_policy:          { label: "New OSHC Policy Requested",       phase: "payments",   color: "text-cyan-300",    bg: "bg-cyan-500/20 border-cyan-500/30",     dot: "bg-cyan-400",    order: 16 },
  visa_payment:         { label: "Visa Payment Collected",          phase: "payments",   color: "text-green-300",   bg: "bg-green-500/20 border-green-500/30",   dot: "bg-green-400",   order: 17 },
  visa_checklist_call:  { label: "Visa Checklist Call Completed",   phase: "visa",       color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30",dot: "bg-emerald-400",order: 18 },
  statement_reviewed:   { label: "Statement/Intention Letter",      phase: "visa",       color: "text-teal-300",    bg: "bg-teal-500/20 border-teal-500/30",     dot: "bg-teal-400",    order: 19 },
  final_doc_check:      { label: "Final Document Check",            phase: "visa",       color: "text-green-300",   bg: "bg-green-500/20 border-green-500/30",   dot: "bg-green-400",   order: 20 },
  visa_applied:         { label: "Visa Applied",                    phase: "visa",       color: "text-blue-300",    bg: "bg-blue-500/20 border-blue-500/30",     dot: "bg-blue-400",    order: 21 },
  final_instructions:   { label: "Final Instructions Sent",         phase: "visa",       color: "text-indigo-300",  bg: "bg-indigo-500/20 border-indigo-500/30", dot: "bg-indigo-400",  order: 22 },
  closed_won:           { label: "Closed Won",                      phase: "closed",     color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30",dot: "bg-emerald-400",order: 23 },
  closed_lost:          { label: "Closed Lost",                     phase: "closed",     color: "text-red-300",     bg: "bg-red-500/20 border-red-500/30",       dot: "bg-red-400",     order: 24 },
};

export const PHASE_CONFIG: Record<
  PhaseGroup,
  { label: string; color: string; headerBg: string; stages: PipelineStage[] }
> = {
  leads:      { label: "Leads",       color: "text-slate-300",   headerBg: "bg-slate-500/10 border-slate-500/20",   stages: ["new_lead", "first_contact"] },
  qualifying: { label: "Qualifying",  color: "text-cyan-300",    headerBg: "bg-cyan-500/10 border-cyan-500/20",     stages: ["waiting_response", "meeting_scheduled", "quotation_prepared"] },
  proposal:   { label: "Proposal",    color: "text-orange-300",  headerBg: "bg-orange-500/10 border-orange-500/20", stages: ["followup", "student_said_yes"] },
  enrollment: { label: "Enrollment",  color: "text-purple-300",  headerBg: "bg-purple-500/10 border-purple-500/20", stages: ["application_sent", "offer_letter_received", "contract_sent", "documents_signed", "read_carefully_email"] },
  payments:   { label: "Payments",    color: "text-yellow-300",  headerBg: "bg-yellow-500/10 border-yellow-500/20", stages: ["first_payment", "school_deposit", "oshc_payment", "oshc_policy", "visa_payment"] },
  visa:       { label: "Visa",        color: "text-emerald-300", headerBg: "bg-emerald-500/10 border-emerald-500/20",stages: ["visa_checklist_call", "statement_reviewed", "final_doc_check", "visa_applied", "final_instructions"] },
  closed:     { label: "Closed",      color: "text-gray-300",    headerBg: "bg-gray-500/10 border-gray-500/20",     stages: ["closed_won", "closed_lost"] },
};

export const PHASE_ORDER: PhaseGroup[] = ["leads", "qualifying", "proposal", "enrollment", "payments", "visa", "closed"];

export const ALL_STAGES: PipelineStage[] = Object.keys(STAGE_CONFIG) as PipelineStage[];

export const TEMPERATURE_CONFIG = {
  hot:  { label: "Hot",  color: "text-red-300",    bg: "bg-red-500/20 border-red-500/30",    dot: "bg-red-400",    icon: "🔥" },
  warm: { label: "Warm", color: "text-orange-300", bg: "bg-orange-500/20 border-orange-500/30", dot: "bg-orange-400", icon: "☀️" },
  cold: { label: "Cold", color: "text-blue-300",   bg: "bg-blue-500/20 border-blue-500/30",  dot: "bg-blue-400",   icon: "❄️" },
};

export const TASK_TEMPLATES: Record<PipelineStage, string[]> = {
  new_lead:              ["Add to CRM", "Verify contact information", "Assign to consultant"],
  first_contact:         ["Send welcome message on WhatsApp", "Introduce Hello Australia", "Ask about goals and timeline"],
  waiting_response:      ["Follow up if no reply in 48h", "Send reminder message", "Try alternate contact method"],
  meeting_scheduled:     ["Confirm meeting date/time", "Prepare presentation materials", "Send calendar invite"],
  quotation_prepared:    ["Prepare course options", "Calculate total costs", "Send quotation document"],
  followup:              ["Check if student reviewed quotation", "Address questions", "Set next follow-up date"],
  student_said_yes:      ["Collect student details for application", "Explain next steps", "Request documents"],
  application_sent:      ["Complete school application form", "Send application to school", "Confirm receipt"],
  offer_letter_received: ["Review offer letter terms", "Explain offer to student", "Confirm student acceptance"],
  contract_sent:         ["Send Hello Australia contract", "Explain contract terms", "Follow up on signature"],
  documents_signed:      ["Receive signed documents", "Store in student file", "Confirm all docs complete"],
  read_carefully_email:  ["Draft 'Read Carefully' email", "Include all important dates", "Send and confirm receipt"],
  first_payment:         ["Send payment instructions", "Confirm CoE payment received", "Issue receipt"],
  school_deposit:        ["Confirm school deposit paid", "Request deposit receipt", "Update student file"],
  oshc_payment:          ["Calculate OSHC cost", "Collect OSHC payment", "Issue receipt"],
  oshc_policy:           ["Request OSHC policy from provider", "Send policy to student", "Confirm receipt"],
  visa_payment:          ["Collect visa payment", "Issue receipt", "Confirm payment recorded"],
  visa_checklist_call:   ["Schedule visa checklist call", "Go through all documents", "Confirm checklist complete"],
  statement_reviewed:    ["Review Statement of Purpose", "Check financial statements", "Request edits if needed"],
  final_doc_check:       ["Final review of all visa documents", "Check passport validity", "Confirm everything ready"],
  visa_applied:          ["Submit visa application online", "Provide receipt to student", "Set expected decision date"],
  final_instructions:    ["Send pre-departure checklist", "Confirm accommodation arranged", "Provide emergency contacts"],
  closed_won:            ["Archive student file", "Request Google review", "Add to alumni network"],
  closed_lost:           ["Record reason for loss", "Send farewell message", "Keep in newsletter list"],
};

export const CONSULTANTS = [
  "André Perez",
  "Andrew Oliveira",
];

export const COURSES: string[] = [
  "ELICOS – General English",
  "ELICOS – IELTS Preparation",
  "ELICOS – Business English",
  "VET – Certificate III",
  "VET – Certificate IV",
  "VET – Diploma",
  "Bachelor of IT",
  "Bachelor of Business",
  "Bachelor of Commerce",
  "Master of Business Analytics",
  "Master of Engineering",
  "Foundation Year",
  "Professional Year – IT",
  "Professional Year – Accounting",
  "Professional Year – Engineering",
];

export const CITIES = [
  "Sydney", "Melbourne", "Brisbane", "Gold Coast", "Adelaide", "Perth", "Canberra",
];

export interface MessageTemplate {
  label: string;
  channel: "whatsapp" | "email";
  subject?: string;
  body: string;
}

export const STAGE_TEMPLATES: Record<PipelineStage, MessageTemplate[]> = {
  new_lead: [
    {
      label: "Boas-vindas inicial",
      channel: "whatsapp",
      body: "Olá {name}! 👋 Aqui é {consultant} da Hello Australia. Vi que você tem interesse em estudar na Austrália — adoraria te ajudar a encontrar a melhor opção! Você tem um tempinho para conversar essa semana?",
    },
    {
      label: "Apresentação por e-mail",
      channel: "email",
      subject: "Bem-vindo(a) à Hello Australia! 🎓",
      body: "Olá {name},\n\nSeja muito bem-vindo(a) à Hello Australia! Sou {consultant} e vou ser seu consultor(a) durante toda essa jornada.\n\nNos especializamos em ajudar estudantes a realizarem o sonho de estudar e morar na Austrália, com suporte completo desde a escolha do curso até o visto.\n\nPode me contar um pouco mais sobre seus objetivos? Qual curso tem interesse e por quanto tempo pretende ficar na Austrália?\n\nAguardo seu retorno!\n\nAtenciosamente,\n{consultant}\nHello Australia",
    },
  ],
  first_contact: [
    {
      label: "Primeiro contato WhatsApp",
      channel: "whatsapp",
      body: "Oi {name}! 😊 Tudo bem? Sou {consultant} da Hello Australia. Estou aqui para te ajudar com seus planos de estudar em {city}! Você prefere conversar por aqui mesmo ou prefere agendar uma videochamada?",
    },
  ],
  waiting_response: [
    {
      label: "Follow-up sem resposta (2 dias)",
      channel: "whatsapp",
      body: "Oi {name}! Como você está? 😊 Só passando para ver se recebeu minha mensagem anterior. Qualquer dúvida sobre {course} ou sobre morar em {city}, é só me chamar. Estou aqui para ajudar! 🙌",
    },
    {
      label: "Follow-up sem resposta (5 dias)",
      channel: "whatsapp",
      body: "Oi {name}! Tudo bem por aí? 👋 Sei que a rotina fica corrida, mas queria saber se ainda tem interesse em estudar na Austrália. Tenho algumas opções incríveis de {course} em {city} que acredito que você vai adorar! Podemos conversar 5 minutinhos essa semana?",
    },
  ],
  meeting_scheduled: [
    {
      label: "Confirmação de reunião",
      channel: "whatsapp",
      body: "Oi {name}! 🗓 Confirmando nossa conversa agendada! Mal posso esperar para te apresentar as opções de {course} em {city}. Se precisar remarcar, é só me avisar. Até logo! 😊",
    },
    {
      label: "Lembrete 1h antes",
      channel: "whatsapp",
      body: "Oi {name}! 👋 Lembrando que nossa reunião está chegando! Qualquer dificuldade para entrar na chamada, me avise. Nos vemos em breve! 🎯",
    },
  ],
  quotation_prepared: [
    {
      label: "Envio da cotação",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Preparei uma simulação completa para você com as melhores opções de {course} em {city}, incluindo valores, duração e datas de início. Vou te enviar agora — qualquer dúvida sobre os valores ou sobre a escolha da escola, pode me perguntar à vontade! 😊",
    },
    {
      label: "Follow-up cotação",
      channel: "whatsapp",
      body: "Oi {name}! Tudo bem? 😊 Queria saber se você teve chance de revisar a cotação que te enviei. Tem alguma dúvida ou algo que gostaria de ajustar? Posso simular outros cursos ou cidades também se quiser comparar! 🎓",
    },
  ],
  followup: [
    {
      label: "Follow-up pós-cotação",
      channel: "whatsapp",
      body: "Oi {name}! 👋 Como estão as coisas? Estava pensando em você e queria saber se a proposta de {course} em {city} faz sentido para seus planos. Tem alguma dúvida que posso esclarecer? Estou aqui! 😊",
    },
    {
      label: "Urgência - vagas limitadas",
      channel: "whatsapp",
      body: "Oi {name}! Passando para te avisar que as vagas para {course} estão preenchendo rápido para a próxima turma. Se quiser garantir sua vaga, precisamos confirmar em breve! Posso te ajudar com qualquer dúvida que ainda tiver. 🎓",
    },
  ],
  student_said_yes: [
    {
      label: "Confirmação e próximos passos",
      channel: "whatsapp",
      body: "Que notícia incrível, {name}! 🎉🥳 Fico muito feliz com sua decisão! Vamos agora seguir para os próximos passos: preciso de alguns documentos seus para dar entrada na aplicação. Vou te enviar a lista completa agora. Qualquer dúvida, pode me perguntar! 🙌",
    },
    {
      label: "Email próximos passos",
      channel: "email",
      subject: "Próximos Passos - Sua Jornada na Austrália Começa Agora! 🎓",
      body: "Olá {name},\n\nQue emocionante! Estamos muito felizes com sua decisão de estudar na Austrália! 🇦🇺\n\nAgora vamos colocar tudo em movimento. Aqui estão os próximos passos:\n\n1. ✅ Enviar documentos necessários para a aplicação\n2. ✅ Aplicação enviada para a escola\n3. ✅ Recebimento da Offer Letter\n4. ✅ Assinatura do contrato\n5. ✅ Pagamentos e CoE\n6. ✅ Processo de visto\n\nVou te guiar em cada etapa. Pode contar comigo!\n\nAtenciosamente,\n{consultant}\nHello Australia",
    },
  ],
  application_sent: [
    {
      label: "Confirmação envio aplicação",
      channel: "whatsapp",
      body: "Oi {name}! ✅ Ótima notícia: sua aplicação foi enviada para a escola agora pouco! Normalmente eles respondem em 1-3 dias úteis com a Offer Letter. Vou te avisar assim que chegar! 📩",
    },
  ],
  offer_letter_received: [
    {
      label: "Offer Letter recebida",
      channel: "whatsapp",
      body: "🎉 {name}! A Offer Letter chegou! Você foi aceito(a) no {course} em {city}! Vou te enviar o documento agora para você revisar. Me confirma quando tiver lido para seguirmos com o contrato! 📄✨",
    },
    {
      label: "Email com Offer Letter",
      channel: "email",
      subject: "🎉 Sua Offer Letter chegou! - {name}",
      body: "Olá {name},\n\nExcelentes notícias! Sua Offer Letter foi recebida com sucesso! 🎓\n\nVocê foi aceito(a) no curso de {course} em {city}. Segue em anexo o documento para sua revisão.\n\nPor favor, confirme:\n✅ Seus dados pessoais estão corretos\n✅ O curso e duração estão conforme combinado\n✅ As datas de início estão de acordo\n\nAssim que confirmar, enviaremos o contrato da Hello Australia para assinatura.\n\nAtenciosamente,\n{consultant}",
    },
  ],
  contract_sent: [
    {
      label: "Envio do contrato",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Acabei de te enviar por e-mail o contrato da Hello Australia junto com a Offer Letter para assinatura. Por favor, leia com atenção e assine digitalmente. Qualquer dúvida sobre algum ponto do contrato, pode me chamar! 😊",
    },
  ],
  documents_signed: [
    {
      label: "Documentos recebidos",
      channel: "whatsapp",
      body: "Perfeito, {name}! ✅ Recebi todos os documentos assinados! Agora vou preparar o e-mail 'Leia com Atenção' com todas as informações importantes sobre sua jornada. Fique atento(a) ao seu e-mail! 📩",
    },
  ],
  read_carefully_email: [
    {
      label: "Email Leia com Atenção",
      channel: "email",
      subject: "⚠️ LEIA COM ATENÇÃO - Informações Importantes - {name}",
      body: "Olá {name},\n\n⚠️ Por favor, leia este e-mail com muita atenção pois contém informações cruciais para sua jornada na Austrália.\n\n📅 DATAS IMPORTANTES:\n• Início do curso: [DATA]\n• Prazo para pagamento do depósito: [DATA]\n• Prazo para solicitação do visto: [DATA]\n\n💰 PAGAMENTOS:\n• Depósito da escola: [VALOR]\n• OSHC (seguro saúde): [VALOR]\n• Taxa de visto: AUD 715\n\n📋 DOCUMENTOS NECESSÁRIOS PARA O VISTO:\n• Passaporte válido\n• Extrato bancário (últimos 3 meses)\n• Comprovante de pagamento do curso\n• Carta de intenção\n• Apólice OSHC\n\nQualquer dúvida, entre em contato imediatamente.\n\nAtenciosamente,\n{consultant}\nHello Australia",
    },
  ],
  first_payment: [
    {
      label: "Instruções de pagamento CoE",
      channel: "whatsapp",
      body: "Oi {name}! 💳 Para darmos entrada no CoE (Confirmação de Matrícula), precisamos processar o primeiro pagamento. Vou te enviar as instruções de transferência agora. Assim que confirmar o pagamento, me manda o comprovante! 🙏",
    },
    {
      label: "Email instruções pagamento",
      channel: "email",
      subject: "Instruções de Pagamento - CoE - {name}",
      body: "Olá {name},\n\nSegue abaixo as instruções para o pagamento do CoE (Confirmação de Matrícula):\n\n💰 Valor: [VALOR]\n🏦 Banco: [DADOS BANCÁRIOS]\n📅 Prazo: [DATA]\n\nApós realizar o pagamento, envie o comprovante para este e-mail ou pelo WhatsApp.\n\nImportante: o CoE só será emitido após confirmação do pagamento.\n\nAtenciosamente,\n{consultant}",
    },
  ],
  school_deposit: [
    {
      label: "Confirmação depósito escola",
      channel: "whatsapp",
      body: "Ótimo, {name}! ✅ Depósito confirmado! A escola já registrou seu pagamento. Agora vamos seguir com o pagamento do OSHC (seguro saúde obrigatório para estudantes na Austrália). Vou te enviar os detalhes! 🏥",
    },
  ],
  oshc_payment: [
    {
      label: "Detalhes OSHC",
      channel: "whatsapp",
      body: "Oi {name}! 🏥 O OSHC (Overseas Student Health Cover) é o seguro saúde obrigatório para estudantes internacionais na Austrália. Vou te enviar o valor e as instruções de pagamento agora. Tem alguma dúvida sobre o seguro?",
    },
  ],
  oshc_policy: [
    {
      label: "Apólice OSHC recebida",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Sua apólice do OSHC foi solicitada e em breve chegará no seu e-mail. Guarde bem esse documento — você vai precisar dele para o visto e também na chegada na Austrália! 🇦🇺",
    },
  ],
  visa_payment: [
    {
      label: "Pagamento taxa de visto",
      channel: "whatsapp",
      body: "Oi {name}! 🛂 Chegou a hora de pagar a taxa do visto de estudante (AUD 715). Vou te enviar o link oficial do Departamento de Imigração da Austrália agora. Após o pagamento, me envia o comprovante! 🙏",
    },
  ],
  visa_checklist_call: [
    {
      label: "Agendamento call checklist",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Precisamos agendar uma call de checklist de visto para garantir que todos os seus documentos estão corretos e completos. Você tem disponibilidade essa semana? Normalmente leva uns 30-40 minutos. 😊",
    },
  ],
  statement_reviewed: [
    {
      label: "Revisão carta de intenção",
      channel: "whatsapp",
      body: "Oi {name}! 📝 Acabei de revisar sua Carta de Intenção/Declaração Financeira. Vou te enviar meus comentários agora. Por favor, faça os ajustes indicados e me manda a versão final para aprovação! 🙏",
    },
  ],
  final_doc_check: [
    {
      label: "Checagem final documentos",
      channel: "whatsapp",
      body: "Oi {name}! ✅ Estou fazendo a verificação final de todos os seus documentos antes de aplicar o visto. Tudo parece estar em ordem! Vou te confirmar em breve que está tudo pronto para a aplicação. 🎯",
    },
  ],
  visa_applied: [
    {
      label: "Visto aplicado",
      channel: "whatsapp",
      body: "🎉 {name}! Sua aplicação de visto foi enviada ao Departamento de Imigração da Austrália! 🛂 O número de aplicação é: [NÚMERO]. O prazo médio de análise é de 4-6 semanas, mas pode variar. Vou te atualizar assim que houver novidades!",
    },
    {
      label: "Email confirmação visto",
      channel: "email",
      subject: "✅ Visto Aplicado com Sucesso - {name}",
      body: "Olá {name},\n\n🎉 Excelentes notícias! Sua aplicação de visto de estudante foi enviada com sucesso!\n\nDetalhes da aplicação:\n• Número: [NÚMERO]\n• Data: [DATA]\n• Prazo estimado: 4-6 semanas\n\nEnquanto aguarda, não faça compras de passagem ainda — espere a aprovação do visto.\n\nFicaremos de olho no status e te avisaremos assim que houver atualizações!\n\nAtenciosamente,\n{consultant}",
    },
  ],
  final_instructions: [
    {
      label: "Instruções pré-embarque",
      channel: "whatsapp",
      body: "🇦🇺✈️ {name}, chegou a hora! Vou te enviar agora o checklist de instruções finais antes do embarque. Leia com atenção — tem informações importantes sobre chegada no aeroporto, primeiros dias em {city} e como ativar seu OSHC! Qualquer dúvida, estou aqui! 😊",
    },
    {
      label: "Email instruções finais",
      channel: "email",
      subject: "✈️ Instruções Finais - Sua Aventura na Austrália Começa em Breve! - {name}",
      body: "Olá {name},\n\n🎉 Parabéns! Você está quase lá! Segue abaixo tudo que precisa saber antes de embarcar:\n\n🛫 NO AEROPORTO:\n• Tenha todos os documentos na mão (passaporte, visto, offer letter)\n• Declare todos os alimentos na chegada\n\n🏠 PRIMEIROS DIAS EM {city}:\n• Confirme seu alojamento antes de viajar\n• Guarde os contatos de emergência\n\n🏥 SAÚDE:\n• Ative seu OSHC assim que chegar\n• Guarde o cartão do seguro na carteira\n\n📱 CONTATOS IMPORTANTES:\n• Hello Australia: [TELEFONE]\n• Emergências: 000\n\nBoa viagem e bem-vindo(a) à Austrália! 🦘\n\n{consultant}\nHello Australia",
    },
  ],
  closed_won: [
    {
      label: "Parabéns - Fechado com sucesso",
      channel: "whatsapp",
      body: "🎊🎉 {name}! Foi uma honra acompanhar sua jornada! Espero que você curta muito a Austrália e que esse seja o início de uma experiência incrível! Não deixa de me contar como estão as coisas por lá! 🇦🇺🦘💛",
    },
  ],
  closed_lost: [
    {
      label: "Mensagem de despedida",
      channel: "whatsapp",
      body: "Oi {name}! Entendo que o momento não é o ideal agora, sem problema! 😊 Se em algum momento seus planos mudarem e quiser retomar o processo de estudar na Austrália, é só me chamar — estarei aqui! Tudo de bom pra você! 🙏",
    },
  ],
};

export const SOURCES = [
  "Facebook Group", "Instagram", "Referral", "Website", "WhatsApp", "Walk-in", "Event", "LinkedIn", "Other",
];
