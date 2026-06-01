// Tiny client-side fetch helpers.
export async function jget<T = any>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export async function jpost<T = any>(url: string, body: any, method = "POST"): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export async function jdelete(url: string) {
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}
