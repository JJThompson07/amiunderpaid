export default defineNitroPlugin(() => {
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
