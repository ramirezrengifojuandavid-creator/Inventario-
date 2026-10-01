const { Redis } = require('@upstash/redis');

// Vercel inyecta estas variables automáticamente al conectar la integración de Upstash
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  automaticDeserialization: false, // guardamos y leemos siempre strings "en crudo"
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    let op, key, value, prefix;
    if (req.method === 'GET') {
      op = req.query.op;
      key = req.query.key;
      prefix = req.query.prefix;
    } else {
      const body = req.body || {};
      op = body.op;
      key = body.key;
      value = body.value;
      prefix = body.prefix;
    }

    if (!op) { res.status(400).json({ error: 'falta el parametro op' }); return; }

    if (op === 'get') {
      const raw = await redis.get(key);
      if (raw === null || raw === undefined) { res.status(404).json({ error: 'not_found' }); return; }
      res.status(200).json({ key, value: raw });
      return;
    }

    if (op === 'set') {
      await redis.set(key, value);
      res.status(200).json({ key, value });
      return;
    }

    if (op === 'delete') {
      await redis.del(key);
      res.status(200).json({ key, deleted: true });
      return;
    }

    if (op === 'list') {
      const keys = await redis.keys((prefix || '') + '*');
      res.status(200).json({ keys, prefix: prefix || '' });
      return;
    }

    res.status(400).json({ error: 'operacion desconocida: ' + op });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
