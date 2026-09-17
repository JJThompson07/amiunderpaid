// server/api/user/leads/submit.post.ts
import { getFirestore } from 'firebase-admin/firestore';
import {
  getBrandName,
  renderBrandedEmail,
  resolveBrandFromHost
} from '~~/server/utils/emailTemplate';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email, recruiterId, searchedRole, location } = body;

  if (!name || !email || !recruiterId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, message: 'Invalid email format' });
  }

  const sanitizeHTML = (str: string): string => {
    if (!str) {
      return '';
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const safeName = sanitizeHTML(name);
  const safeSearchedRole = sanitizeHTML(searchedRole);
  const safeLocation = sanitizeHTML(location);

  const { brand, siteUrl } = resolveBrandFromHost(event);
  const db = getFirestore();

  try {
    const recruiterUserDoc = await db.collection('users').doc(recruiterId).get();

    if (!recruiterUserDoc.exists) {
      throw createError({ statusCode: 404, message: 'Recruiter not found' });
    }

    const recruiterUser = recruiterUserDoc.data() || {};

    // Prioritize the inboundEmail setting, fallback to their account login email
    const targetRecruiterEmail = recruiterUser.inboundEmail || recruiterUser.email;
    const rawAgencyName =
      recruiterUser.agency_name || recruiterUser.agencyName || 'Our Partner Agency';
    const safeAgencyName = sanitizeHTML(rawAgencyName);

    // 2. Save the Lead to Firestore
    const leadRef = await db.collection('leads').add({
      recruiterId,
      candidateName: safeName,
      candidateEmail: email,
      searchedRole: safeSearchedRole || 'Unknown Role',
      location: safeLocation || 'Unknown Location',
      status: 'new',
      createdAt: new Date().toISOString()
    });

    // 3. Queue Email to the Recruiter (Assuming Firebase Trigger Email Extension)
    if (targetRecruiterEmail) {
      await db.collection('mail').add({
        to: targetRecruiterEmail,
        message: {
          subject: `New Lead: ${safeName} is looking for ${safeSearchedRole || 'opportunities'}`,
          html: renderBrandedEmail({
            brand,
            siteUrl,
            heading: 'You have a new lead!',
            paragraphs: ['Log in to your dashboard to manage this lead.'],
            dataBox: [
              { label: 'Name', value: name },
              { label: 'Email', value: email },
              { label: 'Searched Role', value: searchedRole || 'N/A' },
              { label: 'Location', value: location || 'N/A' }
            ],
            cta: { label: 'View Lead in Dashboard', url: `${siteUrl}/recruiter/leads` }
          }),
          text: `You have a new lead!\n\nName: ${safeName}\nEmail: ${email}\nSearched Role: ${safeSearchedRole || 'N/A'}\nLocation: ${safeLocation || 'N/A'}\n\nLog in to your dashboard to manage this lead: ${siteUrl}/recruiter/leads`
        }
      });
    }

    // 4. Queue Confirmation Email to the Candidate
    await db.collection('mail').add({
      to: email,
      message: {
        subject: `Your details have been sent to ${safeAgencyName}`,
        html: renderBrandedEmail({
          brand,
          siteUrl,
          heading: 'Thanks for reaching out!',
          paragraphs: [
            `Hi ${name},`,
            `We have successfully passed your contact details over to the team at ${rawAgencyName}.`,
            `One of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for ${searchedRole || 'roles'} in ${location || 'your area'}.`
          ]
        }),
        text: `Thanks for reaching out!\n\nHi ${safeName},\n\nWe have successfully passed your contact details over to the team at ${safeAgencyName}.\n\nOne of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for ${safeSearchedRole || 'roles'} in ${safeLocation || 'your area'}.\n\nBest regards,\nThe ${getBrandName(brand)} Team`
      }
    });

    return { success: true, leadId: leadRef.id };
  } catch (error) {
    if (isError(error)) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Internal server error processing lead' });
  }
});
