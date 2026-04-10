export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, content, boardingHouseId } = req.body;

  if (!title || !content || !boardingHouseId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: content },
        filters: [
          { field: 'tag', key: 'boarding_house_id', relation: '=', value: boardingHouseId }
        ]
      }),
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
