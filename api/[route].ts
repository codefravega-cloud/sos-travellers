import * as account from "./_routes/account.js";
import * as admin from "./_routes/admin.js";
import * as agentEvents from "./_routes/agent-events.js";
import * as business from "./_routes/business.js";
import * as businessApplications from "./_routes/business-applications.js";
import * as cronSummary from "./_routes/cron-summary.js";
import * as events from "./_routes/events.js";
import * as guideLeads from "./_routes/guide-leads.js";
import * as owner from "./_routes/owner.js";
import * as ownerPhotos from "./_routes/owner-photos.js";
import * as partners from "./_routes/partners.js";
import * as places from "./_routes/places.js";
import * as promotions from "./_routes/promotions.js";
import * as rates from "./_routes/rates.js";
import * as reviews from "./_routes/reviews.js";
import * as suggestions from "./_routes/suggestions.js";
import * as team from "./_routes/team.js";
import * as travellerProfiles from "./_routes/traveller-profiles.js";
import * as weather from "./_routes/weather.js";

// The whole API is one Vercel Function: the Hobby plan allows 12 per deployment and there are more routes
// than that. /api/<name> is served by api/_routes/<name>.ts; a new route file must be added to this table.
type Handler = (request: Request) => Response | Promise<Response>;
const routes: Record<string, Partial<Record<string, Handler>>> = {
  account, admin, "agent-events": agentEvents, business, "business-applications": businessApplications,
  "cron-summary": cronSummary, events, "guide-leads": guideLeads, owner, "owner-photos": ownerPhotos,
  partners, places, promotions, rates, reviews, suggestions, team, "traveller-profiles": travellerProfiles, weather,
};

const dispatch = (method: string) => async (request: Request) => {
  const route = routes[new URL(request.url).pathname.split("/")[2] ?? ""];
  if (!route) return new Response(null, { status: 404 });
  const handler = route[method];
  return handler ? handler(request) : new Response(null, { status: 405 });
};

export const GET = dispatch("GET"), POST = dispatch("POST"), DELETE = dispatch("DELETE");
