import { useState, useEffect } from "react";

const CATEGORIES = ["World", "Politics", "Business", "Technology", "Science", "Health", "Sports", "Culture"];
const NEWS_SOURCES = ["BBC News", "Al Jazeera", "Reuters", "AP News", "The Guardian", "CNN", "Bloomberg", "DW News"];
const CAT_IMAGES = {
  World: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=900&q=80",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
  Business: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
  Science: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900&q=80",
  Health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
  Culture: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&q=80",
};
const EXTRA = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&q=80",
  "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=900&q=80",
];

const GEMINI_KEY = "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";
const ADMIN_PASSWORD = "orbis2026";

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function getImg(cat, id) {
  return id % 3 === 0 ? EXTRA[id % EXTRA.length] : (CAT_IMAGES[cat] || EXTRA[0]);
}

export default function OrbisDaily() {
  const [articles, setArticles] = useState([]);
  const [activeCat, setActiveCat] = useState("World");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("home"); // home | admin | login
  const [adminPass, setAdminPass] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("article"); // article | video
  const [form, setForm] = useState({
    title: "", subtitle: "", summary: "", content: "",
    category: "World", source: "OrbisDaily", reporter: "",
    location: "", tags: "", breaking: false, videoUrl: "", imageUrl: "", type: "article"
  });

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchNews = async (category, count = 4) => {
    setLoading(true);
    try {
      const prompt = `Generate ${count} international news articles for category: "${category}". Today is April 2026. Sources from: ${NEWS_SOURCES.join(", ")}. Return ONLY JSON array no markdown: [{"title":"headline","subtitle":"subheadline","summary":"2 sentence summary","content":"200 word article","source":"source name","reporter":"Full Name","location":"City, Country","region":"region","publishedAt":"2026-04-23T10:00:00Z","breaking":false,"exclusive":false,"tags":["tag1","tag2","tag3"],"readTime":3}]`;
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GEMINI_KEY}`
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
              { role: "system", content: "You are a senior international journalist. Always respond with valid JSON only, no markdown." },
              { role: "user", content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 2000
          })
        }
      );
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const withMeta = parsed.map((a, i) => ({
        ...a, id: Date.now() + i + Math.random(),
        category, type: "article",
        image: getImg(category, i + Date.now()),
      }));
      setArticles(prev => [...withMeta, ...prev.filter(a => a.category !== category)]);
      showToast(`✓ ${count} ${category} stories loaded`);
    } catch (e) { showToast("Failed to fetch news", "err"); }
    setLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) { setIsAdmin(true); setView("admin"); showToast("✓ Admin access granted"); }
    else showToast("Wrong password!", "err");
  };

  const handlePostArticle = () => {
    if (!form.title || !form.content) { showToast("Title and content required!", "err"); return; }
    const newArticle = {
      ...form,
      id: Date.now() + Math.random(),
      publishedAt: new Date().toISOString(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      image: form.imageUrl || getImg(form.category, Date.now()),
      type: adminTab,
      breaking: form.breaking,
      readTime: Math.ceil(form.content.split(" ").length / 200) + 1,
    };
    setArticles(prev => [newArticle, ...prev]);
    setForm({ title: "", subtitle: "", summary: "", content: "", category: "World", source: "OrbisDaily", reporter: "", location: "", tags: "", breaking: false, videoUrl: "", imageUrl: "", type: "article" });
    showToast("✓ Article published successfully!");
    setView("home");
  };

  useEffect(() => { fetchNews("World", 4); }, []);

  const filtered = articles.filter(a => {
    const mc = activeCat === "All" || a.category === activeCat;
    const ms = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  const breaking = articles.filter(a => a.breaking);
  const featured = filtered[0];
  const grid = filtered.slice(1);

  const green = "#006a4e"; const red = "#c0392b"; const cream = "#faf7f2";
  const gold = "#b8960c"; const dark = "#1a0a00";

  // LOGIN VIEW
  if (view === "login") return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
      <div style={{ background: "#fff", padding: 40, borderRadius: 12, width: 360, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: dark, marginBottom: 6 }}>Orbis<span style={{ color: red }}>Daily</span></div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 28, letterSpacing: 2 }}>ADMIN ACCESS</div>
        <input type="password" placeholder="Admin Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
          style={{ width: "100%", padding: "12px 16px", border: "2px solid #ddd", borderRadius: 6, fontSize: 14, marginBottom: 14, outline: "none", fontFamily: "monospace" }} />
        <button onClick={handleAdminLogin}
          style={{ width: "100%", background: dark, color: "#fff", border: "none", padding: "13px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
          Login
        </button>
        <button onClick={() => setView("home")} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>← Back to site</button>
      </div>
    </div>
  );

  // ADMIN VIEW
  if (view === "admin") return (
    <div style={{ minHeight: "100vh", background: "#f0ece4", fontFamily: "'Georgia', serif" }}>
      <style>{`* { box-sizing: border-box; } input, textarea, select { font-family: inherit; }`}</style>

      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "err" ? red : green, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 13 }}>{toast.msg}</div>}

      {/* Admin Header */}
      <div style={{ background: dark, color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Orbis<span style={{ color: red }}>Daily</span> <span style={{ color: "#888", fontSize: 14 }}>Admin Panel</span></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setView("home")} style={{ background: "transparent", border: "1px solid #555", color: "#ccc", padding: "8px 16px", cursor: "pointer", borderRadius: 4, fontSize: 12 }}>← View Site</button>
          <button onClick={() => { setIsAdmin(false); setView("home"); }} style={{ background: red, border: "none", color: "#fff", padding: "8px 16px", cursor: "pointer", borderRadius: 4, fontSize: 12 }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "32px auto", padding: "0 24px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { l: "Total Articles", v: articles.filter(a => a.type !== "video").length, c: dark },
            { l: "Videos", v: articles.filter(a => a.type === "video").length, c: "#1a3a6c" },
            { l: "Breaking News", v: breaking.length, c: red },
            { l: "AI Generated", v: articles.filter(a => a.source !== "OrbisDaily").length, c: green },
          ].map(s => (
            <div key={s.l} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "16px 20px", borderTop: `4px solid ${s.c}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Post Form */}
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ display: "flex", borderBottom: "2px solid #ddd" }}>
            {["article", "video"].map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)}
                style={{ flex: 1, padding: "14px", background: adminTab === tab ? dark : "transparent", color: adminTab === tab ? "#fff" : "#666", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {tab === "article" ? "✍️ Write Article" : "🎥 Post Video"}
              </button>
            ))}
          </div>

          <div style={{ padding: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>TITLE *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article headline..."
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>CATEGORY</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>SUBTITLE</label>
              <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="One line subheadline..."
                style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>SUMMARY</label>
              <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Brief 2-3 sentence summary..." rows={2}
                style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none", resize: "vertical" }} />
            </div>

            {adminTab === "article" ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>FULL ARTICLE *</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your full article here..." rows={8}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.7 }} />
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>VIDEO URL (YouTube/Vimeo)</label>
                <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/embed/..."
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>REPORTER</label>
                <input value={form.reporter} onChange={e => setForm({ ...form, reporter: e.target.value })} placeholder="Your name"
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>LOCATION</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, Country"
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>TAGS (comma separated)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="politics, world, news"
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>IMAGE URL (optional)</label>
              <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://... (leave blank for auto)"
                style={{ width: "100%", padding: "10px 14px", border: "2px solid #eee", borderRadius: 4, fontSize: 14, outline: "none" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={form.breaking} onChange={e => setForm({ ...form, breaking: e.target.checked })} />
                <span style={{ fontWeight: 600, color: red }}>⚡ Mark as Breaking News</span>
              </label>
            </div>

            <button onClick={handlePostArticle}
              style={{ background: dark, color: "#fff", border: "none", padding: "14px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", borderRadius: 4, letterSpacing: 1 }}>
              {adminTab === "article" ? "✍️ PUBLISH ARTICLE" : "🎥 POST VIDEO"}
            </button>
          </div>
        </div>

        {/* AI Fetch */}
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #ddd" }}>🤖 AI News Fetcher</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => fetchNews(cat, 3)} disabled={loading}
                style={{ background: "#f0ece4", border: "1px solid #ddd", padding: "10px", cursor: loading ? "not-allowed" : "pointer", fontSize: 12, borderRadius: 4, fontWeight: 600, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = dark; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f0ece4"; e.currentTarget.style.color = dark; }}>
                {loading ? "..." : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Published Articles */}
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #ddd" }}>📰 Published Content ({articles.length})</div>
          {articles.slice(0, 10).map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0ece4" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.type === "video" ? "🎥" : "📰"} {a.title}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{a.category} · {a.source} · {timeAgo(a.publishedAt)}</div>
              </div>
              <button onClick={() => setArticles(prev => prev.filter(x => x.id !== a.id))}
                style={{ background: "transparent", border: "1px solid #ddd", color: red, padding: "4px 10px", cursor: "pointer", fontSize: 11, borderRadius: 3 }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // MAIN SITE VIEW
  return (
    <div style={{ minHeight: "100vh", background: cream, fontFamily: "'Palatino Linotype', Georgia, serif", color: dark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Source+Serif+4:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hov { transition: transform 0.22s, box-shadow 0.22s; cursor: pointer; }
        .hov:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,0,0,0.11); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ticker { from { transform:translateX(100%); } to { transform:translateX(-100%); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .fade { animation: fadeUp 0.35s ease forwards; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:${dark}; }
      `}</style>

      {toast && <div style={{ position: "fixed", top: 18, right: 18, zIndex: 9999, background: toast.type === "err" ? red : green, color: "#fff", padding: "11px 18px", fontSize: 13, borderRadius: 3, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", animation: "fadeUp 0.3s ease" }}>{toast.msg}</div>}

      {/* Breaking Ticker */}
      {breaking.length > 0 && (
        <div style={{ background: red, color: "#fff", display: "flex", alignItems: "center", overflow: "hidden", padding: "6px 0" }}>
          <div style={{ background: "#8b0000", padding: "0 14px", fontSize: 11, fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>BREAKING</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ animation: "ticker 32s linear infinite", whiteSpace: "nowrap", fontSize: 12, padding: "0 12px" }}>
              {breaking.map(a => `  ◆  ${a.title}  —  ${a.source}`).join("")}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: `4px solid ${dark}` }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #e8e0d5", fontSize: 11, color: "#888" }}>
            <span>Thursday, April 23, 2026</span>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {["Subscribe", "Newsletter", "About"].map(i => (
                <span key={i} style={{ cursor: "pointer", color: "#666" }}>{i}</span>
              ))}
              <span onClick={() => isAdmin ? setView("admin") : setView("login")}
                style={{ cursor: "pointer", color: isAdmin ? green : red, fontWeight: 700, border: `1px solid ${isAdmin ? green : red}`, padding: "3px 10px", borderRadius: 3 }}>
                {isAdmin ? "⚙️ Admin" : "🔐 Admin Login"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 12px" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: dark, lineHeight: 1, letterSpacing: "-2px" }}>
                Orbis<span style={{ color: red }}>Daily</span>
              </div>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 3, marginTop: 2 }}>INTERNATIONAL NEWS</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {searchOpen ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories..."
                    style={{ border: `2px solid ${dark}`, padding: "8px 12px", fontSize: 13, width: 220, outline: "none" }} />
                  <button onClick={() => { setSearchOpen(false); setSearch(""); }} style={{ background: dark, color: "#fff", border: "none", padding: "8px 12px", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setSearchOpen(true)} style={{ background: "transparent", border: `2px solid ${dark}`, padding: "8px 14px", cursor: "pointer", fontSize: 12 }}>🔍 Search</button>
              )}
              <button onClick={() => fetchNews(activeCat, 4)} disabled={loading}
                style={{ background: loading ? "#888" : red, color: "#fff", border: "none", padding: "9px 16px", cursor: loading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700 }}>
                {loading ? "Loading..." : "🤖 AI Fetch"}
              </button>
            </div>
          </div>

          <nav style={{ display: "flex", borderTop: `3px solid ${dark}`, overflowX: "auto" }}>
            {["All", ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => { setActiveCat(cat); if (cat !== "All") fetchNews(cat, 4); }}
                style={{ background: activeCat === cat ? dark : "transparent", color: activeCat === cat ? "#fff" : dark, border: "none", borderRight: "1px solid #ddd", padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1260, margin: "0 auto", padding: "28px 20px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 36 }}>
        <div>
          {loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
              <div style={{ width: 38, height: 38, border: `3px solid ${dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 18px" }} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Fetching stories...</div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>No stories found</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Click "AI Fetch" to load stories</div>
            </div>
          )}

          {/* Featured */}
          {featured && (
            <div className="hov fade" onClick={() => setSelected(featured)} style={{ marginBottom: 36, background: "#fff", border: "1px solid #e0d9ce" }}>
              <div style={{ position: "relative" }}>
                {featured.type === "video" && featured.videoUrl ? (
                  <iframe src={featured.videoUrl} style={{ width: "100%", height: 400, border: "none" }} allowFullScreen />
                ) : (
                  <img src={featured.image} alt={featured.title} style={{ width: "100%", height: 400, objectFit: "cover" }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,8,4,0.92), transparent 55%)" }} />
                <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 7 }}>
                  {featured.breaking && <span style={{ background: red, color: "#fff", padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>BREAKING</span>}
                  {featured.exclusive && <span style={{ background: dark, color: "#f5c518", padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>EXCLUSIVE</span>}
                  {featured.type === "video" && <span style={{ background: "#1a3a6c", color: "#fff", padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>🎥 VIDEO</span>}
                </div>
                <div style={{ position: "absolute", bottom: 0, padding: "24px" }}>
                  <div style={{ color: "#aaa", fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 2 }}>{featured.category} · {featured.source}</div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>{featured.title}</h1>
                  <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.65 }}>{featured.summary}</p>
                  <div style={{ color: "#aaa", fontSize: 11, marginTop: 10 }}>{featured.reporter} · {timeAgo(featured.publishedAt)} · {featured.readTime} min read</div>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          {grid.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 2, background: dark }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: dark, letterSpacing: 2 }}>MORE STORIES</span>
              <div style={{ flex: 1, height: 2, background: dark }} />
            </div>
          )}

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {grid.map((a, i) => (
              <div key={a.id} className="hov fade" onClick={() => setSelected(a)} style={{ background: "#fff", border: "1px solid #e0d9ce", animationDelay: `${i * 0.04}s` }}>
                <div style={{ position: "relative" }}>
                  {a.type === "video" && a.videoUrl ? (
                    <div style={{ width: "100%", height: 165, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>▶️</div>
                  ) : (
                    <img src={a.image} alt={a.title} style={{ width: "100%", height: 165, objectFit: "cover" }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />
                  <div style={{ position: "absolute", top: 7, left: 7, display: "flex", gap: 4 }}>
                    {a.breaking && <span style={{ background: red, color: "#fff", padding: "2px 6px", fontSize: 9, fontWeight: 700 }}>BREAKING</span>}
                    {a.type === "video" && <span style={{ background: "#1a3a6c", color: "#fff", padding: "2px 6px", fontSize: 9, fontWeight: 700 }}>🎥</span>}
                  </div>
                  <div style={{ position: "absolute", bottom: 7, right: 7, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "2px 7px", fontSize: 9 }}>{a.category}</div>
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ color: red, fontSize: 10, fontWeight: 700, marginBottom: 5, letterSpacing: 1 }}>{a.source}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 7 }}>{a.title}</h3>
                  <p style={{ fontSize: 12, color: "#666", lineHeight: 1.55, marginBottom: 11 }}>{a.summary}</p>
                  <div style={{ fontSize: 10, color: "#aaa", borderTop: "1px solid #f0ece4", paddingTop: 9 }}>{timeAgo(a.publishedAt)} · {a.readTime}m read</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <div style={{ background: dark, color: "#fff", padding: 18, marginBottom: 22 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🤖 AI Newsroom</div>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => fetchNews(cat, 3)} disabled={loading}
                style={{ display: "flex", justifyContent: "space-between", width: "100%", background: "transparent", border: "1px solid #333", color: "#ddd", padding: "7px 11px", marginBottom: 4, cursor: loading ? "not-allowed" : "pointer", fontSize: 12 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = red; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#ddd"; }}>
                <span>{cat}</span><span style={{ color: red }}>Fetch →</span>
              </button>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1px solid #e0d9ce", padding: 18, marginBottom: 22 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, marginBottom: 14, paddingBottom: 9, borderBottom: `2px solid ${dark}` }}>Portal Stats</div>
            {[
              { l: "Total Stories", v: articles.length },
              { l: "Breaking", v: breaking.length },
              { l: "Videos", v: articles.filter(a => a.type === "video").length },
              { l: "Categories", v: [...new Set(articles.map(a => a.category))].length },
            ].map(s => (
              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0ece4", fontSize: 13 }}>
                <span style={{ color: "#555" }}>{s.l}</span>
                <span style={{ fontWeight: 700, color: red }}>{s.v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1px solid #e0d9ce", padding: 18 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, marginBottom: 14, paddingBottom: 9, borderBottom: `2px solid ${red}` }}>Latest Updates</div>
            {articles.slice(0, 6).map((a, i) => (
              <div key={a.id} onClick={() => setSelected(a)} className="hov" style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #f0ece4" }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#e8e0d5", minWidth: 22 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 10, color: red, fontWeight: 700, marginBottom: 2 }}>{a.source}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, fontFamily: "'Playfair Display', serif" }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{timeAgo(a.publishedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* Article Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,4,0.88)", zIndex: 1000, overflowY: "auto", display: "flex", justifyContent: "center", padding: "36px 18px" }}
          onClick={() => setSelected(null)}>
          <div style={{ maxWidth: 800, width: "100%", background: "#fff", animation: "fadeUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "relative" }}>
              {selected.type === "video" && selected.videoUrl ? (
                <iframe src={selected.videoUrl} style={{ width: "100%", height: 400, border: "none" }} allowFullScreen />
              ) : (
                <img src={selected.image} alt={selected.title} style={{ width: "100%", height: 360, objectFit: "cover" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: selected.type === "video" ? "none" : "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)" }} />
              <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", width: 34, height: 34, cursor: "pointer", fontSize: 17 }}>✕</button>
              <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 7 }}>
                {selected.breaking && <span style={{ background: red, color: "#fff", padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>BREAKING</span>}
                {selected.type === "video" && <span style={{ background: "#1a3a6c", color: "#fff", padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>🎥 VIDEO</span>}
              </div>
            </div>
            <div style={{ padding: "32px 40px" }}>
              <div style={{ color: red, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>{selected.category} · {selected.source}</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, lineHeight: 1.2, marginBottom: 10 }}>{selected.title}</h1>
              {selected.subtitle && <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 17, color: "#555", marginBottom: 16 }}>{selected.subtitle}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: "1px solid #e8e0d5", borderBottom: "1px solid #e8e0d5", marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, background: dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  {(selected.reporter || "O").charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.reporter || "OrbisDaily Staff"}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{selected.location} · {timeAgo(selected.publishedAt)} · {selected.readTime} min read</div>
                </div>
              </div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, lineHeight: 1.85, marginBottom: 24 }}>
                {selected.content?.split('\n').map((p, i) => p.trim() && <p key={i} style={{ marginBottom: 14 }}>{p}</p>)}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {selected.tags?.map(t => <span key={t} style={{ background: cream, border: "1px solid #ddd", padding: "3px 10px", fontSize: 12 }}>#{t}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: dark, color: "#888", padding: "36px 20px 18px", marginTop: 50 }}>
        <div style={{ maxWidth: 1260, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 36, marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: "#fff", marginBottom: 10 }}>Orbis<span style={{ color: red }}>Daily</span></div>
              <p style={{ fontSize: 13, lineHeight: 1.7 }}>Your trusted source for international news, powered by AI journalism.</p>
            </div>
            {[
              { t: "Categories", items: CATEGORIES.slice(0, 4) },
              { t: "More", items: CATEGORIES.slice(4) },
              { t: "Company", items: ["About Us", "Contact", "Advertise", "Privacy"] },
            ].map(col => (
              <div key={col.t}>
                <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 2, marginBottom: 12, paddingBottom: 7, borderBottom: "1px solid #333" }}>{col.t}</div>
                {col.items.map(item => <div key={item} style={{ fontSize: 12, marginBottom: 7, cursor: "pointer" }}>{item}</div>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span>© 2026 OrbisDaily. All rights reserved.</span>
            <span>Powered by Gemini AI · orbisdaily.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
