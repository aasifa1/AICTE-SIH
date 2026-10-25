import { useMemo, useRef, useState, useEffect } from 'react'
import { isOverdue } from '../services/dashboardService'

const statusColors = {
  Pending: '#d49a35',
  'Under Process': '#4f8dbb',
  Disposed: '#58a078',
  Transferred: '#8570b5',
  Escalated: '#c6605d',
  Overdue: '#be5552',
  Other: '#98a6b5',
}
const rangeOptions = [
  ['3m', 'Last 3 months'], ['6m', 'Last 6 months'], ['12m', 'Last 12 months'], ['all', 'All dates'],
]
const dateKey = (date) => date.toISOString().slice(0, 10)
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
const shortDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const daysLate = (value) => Math.max(0, Math.floor((new Date(`${dateKey(new Date())}T00:00:00`) - new Date(`${value}T00:00:00`)) / 86400000))
const fmtTime = (value) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function useChartWidth(fallback = 600) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function Card({ title, subtitle, action, className = '', children }) {
  return <section className={`panel analytics-card ${className}`}><header className="analytics-card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>
}

function EmptyChart({ message = 'No records in this date range.' }) {
  return <div className="analytics-empty">{message}</div>
}

function StatusDonut({ values, total }) {
  const radius = 66
  const circumference = Math.PI * radius * 2
  const nonzero = values.filter((item) => item.value > 0)
  let offset = 0
  return <div className="donut-layout">
    <div className="donut-chart">
      {total ? <svg viewBox="0 0 220 220" role="img" aria-label="Complaint status distribution donut chart">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#edf1f5" strokeWidth="22" />
        {nonzero.map((item) => {
          const portion = item.value / total
          const dash = portion * circumference
          const currentOffset = offset
          offset += dash
          return <circle key={item.name} className="donut-segment" cx="110" cy="110" r={radius} fill="none" stroke={item.color} strokeWidth="22" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} transform="rotate(-90 110 110)"><title>{`${item.name}: ${item.value} (${Math.round(portion * 100)}%)`}</title></circle>
        })}
        <text x="110" y="105" textAnchor="middle" className="donut-total">{total}</text><text x="110" y="128" textAnchor="middle" className="donut-caption">complaints</text>
      </svg> : <EmptyChart />}
    </div>
    <div className="donut-legend">{values.map((item) => <div className="donut-legend-row" key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.value}</strong><small>{total ? `${Math.round(item.value / total * 100)}%` : '0%'}</small></div>)}</div>
  </div>
}

function BureauBarChart({ values }) {
  const [ref, width] = useChartWidth(640)
  const height = 255
  const margin = { top: 18, right: 16, bottom: 58, left: 42 }
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const max = Math.max(1, ...values.map((item) => item.value))
  const group = plotW / Math.max(values.length, 1)
  const barW = Math.min(52, group * .46)
  return <div className="svg-chart" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bureau-wise complaint workload bar chart">
    {[0, .25, .5, .75, 1].map((fraction) => { const y = margin.top + plotH * (1 - fraction); return <g key={fraction}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} className="chart-gridline"/><text x={margin.left - 9} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(max * fraction)}</text></g> })}
    {values.map((item, index) => {
      const x = margin.left + group * index + (group - barW) / 2
      const barH = item.value / max * plotH
      const labelLines = item.label.split('\n')
      return <g key={item.label}><rect className="chart-bar" x={x} y={margin.top + plotH - barH} width={barW} height={Math.max(barH, 1)} rx="5" fill={item.color}><title>{`${item.label.replace('\n', ' ')}: ${item.value} complaints`}</title></rect><text x={x + barW / 2} y={margin.top + plotH - barH - 7} textAnchor="middle" className="chart-value-label">{item.value}</text>{labelLines.map((line, lineIndex) => <text key={line} x={x + barW / 2} y={height - margin.bottom + 17 + lineIndex * 13} textAnchor="middle" className="chart-x-label">{line}</text>)}</g>
    })}
  </svg></div>
}

function TrendLineChart({ values }) {
  const [ref, width] = useChartWidth(680)
  const height = 270
  const margin = { top: 18, right: 18, bottom: 42, left: 42 }
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const max = Math.max(1, ...values.flatMap((item) => [item.received, item.disposed]))
  const xAt = (index) => margin.left + (values.length <= 1 ? plotW / 2 : index * plotW / (values.length - 1))
  const yAt = (value) => margin.top + plotH - value / max * plotH
  const pathFor = (key) => values.map((item, index) => `${index ? 'L' : 'M'} ${xAt(index)} ${yAt(item[key])}`).join(' ')
  return <div className="svg-chart" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly complaints received and disposed line chart">
    {[0, .25, .5, .75, 1].map((fraction) => { const y = margin.top + plotH * (1 - fraction); return <g key={fraction}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} className="chart-gridline"/><text x={margin.left - 9} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(max * fraction)}</text></g> })}
    {values.length > 0 && <>
      <path d={pathFor('received')} fill="none" stroke="#397db1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />
      <path d={pathFor('disposed')} fill="none" stroke="#58a078" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />
      {values.map((item, index) => <g key={item.month}><circle cx={xAt(index)} cy={yAt(item.received)} r="4.5" fill="#397db1" className="chart-point"><title>{`${monthLabel(item.month)} · Received: ${item.received}`}</title></circle><circle cx={xAt(index)} cy={yAt(item.disposed)} r="4.5" fill="#58a078" className="chart-point"><title>{`${monthLabel(item.month)} · Disposed by submission month: ${item.disposed}`}</title></circle><text x={xAt(index)} y={height - 13} textAnchor="middle" className="chart-x-label">{monthLabel(item.month)}</text></g>)}
    </>}
  </svg></div>
}

function HorizontalBars({ values, onSelect }) {
  const [ref, width] = useChartWidth(900)
  const rowH = 37
  const height = Math.max(160, 28 + values.length * rowH)
  const labelW = Math.min(250, Math.max(150, width * .3))
  const right = 42
  const plotW = Math.max(110, width - labelW - right)
  const max = Math.max(1, ...values.map((item) => item.value))
  return <div className="svg-chart horizontal-chart" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Horizontal institution complaint count chart">
    {values.map((item, index) => {
      const y = 10 + index * rowH
      const barW = item.value / max * plotW
      return <g key={item.name} className={onSelect ? 'clickable-chart-row' : ''} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onClick={() => onSelect?.(item)} onKeyDown={(event) => { if (onSelect && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(item) } }}><text x={labelW - 12} y={y + 19} textAnchor="end" className={`chart-y-label ${onSelect ? 'chart-link-label' : ''}`}><title>{`${item.name}${item.region ? ` · ${item.region}` : ''}`}</title>{item.name.length > 34 ? `${item.name.slice(0, 31)}…` : item.name}</text><rect className="chart-bar" x={labelW} y={y + 4} width={plotW} height="20" rx="5" fill="#edf1f5"/><rect className="chart-bar" x={labelW} y={y + 4} width={barW} height="20" rx="5" fill={item.color ?? '#4f8dbb'}><title>{`${item.name}: ${item.value} complaints`}</title></rect><text x={labelW + barW + 8} y={y + 19} className="chart-value-label">{item.value}</text></g>
    })}
  </svg></div>
}

function buildOverlapGroups(cases) {
  const byInstitution = new Map()
  cases.forEach((item) => {
    const group = byInstitution.get(item.institutionId) ?? { id: item.institutionId, name: item.institution, type: item.institutionType, state: item.institutionState, district: item.institutionDistrict, region: item.region, cases: [] }
    group.cases.push(item)
    byInstitution.set(item.institutionId, group)
  })
  return [...byInstitution.values()].map((group) => ({ ...group, bureaus: [...new Set(group.cases.map((item) => item.bureau))] })).filter((group) => group.bureaus.length > 1).sort((a, b) => b.cases.length - a.cases.length)
}

function InstitutionDialog({ institution, onClose, onOpenCase }) {
  if (!institution) return null
  return <div className="modal-backdrop" onClick={onClose}><section className="case-modal institution-modal" role="dialog" aria-modal="true" aria-labelledby="institution-dialog-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close institution details">×</button><span className="eyebrow">INSTITUTION DETAILS</span><h2 id="institution-dialog-title">{institution.name}</h2><p className="modal-subtitle">{[institution.type, institution.district, institution.state].filter(Boolean).join(' · ') || institution.region}</p><dl className="detail-grid"><div><dt>Institution code</dt><dd>{institution.id}</dd></div><div><dt>Region</dt><dd>{institution.region || '—'}</dd></div><div><dt>Complaints in range</dt><dd>{institution.value}</dd></div><div><dt>Assigned Bureaus</dt><dd>{institution.bureaus?.join(', ') || '—'}</dd></div></dl><h3 className="institution-cases-title">Related complaints</h3><div className="institution-case-list">{institution.cases?.map((item) => <button key={item.id} onClick={() => onOpenCase(item)}><span>{item.id}</span><small>{item.category} · {item.status}</small></button>)}</div><button className="button button-primary modal-done" onClick={onClose}>Done</button></section></div>
}

export function OverlapReviewPage({ cases, onBack }) {
  const overlaps = buildOverlapGroups(cases)
  return <section className="overlap-review-page"><div className="overlap-review-heading"><div><span className="eyebrow">CASE MANAGEMENT</span><h2>Overlap Review</h2><p>Potential overlaps are flagged when the same institution has complaints assigned to multiple Bureaus. Review is required to confirm whether cases are related.</p></div><button className="button button-outline" onClick={onBack}>← Dashboard</button></div>{overlaps.length ? <div className="overlap-review-list">{overlaps.map((group) => <article className="overlap-review-item" key={group.id}><div><strong>{group.name}</strong><span>{group.id} · {group.cases.length} complaints</span></div><div className="overlap-bureau-tags">{group.bureaus.map((bureau) => <span key={bureau}>{bureau}</span>)}</div><div className="overlap-case-links">{group.cases.map((item) => <span key={item.id}>{item.id}</span>)}</div></article>)}</div> : <EmptyChart message="No cross-Bureau institutions in this date range." />}</section>
}

export default function DashboardAnalytics({ data, loading, onOpenCase, onNavigate, onNotice, onOpenOverlapReview }) {
  const [range, setRange] = useState('all')
  const [institutionDialog, setInstitutionDialog] = useState(null)
  const today = dateKey(new Date())
  const earliest = data.cases.reduce((min, item) => item.submitted && item.submitted < min ? item.submitted : min, today)
  const rangeStart = useMemo(() => {
    if (range === 'all') return earliest
    const months = Number.parseInt(range, 10)
    const start = new Date()
    start.setDate(1)
    start.setMonth(start.getMonth() - months + 1)
    return dateKey(start)
  }, [range, earliest])
  const filteredCases = useMemo(() => data.cases.filter((item) => item.submitted >= rangeStart && (range === 'all' || item.submitted <= today)), [data.cases, range, rangeStart, today])
  const statusValues = useMemo(() => {
    const definitions = ['Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated', 'Overdue']
    const known = new Set(definitions)
    return [...definitions.map((name) => ({ name, value: filteredCases.filter((item) => item.status === name).length, color: statusColors[name] })), { name: 'Other', value: filteredCases.filter((item) => !known.has(item.status)).length, color: statusColors.Other }]
  }, [filteredCases])
  const bureauWorkload = useMemo(() => {
    const groups = [
      { label: 'Regulation /\nApproval (RB)', code: 'RB', color: '#397db1' },
      { label: 'PGRC', code: 'PGRC', color: '#8570b5' },
      { label: 'Other Bureaus/\nCells', code: 'other', color: '#59a078' },
      { label: 'Regional\nOffices', code: 'regional', color: '#d49a35' },
    ]
    return groups.map((group) => ({ ...group, value: filteredCases.filter((item) => group.code === 'other' ? !['RB', 'PGRC'].includes(item.bureauCode) && !item.bureau.toLowerCase().includes('regional office') : group.code === 'regional' ? item.bureau.toLowerCase().includes('regional office') : item.bureauCode === group.code).length }))
  }, [filteredCases])
  const monthly = useMemo(() => {
    if (!filteredCases.length) return []
    const submittedMonths = filteredCases.map((item) => monthKey(new Date(`${item.submitted}T00:00:00`))).sort()
    const startMonth = range === 'all' ? submittedMonths[0] : monthKey(new Date(`${rangeStart}T00:00:00`))
    const endMonth = range === 'all' ? submittedMonths[submittedMonths.length - 1] : monthKey(new Date(`${today}T00:00:00`))
    const start = new Date(`${startMonth}-01T00:00:00`)
    const end = new Date(`${endMonth}-01T00:00:00`)
    const monthList = []
    while (start <= end && monthList.length < 36) { monthList.push(monthKey(start)); start.setMonth(start.getMonth() + 1) }
    return monthList.map((month) => {
      const inMonth = filteredCases.filter((item) => monthKey(new Date(`${item.submitted}T00:00:00`)) === month)
      return { month, received: inMonth.length, disposed: inMonth.filter((item) => item.status === 'Disposed').length }
    })
  }, [filteredCases, range, rangeStart, today])
  const overdueCases = useMemo(() => filteredCases.filter(isOverdue).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '')), [filteredCases])
  const overdueByBureau = useMemo(() => data.bureaus.map((bureau) => ({ name: bureau.name, label: bureau.code ?? bureau.name, value: overdueCases.filter((item) => item.bureau === bureau.name).length })).sort((a, b) => b.value - a.value), [data.bureaus, overdueCases])
  const institutions = useMemo(() => {
    const grouped = new Map()
    filteredCases.forEach((item) => {
      const group = grouped.get(item.institutionId) ?? { id: item.institutionId, name: item.institution, type: item.institutionType, state: item.institutionState, district: item.institutionDistrict, region: item.region, cases: [] }
      group.cases.push(item)
      grouped.set(item.institutionId, group)
    })
    return [...grouped.values()].map((item) => ({ ...item, value: item.cases.length, bureaus: [...new Set(item.cases.map((entry) => entry.bureau))] })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, 10)
  }, [filteredCases])
  const overlaps = useMemo(() => buildOverlapGroups(filteredCases), [filteredCases])
  const activity = useMemo(() => data.activity.filter((item) => item.when.slice(0, 10) >= rangeStart && item.when.slice(0, 10) <= today).map((item) => ({ ...item, institution: data.cases.find((record) => record.id === item.caseId)?.institution ?? 'Institution unavailable' })).sort((a, b) => b.when.localeCompare(a.when)).slice(0, 5), [data.activity, data.cases, rangeStart, today])
  const overdueBars = overdueByBureau.map((item) => ({ name: item.name, label: item.label, value: item.value, color: '#c6605d' }))
  const cards = [
    { label: 'Total Cases', value: filteredCases.length, key: 'total', tone: 'all', icon: '▤', note: 'In selected period' },
    { label: 'Pending', value: filteredCases.filter((item) => item.status === 'Pending').length, key: 'Pending', tone: 'amber', icon: '◷', note: 'Awaiting action' },
    { label: 'Under Process', value: filteredCases.filter((item) => item.status === 'Under Process').length, key: 'Under Process', tone: 'blue', icon: '◉', note: 'In progress' },
    { label: 'Disposed', value: filteredCases.filter((item) => item.status === 'Disposed').length, key: 'Disposed', tone: 'green', icon: '✓', note: 'Resolved' },
    { label: 'Overdue', value: overdueCases.length, key: 'overdue', tone: 'red', icon: '⌛', note: 'Past due date' },
    { label: 'Potential Overlaps', value: overlaps.length, key: 'overlaps', tone: 'violet', icon: '⧉', note: 'Institutions to review' },
  ]

  return <div className="dashboard-analytics">
    <div className="analytics-range-row"><div><span className="analytics-period-label">ANALYTICS PERIOD</span><span className="analytics-period-value">{rangeOptions.find(([value]) => value === range)?.[1]}</span></div><label className="analytics-range-select">Date range<select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Analytics date range">{rangeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    <nav className="analytics-quick-actions" aria-label="Quick actions"><span>QUICK ACTIONS</span><button onClick={() => onNavigate?.('All Cases')}>▤ View all cases</button><button onClick={() => onNotice?.('Institution management is planned for a future phase.')}>⌂ View institutions</button><button onClick={() => onNotice?.('Report generation is planned for a future phase.')}>▥ Generate report</button></nav>
    <section className="analytics-kpis" aria-label="Complaint summary">{cards.map((card) => <button type="button" key={card.label} className={`analytics-kpi tone-${card.tone}`} onClick={() => card.key === 'overlaps' ? onOpenOverlapReview() : onOpenCase?.(null, card.key, rangeStart, range === 'all' ? '' : today)}><span className="analytics-kpi-top"><span>{card.label}</span><i>{card.icon}</i></span><strong>{loading ? '—' : card.value}</strong><small>{card.note}<b>→</b></small></button>)}</section>

    <div className="analytics-grid analytics-grid-two">
      <Card title="Complaint Status Distribution" subtitle="Current recorded status · counts and share"><StatusDonut values={statusValues} total={filteredCases.length} /></Card>
      <Card title="Bureau-Wise Workload" subtitle="Complaint volume by Bureau grouping"><BureauBarChart values={bureauWorkload} /></Card>
      <Card title="Complaint Trends" subtitle="Received by submission month; disposed cases grouped by submission month"><div className="chart-legend-inline"><span><i className="legend-received" />Complaints received</span><span><i className="legend-disposed-line" />Disposed (submission cohort)</span></div>{monthly.length ? <TrendLineChart values={monthly} /> : <EmptyChart />}<p className="chart-footnote">The dataset has submission dates but no disposal timestamps; the green line shows currently disposed cases by their submission month.</p></Card>
      <Card title="Overdue Cases by Bureau/Cell" subtitle="Cases past their due date in the selected period">{overdueCases.length ? <HorizontalBars values={overdueBars} /> : <EmptyChart message="No overdue complaints in this date range." />}</Card>
      <Card title="Institution-Wise Complaints" subtitle="Top institutions by complaint count · select a name for details" className="analytics-institutions-card">{institutions.length ? <HorizontalBars values={institutions} onSelect={setInstitutionDialog} /> : <EmptyChart />}</Card>
    </div>

    <div className="analytics-bottom-grid">
      <Card title="Recent Activity" subtitle="Latest sample actions in selected period">{activity.length ? <div className="analytics-activity-list">{activity.map((item) => <button className="analytics-activity-row" key={`${item.caseId}-${item.action}`} onClick={() => onOpenCase(data.cases.find((record) => record.id === item.caseId))}><span className="analytics-activity-icon">↻</span><span className="analytics-activity-copy"><strong>{item.action}</strong><small>{item.caseId} · {item.institution} · {item.user}</small></span><time>{fmtTime(item.when)}</time></button>)}</div> : <EmptyChart message="No sample activity in this date range." />}</Card>
      <Card title="Potential Overlap Alerts" subtitle="Same institution has complaints across multiple Bureaus" action={<button className="text-button" onClick={onOpenOverlapReview}>View all →</button>}>{overlaps.length ? <div className="overlap-alert-list">{overlaps.slice(0, 5).map((item) => <button key={item.id} className="overlap-alert-row" onClick={() => setInstitutionDialog({ ...item, value: item.cases.length })}><span className="overlap-alert-mark">⧉</span><span><strong>{item.name}</strong><small>{item.bureaus.join(' · ')}</small></span><b>{item.cases.length} cases</b></button>)}</div> : <EmptyChart message="No cross-Bureau candidates in this date range." />}<p className="chart-footnote">Potential overlaps are data-review candidates, not confirmed duplicates.</p></Card>
      <Card title="Overdue Complaints" subtitle="Open cases past their due date">{overdueCases.length ? <div className="overdue-table-wrap"><table className="overdue-table"><thead><tr><th>Case ID</th><th>Institution</th><th>Bureau</th><th>Due date</th><th>Days</th></tr></thead><tbody>{overdueCases.slice(0, 8).map((item) => <tr key={item.id}><td><button className="case-link" onClick={() => onOpenCase(item)}>{item.id}</button></td><td>{item.institution}</td><td>{item.bureau}</td><td>{shortDate(item.due)}</td><td><span className="days-late-tag">{daysLate(item.due)}d</span></td></tr>)}</tbody></table></div> : <EmptyChart message="No overdue complaints in this date range." />}</Card>
    </div>
    <InstitutionDialog institution={institutionDialog} onClose={() => setInstitutionDialog(null)} onOpenCase={(item) => { setInstitutionDialog(null); onOpenCase(item) }} />
  </div>
}
