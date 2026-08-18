import { collection } from 'firebase/firestore';
import type { Ref } from 'vue';
import type { VueFirestoreQueryData } from 'vuefire';
import type { JobCategoryEntry } from '~~/shared/utils/market-data';

export const useCategories = (): {
  categories: Ref<VueFirestoreQueryData<JobCategoryEntry>>;
  loadingCategories: Ref<boolean>;
} => {
  const db = useFirestore();
  const categoriesRef = collection(db, 'adzuna_categories');

  // vuefire handles the real-time binding and caching automatically
  const { data: categories, pending: loadingCategories } =
    useCollection<JobCategoryEntry>(categoriesRef);

  return {
    categories,
    loadingCategories
  };
};
