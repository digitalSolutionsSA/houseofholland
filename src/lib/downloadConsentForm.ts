export type ConsentFormFields = {
  full_name: string
  date_of_birth: string | null
  address: string | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  init_risks: boolean
  init_waiver: boolean
  init_aftercare: boolean
  init_no_alcohol: boolean
  init_no_medical: boolean
  init_photos: boolean
  init_age: boolean
  signature_data_url: string | null
  signed_at: string | null
}

/** Opens a printable HTML window with the customer's signed consent
 * form — shared by AdminWaivers (booking waivers) and AdminFlashQueue
 * (flash-day queue waivers) so the layout stays identical either way. */
export function downloadConsentForm(c: ConsentFormFields, contextLabel: string) {
  const signedDate = c.signed_at
    ? new Date(c.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A'
  const sigHtml = c.signature_data_url
    ? `<img src="${c.signature_data_url}" alt="Signature" style="max-width:400px;border:1px solid #ccc;border-radius:6px;padding:8px;background:#fff;" />`
    : '<p style="color:#999">No signature on file</p>'

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;width:140px;vertical-align:top">${label}</td><td style="padding:6px 0;font-size:14px;font-weight:600">${value || '—'}</td></tr>`

  const check = (label: string, agreed: boolean) =>
    `<tr><td colspan="2" style="padding:5px 0;font-size:13px">${agreed ? '✅' : '☐'} ${label}</td></tr>`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Consent Form — ${c.full_name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 32px 24px; color: #111; }
  h1 { text-align:center; font-size:18px; margin:0 0 4px; }
  h2 { text-align:center; font-size:14px; font-weight:normal; margin:0 0 24px; color:#555; }
  .section { margin-bottom:28px; }
  .section h3 { font-size:13px; text-transform:uppercase; letter-spacing:.07em; color:#888; border-bottom:1px solid #e0e0e0; padding-bottom:6px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; }
  .print-btn { display:block; margin:0 auto 24px; padding:10px 24px; background:#222; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; }
  @media print { .print-btn { display:none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
<h1>HOUSE OF HOLLAND TATTOO EMPORIUM, LLC</h1>
<h2>WAIVER, RELEASE AND CONSENT TO TATTOO<br/><small>${contextLabel}</small></h2>

<div class="section">
<h3>Personal Details</h3>
<table>
${row('Full Name', c.full_name)}
${row('Date of Birth', c.date_of_birth ?? '')}
${row('Address', c.address ?? '')}
${row('Phone', c.phone ?? '')}
${row('Email', c.email ?? '')}
</table>
</div>

<div class="section">
<h3>Emergency Contact</h3>
<table>
${row('Name', c.emergency_contact_name ?? '')}
${row('Phone', c.emergency_contact_phone ?? '')}
</table>
</div>

<div class="section">
<h3>Consent Items</h3>
<table>
${check('Risks acknowledged', !!c.init_risks)}
${check('Waiver and release agreed', !!c.init_waiver)}
${check('Aftercare instructions understood', !!c.init_aftercare)}
${check('Not under influence of alcohol/drugs', !!c.init_no_alcohol)}
${check('No medical conditions disclosed', !!c.init_no_medical)}
${check('Photo consent granted', !!c.init_photos)}
${check('Age 18+ confirmed', !!c.init_age)}
</table>
</div>

<div class="section">
<h3>Signature</h3>
${sigHtml}
<p style="font-size:12px;color:#888;margin-top:8px">Signed on ${signedDate}</p>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
