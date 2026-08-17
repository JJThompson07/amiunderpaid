import { verifyAdmin } from '../utils/firebase';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // Intercept all /api/admin/* routes
  // We use strict matching here to avoid any substring-bypass vulnerabilities
  if (path.startsWith('/api/admin/')) {
    await verifyAdmin(event);
  }
});
