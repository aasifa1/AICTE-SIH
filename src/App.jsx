import { useEffect, useMemo, useState } from 'react'
import { dataMode, getDashboardData, isOverdue } from './services/dashboardService'
import DashboardAnalytics, { OverlapReviewPage } from './components/DashboardAnalytics'

const nav = [
  ['Dashboard', '▦'], ['All Cases', '▤'], ['Institutions', '⌂'], ['Bureaus & Cells', '◫'], ['Overlap Review', '⧉'], ['Notifications', '♧'], ['Reports', '▥'], ['User Management', '♙'], ['Settings', '⚙'],
]
const dateText = (v) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const priorityRank = { Urgent: 4, High: 3, Medium: 2, Low: 1 }

function Icon({ children, className = '' }) { return <span className={`icon ${className}`} aria-hidden="true">{children}</span> }
function Status({ value }) { return <span className={`pill status-${value.toLowerCase().replaceAll(' ', '-')}`}><i />{value}</span> }
function Priority({ value }) { return <span className={`priority priority-${value.toLowerCase()}`}><i />{value}</span> }

export default function App() {
  const [data, setData] = useState({ cases: [], activity: [], bureaus: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState({ status: '', bureau: '', priority: '', category: '', from: '', to: '', overdue: false })
  const [sort, setSort] = useState('submitted')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const pageSize = 6

  useEffect(() => { getDashboardData().then(setData).catch(() => setError('Dashboard data could not be loaded. Please refresh to try again.')).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => data.cases.filter((c) => {
    const q = query.trim().toLowerCase()
    return (!q || [c.id, c.institution, c.institutionId, c.category, c.bureau, c.institutionType, c.institutionState, c.institutionDistrict, c.region].some((v) => String(v ?? '').toLowerCase().includes(q))) &&
      (!filter.status || c.status === filter.status) && (!filter.bureau || c.bureau === filter.bureau) &&
      (!filter.priority || c.priority === filter.priority) && (!filter.category || c.category === filter.category) &&
      (!filter.from || c.submitted >= filter.from) && (!filter.to || c.submitted <= filter.to) && (!filter.overdue || isOverdue(c))
  }).sort((a, b) => {
    if (sort === 'priority') return priorityRank[b.priority] - priorityRank[a.priority]
    if (sort === 'status') return a.status.localeCompare(b.status)
    return b.submitted.localeCompare(a.submitted)
  }), [data.cases, query, filter, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const unique = (key) => [...new Set(data.cases.map((c) => c[key]))].sort()
  const setOne = (key, value) => { setFilter((old) => ({ ...old, [key]: value })); setPage(1) }
  const clearFilters = () => { setQuery(''); setFilter({ status: '', bureau: '', priority: '', category: '', from: '', to: '', overdue: false }); setPage(1) }
  const chooseCard = (key, from = '', to = '') => {
    if (key === 'overlaps') { setActiveNav('Overlap Review'); return }
    setQuery('')
    setFilter({ status: ['Pending', 'Under Process', 'Disposed'].includes(key) ? key : '', bureau: '', priority: '', category: '', from, to, overdue: key === 'overdue' })
    setPage(1)
    setActiveNav('All Cases')
  }
  const openDashboardItem = (item, key, from, to) => key ? chooseCard(key, from, to) : setSelected(item)
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3000) }

  return <div className="app-shell">
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand"><div className="brand-mark">A</div>{!collapsed && <div><strong>AICTE</strong><small>CASE MONITORING</small></div>}<button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">{collapsed ? '»' : '«'}</button></div>
      <div className="nav-caption">{!collapsed && 'WORKSPACE'}</div>
      <nav>{nav.map(([label, icon]) => <button key={label} title={collapsed ? label : undefined} onClick={() => ['Dashboard', 'All Cases', 'Overlap Review'].includes(label) ? (setActiveNav(label), label === 'Dashboard' && clearFilters()) : showNotice(`${label} is planned for a future phase.`)} className={`nav-item ${activeNav === label ? 'active' : ''}`}><Icon>{icon}</Icon>{!collapsed && <span>{label}</span>}</button>)}</nav>
      {!collapsed && <div className="sidebar-bottom"><div className="support-card"><div className="support-icon">?</div><strong>Need help?</strong><p>Access the dashboard guide and support resources.</p><button onClick={() => showNotice('Help resources will be available in a future phase.')}>View help center <span>↗</span></button></div><div className="version">Prototype v0.1 <span>•</span> SIH Demo</div></div>}
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="top-actions"><label className="global-search"><Icon>⌕</Icon><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Search cases, institutions..." aria-label="Search cases, institutions"/><kbd>⌘ K</kbd></label><button className="notification-button" aria-label="Notifications" onClick={() => showNotice('The notification feed is a future-phase placeholder.') }><span>♧</span></button><div className="user-menu"><div className="avatar">DU</div><div className="user-label"><strong>Demo User</strong><small>AICTE Administrator</small></div><span className="chevron">⌄</span></div></div></header>

      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">{activeNav === 'Dashboard' ? 'OVERVIEW' : 'CASE MANAGEMENT'} <span>•</span> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</div><h1>{activeNav === 'Dashboard' ? 'Dashboard' : activeNav}</h1><p>{activeNav === 'Dashboard' ? 'Monitor institution complaints and track case progress across Bureaus and Cells.' : 'Search, filter, and review complaint records across Bureaus and Cells.'}</p></div><div className="heading-actions"><span className="demo-tag"><i /> Fictional demo data</span><button className="button button-primary" onClick={() => showNotice('Complaint registration is not implemented in this dashboard phase.')}><span>＋</span> Register Complaint</button></div></div>
        <div className="data-banner"><span className="info-dot">i</span><span>Showing <strong>{dataMode}</strong> from the attached demo dataset. No live AICTE case system is connected.</span></div>

        {error && <div className="error-state"><strong>Unable to load dashboard</strong><p>{error}</p><button className="button button-outline" onClick={() => { setError(''); setLoading(true); getDashboardData().then(setData).catch(() => setError('Dashboard data could not be loaded. Please refresh to try again.')).finally(() => setLoading(false)) }}>Retry</button></div>}
        {activeNav === 'Dashboard' && <DashboardAnalytics data={data} loading={loading} onOpenCase={openDashboardItem} onNavigate={setActiveNav} onNotice={showNotice} onOpenOverlapReview={() => setActiveNav('Overlap Review')} />}
        {activeNav === 'Overlap Review' && <OverlapReviewPage cases={data.cases} onBack={() => setActiveNav('Dashboard')} />}
        {activeNav === 'All Cases' && <section className="panel cases-panel"><div className="panel-heading cases-heading"><div><h2>{activeNav === 'Dashboard' ? 'Recent cases' : 'All cases'}</h2><p>{activeNav === 'Dashboard' ? 'Latest complaint records across all Bureaus and Cells' : 'Search, filter, and review complaint records across all Bureaus and Cells.'}</p></div>{activeNav === 'Dashboard' && <button className="button button-outline" onClick={() => { setActiveNav('All Cases'); clearFilters() }}>View all cases <span>→</span></button>}</div>
          <div className="filters"><label className="table-search"><Icon>⌕</Icon><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Search case ID, institution..." aria-label="Search cases"/></label>
            <select value={filter.bureau} onChange={(e) => setOne('bureau', e.target.value)} aria-label="Filter by Bureau"><option value="">All Bureaus</option>{unique('bureau').map((v) => <option key={v}>{v}</option>)}</select>
            <select value={filter.status} onChange={(e) => setOne('status', e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{unique('status').map((v) => <option key={v}>{v}</option>)}</select>
            <select value={filter.priority} onChange={(e) => setOne('priority', e.target.value)} aria-label="Filter by priority"><option value="">All priorities</option>{unique('priority').map((v) => <option key={v}>{v}</option>)}</select>
            <button className={`filter-toggle ${filter.overdue ? 'filter-on' : ''}`} onClick={() => setOne('overdue', !filter.overdue)}>⌛ Overdue</button><button className="filter-icon" aria-label="More filters" onClick={() => showNotice('Use the date and category fields below to refine the list.')} title="More filters">☷</button>
          </div>
          <div className="advanced-filters"><label>Category<select value={filter.category} onChange={(e) => setOne('category', e.target.value)}><option value="">All categories</option>{unique('category').map((v) => <option key={v}>{v}</option>)}</select></label><label>Submitted from<input type="date" value={filter.from} onChange={(e) => setOne('from', e.target.value)} /></label><label>Submitted to<input type="date" value={filter.to} onChange={(e) => setOne('to', e.target.value)} /></label><label>Sort by<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="submitted">Submission date</option><option value="priority">Priority</option><option value="status">Status</option></select></label>{(query || Object.values(filter).some(Boolean)) && <button className="clear-button" onClick={clearFilters}>Clear filters</button>}</div>
          <div className="result-line">Showing <strong>{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> cases</div>
          <div className="table-wrap"><table><thead><tr><th>CASE ID</th><th>INSTITUTION</th><th>CATEGORY</th><th>BUREAU / CELL</th><th>PRIORITY</th><th>STATUS</th><th>SUBMITTED</th><th>LAST UPDATED</th><th></th></tr></thead><tbody>
            {loading ? <tr><td colSpan="9" className="table-empty">Loading case records…</td></tr> : rows.length ? rows.map((c) => <tr key={c.id}><td><button className="case-link" onClick={() => setSelected(c)}>{c.id}</button></td><td><div className="institution-name">{c.institution}</div><small className="institution-id">{c.institutionId}</small></td><td>{c.category}</td><td>{c.bureau}</td><td><Priority value={c.priority} /></td><td><Status value={c.status} /></td><td>{dateText(c.submitted)}</td><td>{dateText(c.updated)}</td><td><button className="row-action" onClick={() => setSelected(c)} aria-label={`View details for ${c.id}`}>↗</button></td></tr>) : <tr><td colSpan="9" className="table-empty"><div className="empty-symbol">⌕</div><strong>No cases found</strong><span>Try changing your search or filters.</span><button className="clear-button" onClick={clearFilters}>Clear filters</button></td></tr>}
          </tbody></table></div>
          <div className="pagination"><span>Page {page} of {totalPages}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button></div></div>
        </section>}
        <footer className="page-footer"><span>AICTE Complaint Monitoring Dashboard <b>·</b> SIH prototype</span><span>Demo user: read-only identity <b>·</b> No authentication connected</span></footer>
      </div>
    </main>

    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="case-modal" role="dialog" aria-modal="true" aria-labelledby="case-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close details">×</button><span className="eyebrow">CASE DETAILS</span><h2 id="case-title">{selected.id}</h2><p className="modal-subtitle">{selected.title}</p><div className="modal-status"><Status value={selected.status}/><Priority value={selected.priority}/></div><dl className="detail-grid"><div><dt>Institution</dt><dd>{selected.institution}</dd></div><div><dt>Institution ID</dt><dd>{selected.institutionId}</dd></div><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Assigned Bureau</dt><dd>{selected.bureau}</dd></div><div><dt>Assigned user ID</dt><dd>{selected.officer || '—'}</dd></div><div><dt>Submitted</dt><dd>{dateText(selected.submitted)}</dd></div><div><dt>Last updated</dt><dd>{dateText(selected.updated)}</dd></div><div><dt>Due date (demo)</dt><dd>{dateText(selected.due)}</dd></div></dl><div className="modal-note">Fictional demonstration record. Case actions are not connected to a live backend.</div><button className="button button-primary modal-done" onClick={() => setSelected(null)}>Done</button></section></div>}
  </div>
}
