"""Posts due Daily Word cards to the Facebook Page and Instagram.
Reads social/queue.json; each item: id, at (ISO time with zone), img (path on the site), fb, ig captions.
Secrets: META_PAGE_TOKEN (Page access token), META_PAGE_ID, META_IG_ID. Runs from GitHub Actions every 15 minutes."""
import json, os, time, urllib.request, urllib.parse, datetime as dt
G = 'https://graph.facebook.com/v21.0/'
SITE = 'https://daily-word-reflections.github.io/'
TOKEN, PAGE, IG = os.environ.get('META_PAGE_TOKEN', ''), os.environ.get('META_PAGE_ID', ''), os.environ.get('META_IG_ID', '')
Q = 'social/queue.json'

def call(path, data):
    req = urllib.request.Request(G + path, data=urllib.parse.urlencode(dict(data, access_token=TOKEN)).encode(), method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode()[:400]}

def get(path):
    try:
        with urllib.request.urlopen(G + path + ('&' if '?' in path else '?') + 'access_token=' + TOKEN, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode()[:400]}

def main():
    if not TOKEN:
        print('no token'); return
    q = json.load(open(Q, encoding='utf-8'))
    now = dt.datetime.now(dt.timezone.utc)
    changed = False
    for it in q:
        at = dt.datetime.fromisoformat(it['at'])
        if at > now or now - at > dt.timedelta(hours=6):
            continue
        url = SITE + it['img']
        if PAGE and not it.get('fb_id') and it.get('tries_fb', 0) < 3:
            r = call(PAGE + '/photos', {'url': url, 'caption': it['fb'], 'alt_text_custom': it.get('alt', '')})
            if 'error' in r and 'alt_text' in r['error']:
                r = call(PAGE + '/photos', {'url': url, 'caption': it['fb']})
            it['tries_fb'] = it.get('tries_fb', 0) + 1
            if 'error' in r: it['fb_err'] = r['error']
            else: it['fb_id'] = r.get('post_id') or r.get('id'); it.pop('fb_err', None)
            changed = True
        if IG and not it.get('ig_id') and it.get('tries_ig', 0) < 3:
            it['tries_ig'] = it.get('tries_ig', 0) + 1
            c = call(IG + '/media', {'image_url': url, 'caption': it['ig'], 'alt_text': it.get('alt', '')})
            if 'error' in c and 'alt_text' in c['error']:
                c = call(IG + '/media', {'image_url': url, 'caption': it['ig']})
            if 'error' in c: it['ig_err'] = c['error']
            else:
                for _ in range(12):
                    s = get(c['id'] + '?fields=status_code')
                    if s.get('status_code') == 'FINISHED': break
                    time.sleep(5)
                p = call(IG + '/media_publish', {'creation_id': c['id']})
                if 'error' in p: it['ig_err'] = p['error']
                else: it['ig_id'] = p.get('id'); it.pop('ig_err', None)
            changed = True
        print(it['id'], it.get('fb_id'), it.get('ig_id'), it.get('fb_err', '')[:80], it.get('ig_err', '')[:80])
    if changed:
        json.dump(q, open(Q, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
