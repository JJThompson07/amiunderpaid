export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { collectionName, filters } = body;

  const count = await batchDelete(collectionName, filters);
  return { success: true, count };
});
