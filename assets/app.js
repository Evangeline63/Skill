/* ============================================================
   AI Alpha Dashboard — Main Application
   ============================================================ */

const DATA_FILES = {
  signals: './data/signals.json',
  trends: './data/trends.json',
  github_trending: './data/github_trending.json',
  products: './data/products.json',
  funding: './data/funding.json',
  community: './data/community.json',
  daily: './data/daily.json',
};

const TYPE_MAP = {
  model_update: '模型更新',
  funding: '融资',
  product_launch: '产品发布',
  growth_data: '增长/数据',
  open_source: '开源项目',
};

const SOURCE_ICONS = {
  HackerNews:  { text: 'HN', cls: 'source-hn' },
  Reddit:      { text: 'R',  cls: 'source-reddit' },
  X:           { text: 'X',  cls: 'source-x' },
  GitHub:      { text: 'GH', cls: 'source-gh' },
  ProductHunt: { text: 'PH', cls: 'source-ph' },
};

/* ── Utilities ── */
function timeAgo(isoStr) {
  const now = new Date();
  const then = new Date(isoStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${url}`);
  return resp.json();
}

/* ── Signal accordion ── */
function toggleSignal(el) {
  const id = el.dataset.id;
  const detail = document.getElementById(`sd-${id}`);
  if (!detail) return;
  const isOpen = detail.classList.toggle('open');
  el.classList.toggle('active', isOpen);
  el.querySelector('.signal-expand-icon').classList.toggle('rotated', isOpen);
}

/* ── Renderers ── */
function renderSignals(data) {
  const container = document.getElementById('signals-list');
  const countEl = document.getElementById('signals-count');
  if (!container) return;

  countEl && (countEl.textContent = data.signals.length);

  container.innerHTML = data.signals.map((s, i) => {
    const typeClass = `tag-${s.type}`;
    const rankClass = s.hot ? 'signal-rank hot' : 'signal-rank';
    const rankIcon = s.hot ? '🔥' : String(i + 1).padStart(2, '0');
    const srcIcon = SOURCE_ICONS[s.source] || { text: s.source[0], cls: 'source-x' };

    return `
      <div class="signal-item" data-id="${s.id}" onclick="toggleSignal(this)">
        <span class="${rankClass}">${rankIcon}</span>
        <div class="signal-content">
          <div class="signal-title">${s.title}</div>
          <div class="signal-judgment">${s.judgment}</div>
          <div class="signal-meta">
            <span class="tag tag-source">${s.source}</span>
            <span class="tag ${typeClass}">${s.type_label}</span>
            ${s.hot ? '<span class="hot-badge">HOT</span>' : ''}
          </div>
        </div>
        <div class="signal-right">
          <span class="signal-time">${timeAgo(s.timestamp)}</span>
          <span class="signal-expand-icon">›</span>
        </div>
      </div>
      <div class="signal-detail" id="sd-${s.id}">
        <div class="signal-detail-inner">
          <div class="signal-detail-source">
            <div class="community-source-icon ${srcIcon.cls}">${srcIcon.text}</div>
            <div class="signal-detail-source-meta">
              <div class="signal-detail-source-name">${s.source}</div>
              <div class="signal-detail-handle">${s.source_handle || ''}</div>
            </div>
          </div>
          <div class="signal-detail-divider"></div>
          <div class="signal-detail-section">
            <div class="signal-detail-label">详细阐述</div>
            <div class="signal-detail-text">${s.detail || s.judgment}</div>
          </div>
          <a class="signal-detail-link" href="${s.url}" target="_blank" rel="noopener">
            查看原文来源 →
          </a>
        </div>
      </div>`;
  }).join('');
}

function renderTrends(data) {
  const container = document.getElementById('trends-grid');
  if (!container) return;

  container.innerHTML = data.tracks.map(t => {
    const arrowMap = { up: '↑', down: '↓', stable: '→' };
    const arrow = arrowMap[t.trend] || '→';
    const arrowCls = t.trend;

    return `
      <div class="trend-card">
        <div class="trend-card-header">
          <div class="trend-name">
            <span class="trend-icon">${t.icon}</span>
            <span>${t.name}</span>
          </div>
          <div class="trend-indicator">
            <span class="trend-arrow ${arrowCls}">${arrow}</span>
            <span class="trend-score">${t.trend_score}</span>
          </div>
        </div>
        <div class="trend-summary">${t.summary}</div>
        <div class="trend-breakthrough">⚡ ${t.breakthrough}</div>
        <div class="trend-new-label">新进入者</div>
        <div class="trend-new-entrants">
          ${t.new_entrants.map(e => `<span class="new-entrant">${e}</span>`).join('')}
        </div>
        <div class="trend-new-label" style="margin-top:8px">代表项目</div>
        <div class="trend-players">
          ${t.key_players.map(p => `<span class="player-tag">${p}</span>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderProducts(data) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  container.innerHTML = data.products.map(p => {
    const metric = p.stars
      ? `⭐ ${p.stars.toLocaleString()}`
      : p.ph_votes ? `▲ ${p.ph_votes}` : '';

    const tags = p.investable
      ? [`<span class="tag tag-investable">可投资</span>`]
      : [];
    if (p.replicable) tags.push(`<span class="tag tag-replicable">可复制</span>`);
    if (!p.replicable && !p.investable) tags.push(`<span class="tag tag-watch">观察中</span>`);

    const href = p.url || '#';
    return `
      <a class="product-card" href="${href}" target="_blank" rel="noopener">
        <div class="product-header">
          <div class="product-name">${p.name}</div>
          <span class="product-source-badge">${p.source}</span>
        </div>
        <div class="product-tagline">${p.tagline}</div>
        <div class="product-why">${p.why_matters}</div>
        <div class="product-footer">
          <div class="product-tags">${tags.join('')}</div>
          ${metric ? `<div class="product-metric">${metric}</div>` : ''}
        </div>
      </a>`;
  }).join('');
}

function renderFunding(data) {
  const container = document.getElementById('funding-list');
  const hiringContainer = document.getElementById('hiring-list');
  if (!container) return;

  container.innerHTML = data.funding_rounds.map(f => `
    <a class="funding-item" href="${f.url || '#'}" target="_blank" rel="noopener">
      <div class="funding-amount-block">
        <div class="funding-amount">${f.amount}</div>
        <div class="funding-round-tag">${f.round}</div>
      </div>
      <div class="funding-info">
        <div class="funding-company">${f.company}</div>
        <div class="funding-signal">${f.signal}</div>
      </div>
      <div class="funding-sector">${f.sector}</div>
    </a>`).join('');

  if (hiringContainer && data.hiring_signals) {
    hiringContainer.innerHTML = `
      <div class="hiring-header">招聘信号</div>
      ${data.hiring_signals.map(h => `
        <a class="hiring-item" href="${h.url || '#'}" target="_blank" rel="noopener">
          <div class="hiring-company">${h.company}</div>
          <div class="hiring-signal">${h.signal}</div>
        </a>`).join('')}`;
  }
}

function renderCommunity(data) {
  const container = document.getElementById('community-list');
  if (!container) return;

  container.innerHTML = data.signals.map(s => {
    const iconMap = SOURCE_ICONS[s.source] || { text: s.source[0], cls: 'source-x' };
    const sentimentSymbol = {
      positive: '↑', negative: '↓', neutral: '·', mixed: '~'
    }[s.sentiment] || '·';

    return `
      <div class="community-item">
        <div class="community-source-icon ${iconMap.cls}">${iconMap.text}</div>
        <div class="community-content">
          <div class="community-title">${s.title}</div>
          <div class="community-insight">${s.insight}</div>
          <div class="community-meta">
            <span class="community-comments sentiment-${s.sentiment}">${sentimentSymbol}</span>
            <span class="community-comments">${s.comments.toLocaleString()} comments</span>
            ${s.subreddit ? `<span class="tag tag-source">${s.subreddit}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderGithubTrending(data) {
  const container = document.getElementById('gh-trending-list');
  if (!container) return;

  const LANG_COLORS = {
    Python: '#3572A5', 'C++': '#f34b7d', JavaScript: '#f1e05a',
    TypeScript: '#3178c6', Rust: '#dea584', Go: '#00ADD8',
    Java: '#b07219', 'C#': '#178600', Shell: '#89e051',
  };

  container.innerHTML = data.repos.map(r => {
    const langColor = LANG_COLORS[r.language] || '#8b90a8';
    const [owner, repo] = r.name.split('/');
    return `
      <a class="gh-repo-item" href="${r.url}" target="_blank" rel="noopener">
        <span class="gh-repo-rank">${String(r.rank).padStart(2, '0')}</span>
        <div class="gh-repo-info">
          <div class="gh-repo-name"><span class="gh-repo-owner">${owner}/</span>${repo}</div>
          <div class="gh-repo-desc">${r.description}</div>
        </div>
        <div class="gh-repo-stats">
          ${r.language ? `<span class="gh-lang"><span class="gh-lang-dot" style="background:${langColor}"></span>${r.language}</span>` : ''}
          <span class="gh-stars">⭐ ${r.stars.toLocaleString()}</span>
          <span class="gh-stars-today gh-up">+${r.stars_today.toLocaleString()} today</span>
        </div>
      </a>`;
  }).join('');
}

function renderDaily(data) {
  const structuralEl = document.getElementById('structural-changes');
  const trendsEl = document.getElementById('trend-judgments');
  const watchEl = document.getElementById('watch-directions');
  const oppsEl = document.getElementById('opportunities');

  if (structuralEl) {
    structuralEl.innerHTML = data.structural_changes.map(c => `
      <div class="structural-item">${c}</div>`).join('');
  }

  if (trendsEl) {
    trendsEl.innerHTML = data.trend_judgments.map(t => `
      <div class="trend-judgment-item">
        <div class="trend-j-header">
          <div class="trend-j-name">${t.trend}</div>
          <div class="trend-j-confidence">置信度：${t.confidence}</div>
        </div>
        <div class="trend-j-detail">${t.detail}</div>
        <div class="trend-j-horizon">时间窗口：${t.horizon}</div>
      </div>`).join('');
  }

  if (watchEl) {
    watchEl.innerHTML = data.watch_directions.map(w => `
      <div class="watch-item">
        <span class="watch-bullet">›</span>
        <span>${w}</span>
      </div>`).join('');
  }

  if (oppsEl) {
    oppsEl.innerHTML = data.opportunity_hints.map(o => {
      const urgencyCls = o.urgency === '高' ? 'opp-urgency-high' : 'opp-urgency-mid';
      return `
        <div class="opportunity-item">
          <div class="opp-header">
            <div class="opp-title">${o.title}</div>
            <div class="opp-badges">
              <span class="opp-stage">${o.stage}</span>
              <span class="${urgencyCls}">紧迫度：${o.urgency}</span>
            </div>
          </div>
          <div class="opp-detail">${o.detail}</div>
        </div>`;
    }).join('');
  }
}

function updateTimestamp(data) {
  const el = document.getElementById('update-time');
  if (el && data.updated) {
    const d = new Date(data.updated);
    el.textContent = `Updated ${d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    })}`;
  }
}

/* ── Bootstrap ── */
async function init() {
  try {
    const [signals, trends, githubTrending, products, funding, community, daily] = await Promise.all([
      fetchJSON(DATA_FILES.signals),
      fetchJSON(DATA_FILES.trends),
      fetchJSON(DATA_FILES.github_trending),
      fetchJSON(DATA_FILES.products),
      fetchJSON(DATA_FILES.funding),
      fetchJSON(DATA_FILES.community),
      fetchJSON(DATA_FILES.daily),
    ]);

    renderSignals(signals);
    renderTrends(trends);
    renderGithubTrending(githubTrending);
    renderProducts(products);
    renderFunding(funding);
    renderCommunity(community);
    renderDaily(daily);
    updateTimestamp(signals);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
