import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  Copy,
  Download,
  Folder,
  HardDrive,
  KeyRound,
  LayoutGrid,
  Link,
  LockKeyhole,
  Menu,
  Monitor,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  Upload,
  Vault,
  X,
} from "lucide-react";
import {
  decrypt,
  emptyData,
  encrypt,
  samples,
  validateHost,
  type Credential,
  type Data,
  type Envelope,
  type Host,
} from "./vault";
type Page =
  | "Hosts"
  | "Sessions"
  | "Files"
  | "Vault"
  | "NFC tools"
  | "Diagnostics"
  | "Settings";
const nav = [
  ["Hosts", LayoutGrid],
  ["Sessions", Terminal],
  ["Files", Folder],
  ["Vault", Vault],
  ["NFC tools", Radio],
  ["Diagnostics", Activity],
  ["Settings", Settings],
] as const;
const blankHost = (): Host => ({
  id: crypto.randomUUID(),
  name: "",
  address: "",
  port: 22,
  username: "",
  protocol: "SSH",
  group: "Personal",
  tags: [],
  favorite: false,
  note: "",
});
const storageKey = "prismalink-vault-v1";
function readVault(): Envelope | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      typeof value.version === "number" &&
      typeof value.salt === "string" &&
      typeof value.iv === "string" &&
      typeof value.ciphertext === "string"
    )
      return value;
  } catch {
    /* Preserve unreadable data rather than offering to overwrite it. */
  }
  return { version: 0, salt: "", iv: "", ciphertext: "" };
}
async function download(name: string, content: string) {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: name });
    if (!path) throw Error("Export cancelled.");
    await writeTextFile(path, content);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/octet-stream" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current!;
    const focusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        ),
      ).filter((e) => !e.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose.current();
      if (e.key === "Tab") {
        const list = focusable(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal glass"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [envelope, setEnvelope] = useState<Envelope | null>(readVault);
  const [data, setData] = useState<Data | null>(null);
  const secret = useRef("");
  const sessionEpoch = useRef(0);
  const [demo, setDemo] = useState(false);
  const [page, setPage] = useState<Page>("Hosts");
  const [filter, setFilter] = useState("All hosts");
  const [query, setQuery] = useState("");
  const [host, setHost] = useState<Host | null>(null);
  const [selected, setSelected] = useState<Host | null>(null);
  const [modal, setModal] = useState<"import" | "credential" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [activity, setActivity] = useState<string[]>([]);
  const [importText, setImportText] = useState("");
  const [prefs, setPrefs] = useState(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("prismalink-preferences") || "{}",
      );
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  });
  const [credential, setCredential] = useState<Credential>({
    id: "",
    name: "",
    username: "",
    password: "",
  });
  const [generated, setGenerated] = useState<{
    public_key: string;
    private_key: string;
  } | null>(null);
  const notify = (s: string) => setNotice(s);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const lock = () => {
    sessionEpoch.current++;
    secret.current = "";
    setPage("Hosts");
    setFilter("All hosts");
    setQuery("");
    setActivity([]);
    setMobile(false);
    setData(null);
    setDemo(false);
    setSelected(null);
    setHost(null);
    setModal(null);
    setGenerated(null);
    setCredential({ id: "", name: "", username: "", password: "" });
    setError("");
  };
  useEffect(() => {
    if (!data) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, 300000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [!!data]);
  useEffect(() => {
    document.documentElement.dataset.motion = String(!!prefs.motion);
    document.documentElement.dataset.opaque = String(
      !!prefs.opaque || !!prefs.low,
    );
    document.documentElement.dataset.low = String(!!prefs.low);
    document.documentElement.style.fontSize = prefs.large ? "18px" : "16px";
    try {
      localStorage.setItem("prismalink-preferences", JSON.stringify(prefs));
    } catch {
      /* Demo remains usable when storage is unavailable. */
    }
  }, [prefs]);
  async function persist(next: Data) {
    if (demo) {
      setData(next);
      return;
    }
    const epoch = sessionEpoch.current;
    const encrypted = await encrypt(next, secret.current);
    if (epoch !== sessionEpoch.current) return;
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    setEnvelope(encrypted);
    setData(next);
  }
  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget),
      password = String(fields.get("password"));
    try {
      if (envelope) {
        setData(await decrypt(envelope, password));
        secret.current = password;
      } else {
        if (password !== fields.get("confirm"))
          throw Error("Passwords do not match.");
        const encrypted = await encrypt(emptyData(), password);
        localStorage.setItem(storageKey, JSON.stringify(encrypted));
        secret.current = password;
        setEnvelope(encrypted);
        setData(emptyData());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveHost(e: FormEvent) {
    e.preventDefault();
    if (!host || !data) return;
    setBusy(true);
    setError("");
    try {
      validateHost(host);
      await persist({
        ...data,
        hosts: data.hosts.some((h) => h.id === host.id)
          ? data.hosts.map((h) => (h.id === host.id ? host : h))
          : [...data.hosts, host],
      });
      setHost(null);
      notify("Host saved securely.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function probe(h: Host) {
    if (!isTauri()) {
      notify("Network diagnostics require the installed native app.");
      return;
    }
    setBusy(true);
    try {
      const result = await invoke<string>("probe", {
        address: h.address,
        port: h.port,
      });
      setActivity((a) => [
        `${new Date().toLocaleTimeString()} · ${h.name}: ${result}`,
        ...a,
      ]);
      notify(result);
    } catch (e) {
      setActivity((a) => [`${h.name}: ${String(e)}`, ...a]);
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  const closeHost = () => {
    setHost(null);
    setError("");
  };
  const groups = [...new Set(data?.hosts.map((h) => h.group) || [])].sort();
  const shown =
    data?.hosts.filter(
      (h) =>
        (filter === "All hosts" ||
          (filter === "Favorites" && h.favorite) ||
          h.group === filter) &&
        `${h.name} ${h.address} ${h.tags.join(" ")} ${h.group}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  if (!data)
    return (
      <main className="welcome">
        <div className="welcome-copy">
          <a className="brand" href="#">
            <span className="brand-mark">
              <Link size={26} />
            </span>
            PrismaLink<span className="alpha">ALPHA</span>
          </a>
          <div className="eyebrow">
            <span className="dot" /> ONE SPACE. EVERY CONNECTION.
          </div>
          <h1>
            Your world.
            <br />
            Within reach.
          </h1>
          <p>
            A quieter home for your hosts, keys, and connections.
            <br />
            Private by design. Yours to control.
          </p>
          <div className="welcome-art">
            <div className="orbit one" />
            <div className="orbit two" />
            <span className="art-node n1">
              <Terminal />
            </span>
            <span className="art-node n2">
              <Monitor />
            </span>
            <span className="art-node n3">
              <Folder />
            </span>
            <span className="art-center">
              <Link size={48} />
            </span>
            <span className="art-label">
              <ShieldCheck size={14} /> Encrypted. On your device.
            </span>
          </div>
          <footer>Built for the way you connect.</footer>
        </div>
        <section className="unlock glass">
          <span className="vault-emblem">
            <LockKeyhole size={28} />
          </span>
          <h2>{envelope ? "Welcome back." : "Make yourself at home."}</h2>
          <p>
            {envelope
              ? "Unlock your private workspace."
              : "Start with a private, encrypted vault."}
          </p>
          {envelope && envelope.version !== 1 && (
            <p className="error" role="alert">
              Stored vault data is unreadable or from an unsupported version. It
              has been preserved. Restore a known backup in a fresh app profile;
              do not clear app data until you have a recovery copy.
            </p>
          )}
          <form onSubmit={unlock}>
            <label>
              Master password
              <input
                name="password"
                type="password"
                autoComplete={envelope ? "current-password" : "new-password"}
                minLength={12}
                required
                placeholder={
                  envelope
                    ? "Enter your master password"
                    : "At least 12 characters"
                }
              />
            </label>
            {!envelope && (
              <label>
                Confirm password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  placeholder="One more time"
                />
              </label>
            )}
            <p className="hint">
              Your password stays on this device. There is no password recovery.
              Keep an encrypted backup somewhere safe.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="primary wide"
              disabled={busy || (!!envelope && envelope.version !== 1)}
            >
              {busy
                ? "Securing your workspace…"
                : envelope
                  ? "Unlock workspace"
                  : "Create my vault"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="or">
            <span />
            OR TAKE A LOOK AROUND
            <span />
          </div>
          <button
            className="secondary wide"
            onClick={() => {
              setData(structuredClone(samples));
              setDemo(true);
              setError("");
            }}
          >
            Explore demo workspace
            <ArrowUpRight size={16} />
          </button>
          <div className="trust">
            <ShieldCheck size={14} /> AES-256-GCM encryption <span>·</span>{" "}
            Local-first
          </div>
        </section>
        <div className="welcome-version">PrismaLink / 0.1.0-alpha.2</div>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className={`sidebar glass ${mobile ? "open" : ""}`}>
        <a className="brand" href="#" onClick={() => setPage("Hosts")}>
          <span className="brand-mark">
            <Link size={24} />
          </span>
          PrismaLink
        </a>
        <div className="workspace">
          <span className="avatar">P</span>
          <div>
            <strong>Personal workspace</strong>
            <small>
              {demo ? "Demo · changes are temporary" : "Local encrypted vault"}
            </small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => {
                setPage(name);
                setMobile(false);
                setError("");
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Hosts" && (
                <span className="count">{data.hosts.length}</span>
              )}
              {name === "Sessions" && <span className="nav-soon">0</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label groups-label">YOUR GROUPS</div>
        <div className="group-list">
          {groups.map((g, i) => (
            <button
              key={g}
              onClick={() => {
                setPage("Hosts");
                setFilter(g);
                setMobile(false);
              }}
            >
              <span className={`group-dot g${i % 3}`} />
              {g}
              <span>{data.hosts.filter((h) => h.group === g).length}</span>
            </button>
          ))}
          {!groups.length && (
            <p className="hint">Groups appear when you add hosts.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-status">
            <ShieldCheck size={17} />
            <div>
              <strong>
                {demo ? "Demo workspace" : "Your vault is protected"}
              </strong>
              <small>
                {demo ? "No live connections" : "Encrypted on this device"}
              </small>
            </div>
            <span className="dot" />
          </div>
          <button className="lock-button" onClick={lock}>
            <LockKeyhole size={16} />
            {demo ? "Exit demo" : "Lock workspace"}
            <span>↗</span>
          </button>
          <small className="build-label">
            PRISMALINK <span>v0.1.0-alpha.2</span>
          </small>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="private-badge">
              <ShieldCheck size={14} />
              {demo ? "Demo mode" : "Local & private"}
            </span>
            <button
              className="icon"
              aria-label="Open settings"
              onClick={() => setPage("Settings")}
            >
              <Settings size={18} />
            </button>
            <span className="profile">P</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR CONNECTIONS, SIMPLIFIED</div>
              <h1>
                {page === "Hosts"
                  ? "A place for every host."
                  : page === "Vault"
                    ? "Keep your secrets close."
                    : page === "Files"
                      ? "Move with confidence."
                      : page === "Sessions"
                        ? "Room to do your best work."
                        : page === "Settings"
                          ? "Make it feel like you."
                          : page === "Diagnostics"
                            ? "A clearer connection."
                            : "A connection, one tap away."}
              </h1>
              <p>
                {page === "Hosts"
                  ? "From your homelab to production. Everything, a little closer."
                  : page === "Vault"
                    ? "Credentials stay encrypted, right here on your device."
                    : page === "Settings"
                      ? "A comfortable workspace, on your terms."
                      : "Your tools, together in one private workspace."}
              </p>
            </div>
            {page === "Hosts" && (
              <button
                className="primary"
                onClick={() => {
                  setError("");
                  setHost(blankHost());
                }}
              >
                <Plus size={18} />
                Add host
              </button>
            )}
            {page === "Vault" && (
              <button
                className="primary"
                onClick={() => {
                  setCredential({
                    id: crypto.randomUUID(),
                    name: "",
                    username: "",
                    password: "",
                  });
                  setModal("credential");
                  setError("");
                }}
              >
                <Plus size={18} />
                Add credential
              </button>
            )}
          </div>
          {demo && (
            <div className="demo-banner">
              <Sparkles size={16} />
              <span>
                You're exploring a demo. Hosts are examples and changes aren't
                saved.
              </span>
              <button onClick={lock}>
                Create your vault
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {error && !host && !modal && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {page === "Hosts" && (
            <>
              <section className="overview">
                <div className="overview-card glass">
                  <span className="stat-icon violet">
                    <HardDrive size={20} />
                  </span>
                  <div>
                    <span>Total hosts</span>
                    <strong>
                      {data.hosts.length}
                      <small>in your workspace</small>
                    </strong>
                  </div>
                  <span className="tiny-chart">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="overview-card glass">
                  <span className="stat-icon lime">
                    <Star size={20} />
                  </span>
                  <div>
                    <span>Favorites</span>
                    <strong>
                      {data.hosts.filter((h) => h.favorite).length}
                      <small>just a click away</small>
                    </strong>
                  </div>
                </div>
                <div className="overview-card glass">
                  <span className="stat-icon neutral">
                    <Folder size={20} />
                  </span>
                  <div>
                    <span>Host groups</span>
                    <strong>
                      {groups.length}
                      <small>organized your way</small>
                    </strong>
                  </div>
                </div>
              </section>
              <section className="hosts-section">
                <div className="section-heading">
                  <div className="tabs">
                    {["All hosts", "Favorites"].map((t) => (
                      <button
                        key={t}
                        className={filter === t ? "selected" : ""}
                        onClick={() => setFilter(t)}
                      >
                        {t === "Favorites" && <Star size={15} />} {t}
                        <span>
                          {t === "All hosts"
                            ? data.hosts.length
                            : data.hosts.filter((h) => h.favorite).length}
                        </span>
                      </button>
                    ))}
                    {!["All hosts", "Favorites"].includes(filter) && (
                      <button
                        className="selected"
                        onClick={() => setFilter("All hosts")}
                      >
                        {filter}
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="view-tools">
                    <button
                      className="text-button"
                      onClick={() => {
                        setModal("import");
                        setImportText("");
                        setError("");
                      }}
                    >
                      <ArrowLeftRight size={15} />
                      Import / export
                    </button>
                  </div>
                </div>
                <div className="filter-bar">
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search hosts"
                      placeholder="Search hosts, addresses, or tags…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <label className="group-select">
                    <Folder size={15} />
                    <select
                      aria-label="Filter by group"
                      value={groups.includes(filter) ? filter : ""}
                      onChange={(e) => setFilter(e.target.value || "All hosts")}
                    >
                      <option value="">All groups</option>
                      {groups.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <span className="results">{shown.length} hosts</span>
                </div>
                <div className="host-grid">
                  {shown.map((h) => (
                    <article className="host-card glass" key={h.id}>
                      <div className="card-top">
                        <span
                          className={`protocol-icon ${h.protocol.toLowerCase()}`}
                        >
                          {h.protocol === "SSH" ? (
                            <Terminal size={23} />
                          ) : h.protocol === "SFTP" ? (
                            <Folder size={23} />
                          ) : (
                            <Monitor size={23} />
                          )}
                        </span>
                        <span className="protocol-label">{h.protocol}</span>
                        <button
                          className={`icon favorite ${h.favorite ? "is-favorite" : ""}`}
                          aria-label={`${h.favorite ? "Unfavorite" : "Favorite"} ${h.name}`}
                          onClick={() =>
                            mutate(() =>
                              persist({
                                ...data,
                                hosts: data.hosts.map((x) =>
                                  x.id === h.id
                                    ? { ...x, favorite: !x.favorite }
                                    : x,
                                ),
                              }),
                            )
                          }
                          disabled={busy}
                        >
                          <Star
                            size={17}
                            fill={h.favorite ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                      <button
                        className="host-name"
                        onClick={() => setSelected(h)}
                      >
                        {h.name}
                        <ArrowUpRight size={16} />
                      </button>
                      <p className="host-address">
                        {h.username && `${h.username}@`}
                        {h.address}
                      </p>
                      <div className="tags">
                        <span className="group-tag">{h.group}</span>
                        {h.tags.slice(0, 2).map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                      <div className="card-footer">
                        <span>
                          <span className="status-dot" />
                          Saved host
                        </span>
                        <button
                          aria-label={`Open ${h.name}`}
                          onClick={() => setSelected(h)}
                        >
                          Open
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                  <button
                    className="add-card"
                    onClick={() => setHost(blankHost())}
                  >
                    <span>
                      <Plus size={23} />
                    </span>
                    <strong>Add a new host</strong>
                    <small>Your next connection starts here</small>
                  </button>
                </div>
                {!shown.length && data.hosts.length > 0 && (
                  <p className="hint">
                    No matching hosts. Try another search or group.
                  </p>
                )}
              </section>
              <div className="tip">
                <span className="tip-icon">
                  <Command size={17} />
                </span>
                <div>
                  <strong>A little more organized.</strong>
                  <span>
                    Use groups and tags to keep your connections feeling
                    effortless.
                  </span>
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("Settings")}
                >
                  Make it yours
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          )}
          {page === "Vault" && (
            <>
              <div className="info-banner">
                <ShieldCheck size={20} />
                <p>
                  AES-256-GCM encryption with a unique salt and nonce on every
                  save. Your workspace locks after 5 minutes of inactivity.
                </p>
              </div>
              <div className="host-grid">
                {data.credentials.map((c) => (
                  <article key={c.id} className="host-card glass">
                    <KeyRound className="lime-text" />
                    <h3>{c.name}</h3>
                    <p className="host-address">{c.username}</p>
                    <p>••••••••••••</p>
                    <div className="card-footer">
                      <button
                        onClick={() =>
                          mutate(async () => {
                            await navigator.clipboard.writeText(c.password);
                            notify(
                              "Password copied. Clear your clipboard when finished.",
                            );
                          })
                        }
                      >
                        <Copy size={14} />
                        Copy password
                      </button>
                      <button
                        aria-label={`Delete ${c.name}`}
                        onClick={() => {
                          if (confirm("Permanently delete this credential?"))
                            mutate(() =>
                              persist({
                                ...data,
                                credentials: data.credentials.filter(
                                  (x) => x.id !== c.id,
                                ),
                              }),
                            );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!data.credentials.length && (
                <div className="empty glass">
                  <KeyRound size={36} />
                  <h2>Your secrets have a safe place.</h2>
                  <p>Add your first credential to your encrypted vault.</p>
                </div>
              )}
              <section className="settings-panel glass">
                <h2>SSH key generator</h2>
                <p>
                  Create an Ed25519 key pair using the native app. Private keys
                  are never sent to a server. Download and protect the key
                  before closing this view.
                </p>
                <button
                  className="secondary"
                  disabled={!isTauri() || busy}
                  onClick={() =>
                    mutate(async () => {
                      setGenerated(await invoke("generate_key"));
                    })
                  }
                >
                  <KeyRound size={16} />
                  Generate Ed25519 key
                </button>
                {!isTauri() && (
                  <p className="hint">Available in the installed native app.</p>
                )}
                {generated && (
                  <>
                    <label>
                      Public key
                      <textarea readOnly value={generated.public_key} />
                    </label>
                    <button
                      className="secondary"
                      onClick={() =>
                        mutate(() =>
                          download("prismalink_ed25519", generated.private_key),
                        )
                      }
                    >
                      <Download size={16} />
                      Download private key (unencrypted)
                    </button>
                    <p className="hint">
                      Set private key permissions to owner-only. This download
                      is not password-protected.
                    </p>
                  </>
                )}
              </section>
            </>
          )}
          {page === "Settings" && (
            <section className="settings-panel glass">
              <h2>Comfort & accessibility</h2>
              <p>
                Choose how PrismaLink looks and moves. System reduced-motion
                preferences are always respected.
              </p>
              {[
                [
                  "motion",
                  "Reduce motion",
                  "Keep transitions simple and immediate.",
                ],
                [
                  "opaque",
                  "Reduce transparency",
                  "Use solid surfaces for a clearer view.",
                ],
                [
                  "low",
                  "Low-effects mode",
                  "Turn off blur, gradients, and decorative shadows.",
                ],
                [
                  "large",
                  "Larger text",
                  "Give your workspace a little breathing room.",
                ],
              ].map(([key, title, desc]) => (
                <label className="setting-row" key={key}>
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!prefs[key]}
                    onChange={(e) =>
                      setPrefs({ ...prefs, [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
              <h2 className="section-space">About this alpha</h2>
              <p>
                PrismaLink 0.1.0-alpha.2. Host library, encrypted vault,
                backups, native TCP diagnostics, and key generation. SSH
                sessions, SFTP, remote desktop, and NFC are planned; protocol
                labels organize hosts and do not imply connection support.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setModal("import");
                  setImportText("");
                }}
              >
                Backup & restore
                <ArrowUpRight size={16} />
              </button>
            </section>
          )}
          {page === "Diagnostics" && (
            <section className="settings-panel glass">
              <h2>Connection reachability</h2>
              <p>
                Check DNS resolution and a TCP handshake. A successful check
                does not authenticate or verify a protocol or server identity.
              </p>
              {data.hosts.map((h) => (
                <div className="diagnostic-row" key={h.id}>
                  <span>
                    <strong>{h.name}</strong>
                    <small>
                      {h.address}:{h.port}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    disabled={busy || demo}
                    onClick={() => probe(h)}
                  >
                    <Activity size={15} />
                    Check
                  </button>
                </div>
              ))}
              {!data.hosts.length && (
                <p>Add a host to run a reachability check.</p>
              )}
              <h3>Results</h3>
              <pre className="terminal">
                {activity.join("\n") || "No checks run in this session."}
              </pre>
            </section>
          )}
          {["Sessions", "Files", "NFC tools"].includes(page) && (
            <section className="empty glass">
              {page === "Sessions" ? (
                <Terminal size={40} />
              ) : page === "Files" ? (
                <ArrowLeftRight size={40} />
              ) : (
                <Radio size={40} />
              )}
              <span className="planned">PLANNED CAPABILITY</span>
              <h2>
                {page === "Sessions"
                  ? "A workspace for what’s next."
                  : page === "Files"
                    ? "Your files, side by side."
                    : "Less typing. More connecting."}
              </h2>
              <p>
                {page === "Sessions"
                  ? "Interactive SSH, VNC, and RDP sessions are not available in this alpha. Your saved hosts are ready for a future connection engine."
                  : page === "Files"
                    ? "Two-pane SFTP browsing and transfer queues are not implemented yet. No files are transferred by this version."
                    : "NFC reading, writing, and capacity checks require a native adapter that is not implemented in this version."}
              </p>
              <button className="secondary" onClick={() => setPage("Hosts")}>
                Back to hosts
                <ArrowRight size={16} />
              </button>
            </section>
          )}
          <footer className="content-footer">
            <span>
              <span className="status-dot" />
              {demo
                ? "Demo data · no active connections"
                : "Local workspace · encrypted at rest"}
            </span>
            <span>
              Less friction. More connection.
              <Link size={13} />
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast glass" role="status">
          <Check size={17} />
          {notice}
          <button
            className="icon"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {host && (
        <Modal
          title={
            data.hosts.some((h) => h.id === host.id)
              ? "Edit host"
              : "A new connection"
          }
          close={closeHost}
        >
          <form onSubmit={saveHost}>
            <div className="form-grid">
              <label className="full">
                Host name
                <input
                  required
                  maxLength={120}
                  value={host.name}
                  onChange={(e) => setHost({ ...host, name: e.target.value })}
                  placeholder="e.g. Production gateway"
                />
              </label>
              <label>
                Protocol
                <select
                  value={host.protocol}
                  onChange={(e) => {
                    const p = e.target.value as Host["protocol"];
                    setHost({
                      ...host,
                      protocol: p,
                      port: p === "RDP" ? 3389 : p === "VNC" ? 5900 : 22,
                    });
                  }}
                >
                  {["SSH", "SFTP", "RDP", "VNC"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Port
                <input
                  type="number"
                  min={1}
                  max={65535}
                  required
                  value={host.port}
                  onChange={(e) =>
                    setHost({ ...host, port: Number(e.target.value) })
                  }
                />
              </label>
              <label className="full">
                Hostname or IP
                <input
                  required
                  value={host.address}
                  onChange={(e) =>
                    setHost({ ...host, address: e.target.value })
                  }
                  placeholder="server.example.com"
                />
              </label>
              <label>
                Username
                <input
                  value={host.username}
                  onChange={(e) =>
                    setHost({ ...host, username: e.target.value })
                  }
                  autoComplete="off"
                />
              </label>
              <label>
                Group
                <input
                  required
                  value={host.group}
                  onChange={(e) => setHost({ ...host, group: e.target.value })}
                  list="groups"
                />
                <datalist id="groups">
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </datalist>
              </label>
              <label className="full">
                Tags (comma-separated)
                <input
                  value={host.tags.join(",")}
                  onChange={(e) =>
                    setHost({
                      ...host,
                      tags: [
                        ...new Set(
                          e.target.value.split(",").map((t) => t.trim()),
                        ),
                      ],
                    })
                  }
                  placeholder="linux, production"
                />
              </label>
              <label className="full">
                Notes
                <textarea
                  value={host.note}
                  onChange={(e) => setHost({ ...host, note: e.target.value })}
                />
              </label>
            </div>
            <p className="hint">
              Host organization only. Protocol sessions are not included in this
              alpha.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeHost}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save host"}
                <Check size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.name} close={() => setSelected(null)}>
          <div className="host-details">
            <span className="protocol-icon">
              <Terminal />
            </span>
            <p className="host-address">
              {selected.username}@{selected.address}:{selected.port}
            </p>
            <div className="detail-row">
              <span>Protocol</span>
              <strong>{selected.protocol}</strong>
            </div>
            <div className="detail-row">
              <span>Group</span>
              <strong>{selected.group}</strong>
            </div>
            <p>{selected.note || "No notes added."}</p>
            <div className="info-banner">
              <ShieldCheck size={18} />
              <p>
                Saved securely. Protocol connections are not implemented in this
                alpha.
              </p>
            </div>
            <button
              className="secondary wide"
              disabled={busy || demo}
              onClick={() => probe(selected)}
            >
              <Activity size={16} />
              Check TCP reachability
            </button>
          </div>
          <div className="modal-actions">
            <button
              className="danger icon"
              aria-label="Delete host"
              onClick={() => {
                if (confirm("Permanently delete this host?"))
                  mutate(async () => {
                    await persist({
                      ...data,
                      hosts: data.hosts.filter((h) => h.id !== selected.id),
                    });
                    setSelected(null);
                  });
              }}
            >
              <Trash2 size={18} />
            </button>
            <button
              className="primary"
              onClick={() => {
                setHost({ ...selected });
                setSelected(null);
                setError("");
              }}
            >
              Edit host
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "credential" && (
        <Modal
          title="Add a credential"
          close={() => {
            setModal(null);
            setError("");
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate(async () => {
                await persist({
                  ...data,
                  credentials: [...data.credentials, credential],
                });
                setModal(null);
                setCredential({ id: "", name: "", username: "", password: "" });
              });
            }}
          >
            <label>
              Name
              <input
                required
                value={credential.name}
                onChange={(e) =>
                  setCredential({ ...credential, name: e.target.value })
                }
              />
            </label>
            <label>
              Username
              <input
                autoComplete="off"
                value={credential.username}
                onChange={(e) =>
                  setCredential({ ...credential, username: e.target.value })
                }
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                autoComplete="new-password"
                value={credential.password}
                onChange={(e) =>
                  setCredential({ ...credential, password: e.target.value })
                }
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="primary" disabled={busy}>
                Save credential
                <ShieldCheck size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "import" && (
        <Modal
          title="Backup & restore"
          close={() => {
            setModal(null);
            setError("");
          }}
        >
          <p className="hint">
            Export an encrypted backup of your whole vault. Restoring replaces
            all hosts and credentials after password verification. Demo backups
            are unavailable.
          </p>
          <button
            className="secondary wide"
            disabled={demo || busy}
            onClick={() =>
              mutate(async () => {
                await download(
                  "prismalink-vault.json",
                  JSON.stringify(await encrypt(data, secret.current)),
                );
                notify("Encrypted backup downloaded.");
              })
            }
          >
            <ArrowDownToLine size={16} />
            Export encrypted vault
          </button>
          <div className="divider" />
          <label>
            Choose encrypted backup
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 10_000_000) {
                    setError("Backup exceeds 10 MB.");
                    return;
                  }
                  f.text()
                    .then(setImportText)
                    .catch(() => setError("Could not read backup."));
                }
              }}
            />
          </label>
          <p className="hint">
            {importText
              ? `${(importText.length / 1024).toFixed(1)} KB selected. Verify before replacing your vault.`
              : "No backup selected."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const password = String(
                new FormData(e.currentTarget).get("backupPassword"),
              );
              mutate(async () => {
                const restored = await decrypt(
                  JSON.parse(importText),
                  password,
                );
                if (
                  confirm(
                    `Replace your vault with ${restored.hosts.length} hosts and ${restored.credentials.length} credentials? Export a backup first.`,
                  )
                ) {
                  await persist(restored);
                  setModal(null);
                  setImportText("");
                  notify(
                    "Vault restored. Your current master password is unchanged.",
                  );
                }
              });
            }}
          >
            <label>
              Backup password
              <input
                name="backupPassword"
                type="password"
                autoComplete="off"
                required
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="primary wide"
              disabled={!importText || demo || busy}
            >
              <Upload size={16} />
              Verify & restore
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
