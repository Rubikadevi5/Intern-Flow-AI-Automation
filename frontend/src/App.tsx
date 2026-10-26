import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, ChevronRight, CircleUserRound, ClipboardCheck, FileText, FolderKanban, LayoutDashboard, Mail, Menu, Plus, Search, Settings, Sparkles, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Candidate, Dashboard, Review } from "./api";

type Page = "Dashboard" | "Candidates" | "Projects" | "Review Schedule" | "Conduct Review" | "AI Feedback" | "Email History" | "Reports" | "Settings";
const pages: { name: Page; icon: typeof LayoutDashboard }[] = [{ name: "Dashboard", icon: LayoutDashboard }, { name: "Candidates", icon: Users }, { name: "Projects", icon: FolderKanban }, { name: "Review Schedule", icon: CalendarDays }, { name: "Conduct Review", icon: ClipboardCheck }, { name: "AI Feedback", icon: Sparkles }, { name: "Email History", icon: Mail }, { name: "Reports", icon: FileText }, { name: "Settings", icon: Settings }];

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "gray" | "blue" }) { return <span className={`badge ${tone}`}>{children}</span>; }

export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() { try { setError(""); const [dash, candidateData, reviewData] = await Promise.all([api<Dashboard>("/dashboard"), api<{ items: Candidate[] }>(`/candidates?search=${encodeURIComponent(query)}`), api<Review[]>("/reviews")]); setDashboard(dash); setCandidates(candidateData.items); setReviews(reviewData); } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect to the API"); } }
  useEffect(() => { load(); }, [query]);
  useEffect(() => {
    const edit = (event: Event) => setEditingCandidate((event as CustomEvent<Candidate>).detail);
    const remove = async (event: Event) => { const candidate = (event as CustomEvent<Candidate>).detail; if (window.confirm(`Archive ${candidate.name} (${candidate.candidate_id})?`)) { await api(`/candidates/${candidate.candidate_id}`, { method: "DELETE" }); load(); } };
    window.addEventListener("candidate-edit", edit); window.addEventListener("candidate-delete", remove);
    return () => { window.removeEventListener("candidate-edit", edit); window.removeEventListener("candidate-delete", remove); };
  }, []);
  useEffect(() => {
    const rowAction = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("more")) return;
      const row = target.closest("tr");
      const candidate = candidates.find(item => row?.textContent?.includes(item.candidate_id));
      if (candidate) setEditingCandidate(candidate);
    };
    document.addEventListener("click", rowAction);
    return () => document.removeEventListener("click", rowAction);
  }, [candidates]);
  useEffect(() => {
    const actionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest("button");
      if (!button) return;
      if (button.textContent?.includes("Schedule review")) { event.preventDefault(); setScheduleModalOpen(true); }
    };
    document.addEventListener("click", actionClick);
    return () => document.removeEventListener("click", actionClick);
  }, []);

  const navigate = (next: Page) => { setPage(next); setMobileOpen(false); };
  return <div className="app-shell">
    <aside className={mobileOpen ? "sidebar open" : "sidebar"}><div className="brand"><div className="brand-mark">IF</div><div><strong>InternFlow</strong><small>AI REVIEW OPS</small></div><button className="close-nav" onClick={() => setMobileOpen(false)}><X size={18}/></button></div><nav>{pages.map(({ name, icon: Icon }) => <button key={name} className={page === name ? "nav-item active" : "nav-item"} onClick={() => navigate(name)}><Icon size={18}/><span>{name}</span>{name === "AI Feedback" && <i>3</i>}</button>)}</nav><div className="sidebar-foot"><div className="mode-dot"/><div><strong>InternFlow workspace</strong><small>Integrations paused</small></div></div></aside>
    {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)}/>}<main className="main"><header><button className="menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><div className="crumb">Workspace <ChevronRight size={14}/> <strong>{page}</strong></div><div className="header-actions"><span className="connection"><span/> API connected</span></div></header>
      <section className="page-content"><div className="title-row"><div><p className="eyebrow">MONDAY, 26 OCTOBER 2026</p><h1>{page === "Dashboard" ? "Good morning, Rubika" : page}</h1><p className="subhead">{page === "Dashboard" ? "Here is what is happening across your internship program." : "Manage your internship review workflow."}</p></div>{page === "Candidates" && <button className="button primary" onClick={() => setCandidateModalOpen(true)}><Plus size={17}/> Add candidate</button>}{page === "Projects" && <button className="button primary" onClick={() => setPage("Projects")}><Plus size={17}/> New project</button>}{page === "Email History" && <button className="button primary" onClick={() => setEmailModalOpen(true)}><Plus size={17}/> Compose email</button>}</div>{error && <div className="notice error">{error}. Start the backend with <code>uvicorn app.main:app --reload --port 8000</code>.</div>}{page === "Dashboard" && dashboard && <DashboardView data={dashboard} reviews={reviews} navigate={navigate}/>} {page === "Candidates" && <CandidatesView candidates={candidates} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter}/>} {page === "Review Schedule" && <ScheduleView reviews={reviews}/>} {page !== "Dashboard" && page !== "Candidates" && page !== "Review Schedule" && <Placeholder page={page} />}</section>
      {(candidateModalOpen || editingCandidate) && <CandidateModal candidate={editingCandidate} onClose={() => { setCandidateModalOpen(false); setEditingCandidate(undefined); }} onSaved={() => { setCandidateModalOpen(false); setEditingCandidate(undefined); load(); }} />}
      {emailModalOpen && <EmailModal onClose={() => setEmailModalOpen(false)} />}
      {scheduleModalOpen && <ScheduleModal candidates={candidates} onClose={() => setScheduleModalOpen(false)} onSaved={() => { setScheduleModalOpen(false); load(); }} />}
    </main></div>;
}

function DashboardView({ data, reviews, navigate }: { data: Dashboard; reviews: Review[]; navigate: (p: Page) => void }) { const stats = [{ label: "Total candidates", value: data.total_candidates, detail: `${data.active_internships} active`, icon: Users, tone: "teal" }, { label: "Upcoming reviews", value: data.upcoming_reviews, detail: `${data.overdue_reviews} overdue`, icon: CalendarDays, tone: "orange" }, { label: "Feedback to approve", value: data.feedback_awaiting_approval, detail: "Needs your attention", icon: Sparkles, tone: "purple" }, { label: "Emails sent", value: data.emails_sent, detail: "Demo mode", icon: Mail, tone: "blue" }]; return <><div className="stat-grid">{stats.map(({ label, value, detail, icon: Icon, tone }) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></div>)}</div><div className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Review activity</h2><p>Scheduled review volume</p></div><select><option>Last 30 days</option></select></div><ResponsiveContainer width="100%" height={230}><BarChart data={[{name:"Oct 20", scheduled:2, completed:1},{name:"Oct 23", scheduled:3, completed:2},{name:"Oct 26", scheduled:4, completed:1},{name:"Oct 29", scheduled:4, completed:0},{name:"Nov 01", scheduled:2, completed:0}]}><CartesianGrid vertical={false} stroke="#e9e9e4"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11, fill:"#8a8e8a"}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11, fill:"#8a8e8a"}}/><Tooltip/><Bar dataKey="scheduled" fill="#1f7a72" radius={[4,4,0,0]}/><Bar dataKey="completed" fill="#c7dfd9" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer><div className="legend"><span><i className="teal-dot"/>Scheduled</span><span><i className="pale-dot"/>Completed</span></div></div><div className="panel distribution"><div className="panel-heading"><div><h2>Project distribution</h2><p>Candidate allocation</p></div></div><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={data.project_distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3}>{data.project_distribution.map((_, i) => <Cell key={i} fill={["#1f7a72","#e99b58","#8c78b4","#d5c16e","#6d9fc0","#c57b84","#719a77"][i % 7]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="distribution-list">{data.project_distribution.slice(0,4).map((item, i) => <div key={item.name}><span><i style={{background:["#1f7a72","#e99b58","#8c78b4","#d5c16e"][i]}}/>{item.name}</span><b>{item.value}</b></div>)}</div></div></div><div className="panel upcoming"><div className="panel-heading"><div><h2>Upcoming reviews</h2><p>Stay ahead of every conversation</p></div><button className="text-button" onClick={() => navigate("Review Schedule")}>View schedule <ChevronRight size={15}/></button></div>{reviews.filter(r => r.status === "Scheduled").slice(0,5).map(r => <div className="review-row" key={r.id}><div className="date-tile"><b>{new Date(r.start_at).toLocaleDateString("en-IN", {day:"2-digit"})}</b><small>{new Date(r.start_at).toLocaleDateString("en-IN", {month:"short"}).toUpperCase()}</small></div><div className="review-info"><b>{r.candidate_name}</b><span>{r.candidate_id} · {r.project}</span></div><div className="review-time">{formatDate(r.start_at).split(", ").slice(1).join(", ")}<small>{r.reviewer === "Unassigned" ? "Reviewer unassigned" : r.reviewer}</small></div><Badge tone="blue">Scheduled</Badge></div>)}{reviews.length === 0 && <div className="empty">No reviews scheduled yet.</div>}</div></> }

function CandidatesView({ candidates, query, setQuery, statusFilter, setStatusFilter }: { candidates: Candidate[]; query: string; setQuery: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void }) { const visibleCandidates = statusFilter ? candidates.filter(candidate => candidate.status === statusFilter) : candidates; return <div className="panel table-panel"><div className="table-toolbar"><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, ID, or email..."/></div><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter candidates by status"><option value="">All statuses</option><option value="Active">Active</option><option value="Completed">Completed</option></select><button className="button secondary">Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Project</th><th>Mentor</th><th>Status</th><th>Review cycle</th><th/></tr></thead><tbody>{visibleCandidates.map(c => <tr key={c.candidate_id}><td><div className="person"><div className="initials">{c.name.slice(0,2).toUpperCase()}</div><div><b>{c.name}</b><span>{c.candidate_id} · {c.email}</span></div></div></td><td>{c.project_name || "Unassigned"}</td><td>{c.mentor}</td><td><Badge>{c.status}</Badge></td><td>{c.review_frequency}</td><td><button className="more" aria-label={`Edit ${c.candidate_id}`}>Edit</button></td></tr>)}</tbody></table></div><div className="table-foot">Showing <b>{visibleCandidates.length}</b> of <b>{candidates.length}</b> candidates <span>Page 1 of 1</span></div></div> }

function ScheduleView({ reviews }: { reviews: Review[] }) { return <div className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className="selected">Table</button><button>Calendar</button></div><button className="button primary"><Plus size={17}/> Schedule review</button></div><div className="table-wrap"><table><thead><tr><th>Date & time</th><th>Candidate</th><th>Project</th><th>Reviewer</th><th>Status</th><th>Feedback</th></tr></thead><tbody>{reviews.map(r => <tr key={r.id}><td><b>{formatDate(r.start_at)}</b></td><td><div className="person"><div className="initials">{r.candidate_name.slice(0,2).toUpperCase()}</div><div><b>{r.candidate_name}</b><span>{r.candidate_id}</span></div></div></td><td>{r.project}</td><td>{r.reviewer}</td><td><Badge tone={r.status === "Completed" ? "green" : "blue"}>{r.status}</Badge></td><td><Badge tone={r.feedback_status === "Not started" ? "gray" : "amber"}>{r.feedback_status}</Badge></td></tr>)}</tbody></table></div></div> }
function CandidateModal({ candidate, onClose, onSaved }: { candidate?: Candidate; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(candidate?.name || "");
  const [email, setEmail] = useState(candidate?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setSaving(true); setMessage("");
    try { await api(candidate ? `/candidates/${candidate.candidate_id}` : "/candidates", { method: candidate ? "PATCH" : "POST", body: JSON.stringify({ name, email }) }); onSaved(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save candidate"); }
    finally { setSaving(false); }
  }
  async function archive() { if (!candidate || !window.confirm(`Archive ${candidate.name} (${candidate.candidate_id})?`)) return; await api(`/candidates/${candidate.candidate_id}`, { method: "DELETE" }); onSaved(); }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">{candidate ? "EDIT RECORD" : "NEW RECORD"}</p><h2>{candidate ? "Edit candidate" : "Add candidate"}</h2></div><button className="close-modal" onClick={onClose}><X size={18}/></button></div><label>Candidate name<input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" autoFocus/></label><label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"/></label>{message && <div className="form-error">{message}</div>}<div className="modal-actions">{candidate && <button className="button danger" onClick={archive}>Delete</button>}<button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={!name || !email || saving} onClick={save}>{saving ? "Saving..." : candidate ? "Save changes" : "Save candidate"}</button></div></div></div>;
}

function EmailModal({ onClose }: { onClose: () => void }) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("Internship review update");
  const [message, setMessage] = useState("");
  async function queueEmail() { try { await api("/notifications/preview", { method: "POST", body: JSON.stringify({ recipient, template: "custom", subject }) }); setMessage("Message queued for preview. No email was sent."); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to queue message"); } }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">MESSAGE CENTER</p><h2>Compose email</h2></div><button className="close-modal" onClick={onClose}><X size={18}/></button></div><label>Recipient email<input type="email" value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="candidate@example.com" autoFocus/></label><label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} /></label>{message && <div className="form-error">{message}</div>}<div className="modal-actions"><button className="button secondary" onClick={onClose}>Close</button><button className="button primary" disabled={!recipient || !subject} onClick={queueEmail}>Queue preview</button></div></div></div>;
}

function ScheduleModal({ candidates, onClose, onSaved }: { candidates: Candidate[]; onClose: () => void; onSaved: () => void }) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id?.toString() || "");
  const [reviewer, setReviewer] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [message, setMessage] = useState("");
  async function save() {
    try { await api("/reviews", { method: "POST", body: JSON.stringify({ candidate_id: Number(candidateId), reviewer: reviewer || "Unassigned", start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString() }) }); onSaved(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to schedule review"); }
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">REVIEW CALENDAR</p><h2>Schedule review</h2></div><button className="close-modal" onClick={onClose}><X size={18}/></button></div><label>Candidate<select value={candidateId} onChange={event => setCandidateId(event.target.value)}>{candidates.map(candidate => <option value={candidate.id} key={candidate.candidate_id}>{candidate.candidate_id} · {candidate.name}</option>)}</select></label><label>Reviewer<input value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Reviewer name"/></label><label>Start time<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)}/></label><label>End time<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)}/></label>{message && <div className="form-error">{message}</div>}<div className="modal-actions"><button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={!candidateId || !startAt || !endAt} onClick={save}>Schedule review</button></div></div></div>;
}

function Placeholder({ page }: { page: Page }) { return <div className="panel empty-page"><div className="empty-icon"><BarChart3 size={28}/></div><h2>{page} is ready for your workflow</h2><p>This workspace is connected to the database. Create and manage records from this section.</p><button className="button secondary" onClick={() => window.alert(`${page} actions are being prepared for this workspace.`)}><Plus size={17}/> Create first record</button></div> }
