from datetime import datetime, timedelta, timezone
from functools import lru_cache

import yfinance as yf

STATIC_NEWS = {
    "STX40.JO": [
        {
            "headline": "JSE Top 40 edges higher as rand steadies ahead of budget update",
            "summary": "Broad-based buying across rand-hedge counters lifted the Top 40, with traders pointing to calmer currency markets and resilient mining majors.",
            "source": "Business Day",
            "url": "https://www.businesslive.co.za/bd/markets/2024-02-19-jse-top-40-edges-higher-as-rand-steadies/",
            "sentiment": "Positive",
            "topic": "Market outlook",
            "days_ago": 2
        },
        {
            "headline": "Passive investors flock to Satrix Top 40 as local unit prices stay depressed",
            "summary": "Asset managers report continued inflows into core ETFs with investors citing valuation opportunities on the JSE’s heavyweight names.",
            "source": "Moneyweb",
            "url": "https://www.moneyweb.co.za/news/markets/passive-investors-flock-to-satrix-top-40/",
            "sentiment": "Positive",
            "topic": "Asset flows",
            "days_ago": 5
        }
    ],
    "MTN.JO": [
        {
            "headline": "MTN outlines capex discipline while pushing 5G expansion in SA",
            "summary": "Management reaffirmed guidance for mid-teens service revenue growth as network investments tilt toward data capacity and fintech services.",
            "source": "TechCentral",
            "url": "https://techcentral.co.za/mtn-outlines-capex-discipline-while-pushing-5g-expansion/",
            "sentiment": "Positive",
            "topic": "Growth strategy",
            "days_ago": 3
        },
        {
            "headline": "Regulatory glare on Nigeria unit keeps MTN investors cautious",
            "summary": "Analysts warn that fresh spectrum fee disputes could weigh on the telecom’s largest market, tempering near-term earnings momentum.",
            "source": "Reuters",
            "url": "https://www.reuters.com/africa/mtn-nigeria-spectrum-fees-2024-02-15/",
            "sentiment": "Mixed",
            "topic": "Regulation",
            "days_ago": 6
        }
    ],
    "GRT.JO": [
        {
            "headline": "Growthpoint signals stabilising office vacancies, eyes solar rollout",
            "summary": "South Africa’s largest REIT says demand for premium office space is improving while embedded energy projects support distribution guidance.",
            "source": "PropertyWheel",
            "url": "https://propertywheel.co.za/2024/02/growthpoint-signals-stabilising-office-vacancies/",
            "sentiment": "Positive",
            "topic": "Property fundamentals",
            "days_ago": 4
        },
        {
            "headline": "Inflation pressure keeps SA REIT yields elevated",
            "summary": "Portfolio managers highlight Growthpoint’s balance sheet strength but caution that higher-for-longer rates could cap capital growth.",
            "source": "Financial Mail",
            "url": "https://www.businesslive.co.za/fm/money-and-investing/2024-02-12-inflation-pressure-keeps-sa-reit-yields-elevated/",
            "sentiment": "Mixed",
            "topic": "Yield outlook",
            "days_ago": 7
        }
    ]
}


def fetch_static_news(symbol):
    stories = []
    items = STATIC_NEWS.get(symbol, [])
    for entry in items:
        published_at = datetime.now(timezone.utc) - timedelta(days=entry.get("days_ago", 3))
        stories.append({
            "id": f"{symbol}-{entry.get('headline')[:12].replace(' ', '').lower()}",
            "symbol": symbol,
            "name": None,
            "headline": entry.get("headline"),
            "summary": entry.get("summary"),
            "sentiment": entry.get("sentiment", "Neutral"),
            "topic": entry.get("topic"),
            "published_at": published_at.isoformat(),
            "source": entry.get("source"),
            "url": entry.get("url")
        })
    return stories


def _extract_first_url(record):
    direct = record.get('link') or record.get('url')
    if isinstance(direct, str) and direct.startswith('http'):
        return direct

    content = record.get('content') or {}
    if isinstance(content, dict):
        for key in ('canonicalUrl', 'clickThroughUrl', 'previewUrl'):
            value = content.get(key)
            if isinstance(value, dict):
                url = value.get('url')
                if url and isinstance(url, str) and url.startswith('http'):
                    return url
        alt = content.get('providerContentUrl')
        if isinstance(alt, str) and alt.startswith('http'):
            return alt

    finance = record.get('finance') or {}
    if isinstance(finance, dict):
        preview = finance.get('stock', {}).get('link')
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

    return {
        "id": record.get('uuid') or f"{record.get('symbol')}-{provider_time}",
        "headline": title,
        "summary": summary or record.get('content'),
        "source": source,
        "url": url,
        "sentiment": 'Neutral',
        "topic": record.get('type') or record.get('topic') or content.get('category'),
        "published_at": published_at,
        "thumbnail": thumbnail
    }


@lru_cache(maxsize=128)
def fetch_live_news(symbol, limit=6, lookback_days=7):
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
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
        if not normalised.get("url"):
            continue
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

    if stories:
        return stories
    return fetch_static_news(symbol)


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
