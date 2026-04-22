import { doc, setDoc } from 'firebase/firestore';

export const usePricing = () => {
  const db = useFirestore();

  // Point directly to our single source of truth for pricing
  const pricingRef = doc(db, 'platform_settings', 'pricing');

  // Vuefire handles the real-time websocket sync and caching automatically
  const { data: pricingData, pending: loadingPricing } = useDocument(pricingRef);

  // The update function used exclusively by the Admin panel
  const updatePricing = async (newPricingData: Record<string, any>) => {
    try {
      // Using { merge: true } ensures we only update the pricing fields
      // and don't accidentally wipe out other platform settings if we
      // add more data to this document in the future.
      await setDoc(
        pricingRef,
        {
          ...newPricingData,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error('🔥 Error updating pricing:', error);
      throw error;
    }
  };

  return {
    pricingData,
    loadingPricing,
    updatePricing
  };
};
