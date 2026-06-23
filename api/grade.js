const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { system, userText } = req.body;
    if (!system || !userText) {
      return res.status(400).json({ error: 'Missing system or userText' });
    }

    const requestBody = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      system: system,
      messages: [{ role: 'user', content: userText }]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            resolve({ status: proxyRes.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Failed to parse Anthropic response'));
          }
        });
      });

      proxyReq.on('error', reject);
      proxyReq.write(requestBody);
      proxyReq.end();
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
