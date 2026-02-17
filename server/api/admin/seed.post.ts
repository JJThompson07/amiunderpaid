export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const body = await readBody(event);
  const { collectionName, data } = body;

  const count = await batchSeed(collectionName, data);
  return { success: true, count };
});
