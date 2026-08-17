import { loadNuxtConfig } from '@nuxt/kit';
async function test() {
  const config = await loadNuxtConfig({});
  console.log("ssr is:", config.ssr);
}
test();
