// Netlify function — fetch recent Strava activities
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const token = event.queryStringParameters?.token;
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No token' }) };
  }

  try {
    const resp = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=10&page=1',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
