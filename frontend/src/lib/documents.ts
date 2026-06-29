type DocContext = Record<string, string | undefined>

const DEFAULTS: DocContext = {
  address: '—',
  location: '—',
  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  hearing_date: '—',
  relief_sought: '—',
}

function render(template: string, ctx: DocContext): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => ctx[key] ?? DEFAULTS[key] ?? '—')
}

const BAIL_TEMPLATE = `
IN THE HIGH COURT OF {{ jurisdiction }}

CASE NO: {{ case_number }}

APPLICATION FOR BAIL

IN THE MATTER BETWEEN:

{{ client_name }}                                    APPLICANT

and

THE STATE                                          RESPONDENT

MAY IT PLEASE THE COURT:

1. The Applicant stands charged with {{ charge }}.
2. The Applicant respectfully submits that he/she is entitled to bail under Section 60 of the Criminal Procedure Code.
3. The Applicant has fixed abode within the jurisdiction of this court at {{ address }}.

DATED at {{ location }} this {{ date }}.

__________________________
Advocate for the Applicant
`.trim()

const MOTION_TEMPLATE = `
NOTICE OF MOTION
TAKE NOTICE THAT the Applicant shall move the court on {{ hearing_date }} for an order seeking {{ relief_sought }}.
`.trim()

const TEMPLATES: Record<string, string> = {
  bail_application: BAIL_TEMPLATE,
  notice_of_motion: MOTION_TEMPLATE,
}

export function generateLegalDocument(templateType: string, context: DocContext): string {
  const body = TEMPLATES[templateType]
  if (!body) {
    return `Template '${templateType}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}.`
  }
  const ctx = { ...DEFAULTS, ...context }
  return render(body, ctx)
}
