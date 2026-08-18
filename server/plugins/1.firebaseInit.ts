export default defineNitroPlugin(() => {
  // nuxt-vuefire's own admin app (used to mint the __session cookie — see
  // node_modules/vuefire/dist/server, ensureAdminApp) resolves its credentials
  // from GOOGLE_APPLICATION_CREDENTIALS independently of useAdminApp() below.
  // This MUST run at Nitro runtime startup, not in nuxt.config.ts: that file's
  // top-level code only executes during `nuxt build`, and on serverless
  // platforms (Vercel) the build and the deployed runtime function are
  // separate processes, so a build-time process.env mutation never reaches
  // the function actually handling requests.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString(
        'utf-8'
      );
      // Parse and stringify to guarantee it is a single-line string
      process.env.GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify(JSON.parse(decoded));
    } catch (error) {
      // Intentional diagnostic log: this runs at server startup, before any
      // app-level logging utility is available.
      // eslint-disable-next-line no-console
      console.error('⚠️ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64', error);
    }
  }

  try {
    // This calls your newly bulletproofed Base64 function
    useAdminApp();
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: Failed to initialize Firebase Admin.',
      cause: error
    });
  }
});
