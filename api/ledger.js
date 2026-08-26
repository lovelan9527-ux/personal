export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        ok: false,
        error: 'Method not allowed'
      });
    }

    const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL;
    const GAS_API_SECRET = process.env.GAS_API_SECRET;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!GAS_WEB_APP_URL || !GAS_API_SECRET || !ADMIN_PASSWORD) {
      return res.status(500).json({
        ok: false,
        error: 'Vercel 環境變數尚未設定完整'
      });
    }

    const body = req.body || {};
    const action = body.action;

    if (!action) {
      return res.status(400).json({
        ok: false,
        error: '缺少 action'
      });
    }

    if (action === 'loadState') {
      const gasResult = await callGas({
        action: 'loadState',
        secret: GAS_API_SECRET
      });

      return res.status(200).json(gasResult);
    }

    if (action === 'commitOperation') {
      if (String(body.adminPassword || '') !== String(ADMIN_PASSWORD)) {
        return res.status(401).json({
          ok: false,
          error: '管理員密碼錯誤'
        });
      }

      const gasResult = await callGas({
        action: 'commitOperation',
        secret: GAS_API_SECRET,
        operation: body.operation
      });

      return res.status(200).json(gasResult);
    }

    return res.status(400).json({
      ok: false,
      error: '未知 action：' + action
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

async function callGas(payload) {
  const response = await fetch(process.env.GAS_WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Apps Script 回傳不是 JSON：' + text.slice(0, 300));
  }

  if (!response.ok) {
    throw new Error(data.error || 'Apps Script HTTP 錯誤');
  }

  return data;
}
