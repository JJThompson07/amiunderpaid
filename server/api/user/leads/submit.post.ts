// server/api/user/leads/submit.post.ts
import { getFirestore } from 'firebase-admin/firestore';

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
          html: `
            <h2>You have a new lead from AmIUnderpaid!</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Searched Role:</strong> ${safeSearchedRole || 'N/A'}</p>
            <p><strong>Location:</strong> ${safeLocation || 'N/A'}</p>
            <br/>
            <p>Log in to your dashboard to manage this lead.</p>
          `,
          text: `You have a new lead from AmIUnderpaid!\n\nName: ${safeName}\nEmail: ${email}\nSearched Role: ${safeSearchedRole || 'N/A'}\nLocation: ${safeLocation || 'N/A'}\n\nLog in to your dashboard to manage this lead.`
        }
      });
    }

    // 4. Queue Confirmation Email to the Candidate
    // Security Remediation: XSS prevention by ensuring agencyName is sanitized before HTML injection
    await db.collection('mail').add({
      to: email,
      message: {
        subject: `Your details have been sent to ${safeAgencyName}`,
        html: `
          <h2>Thanks for reaching out!</h2>
          <p>Hi ${safeName},</p>
          <p>We have successfully passed your contact details over to the team at <strong>${safeAgencyName}</strong>.</p>
          <p>One of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for <strong>${safeSearchedRole || 'roles'}</strong> in <strong>${safeLocation || 'your area'}</strong>.</p>
          <br/>
          <p>Best regards,<br/>The AmIUnderpaid Team</p>
        `,
        text: `Thanks for reaching out!\n\nHi ${safeName},\n\nWe have successfully passed your contact details over to the team at ${safeAgencyName}.\n\nOne of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for ${safeSearchedRole || 'roles'} in ${safeLocation || 'your area'}.\n\nBest regards,\nThe AmIUnderpaid Team`
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
