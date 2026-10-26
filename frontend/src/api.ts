const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json", ...options?.headers }, ...options });
  if (!response.ok) throw new Error((await response.json()).detail || "Request failed");
  return response.json();
}

export type Candidate = { id: number; candidate_id: string; name: string; email: string; project_name: string | null; mentor: string; status: string; is_demo: boolean; review_frequency: string };
export type Review = { id: number; candidate_id: string; candidate_name: string; email: string; project: string; reviewer: string; start_at: string; end_at: string; status: string; feedback_status: string };
export type Dashboard = { total_candidates: number; active_internships: number; completed_internships: number; upcoming_reviews: number; completed_reviews: number; overdue_reviews: number; feedback_awaiting_approval: number; emails_sent: number; project_distribution: { name: string; value: number }[]; upcoming: { id: number; candidate_id: string; candidate_name: string; project: string; start_at: string; reviewer: string }[] };
