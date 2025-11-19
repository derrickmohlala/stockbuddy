from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus
import re
import xml.etree.ElementTree as ET

import requests
import yfinance as yf

GOOGLE_NEWS_FEED = "https://news.google.com/rss/search?q={query}&hl=en-ZA&gl=ZA&ceid=ZA:en"

POSITIVE_KEYWORDS = [
    "beats", "beat", "surge", "surges", "rally", "soar", "soars", "climb", "climbs",
    "strong", "record", "growth", "raise", "upgraded", "upgrade", "expands", "expansion",
    "positive", "improves", "improvement", "tops", "outperforms", "accretive", "bullish"
]

NEGATIVE_KEYWORDS = [
    "misses", "warns", "warning", "slump", "slumps", "fall", "falls", "drop", "drops",
    "cuts", "cut", "downgrade", "downgraded", "pressure", "loss", "losses", "concern",
    "probe", "regulatory", "lawsuit", "strike", "disappoints", "weak", "bearish"
]


def classify_sentiment(*texts):
    combined = " ".join(filter(None, texts)).lower()
    if not combined.strip():
        return "Neutral"

    positive_hits = sum(1 for word in POSITIVE_KEYWORDS if word in combined)
    negative_hits = sum(1 for word in NEGATIVE_KEYWORDS if word in combined)

    if positive_hits > 0 and negative_hits > 0:
        return "Mixed"
    if positive_hits > 0:
        return "Positive"
    if negative_hits > 0:
        return "Cautious"
    return "Neutral"


def fetch_google_news(symbol, limit=5):
    query = quote_plus(f"{symbol} JSE news")
    url = GOOGLE_NEWS_FEED.format(query=query)
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception:
        return []

    try:
        root = ET.fromstring(response.text)
    except ET.ParseError:
        return []

    cleaned = []
    for idx, item in enumerate(root.findall(".//item")):
        title = item.findtext("title") or f"{symbol} market update"
        link = item.findtext("link") or f"https://www.google.com/search?q={query}"
        description = item.findtext("description") or ""
        description = re.sub(r"<[^>]+>", "", description).strip()
        source = item.findtext("source") or "Google News"
        pub_date_text = item.findtext("pubDate")
        try:
            published_at = parsedate_to_datetime(pub_date_text) if pub_date_text else datetime.now(timezone.utc)
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=timezone.utc)
            else:
                published_at = published_at.astimezone(timezone.utc)
        except Exception:
            published_at = datetime.now(timezone.utc)

        cleaned.append({
            "id": f"{symbol}-gnews-{idx}",
            "symbol": symbol,
            "name": None,
            "headline": title,
            "summary": description or f"Latest coverage mentioning {symbol} on the JSE.",
            "sentiment": classify_sentiment(title, description),
            "topic": "Market",
            "published_at": published_at.isoformat(),
            "source": source,
            "url": link
        })

        if len(cleaned) >= limit:
            break
    return cleaned


def _extract_first_url(record):
    """Extract URL from yfinance news record, checking all possible locations."""
    # yfinance news items typically have 'link' at top level - check this first
    link = record.get('link')
    if isinstance(link, str) and link.startswith('http'):
        return link
    
    # Also check 'url' at top level
    url = record.get('url')
    if isinstance(url, str) and url.startswith('http'):
        return url
    
    # Check content object
    content = record.get('content') or {}
    if isinstance(content, dict):
        # Check nested URL objects
        for key in ('canonicalUrl', 'clickThroughUrl', 'previewUrl'):
            value = content.get(key)
            if isinstance(value, dict):
                nested_url = value.get('url')
                if nested_url and isinstance(nested_url, str) and nested_url.startswith('http'):
                    return nested_url
            elif isinstance(value, str) and value.startswith('http'):
                return value
        
        # Check direct provider content URL
        alt = content.get('providerContentUrl')
        if isinstance(alt, str) and alt.startswith('http'):
            return alt
    
    # Check finance object
    finance = record.get('finance') or {}
    if isinstance(finance, dict):
        stock = finance.get('stock', {})
        if isinstance(stock, dict):
            preview = stock.get('link')
            if isinstance(preview, str) and preview.startswith('http'):
                return preview
    
    return None


def _normalise_yf_record(record):
    provider_time = record.get('providerPublishTime')
    published_at = None
    if provider_time:
        try:
            published_at = datetime.fromtimestamp(provider_time, tz=timezone.utc)
        except Exception:
            published_at = None

    content = record.get('content') or {}
    if published_at is None:
        pub_date = content.get('pubDate') or content.get('displayTime')
        if isinstance(pub_date, str):
            try:
                published_at = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
            except Exception:
                published_at = None
    if published_at is None:
        published_at = datetime.now(timezone.utc)

    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    else:
        published_at = published_at.astimezone(timezone.utc)

    title = record.get('title') or content.get('title')
    summary = record.get('summary') or content.get('summary') or content.get('description')
    source = record.get('publisher')
    if not source:
        provider = record.get('provider') or content.get('provider')
        if isinstance(provider, dict):
            source = provider.get('displayName') or provider.get('name')

    url = _extract_first_url(record)
    thumbnail = None
    thumb_source = content.get('thumbnail')
    if isinstance(thumb_source, dict):
        thumbnail = thumb_source.get('originalUrl')

    sentiment = classify_sentiment(title or "", summary or "", content.get('category') or "")

    return {
        "id": record.get('uuid') or f"{record.get('symbol')}-{provider_time}",
        "headline": title,
        "summary": summary or record.get('content'),
        "source": source,
        "url": url,
        "sentiment": sentiment,
        "topic": record.get('type') or record.get('topic') or content.get('category'),
        "published_at": published_at,
        "thumbnail": thumbnail
    }


NEWS_CACHE = {}

def fetch_live_news(symbol, limit=6, lookback_days=14):
    """Fetch recent headlines for a symbol with short‑lived in‑memory caching.

    - Successful (non‑empty) fetches are cached for 30 minutes.
    - Empty results are cached for 5 minutes to allow quick refresh without
      hammering the upstream, but still pick up fresh items the same day.
    """
    now = datetime.now(timezone.utc)
    cache_key = (symbol, lookback_days, limit)
    cached = NEWS_CACHE.get(cache_key)
    if cached:
        ttl = timedelta(minutes=30) if cached.get("stories") else timedelta(minutes=5)
        if now - cached.get("at", now) < ttl:
            stories = cached.get("stories", [])
            return stories

    cutoff = now - timedelta(days=lookback_days)
    collected = []
    try:
        ticker = yf.Ticker(symbol)
        raw_items = ticker.news or []
    except Exception:
        raw_items = []

    for item in raw_items:
        normalised = _normalise_yf_record(item)
        published_at = normalised["published_at"]
        if not isinstance(published_at, datetime):
            continue
        if published_at < cutoff:
            continue
        
        # Ensure we always have a URL - yfinance should provide 'link' field
        url = normalised.get("url")
        if not (isinstance(url, str) and url.startswith("http")):
            # Double-check the raw item for 'link' field (yfinance puts it at top level)
            raw_link = item.get("link") if isinstance(item, dict) else None
            if isinstance(raw_link, str) and raw_link.startswith("http"):
                normalised["url"] = raw_link
            else:
                search_query = quote_plus(f"{symbol} JSE news")
                normalised["url"] = f"https://www.google.com/search?q={search_query}"
        
        normalised["published_at"] = published_at
        collected.append(normalised)
        if len(collected) >= limit:
            break

    collected.sort(key=lambda entry: entry["published_at"], reverse=True)

    stories = []
    for entry in collected:
        entry = entry.copy()
        entry["published_at"] = entry["published_at"].isoformat()
        stories.append(entry)

    if not stories:
        stories = fetch_google_news(symbol, limit=limit)

    # Cache and return
    NEWS_CACHE[cache_key] = {"at": now, "stories": stories}
    return stories


def fetch_upcoming_earnings(symbol, horizon_days=60, limit=4):
    cutoff = datetime.now()
    future_limit = cutoff + timedelta(days=horizon_days)
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.get_earnings_dates(limit=limit * 3)
    except Exception:
        return []
    if df is None or df.empty:
        return []
    upcoming = []
    for idx, row in df.iterrows():
        when = idx.to_pydatetime() if hasattr(idx, 'to_pydatetime') else idx
        if when is None:
            continue
        if when < cutoff or when > future_limit:
            continue
        upcoming.append({
            "symbol": symbol,
            "date": when.isoformat(),
            "eps_estimate": row.get('EPS Estimate'),
            "eps_actual": row.get('Reported EPS'),
            "surprise_pct": row.get('Surprise(%)')
        })
        if len(upcoming) >= limit:
            break
    return upcoming
