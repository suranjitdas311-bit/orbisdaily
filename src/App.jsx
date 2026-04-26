import { useState, useEffect, useRef } from "react";

const CATEGORIES = ["World", "Politics", "Business", "Technology", "Science", "Health", "Sports", "Culture"];

const NEWS_SOURCES = ["BBC News", "Al Jazeera", "Reuters", "AP News", "The Guardian", "CNN", "Bloomberg", "DW News"];

const CATEGORY_IMAGES = {
  World: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=900&q=80",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
  Business: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
  Science: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900&q=80",
  Health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
  Culture: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&q=80",
};

const EXTRA_IMAGES = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&q=80",
  "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=900&q=80",
  "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=900&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getImage(category, id) {
  const extras = EXTRA_IMAGES;
  const base = CATEGORY_IMAGES[category] || extras[0];
  return id % 3 === 0 ? extras[id % extras.length] : base + `&seed=${id}`;
}

export default function OrbisDaily() {
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState("World");
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const tickerRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchNews = async (category, count = 4) => {
    setLoading(true);
    try {
      const prompt = `Generate ${count} international news articles for category: "${category}".
Today is April 23, 2026. Make news sound current and realistic.
Sources should be from: BBC News, Al Jazeera, Reuters, AP News, The Guardian, CNN, Bloomberg, DW News.
Return ONLY a JSON array, no markdown, no extra text:
[{"title":"headline max 12 words","subtitle":"one line subheadline","summary":"2 sentence summary","content":"200-250 word article with quotes and analysis","source":"one source","reporter":"Full Name","location":"City, Country","region":"Europe/Asia/Americas/Africa/Middle East","publishedAt":"2026-04-23T10:00:00Z","breaking":false,"exclusive":false,"tags":["tag1","tag2","tag3"],"readTime":3}]`;

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/llama3-8b-8192:chat/completions?key=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",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2000 }
          })
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const withMeta = parsed.map((a, i) => ({
        ...a,
        id: Date.now() + i + Math.random(),
        category,
        image: getImage(category, i + Date.now()),
      }));
      setArticles(prev => {
        const others = prev.filter(a => a.category !== category);
        return [...withMeta, ...others];
      });
      showToast(`✓ ${count} ${category} stories loaded`);
    } catch (e) {
      showToast("Failed to fetch news", "error");
    }
    setLoading(false);
  };

    const fetchAllCategories = async () => {
    setFetchingAll(true);
    for (const cat of CATEGORIES.slice(0, 4)) {
      await fetchNews(cat, 3);
      await new Promise(r => setTimeout(r, 600));
    }
    setFetchingAll(false);
  };

  const generateSEO = async (article) => {
    setSeoLoading(true);
    setSeoData(null);
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/llama3-8b-8192:chat/completions?key=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", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate SEO data for this news article. Title: "${article.title}", Category: "${article.category}". Return ONLY JSON no markdown: {"metaTitle":"SEO title under 60 chars","metaDescription":"150-160 char description","focusKeyword":"main keyword","secondaryKeywords":["kw1","kw2","kw3"],"urlSlug":"url-slug","canonicalUrl":"https://orbisdaily.com/news/slug","ogTitle":"social title","ogDescription":"social desc","twitterTitle":"twitter title","twitterDescription":"twitter desc","schemaMarkup":"NewsArticle","seoScore":88,"readabilityScore":84,"keywordDensity":"2.3%","wordCount":230,"internalLinkSuggestions":["topic1","topic2"],"improvements":["tip1","tip2","tip3"]}` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 1000 }
        })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      setSeoData(JSON.parse(clean));
      showToast("✓ SEO analysis complete");
    } catch (e) {
      showToast("SEO generation failed", "error");
    }
    setSeoLoading(false);
  };

  useEffect(() => { fetchNews("World", 5); }, []);

  const filteredArticles = articles.filter(a => {
    const matchCat = activeCategory === "All" || a.category === activeCategory;
    const matchSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const breakingNews = articles.filter(a => a.breaking);
  const featuredArticle = filteredArticles[0];
  const gridArticles = filteredArticles.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4ef", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: "#1a1008" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f7f4ef; }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #c0392b !important; }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; cursor: pointer; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .btn-primary { transition: background 0.2s, transform 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); }
        .tag-pill { transition: background 0.2s, color 0.2s; }
        .tag-pill:hover { background: #c0392b !important; color: #fff !important; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ticker { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #c0392b; border-radius: 3px; }
        .seo-score-bar { transition: width 1s ease; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "error" ? "#c0392b" : "#1a5c2e", color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 13, fontFamily: "monospace", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* Breaking Ticker */}
      {breakingNews.length > 0 && (
        <div style={{ background: "#c0392b", color: "#fff", padding: "7px 0", overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ background: "#8b0000", color: "#fff", padding: "0 16px", fontSize: 11, fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap", height: "100%", display: "flex", alignItems: "center", fontFamily: "monospace" }}>BREAKING</div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ animation: "ticker 35s linear infinite", whiteSpace: "nowrap", fontSize: 12, letterSpacing: 0.5, fontFamily: "'Source Serif 4', serif" }}>
              {breakingNews.map(a => `  ◆  ${a.title}  —  ${a.source}`).join("")}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "3px double #1a1008" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e0d9ce", fontSize: 11, color: "#888", fontFamily: "'Source Serif 4', serif" }}>
            <span>Thursday, April 23, 2026</span>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {["Subscribe", "Newsletter", "Podcast", "About"].map(item => (
                <span key={item} className="nav-link" style={{ cursor: "pointer", color: "#555" }}>{item}</span>
              ))}
            </div>
          </div>

          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 46, fontWeight: 900, letterSpacing: "-2px", color: "#1a1008", lineHeight: 1 }}>
                Orbis<span style={{ color: "#c0392b" }}>Daily</span>
              </div>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", paddingBottom: 4 }}>International</div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {searchOpen ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search stories..."
                    style={{ border: "2px solid #1a1008", borderRadius: 0, padding: "8px 14px", fontSize: 13, width: 240, fontFamily: "'Source Serif 4', serif", outline: "none", background: "#fafafa" }}
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ background: "#1a1008", color: "#fff", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setSearchOpen(true)} style={{ background: "transparent", border: "2px solid #1a1008", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'Source Serif 4', serif" }}>🔍 Search</button>
              )}
              <button
                onClick={() => fetchNews(activeCategory, 4)}
                disabled={loading}
                className="btn-primary"
                style={{ background: loading ? "#888" : "#c0392b", color: "#fff", border: "none", padding: "9px 18px", cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Source Serif 4', serif", letterSpacing: 0.5 }}
              >
                {loading ? "Loading..." : "🤖 AI Fetch News"}
              </button>
              <button
                onClick={fetchAllCategories}
                disabled={fetchingAll}
                style={{ background: "transparent", border: "2px solid #c0392b", color: "#c0392b", padding: "9px 14px", cursor: fetchingAll ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}
              >
                {fetchingAll ? "⏳" : "⚡ All"}
              </button>
            </div>
          </div>

          {/* Category Nav */}
          <nav style={{ display: "flex", gap: 0, borderTop: "3px solid #1a1008", overflowX: "auto" }}>
            {["All", ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); if (cat !== "All") fetchNews(cat, 4); }}
                style={{
                  background: activeCategory === cat ? "#1a1008" : "transparent",
                  color: activeCategory === cat ? "#fff" : "#1a1008",
                  border: "none", borderRight: "1px solid #ddd",
                  padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap",
                  fontFamily: "'Source Serif 4', serif", transition: "all 0.2s"
                }}
              >{cat}</button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>

        {/* Left - Articles */}
        <div>
          {loading && articles.filter(a => a.category === activeCategory).length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #c0392b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Fetching international stories...</div>
            </div>
          )}

          {filteredArticles.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, opacity: 0.2 }}>📰</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginTop: 16 }}>No stories found</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Click "AI Fetch News" to load stories</div>
            </div>
          )}

          {/* Featured Story */}
          {featuredArticle && (
            <div className="card-hover fade-in" onClick={() => setSelectedArticle(featuredArticle)} style={{ marginBottom: 40, background: "#fff", border: "1px solid #e0d9ce" }}>
              <div style={{ position: "relative" }}>
                <img src={featuredArticle.image} alt={featuredArticle.title} style={{ width: "100%", height: 420, objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,8,4,0.92) 0%, rgba(10,8,4,0.3) 50%, transparent 100%)" }} />
                <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
                  {featuredArticle.breaking && <span style={{ background: "#c0392b", color: "#fff", padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace" }}>BREAKING</span>}
                  {featuredArticle.exclusive && <span style={{ background: "#1a1008", color: "#f5c518", padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace" }}>EXCLUSIVE</span>}
                </div>
                <div style={{ position: "absolute", bottom: 0, padding: "28px" }}>
                  <div style={{ color: "#c0392b", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10, fontFamily: "monospace", textTransform: "uppercase" }}>
                    {featuredArticle.category} · {featuredArticle.source} · {featuredArticle.region}
                  </div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>{featuredArticle.title}</h1>
                  <p style={{ color: "#ccc", fontSize: 15, fontFamily: "'Source Serif 4', serif", lineHeight: 1.6 }}>{featuredArticle.summary}</p>
                  <div style={{ color: "#999", fontSize: 12, marginTop: 12, fontFamily: "monospace" }}>By {featuredArticle.reporter} · {featuredArticle.location} · {timeAgo(featuredArticle.publishedAt)} · {featuredArticle.readTime} min read</div>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          {gridArticles.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div style={{ flex: 1, height: 1, background: "#1a1008" }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#1a1008" }}>Latest Stories</span>
              <div style={{ flex: 1, height: 1, background: "#1a1008" }} />
            </div>
          )}

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {gridArticles.map((article, i) => (
              <div key={article.id} className="card-hover fade-in" onClick={() => setSelectedArticle(article)}
                style={{ background: "#fff", border: "1px solid #e0d9ce", animationDelay: `${i * 0.05}s` }}>
                <div style={{ position: "relative" }}>
                  <img src={article.image} alt={article.title} style={{ width: "100%", height: 175, objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                    {article.breaking && <span style={{ background: "#c0392b", color: "#fff", padding: "2px 7px", fontSize: 9, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace" }}>BREAKING</span>}
                    {article.exclusive && <span style={{ background: "#1a1008", color: "#f5c518", padding: "2px 7px", fontSize: 9, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace" }}>EXCL.</span>}
                  </div>
                  <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "2px 8px", fontSize: 10, fontFamily: "monospace" }}>{article.category}</div>
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ color: "#c0392b", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace", textTransform: "uppercase" }}>{article.source} · {article.region}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.35, marginBottom: 8, color: "#1a1008" }}>{article.title}</h3>
                  <p style={{ fontSize: 12.5, color: "#555", lineHeight: 1.55, marginBottom: 12, fontFamily: "'Source Serif 4', serif" }}>{article.summary}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0ece4", paddingTop: 10 }}>
                    <span style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>{timeAgo(article.publishedAt)} · {article.readTime}m</span>
                    <button onClick={e => { e.stopPropagation(); setSelectedArticle(article); generateSEO(article); }}
                      style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "3px 9px", fontSize: 10, cursor: "pointer", fontWeight: 700, letterSpacing: 1, fontFamily: "monospace" }}>SEO</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          {/* AI Control */}
          <div style={{ background: "#1a1008", color: "#fff", padding: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🤖 AI Newsroom</div>
            <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", marginBottom: 16 }}>Powered by Claude AI</div>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => fetchNews(cat, 3)} disabled={loading}
                style={{ display: "flex", justifyContent: "space-between", width: "100%", background: "transparent", border: "1px solid #333", color: "#ddd", padding: "8px 12px", marginBottom: 5, cursor: loading ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "'Source Serif 4', serif", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#c0392b"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#ddd"; }}>
                <span>{cat}</span>
                <span style={{ color: "#c0392b", fontSize: 11 }}>Fetch →</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ background: "#fff", border: "1px solid #e0d9ce", padding: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #1a1008" }}>Portal Stats</div>
            {[
              { label: "Total Stories", value: articles.length, icon: "📰" },
              { label: "Breaking", value: breakingNews.length, icon: "⚡" },
              { label: "Exclusives", value: articles.filter(a => a.exclusive).length, icon: "🎯" },
              { label: "AI-Generated", value: "100%", icon: "🤖" },
              { label: "Categories", value: [...new Set(articles.map(a => a.category))].length, icon: "🗂" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f0ece4", fontSize: 13, fontFamily: "'Source Serif 4', serif" }}>
                <span style={{ color: "#555" }}>{s.icon} {s.label}</span>
                <span style={{ fontWeight: 700, color: "#c0392b" }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Latest */}
          <div style={{ background: "#fff", border: "1px solid #e0d9ce", padding: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #c0392b" }}>Latest Updates</div>
            {articles.slice(0, 6).map((a, i) => (
              <div key={a.id} onClick={() => setSelectedArticle(a)} className="card-hover"
                style={{ padding: "10px 0", borderBottom: "1px solid #f0ece4", display: "flex", gap: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#e0d9ce", fontFamily: "'Playfair Display', serif", minWidth: 24 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 10, color: "#c0392b", fontWeight: 700, fontFamily: "monospace", marginBottom: 3 }}>{a.source}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, fontFamily: "'Playfair Display', serif", color: "#1a1008" }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 3, fontFamily: "monospace" }}>{timeAgo(a.publishedAt)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sources */}
          <div style={{ background: "#fff", border: "1px solid #e0d9ce", padding: 20 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #1a1008" }}>News Sources</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {NEWS_SOURCES.map(s => (
                <span key={s} className="tag-pill" style={{ background: "#f7f4ef", border: "1px solid #ddd", padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{s}</span>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Article Modal */}
      {selectedArticle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,4,0.88)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}
          onClick={() => { setSelectedArticle(null); setSeoData(null); }}>
          <div style={{ maxWidth: 820, width: "100%", background: "#fff", animation: "fadeIn 0.3s ease" }} onClick={e => e.stopPropagation()}>

            {/* Article Image */}
            <div style={{ position: "relative" }}>
              <img src={selectedArticle.image} alt={selectedArticle.title} style={{ width: "100%", height: 380, objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)" }} />
              <button onClick={() => { setSelectedArticle(null); setSeoData(null); }}
                style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
                {selectedArticle.breaking && <span style={{ background: "#c0392b", color: "#fff", padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace" }}>BREAKING</span>}
                {selectedArticle.exclusive && <span style={{ background: "#1a1008", color: "#f5c518", padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace" }}>EXCLUSIVE</span>}
              </div>
            </div>

            {/* Article Body */}
            <div style={{ padding: "36px 44px" }}>
              <div style={{ color: "#c0392b", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 12, fontFamily: "monospace", textTransform: "uppercase" }}>
                {selectedArticle.category} · {selectedArticle.source} · {selectedArticle.region}
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 900, lineHeight: 1.2, marginBottom: 12, color: "#1a1008" }}>{selectedArticle.title}</h1>
              {selectedArticle.subtitle && <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: "#555", marginBottom: 16, lineHeight: 1.4 }}>{selectedArticle.subtitle}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 20, borderBottom: "1px solid #e0d9ce", marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, background: "#1a1008", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14 }}>
                  {selectedArticle.reporter?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>{selectedArticle.reporter}</div>
                  <div style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{selectedArticle.location} · {timeAgo(selectedArticle.publishedAt)} · {selectedArticle.readTime} min read</div>
                </div>
              </div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, lineHeight: 1.85, color: "#2a1a08", marginBottom: 28 }}>
                {selectedArticle.content?.split('\n').map((p, i) => p.trim() && <p key={i} style={{ marginBottom: 16 }}>{p}</p>)}
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                {selectedArticle.tags?.map(tag => (
                  <span key={tag} className="tag-pill" style={{ background: "#f7f4ef", border: "1px solid #ddd", padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>#{tag}</span>
                ))}
              </div>

              {/* SEO Button */}
              <button onClick={() => generateSEO(selectedArticle)} disabled={seoLoading}
                style={{ background: seoLoading ? "#888" : "#1a1008", color: "#fff", border: "none", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: seoLoading ? "not-allowed" : "pointer", fontFamily: "'Source Serif 4', serif", letterSpacing: 1, width: "100%" }}>
                {seoLoading ? "⏳ Generating SEO Analysis..." : "🎯 Generate Full SEO Analysis"}
              </button>

              {/* SEO Panel */}
              {seoData && (
                <div style={{ marginTop: 28, background: "#f7f4ef", border: "2px solid #1a1008", padding: 28, animation: "fadeIn 0.4s ease" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 20, paddingBottom: 12, borderBottom: "2px solid #1a1008" }}>🎯 SEO Analysis Report</div>

                  {/* Scores */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                    {[
                      { label: "SEO Score", value: seoData.seoScore, color: "#1a5c2e" },
                      { label: "Readability", value: seoData.readabilityScore, color: "#1a3a6c" },
                      { label: "Keyword %", value: seoData.keywordDensity, color: "#8b4513", raw: true },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#fff", border: "1px solid #ddd", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: 30, fontWeight: 900, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.raw ? s.value : `${s.value}`}</div>
                        {!s.raw && <div style={{ height: 4, background: "#eee", marginTop: 8, borderRadius: 2 }}>
                          <div className="seo-score-bar" style={{ height: "100%", background: s.color, width: `${s.value}%`, borderRadius: 2 }} />
                        </div>}
                        <div style={{ fontSize: 11, color: "#888", marginTop: 6, fontFamily: "monospace", letterSpacing: 1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* SEO Fields */}
                  {[
                    { label: "Meta Title", value: seoData.metaTitle },
                    { label: "Meta Description", value: seoData.metaDescription },
                    { label: "URL Slug", value: seoData.urlSlug },
                    { label: "Focus Keyword", value: seoData.focusKeyword },
                    { label: "Canonical URL", value: seoData.canonicalUrl },
                    { label: "OG Title", value: seoData.ogTitle },
                    { label: "Twitter Title", value: seoData.twitterTitle },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#c0392b", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>{f.label}</div>
                      <div style={{ background: "#fff", border: "1px solid #ddd", padding: "9px 14px", fontSize: 13, fontFamily: "monospace", color: "#1a1008", wordBreak: "break-all" }}>{f.value}</div>
                    </div>
                  ))}

                  {/* Keywords */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#c0392b", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Secondary Keywords</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {seoData.secondaryKeywords?.map(k => (
                        <span key={k} style={{ background: "#1a1008", color: "#fff", padding: "3px 10px", fontSize: 11, fontFamily: "monospace" }}>{k}</span>
                      ))}
                    </div>
                  </div>

                  {/* Improvements */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#c0392b", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>💡 Improvement Suggestions</div>
                    {seoData.improvements?.map((imp, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #e0d9ce", fontFamily: "'Source Serif 4', serif", fontSize: 13 }}>
                        <span style={{ color: "#1a5c2e", fontWeight: 700 }}>✓</span>
                        <span>{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: "#1a1008", color: "#888", padding: "40px 24px 20px", marginTop: 60 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 12 }}>Orbis<span style={{ color: "#c0392b" }}>Daily</span></div>
              <p style={{ fontSize: 13, lineHeight: 1.7, fontFamily: "'Source Serif 4', serif" }}>Your trusted source for international news, powered by AI journalism. Bringing you stories from every corner of the world.</p>
            </div>
            {[
              { title: "Categories", items: CATEGORIES.slice(0, 4) },
              { title: "More", items: CATEGORIES.slice(4) },
              { title: "Company", items: ["About Us", "Contact", "Advertise", "Privacy"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #333" }}>{col.title}</div>
                {col.items.map(item => <div key={item} style={{ fontSize: 13, marginBottom: 8, cursor: "pointer", fontFamily: "'Source Serif 4', serif" }} className="nav-link">{item}</div>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace" }}>
            <span>© 2026 OrbisDaily. All rights reserved.</span>
            <span>Powered by Claude AI · orbisdaily.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
