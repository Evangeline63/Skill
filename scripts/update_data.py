#!/usr/bin/env python3
"""
AI Alpha Dashboard — Auto-update script
Runs via GitHub Actions every 3 hours.
Fetches live data from GitHub, HackerNews, Reddit; rebuilds data-bundle.js.
"""

import json, os, time
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA  = os.path.join(BASE, 'data')
NOW   = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

HEADERS = {
    'User-Agent': 'AI-Alpha-Dashboard/1.0 (+https://github.com/Evangeline63/Skill)',
    'Accept': 'application/json',
}

# ── helpers ───────────────────────────────────────────────────

def get(url, timeout=12):
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except (URLError, HTTPError, Exception) as e:
        print(f'  WARN {url[:60]} → {e}')
        return None

def load(fname):
    with open(os.path.join(DATA, fname), encoding='utf-8') as f:
        return json.load(f)

def save(fname, data):
    path = os.path.join(DATA, fname)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  ✓ {fname}')

# ── GitHub Trending (via GitHub Search API) ───────────────────

def update_github_trending():
    print('\n── GitHub Trending')
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%d')
    url = (
        'https://api.github.com/search/repositories'
        f'?q=topic:artificial-intelligence+pushed:>{since}'
        '&sort=stars&order=desc&per_page=10'
    )
    result = get(url)
    if not result or 'items' not in result:
        print('  Skipped — no data'); return

    repos = []
    for i, item in enumerate(result['items'][:6], 1):
        repos.append({
            'rank':        i,
            'name':        item['full_name'],
            'description': (item.get('description') or '')[:120],
            'language':    item.get('language') or '',
            'stars':       item['stargazers_count'],
            'stars_today': item.get('watchers_count', 0),
            'url':         item['html_url'],
        })

    if repos:
        save('github_trending.json', {'updated': NOW, 'repos': repos})

# ── HackerNews (Firebase API) ─────────────────────────────────

AI_KW = [
    'ai', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic',
    'mistral', 'llama', 'agent', 'machine learning', 'neural',
    'transformer', 'diffusion', 'rag', 'langchain', 'copilot',
    'chatgpt', 'artificial intelligence', 'deep learning',
]

def is_ai(title):
    t = title.lower()
    return any(kw in t for kw in AI_KW)

def fetch_hn():
    print('\n── HackerNews')
    top_ids = get('https://hacker-news.firebaseio.com/v0/topstories.json')
    if not top_ids:
        return []

    signals = []
    for item_id in top_ids[:120]:
        if len(signals) >= 5: break
        item = get(f'https://hacker-news.firebaseio.com/v0/item/{item_id}.json')
        if not item or item.get('type') != 'story':
            continue
        title = item.get('title', '')
        if not is_ai(title):
            continue
        ts = datetime.fromtimestamp(
            item.get('time', 0), tz=timezone.utc
        ).strftime('%Y-%m-%dT%H:%M:%SZ')
        signals.append({
            'source':    'HackerNews',
            'title':     title[:160],
            'insight':   f"HN 热议：{item.get('score', 0)} 分 · {item.get('descendants', 0)} 评论",
            'sentiment': 'positive' if item.get('score', 0) > 200 else 'neutral',
            'comments':  item.get('descendants', 0),
            'url':       item.get('url') or f"https://news.ycombinator.com/item?id={item_id}",
        })
        time.sleep(0.08)

    print(f'  {len(signals)} AI stories found')
    return signals

# ── Reddit (public JSON API) ──────────────────────────────────

SUBS = [
    ('r/MachineLearning', 'https://www.reddit.com/r/MachineLearning/top.json?t=day&limit=5'),
    ('r/artificial',      'https://www.reddit.com/r/artificial/top.json?t=day&limit=5'),
    ('r/singularity',     'https://www.reddit.com/r/singularity/top.json?t=day&limit=3'),
]

def fetch_reddit():
    print('\n── Reddit')
    signals = []
    for subreddit, url in SUBS:
        if len(signals) >= 5: break
        result = get(url)
        if not result: continue
        posts = result.get('data', {}).get('children', [])
        for post in posts[:2]:
            d = post.get('data', {})
            if d.get('stickied') or d.get('score', 0) < 30:
                continue
            score = d.get('score', 0)
            signals.append({
                'source':    'Reddit',
                'subreddit': subreddit,
                'title':     d.get('title', '')[:160],
                'insight':   f"Reddit 热帖：{score} upvotes · {d.get('num_comments', 0)} 评论",
                'sentiment': 'positive' if score > 300 else 'neutral',
                'comments':  d.get('num_comments', 0),
                'url':       'https://www.reddit.com' + d.get('permalink', ''),
            })
        time.sleep(0.5)

    print(f'  {len(signals)} posts found')
    return signals

def update_community():
    hn     = fetch_hn()
    reddit = fetch_reddit()
    merged = (hn + reddit)[:8]
    for i, s in enumerate(merged, 1):
        s['id'] = i
    if merged:
        save('community.json', {'updated': NOW, 'signals': merged})

# ── Touch timestamps on curator-maintained files ──────────────

def touch_timestamps():
    print('\n── Timestamps')
    for fname in ['signals.json', 'trends.json', 'products.json', 'funding.json', 'daily.json']:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path): continue
        d = load(fname)
        d['updated'] = NOW
        save(fname, d)

# ── Rebuild data-bundle.js ────────────────────────────────────

def rebuild_bundle():
    print('\n── Rebuilding data-bundle.js')
    keys = ['signals', 'trends', 'github_trending', 'products', 'funding', 'community', 'daily']
    parts = []
    for k in keys:
        path = os.path.join(DATA, f'{k}.json')
        if not os.path.exists(path): continue
        with open(path, encoding='utf-8') as f:
            obj = json.load(f)
        parts.append(f'  "{k}": {json.dumps(obj, ensure_ascii=False, indent=4)}')

    bundle = 'window.__DATA__ = {\n' + ',\n'.join(parts) + '\n};\n'
    out = os.path.join(BASE, 'assets', 'data-bundle.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(bundle)
    print(f'  ✓ data-bundle.js ({len(bundle):,} bytes)')

# ── Main ──────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'AI Alpha Dashboard — data update @ {NOW}')
    update_github_trending()
    update_community()
    touch_timestamps()
    rebuild_bundle()
    print('\nDone.')
