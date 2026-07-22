// This is your BACKEND. It runs on Netlify's servers, not in the visitor's
// browser -- so the secret API key never gets sent to whoever is using your
// website. That's the entire reason this file exists.
//
// This version calls Google's Gemini API (free tier) instead of Claude,
// since Gemini's free tier doesn't require adding payment info.

exports.handler = async function (event) {
  // Websites can only ever POST data to this function -- reject anything else.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // This reads the secret key from Netlify's environment variables --
  // NOT from this file. You'll set this value in the Netlify dashboard,
  // never write the actual key into your code.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing its API key. Set GEMINI_API_KEY in Netlify settings.' })
    };
  }

  try {
    // The website sends us just the "prompt" text it wants a draft for.
    const { prompt } = JSON.parse(event.body);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    // Gemini's response shape is different from Claude's -- pull the text out
    // of candidates[0].content.parts[0].text instead of content[].text
    const draftText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return {
      statusCode: 200,
      body: JSON.stringify({ draft: draftText })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong generating the draft.' })
    };
  }
};
