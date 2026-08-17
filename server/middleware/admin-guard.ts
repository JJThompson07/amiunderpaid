import { verifyAdmin } from '../utils/firebase';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // Intercept all /api/admin/* routes except migrate-claims (which needs to set the claim first)
  if (path.startsWith('/api/admin/') && !path.includes('migrate-claims')) {
    await verifyAdmin(event);
  }
});
