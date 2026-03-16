import { collection } from 'firebase/firestore';
import { useFirestore, useCollection } from 'vuefire';

export const useCategories = () => {
  const db = useFirestore();
  const categoriesRef = collection(db, 'adzuna_categories');

  // vuefire handles the real-time binding and caching automatically
  const { data: categories, pending: loadingCategories } = useCollection(categoriesRef);

  return {
    categories,
    loadingCategories
  };
};
