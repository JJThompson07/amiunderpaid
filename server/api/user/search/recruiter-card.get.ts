import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const territoryId = Number(query.territoryId);
  const category = String(query.category);

  if (!territoryId || !category) {
    return createError({ statusCode: 400, message: 'Missing territoryId or category' });
  }

  const db = getFirestore();
  const usersSnap = await db.collection('users').where('role', '==', 'recruiter').get();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let exclusiveOwner = null;
  const basicOwners: any[] = [];

  // Find who owns this territory/category this month
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const activeTerritories = data.activeTerritories || [];

    const matchedTerritory = activeTerritories.find(
      (t: any) => t.territoryId === territoryId && t.categoryValue === category
    );

    if (matchedTerritory) {
      if (matchedTerritory.exclusiveMonths?.includes(currentMonthStr)) {
        exclusiveOwner = { uid: doc.id, data };
        break; // Exclusive overrides basic, stop searching!
      } else if (matchedTerritory.isBasic) {
        basicOwners.push({ uid: doc.id, data });
      }
    }
  }

  // 1. Prioritise Exclusive Owner
  // 2. If no exclusive, randomly distribute between Basic owners
  let selectedOwners: any[] = [];
  if (exclusiveOwner) {
    selectedOwners.push(exclusiveOwner);
  } else if (basicOwners.length > 0) {
    // Shuffle array to randomize which basic recruiters show up
    const shuffled = basicOwners.sort(() => 0.5 - Math.random());
    // Take up to 3 recruiters
    selectedOwners = shuffled.slice(0, 3);
  }

  if (selectedOwners.length === 0) {
    return { success: true, cards: [] };
  }

  // Return the resolved contact settings to be rendered in AmICardLeadContact
  const cards = await Promise.all(
    selectedOwners.map(async (owner) => {
      let settings = owner.data.contactSettings;

      // 1. Handle if it was saved as a stringified JSON
      if (typeof settings === 'string') {
        try {
          settings = JSON.parse(settings);
        } catch {
          console.error(`Failed to parse contactSettings for user ${owner.uid}`);
        }
      }

      // 2. Handle if it was saved in the dedicated collection
      if (!settings) {
        const snap = await db.collection('recruiter_contact_settings').doc(owner.uid).get();

        if (snap.exists) settings = snap.data();
      }

      // 3. Fallback to snake_case or base data
      settings =
        settings ||
        owner.data.recruiter_contact_settings ||
        owner.data.contact_settings ||
        owner.data;

      return {
        recruiterId: owner.uid,
        isExclusive: !!exclusiveOwner,
        title: settings.title || settings.contactTitle || null,
        content: settings.content || settings.contactContent || null,
        categoryContent: settings.categoryContent?.[category] || null,
        brandBgColour: settings.brandBgColour || settings.brand_bg_colour || '#4f46e5',
        brandTextColour: settings.brandTextColour || settings.brand_text_colour || '#ffffff',
        buttonText: settings.buttonText || settings.button_text || null,
        logoUrl: settings.logoUrl || settings.logo_url || null,
        agencyName: owner.data.agency_name || owner.data.agencyName || null
      };
    })
  );

  return {
    success: true,
    cards
  };
});
