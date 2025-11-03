// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const STATI = [
  "imballato",
  "spedito",
  "arrivato",
  "pronte per la vendita",
  "venduta",
] as const;

type Stato = typeof STATI[number];

type Scatola = {
  id: string;
  codice: string;
  colore: string;
  tipoOggetto: string;
  luogoProduzione: string;
  progressivo: number;
  stato: Stato;
  prezzoBase?: 10 | 20 | 30;
  donazioneLibera?: number;
  dataVendita?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function makeCodice(tipo: string, luogo: string, progressivo: number) {
  const t = (tipo || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  const l = (luogo || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return `${t}-${l}-${pad3(progressivo)}`;
}
function fmtEUR(n: number | undefined) {
  if (n == null || isNaN(n)) return "";
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayIT() {
  return new Date().toLocaleDateString("it-IT");
}
function uuid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const LS_KEY = "anffas-scatole-v1";
function loadScatole(): Scatola[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Scatola[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveScatole(items: Scatola[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

/* ── UI Globali ─────────────────────────────────────────── */
function HeaderBar({ onOpenLabels }: { onOpenLabels: () => void }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="mx-auto max-w-7xl flex items-center gap-4 p-4">
        <img src="/logo.png" alt="Anffas Trentino" className="h-10 w-auto" />
        <div>
          <div className="text-xl font-bold text-anffas-blue">Anffas HUB e Filiali 2025</div>
          <div className="text-sm text-gray-600">Gestione campagna: codici parlanti, stati, vendite, totali</div>
        </div>
        <button
          onClick={onOpenLabels}
          className="ml-auto rounded-xl border px-3 py-1 bg-anffas-yellow/60 text-anffas-blue"
        >
          Stampa etichette
        </button>
      </div>
    </div>
  );
}

function Instructions() {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="rounded-2xl bg-white p-5 shadow border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-anffas-blue">Guida rapida</div>
        <button onClick={() => setOpen(!open)} className="rounded-xl border px-3 py-1">
          {open ? "Nascondi" : "Mostra"}
        </button>
      </div>
      {open && (
        <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm">
          <li><b>All’HUB</b>: inserisci Tipo (3 lettere), Luogo (3 lettere), Progressivo → si genera il <i>codice parlante</i>.</li>
          <li>Imposta colore e note. Clicca <b>Aggiungi</b> → stato iniziale <b>imballato</b>.</li>
          <li><b>Spedizione</b>: quando il corriere ritira, imposta stato <b>spedito</b>.</li>
          <li><b>Filiale</b>: al ricevimento → <b>arrivato</b> → quando pronta → <b>pronte per la vendita</b>.</li>
          <li><b>Vendita</b>: registra <b>prezzo base</b> (10/20/30) + <b>donazione libera</b> e <b>data</b> → lo stato passa a <b>venduta</b>.</li>
          <li>I <b>totali</b> si aggiornano in testata. Esporta CSV dai filtri.</li>
          <li>Memoria <b>locale</b> (browser). Ogni utente testa senza interferire con altri.</li>
        </ol>
      )}
    </div>
  );
}

/* ── Etichette con QR ───────────────────────────────────── */
function Labels({ items, onBack }: { items: Scatola[]; onBack: () => void }) {
  const [perRow, setPerRow] = React.useState(3);
  const [includeColor, setIncludeColor] = React.useState(true);

  useEffect(() => {
    (async () => {
      for (const s of items) {
        const canvas = document.getElementById(`qr-${s.id}`) as HTMLCanvasElement | null;
        if (canvas) {
          await QRCode.toCanvas(canvas, s.codice, { margin: 1, width: 160 });
        }
      }
    })();
  }, [items]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-2xl border px-3 py-2" onClick={onBack}>← Torna all’app</button>
          <button className="rounded-2xl border px-3 py-2 bg-anffas-blue text-white" onClick={() => window.print()}>🖨️ Stampa</button>
          <label className="ml-2 text-sm">
            Etichette per riga:
            <select className="ml-2 rounded-xl border px-2 py-1" value={perRow} onChange={(e)=>setPerRow(parseInt(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <label className="ml-2 text-sm">
            <input type="checkbox" className="mr-1" checked={includeColor} onChange={(e)=>setIncludeColor(e.target.checked)} />
            Mostra colore scatola
          </label>
        </div>
        <div className="text-sm text-gray-600">Consiglio: Carta adesiva A4 – QR 160px, margini minimi.</div>
      </div>

      <div className="grid gap-4" style={{gridTemplateColumns:`repeat(${perRow}, minmax(0, 1fr))`}}>
        {items.map((s) => (
          <div key={s.id} className="rounded-xl border p-3 bg-white break-inside-avoid">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Codice parlante</div>
              {includeColor && s.colore && <div className="text-xs rounded-full px-2 py-0.5 border">{s.colore}</div>}
            </div>
            <div className="text-lg font-bold tracking-wider">{s.codice}</div>
            <div className="mt-1 text-xs text-gray-600">
              Tipo: <b>{s.tipoOggetto}</b> • Luogo: <b>{s.luogoProduzione}</b> • Prog: <b>{pad3(s.progressivo)}</b>
            </div>
            <div className="mt-2 flex items-center justify-center">
              <canvas id={`qr-${s.id}`} width={160} height={160} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── App principale ─────────────────────────────────────── */
export default function App() {
  const [scatole, setScatole] = useState<Scatola[]>(loadScatole());
  const [query, setQuery] = useState("");
  const [filtroStato, setFiltroStato] = useState<string>("");
  const [view, setView] = useState<"home" | "labels">("home");

  useEffect(() => { saveScatole(scatole); }, [scatole]);

  const totaleBase = useMemo(() => scatole.reduce((sum, s) => sum + (s.prezzoBase ?? 0), 0), [scatole]);
  const totaleDonazioni = useMemo(() => scatole.reduce((sum, s) => sum + (s.donazioneLibera ?? 0), 0), [scatole]);

  const countsPerStato = useMemo(() => {
    const m = new Map<Stato, number>();
    STATI.forEach((st) => m.set(st, 0));
    scatole.forEach((s) => m.set(s.stato, (m.get(s.stato) || 0) + 1));
    return m;
  }, [scatole]);

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scatole.filter((s) => {
      const matchQ =
        !q ||
        s.codice.toLowerCase().includes(q) ||
        (s.colore || "").toLowerCase().includes(q) ||
        (s.note || "").toLowerCase().includes(q) ||
        s.tipoOggetto.toLowerCase().includes(q) ||
        s.luogoProduzione.toLowerCase().includes(q);
      const matchStato = !filtroStato || s.stato === filtroStato;
      return matchQ && matchStato;
    });
  }, [scatole, query, filtroStato]);

  return (
    <div className="min-h-screen bg-anffas-bg text-anffas-text">
      <HeaderBar onOpenLabels={() => setView("labels")} />
      <div className="p-6">
        {view === "home" ? (
          <div className="mx-auto max-w-7xl space-y-6">
            <Header countsPerStato={countsPerStato} totaleBase={totaleBase} totaleDonazioni={totaleDonazioni} />
            <Instructions />

            <Card>
              <CardTitle>Nuova scatola all'HUB</CardTitle>
              <NuovaScatolaForm onCreate={(s) => setScatole((prev) => [s, ...prev])} scatole={scatole} />
            </Card>

            <Card>
              <CardTitle>Ricerca e filtri</CardTitle>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className="rounded-2xl border p-3"
                  placeholder="Cerca per codice, colore, note, tipo o luogo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select className="rounded-2xl border p-3" value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)}>
                  <option value="">Tutti gli stati</option>
                  {STATI.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button className="rounded-2xl border px-4 py-2" onClick={() => setFiltroStato("")}>Pulisci</button>
                  <button className="rounded-2xl border px-4 py-2" onClick={() => exportCSV(visibili)}>Esporta CSV</button>
                </div>
              </div>
            </Card>

            <ElencoScatole
              items={visibili}
              onUpdate={(id, patch) => setScatole((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)))}
              onDelete={(id) => setScatole((prev) => prev.filter((s) => s.id !== id))}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-6">
            <Labels items={scatole} onBack={() => setView("home")} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componenti secondari ───────────────────────────────── */
function Header({ countsPerStato, totaleBase, totaleDonazioni }: {
  countsPerStato: Map<Stato, number>;
  totaleBase: number;
  totaleDonazioni: number;
}) {
  const totale = totaleBase + totaleDonazioni;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-5 shadow border-t-4 border-anffas-blue">
        <div className="text-xl font-semibold text-anffas-blue">Totale vendite</div>
        <div className="mt-2 text-3xl font-bold">€ {fmtEUR(totale)}</div>
        <div className="mt-1 text-sm">Base: € {fmtEUR(totaleBase)} • Donazioni libere: € {fmtEUR(totaleDonazioni)}</div>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow border-t-4 border-anffas-light">
        <div className="text-xl font-semibold text-anffas-blue">Stato delle scatole</div>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
          {STATI.map((s) => (
            <li key={s} className="flex justify-between">
              <span>{s}</span>
              <span className="font-semibold">{countsPerStato.get(s) || 0}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow border-t-4 border-anffas-yellow">
        <div className="text-xl font-semibold text-anffas-blue">Oggi</div>
        <div className="mt-2 text-3xl font-bold">{todayIT()}</div>
        <p className="mt-1 text-sm">HUB Passaggio Osele • Anffas Trentino</p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-6 shadow">{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-2xl font-bold text-anffas-blue">{children}</h2>;
}

function NuovaScatolaForm({ onCreate, scatole }: { onCreate: (s: Scatola) => void; scatole: Scatola[]; }) {
  const [tipo, setTipo] = useState("");
  const [luogo, setLuogo] = useState("");
  const [progressivo, setProgressivo] = useState<number>(nextProgressivo(scatole));
  const [colore, setColore] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { setProgressivo(nextProgressivo(scatole)); }, [scatole.length]);

  const codice = makeCodice(tipo, luogo, progressivo);

  function handleAdd() {
    if (tipo.trim().length < 1 || luogo.trim().length < 1) return alert("Inserisci tipo e luogo (3 lettere ciascuno)");
    const now = new Date().toISOString();
    const s: Scatola = {
      id: uuid(),
      codice,
      colore: colore.trim(),
      tipoOggetto: (tipo || "").toUpperCase().slice(0, 3),
      luogoProduzione: (luogo || "").toUpperCase().slice(0, 3),
      progressivo,
      stato: "imballato",
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    onCreate(s);
    setTipo(""); setLuogo(""); setColore(""); setNote("");
    setProgressivo(nextProgressivo([...scatole, s]));
  }

  return (
    <div className="grid gap-3 md:grid-cols-6">
      <div className="md:col-span-2">
        <label className="block text-sm text-gray-600">Tipo oggetto (3 lettere)</label>
        <input className="mt-1 w-full rounded-2xl border p-3 uppercase" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="ES. CAN = candela" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm text-gray-600">Luogo produzione (3 lettere)</label>
        <input className="mt-1 w-full rounded-2xl border p-3 uppercase" value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="ES. SEL = Sella" />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Progressivo</label>
        <input type="number" min={1} max={999} className="mt-1 w-full rounded-2xl border p-3" value={progressivo} onChange={(e) => setProgressivo(parseInt(e.target.value || "1"))} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Colore scatola</label>
        <input className="mt-1 w-full rounded-2xl border p-3" value={colore} onChange={(e) => setColore(e.target.value)} placeholder="es. rosso" />
      </div>
      <div className="md:col-span-6">
        <label className="block text-sm text-gray-600">Note</label>
        <input className="mt-1 w-full rounded-2xl border p-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="dettagli opzionali" />
      </div>
      <div className="md:col-span-6 flex items-center justify-between rounded-2xl bg-anffas-light/10 px-4 py-3">
        <div>
          <div className="text-sm text-gray-600">Codice parlante generato</div>
          <div className="text-xl font-bold tracking-wider">{codice}</div>
        </div>
        <button className="rounded-2xl border px-4 py-2 bg-anffas-blue text-white" onClick={handleAdd}>Aggiungi (stato: imballato)</button>
      </div>
    </div>
  );
}

function nextProgressivo(scatole: Scatola[]) {
  const max = scatole.reduce((acc, s) => Math.max(acc, s.progressivo), 0);
  return Math.min(999, max + 1);
}

function ElencoScatole({ items, onUpdate, onDelete }: {
  items: Scatola[];
  onUpdate: (id: string, patch: Partial<Scatola>) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) return <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow">Nessuna scatola trovata.</div>;
  return (
    <div className="grid gap-4">
      {items.map((s) => <RigaScatola key={s.id} s={s} onUpdate={onUpdate} onDelete={onDelete} />)}
    </div>
  );
}

function StatoBadge({ stato }: { stato: Stato }) {
  const cls = ({
    imballato: "bg-anffas-blue/10 text-anffas-blue",
    spedito: "bg-anffas-light/20 text-anffas-blue",
    arrivato: "bg-yellow-100 text-yellow-800",
    "pronte per la vendita": "bg-emerald-100 text-emerald-800",
    venduta: "bg-anffas-yellow/50 text-anffas-blue",
  } as Record<Stato, string>)[stato] || "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{stato}</span>;
}

function RigaScatola({ s, onUpdate, onDelete }: {
  s: Scatola;
  onUpdate: (id: string, patch: Partial<Scatola>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingVendita, setEditingVendita] = useState(false);

  function advanceStato() {
    const idx = STATI.indexOf(s.stato);
    if (idx < STATI.length - 1) onUpdate(s.id, { stato: STATI[idx + 1] });
  }
  function setStato(stato: Stato) { onUpdate(s.id, { stato }); }

  return (
    <div className="rounded-2xl bg-white p-5 shadow border border-gray-200">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border px-3 py-2 text-lg font-bold tracking-wider">{s.codice}</div>
          {s.colore && <div className="text-sm text-gray-600">Colore: <span className="font-semibold">{s.colore}</span></div>}
          <StatoBadge stato={s.stato} />
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-2xl border px-3 py-2" value={s.stato} onChange={(e) => setStato(e.target.value as Stato)}>
            {STATI.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <button className="rounded-2xl border px-3 py-2 bg-anffas-light/40" onClick={advanceStato}>Avanza stato ▶</button>
          <button className="rounded-2xl border px-3 py-2" onClick={() => onDelete(s.id)}>Elimina</button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Info label="Tipo" value={s.tipoOggetto} />
        <Info label="Luogo" value={s.luogoProduzione} />
        <Info label="Progressivo" value={pad3(s.progressivo)} />
        <Info label="Note" value={s.note || "—"} />
      </div>

      <div className="mt-4 rounded-2xl bg-anffas-light/10 p-3 text-sm text-gray-700">
        <div>Creato: {new Date(s.createdAt).toLocaleString("it-IT")}</div>
        <div>Ultima modifica: {new Date(s.updatedAt).toLocaleString("it-IT")}</div>
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Vendita</div>
          {!editingVendita && s.stato !== "venduta" && (
            <button className="rounded-2xl border px-3 py-1 bg-anffas-blue text-white" onClick={() => setEditingVendita(true)}>
              Registra vendita
            </button>
          )}
        </div>

        {editingVendita && (
          <FormVendita
            onCancel={() => setEditingVendita(false)}
            onSave={(res) => {
              onUpdate(s.id, {
                stato: "venduta",
                prezzoBase: res.prezzoBase as 10 | 20 | 30,
                donazioneLibera: res.donazioneLibera,
                dataVendita: res.dataISO,
              });
              setEditingVendita(false);
            }}
          />
        )}

        {s.stato === "venduta" && (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
            <div className="text-sm">
              Prezzo base: <b>€ {fmtEUR(s.prezzoBase)}</b> — Donazione libera: <b>€ {fmtEUR(s.donazioneLibera)}</b>
            </div>
            <div className="text-sm">
              Totale: <b>€ {fmtEUR((s.prezzoBase || 0) + (s.donazioneLibera || 0))}</b> — Data vendita:{" "}
              <b>{new Date(s.dataVendita || new Date().toISOString()).toLocaleDateString("it-IT")}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function FormVendita({ onSave, onCancel }: {
  onSave: (v: { prezzoBase: number; donazioneLibera: number; dataISO: string }) => void;
  onCancel: () => void;
}) {
  const [prezzoBase, setPrezzoBase] = useState<10 | 20 | 30>(10);
  const [donazioneLibera, setDonazioneLibera] = useState<number>(0);
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0, 10));

  function handleSave() {
    onSave({
      prezzoBase,
      donazioneLibera: Number(donazioneLibera || 0),
      dataISO: new Date(data + "T12:00:00").toISOString(),
    });
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-5">
      <div>
        <label className="block text-sm text-gray-600">Prezzo base</label>
        <select className="mt-1 w-full rounded-2xl border p-2" value={prezzoBase} onChange={(e) => setPrezzoBase(Number(e.target.value) as 10 | 20 | 30)}>
          <option value={10}>€ 10</option>
          <option value={20}>€ 20</option>
          <option value={30}>€ 30</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600">Donazione libera</label>
        <input type="number" min={0} step="1" className="mt-1 w-full rounded-2xl border p-2" value={donazioneLibera} onChange={(e) => setDonazioneLibera(Number(e.target.value || 0))} placeholder="es. 5" />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Data vendita</label>
        <input type="date" className="mt-1 w-full rounded-2xl border p-2" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="flex items-end gap-2 md:col-span-2">
        <button className="rounded-2xl border px-4 py-2 bg-anffas-blue text-white" onClick={handleSave}>Salva vendita</button>
        <button className="rounded-2xl border px-4 py-2" onClick={onSave as any}>Annulla</button>
      </div>
    </div>
  );
}

/* ── Export CSV ─────────────────────────────────────────── */
function exportCSV(rows: Scatola[]) {
  if (!rows.length) return alert("Niente da esportare");
  const headers = [
    "codice","colore","stato","tipoOggetto","luogoProduzione","progressivo",
    "prezzoBase","donazioneLibera","totaleVendita","dataVendita","note","createdAt","updatedAt",
  ];
  const lines = [headers.join(",")];
  for (const s of rows) {
    const row = [
      s.codice,
      s.colore || "",
      s.stato,
      s.tipoOggetto,
      s.luogoProduzione,
      pad3(s.progressivo),
      s.prezzoBase ?? "",
      s.donazioneLibera ?? "",
      (s.prezzoBase || 0) + (s.donazioneLibera || 0),
      s.dataVendita ? new Date(s.dataVendita).toLocaleDateString("it-IT") : "",
      s.note || "",
      new Date(s.createdAt).toLocaleString("it-IT"),
      new Date(s.updatedAt).toLocaleString("it-IT"),
    ].map((v) => `${v}`.replaceAll(",", ";"));
    lines.push(row.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anffas_scatole_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

