// Vercel Serverless Function - GitHub proxy
// GH_TOKEN is stored in Vercel environment variables, never exposed to client

const GH_REPO = 'caaiiruu/trip-planner';
const GH_FILE = 'db.json';
const GH_API = `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin.endsWith('.vercel.app') || origin === 'http://localhost:9999') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server misconfigured' });

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'trip-planner-proxy',
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(GH_API, { headers: ghHeaders });
      if (!r.ok) return res.status(r.status).json({ error: 'GitHub read failed' });
      const data = await r.json();
      return res.status(200).json({ sha: data.sha, content: data.content });
    }

    if (req.method === 'PUT') {
      const { content, sha, message } = req.body;
      if (!content || !sha) return res.status(400).json({ error: 'Missing content or sha' });
      const r = await fetch(GH_API, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || 'sync: update trip data', content, sha }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'GitHub write failed' });
      return res.status(200).json({ sha: data.content?.sha });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
