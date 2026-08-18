import { doc, type DocumentReference, setDoc } from 'firebase/firestore';
import type { Ref } from 'vue';

export type PricingBand = {
  basic: number;
  exclusive: number;
};

export type CountryPricingBands = {
  band1: PricingBand;
  band2: PricingBand;
  band3: PricingBand;
  band4: PricingBand;
  band5: PricingBand;
};

export type PricingConfig = {
  UK: CountryPricingBands;
  USA: CountryPricingBands;
  updatedAt?: string;
};

type UsePricingReturn = {
  pricingData: Ref<PricingConfig | undefined>;
  loadingPricing: Ref<boolean>;
  updatePricing: (newPricingData: Partial<PricingConfig>) => Promise<boolean>;
};

export const usePricing = (): UsePricingReturn => {
  const db = useFirestore();

  // Point directly to our single source of truth for pricing
  const pricingRef = doc(db, 'platform_settings', 'pricing') as DocumentReference<PricingConfig>;

  // Vuefire handles the real-time websocket sync and caching automatically
  const { data: pricingData, pending: loadingPricing } = useDocument(pricingRef);

  // The update function used exclusively by the Admin panel
  const updatePricing = async (newPricingData: Partial<PricingConfig>): Promise<boolean> => {
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
      // eslint-disable-next-line no-console -- surfaces Firestore write failures for admin debugging; no dedicated error-logging utility exists in the composables layer yet
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
