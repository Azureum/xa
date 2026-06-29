export function GET() {
  return Response.json({
    ok: true,
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
  });
}
