// Vercel serverless function (Node runtime, ESM).
// Proxy server-to-server hacia la GraphQL API de GitHub: la contributionsCollection
// requiere un token autenticado (aunque los datos sean públicos), así que no se
// puede llamar directo desde el navegador. Único caller: js/git-history.js.
// Configurar en Vercel: GITHUB_TOKEN (PAT clásico sin scopes, o fine-grained
// read-only) y opcionalmente GITHUB_USERNAME (default: DavidAucancela).

const REQUEST_TIMEOUT_MS = 6000;
const WEEKS = 12;
const DEFAULT_USERNAME = 'DavidAucancela';

const QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(200).json({ days: [], totalContributions: null, mock: true });
    return;
  }

  const username = process.env.GITHUB_USERNAME || DEFAULT_USERNAME;
  const to   = new Date();
  const from = new Date(to.getTime() - WEEKS * 7 * 24 * 60 * 60 * 1000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login: username, from: from.toISOString(), to: to.toISOString() },
      }),
    });

    if (!response.ok) {
      res.status(200).json({ days: [], totalContributions: null, mock: true });
      return;
    }

    const json = await response.json();
    const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;

    if (!calendar) {
      res.status(200).json({ days: [], totalContributions: null, mock: true });
      return;
    }

    const days = calendar.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
    );

    res.status(200).json({
      days,
      totalContributions: calendar.totalContributions,
      username,
      mock: false,
    });
  } catch {
    res.status(200).json({ days: [], totalContributions: null, mock: true });
  } finally {
    clearTimeout(timeout);
  }
}
