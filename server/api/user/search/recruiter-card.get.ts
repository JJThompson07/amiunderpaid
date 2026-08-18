import { FieldPath, getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const territoryId = Number(query.territoryId);
  const category = String(query.category);

  if (!territoryId || !category) {
    throw createError({ statusCode: 400, message: 'Missing territoryId or category' });
  }

  const db = getFirestore();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const claimDocId = `${territoryId}_${category}`;
  const claimSnap = await db.collection('territory_category_owners').doc(claimDocId).get();

  if (!claimSnap.exists) {
    return { success: true, cards: [] };
  }

  const claimData = claimSnap.data() || {};
  const takenMonths = claimData.takenExclusiveMonths || {};
  const basicOwners = claimData.basicOwners || [];

  const exclusiveOwnerUid = takenMonths[currentMonthStr] || null;

  let selectedOwnerUids: string[] = [];

  // 1. Prioritise Exclusive Owner
  if (exclusiveOwnerUid) {
    selectedOwnerUids.push(exclusiveOwnerUid);
  } else if (basicOwners.length > 0) {
    // 2. If no exclusive, randomly distribute between Basic owners
    const shuffled = basicOwners.sort(() => 0.5 - Math.random());
    selectedOwnerUids = shuffled.slice(0, 3);
  }

  if (selectedOwnerUids.length === 0) {
    return { success: true, cards: [] };
  }

  // 3. Fetch the selected user profiles
  // We can fetch up to 10 in an 'in' query, and we only select up to 3!
  const usersSnap = await db
    .collection('users')
    .where(FieldPath.documentId(), 'in', selectedOwnerUids)
    .get();

  const selectedOwners = usersSnap.docs.map((doc) => ({
    uid: doc.id,
    data: doc.data(),
    isExclusive: doc.id === exclusiveOwnerUid
  }));

  // Return the resolved contact settings to be rendered in AmICardLeadContact
  const cards = await Promise.all(
    selectedOwners.map(async (owner) => {
      let settings = owner.data.contactSettings;

      // 1. Handle if it was saved as a stringified JSON
      if (typeof settings === 'string') {
        try {
          settings = JSON.parse(settings);
        } catch {
          // eslint-disable-next-line no-console -- surfaces malformed contactSettings JSON for debugging; no dedicated server-side error-logging utility exists
          console.error(`Failed to parse contactSettings for user ${owner.uid}`);
        }
      }

      // 2. Handle if it was saved in the dedicated collection
      if (!settings) {
        const snap = await db.collection('recruiter_contact_settings').doc(owner.uid).get();

        if (snap.exists) {
          settings = snap.data();
        }
      }

      // 3. Fallback to snake_case or base data
      settings =
        settings ||
        owner.data.recruiter_contact_settings ||
        owner.data.contact_settings ||
        owner.data;

      return {
        recruiterId: owner.uid,
        isExclusive: owner.isExclusive,
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
