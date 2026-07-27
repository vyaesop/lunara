export interface TtcGuideCard {
  id: string
  title: string
  body: string
  sourceUrl: string
}

export const TTC_GUIDE: readonly TtcGuideCard[] = [
  {
    id: 'window',
    title: 'The window is wider than one day',
    body:
      'A calendar fertile window commonly spans the five days before estimated ovulation through one day after. Ovulation can move, so no app can identify a guaranteed conception day.',
    sourceUrl:
      'https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning',
  },
  {
    id: 'bbt',
    title: 'BBT looks backward',
    body:
      'A sustained temperature rise can support that ovulation already occurred. Illness, sleep, timing, alcohol, travel, and missing readings can make a chart harder to interpret.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/evaluating-infertility',
  },
  {
    id: 'opk',
    title: 'An OPK sees an LH rise',
    body:
      'A positive urine ovulation test suggests ovulation may follow soon, but it does not prove that an egg was released. Keep the actual test instructions with your log.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/evaluating-infertility',
  },
  {
    id: 'test',
    title: 'A negative test can change',
    body:
      'Testing too early can miss a pregnancy. Follow the timing and reading instructions for the specific test, and repeat after several days if pregnancy still seems possible.',
    sourceUrl: 'https://www.fda.gov/medical-devices/home-use-tests/pregnancy',
  },
  {
    id: 'folic-acid',
    title: 'Plan folic acid before pregnancy',
    body:
      'CDC recommends 400 micrograms of folic acid each day for people capable of becoming pregnant. Ask a clinician whether your health history calls for a different plan.',
    sourceUrl: 'https://www.cdc.gov/folic-acid/about/intake-and-sources.html',
  },
  {
    id: 'evaluation',
    title: 'When to ask about an evaluation',
    body:
      'ACOG recommends considering an infertility evaluation after 12 months of regular sex without birth control, after 6 months when older than 35, and sooner in some circumstances. A clinician can personalize that timeline.',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/evaluating-infertility',
  },
]

export const TTC_SOURCES = [
  {
    label: 'ACOG: Fertility awareness',
    url: 'https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning',
  },
  {
    label: 'ACOG: Evaluating infertility',
    url: 'https://www.acog.org/womens-health/faqs/evaluating-infertility',
  },
  {
    label: 'FDA: Home pregnancy tests',
    url: 'https://www.fda.gov/medical-devices/home-use-tests/pregnancy',
  },
  {
    label: 'CDC: Folic acid',
    url: 'https://www.cdc.gov/folic-acid/about/intake-and-sources.html',
  },
] as const
