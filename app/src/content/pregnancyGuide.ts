export interface PregnancyWeekDetail {
  week: number
  trimester: 1 | 2 | 3
  title: string
  overview: string
  development: string
  body: string
  focus: string
}

export interface PregnancyChecklistGroup {
  id: string
  title: string
  weeks: string
  items: readonly { id: string; label: string; detail: string }[]
}

export interface PregnancyFaq {
  id: string
  question: string
  answer: string
  sourceUrl: string
}

const DEVELOPMENT_STAGES = [
  {
    start: 0,
    end: 3,
    copy: 'Pregnancy dating begins at the last menstrual period. Fertilization and the earliest cell divisions usually occur later in this span.',
  },
  {
    start: 4,
    end: 8,
    copy: 'Early structures that become the brain, spine, heart, limbs, lungs, and inner ear are beginning to form.',
  },
  {
    start: 9,
    end: 12,
    copy: 'The limbs, eyelids, nails, liver, kidneys, and pancreas continue developing as the embryo-to-fetus transition passes.',
  },
  {
    start: 13,
    end: 16,
    copy: 'Bones begin hardening, the neck and lower limbs become more defined, and hearing and lung tissue continue developing.',
  },
  {
    start: 17,
    end: 20,
    copy: 'Movement control and the digestive system mature; facial features are increasingly recognizable on ultrasound.',
  },
  {
    start: 21,
    end: 24,
    copy: 'Movement becomes stronger, the sucking reflex develops, and fat and the ridges that become fingerprints begin forming.',
  },
  {
    start: 25,
    end: 28,
    copy: 'The nervous system develops quickly, eyelids can open and close, and the lungs begin producing surfactant.',
  },
  {
    start: 29,
    end: 32,
    copy: 'Stretching, kicking, grasping, light response, blood-cell production, and continued fat gain fill this growth period.',
  },
  {
    start: 33,
    end: 36,
    copy: 'Bones continue hardening while the skull stays flexible; the fetus may move toward a head-down position.',
  },
  {
    start: 37,
    end: 42,
    copy: 'The lungs, brain, and nervous system continue finishing development while the body prepares for birth.',
  },
] as const

const BODY_BY_TRIMESTER: Record<1 | 2 | 3, string> = {
  1: 'Hormonal changes can bring fatigue, breast tenderness, nausea, food changes, frequent urination, or no obvious symptoms at all.',
  2: 'Energy or nausea may change, the uterus expands, and movement may become noticeable. Every pregnancy follows its own timeline.',
  3: 'Growth can add pressure, breathlessness, sleep changes, swelling, practice contractions, and more frequent urination.',
}

const WEEK_FOCUS: string[] = [
  'Record the first day of your last period if you know it.',
  'If pregnancy is possible, review medicines and supplements with a healthcare professional.',
  'Keep a note of cycle dates and any fertility tests you use.',
  'A test may still be too early; follow its package directions.',
  'If a test is positive, plan how to contact a prenatal-care professional.',
  'Write down medicines, supplements, allergies, and questions for your first visit.',
  'Try small, manageable meals and fluids if nausea is making intake difficult.',
  'Notice what helps fatigue and give rest the same priority as other plans.',
  'Ask when your first prenatal visit and any early tests should happen.',
  'Bring a concise medical, pregnancy, and family history to appointments.',
  'Review food safety and prenatal-vitamin questions with your care team.',
  'Make a short list of symptoms and questions rather than relying on memory.',
  'Check that upcoming screening choices and dates are clear to you.',
  'Mark the transition into the second trimester with a fresh symptom check-in.',
  'Discuss an activity plan that fits your health and pregnancy.',
  'Review hydration, regular meals, and rest as your body’s needs shift.',
  'Ask what movement may feel like and when your clinician expects it for you.',
  'Note any new pelvic, back, or sleep discomfort to discuss at your next visit.',
  'Confirm the plan and timing for an anatomy ultrasound if one is recommended.',
  'Notice movement without comparing your timeline with someone else’s.',
  'Halfway is a useful point to review appointments, support, and practical needs.',
  'Start a private list of birth, feeding, and postpartum questions.',
  'Learn which hospital or birth-setting number to call after hours.',
  'Ask your clinician how they want you to respond to movement changes.',
  'Review urgent pregnancy warning signs with the people supporting you.',
  'Check the upcoming schedule for any recommended screening or lab work.',
  'Notice whether sleep, work, or pain changes need additional support.',
  'Prepare for the third trimester by reviewing transport and appointment plans.',
  'Ask for personalized guidance on movement awareness or kick counting.',
  'Keep emergency contacts and your prenatal-care details easy to reach.',
  'Discuss vaccines, infant feeding, and postpartum care with your care team.',
  'Consider what practical support you may want during the first weeks after birth.',
  'Draft a flexible birth-preference page for a conversation with your clinician.',
  'Ask how to recognize labor and when your care team wants you to call.',
  'Confirm any remaining tests, appointments, and hospital or birth-center plans.',
  'Pack only what helps you feel prepared; essentials can stay simple.',
  'Review transport, pet or child care, and the first call you will make.',
  'Keep watching for changes in movement and follow your clinician’s instructions.',
  'Rest, hydrate, and keep plans flexible as the estimated date approaches.',
  'Remember that the due date is an estimate, not an appointment.',
  'Follow your care team’s monitoring and next-step plan.',
]

function trimesterForWeek(week: number): 1 | 2 | 3 {
  return week < 14 ? 1 : week < 28 ? 2 : 3
}

export function pregnancyWeekDetail(week: number): PregnancyWeekDetail {
  const safeWeek = Math.min(42, Math.max(0, Math.floor(week)))
  const trimester = trimesterForWeek(safeWeek)
  const stage =
    DEVELOPMENT_STAGES.find((item) => safeWeek >= item.start && safeWeek <= item.end) ??
    DEVELOPMENT_STAGES.at(-1)!
  return {
    week: safeWeek,
    trimester,
    title: `Week ${safeWeek}`,
    overview:
      'Development is continuous rather than switching on at exact week boundaries. The range above is a broad orientation, and clinician-confirmed dating takes priority.',
    development: stage.copy,
    body: BODY_BY_TRIMESTER[trimester],
    focus:
      WEEK_FOCUS[Math.min(safeWeek, WEEK_FOCUS.length - 1)] ??
      'Follow the plan you made with your prenatal-care team.',
  }
}

export const PREGNANCY_CHECKLISTS: readonly PregnancyChecklistGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    weeks: 'Positive test through first visit',
    items: [
      {
        id: 'contact-care',
        label: 'Contact a prenatal-care professional',
        detail: 'Ask when they want to see you and what information to bring.',
      },
      {
        id: 'medication-review',
        label: 'Review medicines and supplements',
        detail: 'Do not stop prescribed medicine without professional advice.',
      },
      {
        id: 'prenatal-plan',
        label: 'Confirm a prenatal-vitamin plan',
        detail: 'Ask what dose and ingredients are right for you.',
      },
      {
        id: 'history',
        label: 'Gather your health history',
        detail: 'Include prior pregnancies, conditions, surgeries, allergies, and family history.',
      },
    ],
  },
  {
    id: 'first-trimester',
    title: 'First trimester',
    weeks: 'Weeks 0–13',
    items: [
      {
        id: 'first-visit',
        label: 'Attend or schedule the first prenatal visit',
        detail: 'Use it to confirm dating and ask about the care schedule.',
      },
      {
        id: 'screening-options',
        label: 'Review screening choices',
        detail: 'Timing and options depend on your history and preferences.',
      },
      {
        id: 'food-safety',
        label: 'Review nutrition and food safety',
        detail: 'Use guidance from your clinician and current public-health sources.',
      },
      {
        id: 'support-plan',
        label: 'Identify practical and emotional support',
        detail: 'Transportation, work, childcare, and mental health all belong in prenatal care.',
      },
    ],
  },
  {
    id: 'second-trimester',
    title: 'Second trimester',
    weeks: 'Weeks 14–27',
    items: [
      {
        id: 'anatomy-plan',
        label: 'Confirm the anatomy-ultrasound plan',
        detail: 'Ask what it can and cannot show and when results arrive.',
      },
      {
        id: 'movement-guidance',
        label: 'Ask about movement expectations',
        detail: 'There is individual variation, especially early on.',
      },
      {
        id: 'activity',
        label: 'Review physical activity',
        detail: 'Ask about activities, adaptations, hydration, and warning signs for you.',
      },
      {
        id: 'future-screening',
        label: 'Preview upcoming screening',
        detail: 'Your care team can explain which labs or tests are recommended and why.',
      },
    ],
  },
  {
    id: 'third-trimester',
    title: 'Third trimester',
    weeks: 'Weeks 28–birth',
    items: [
      {
        id: 'movement-plan',
        label: 'Know the movement-change plan',
        detail: 'Ask exactly who to call and when if movement changes.',
      },
      {
        id: 'birth-preferences',
        label: 'Discuss flexible birth preferences',
        detail: 'Include pain support, communication, and what matters most if plans change.',
      },
      {
        id: 'labor-call',
        label: 'Know when and where to call',
        detail: 'Save your care team and birth-setting numbers offline.',
      },
      {
        id: 'postpartum-support',
        label: 'Plan early postpartum support',
        detail: 'Include recovery, feeding help, sleep, mental health, meals, and transport.',
      },
    ],
  },
]

export const PREGNANCY_FAQS: readonly PregnancyFaq[] = [
  {
    id: 'dating',
    question: 'Why does pregnancy start before conception?',
    answer:
      'Clinical gestational age is usually counted from the first day of the last menstrual period. That adds roughly two weeks before fertilization for a typical cycle.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy',
  },
  {
    id: 'due-date',
    question: 'Is the due date exact?',
    answer:
      'No. It is an estimated date used to track gestational age and time care. Your clinician may adjust dating using history and ultrasound information.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy',
  },
  {
    id: 'prenatal-care',
    question: 'When should prenatal care begin?',
    answer:
      'Contact a prenatal-care professional after a positive test or when you think you may be pregnant. They can set visit timing around your health and history.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/prenatal-care',
  },
  {
    id: 'vitamin',
    question: 'What should I know about prenatal vitamins?',
    answer:
      'Needs vary. Review the product and dose with a healthcare professional, and do not double doses. A balanced diet and a prenatal supplement serve different roles.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/healthy-eating-during-pregnancy',
  },
  {
    id: 'exercise',
    question: 'Can I exercise during pregnancy?',
    answer:
      'For many healthy, uncomplicated pregnancies, regular moderate activity is considered safe. Ask your clinician about your conditions, current routine, and warning signs.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/exercise-during-pregnancy',
  },
  {
    id: 'movement',
    question: 'How much fetal movement is normal?',
    answer:
      'Movement patterns differ. What matters is a change from the pattern you know. Ask your clinician when and how they want you to monitor and respond.',
    sourceUrl: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
  },
  {
    id: 'bleeding',
    question: 'Should bleeding be checked?',
    answer:
      'Contact your prenatal-care team about bleeding. Bleeding heavier than spotting during pregnancy is an urgent maternal warning sign and needs immediate medical care.',
    sourceUrl: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
  },
  {
    id: 'symptoms',
    question: 'Do symptoms show whether a pregnancy is healthy?',
    answer:
      'No. Symptoms can be strong, mild, change, or be absent. An app cannot use symptoms to confirm how a pregnancy is progressing.',
    sourceUrl: 'https://www.acog.org/womens-health/pregnancy/during-pregnancy',
  },
]

export const PREGNANCY_SOURCES = [
  {
    label: 'ACOG: How your fetus grows during pregnancy',
    url: 'https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy',
  },
  {
    label: 'ACOG: Prenatal care',
    url: 'https://www.acog.org/womens-health/faqs/prenatal-care',
  },
  {
    label: 'CDC: Urgent maternal warning signs',
    url: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
  },
] as const
