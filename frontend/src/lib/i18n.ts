import { supabase } from './supabase'

const strings = {
  en: {
    disclaimer:
      'Verdiqt provides legal information, not legal advice. AI outputs require human review before court use.',
    notForCourt: 'Not approved for court use',
    requiresReview: 'Requires lawyer review',
    approve: 'Approve',
    reject: 'Reject',
    shareClient: 'Share with client',
  },
  sw: {
    disclaimer:
      'Verdiqt inatoa taarifa za kisheria, si ushauri wa kisheria. Matokeo ya AI yanahitaji ukaguzi wa kibinadamu.',
    notForCourt: 'Haijakubaliwa kwa matumizi ya mahakama',
    requiresReview: 'Inahitaji ukaguzi wa wakili',
    approve: 'Idhinisha',
    reject: 'Kataa',
    shareClient: 'Shiriki na mteja',
  },
  fr: {
    disclaimer:
      'Verdiqt fournit des informations juridiques, pas des conseils juridiques. Les résultats IA nécessitent une revue humaine.',
    notForCourt: 'Non approuvé pour usage judiciaire',
    requiresReview: 'Révision par avocat requise',
    approve: 'Approuver',
    reject: 'Rejeter',
    shareClient: 'Partager avec le client',
  },
} as const

export type Locale = keyof typeof strings

export function t(locale: Locale, key: keyof (typeof strings)['en']): string {
  return strings[locale]?.[key] ?? strings.en[key]
}

export async function getUserLocale(): Promise<Locale> {
  const { data } = await supabase.auth.getUser()
  const lang = data.user?.user_metadata?.preferred_language as Locale | undefined
  if (lang && lang in strings) return lang
  return 'en'
}
