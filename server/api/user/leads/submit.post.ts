// server/api/user/leads/submit.post.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email, recruiterId, searchedRole, location } = body;

  if (!name || !email || !recruiterId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const db = getFirestore();

  try {
    const recruiterUserDoc = await db.collection('users').doc(recruiterId).get();

    if (!recruiterUserDoc.exists) {
      throw createError({ statusCode: 404, message: 'Recruiter not found' });
    }

    const recruiterUser = recruiterUserDoc.data() || {};

    // Prioritize the inboundEmail setting, fallback to their account login email
    const targetRecruiterEmail = recruiterUser.inboundEmail || recruiterUser.email;
    const agencyName =
      recruiterUser.agency_name || recruiterUser.agencyName || 'Our Partner Agency';

    // 2. Save the Lead to Firestore
    const leadRef = await db.collection('leads').add({
      recruiterId,
      candidateName: name,
      candidateEmail: email,
      searchedRole: searchedRole || 'Unknown Role',
      location: location || 'Unknown Location',
      status: 'new',
      createdAt: new Date().toISOString()
    });

    // 3. Queue Email to the Recruiter (Assuming Firebase Trigger Email Extension)
    if (targetRecruiterEmail) {
      await db.collection('mail').add({
        to: targetRecruiterEmail,
        message: {
          subject: `New Lead: ${name} is looking for ${searchedRole || 'opportunities'}`,
          html: `
            <h2>You have a new lead from AmIUnderpaid!</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Searched Role:</strong> ${searchedRole || 'N/A'}</p>
            <p><strong>Location:</strong> ${location || 'N/A'}</p>
            <br/>
            <p>Log in to your dashboard to manage this lead.</p>
          `,
          text: `You have a new lead from AmIUnderpaid!\n\nName: ${name}\nEmail: ${email}\nSearched Role: ${searchedRole || 'N/A'}\nLocation: ${location || 'N/A'}\n\nLog in to your dashboard to manage this lead.`
        }
      });
    }

    // 4. Queue Confirmation Email to the Candidate
    await db.collection('mail').add({
      to: email,
      message: {
        subject: `Your details have been sent to ${agencyName}`,
        html: `
          <h2>Thanks for reaching out!</h2>
          <p>Hi ${name},</p>
          <p>We have successfully passed your contact details over to the team at <strong>${agencyName}</strong>.</p>
          <p>One of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for <strong>${searchedRole || 'roles'}</strong> in <strong>${location || 'your area'}</strong>.</p>
          <br/>
          <p>Best regards,<br/>The AmIUnderpaid Team</p>
        `,
        text: `Thanks for reaching out!\n\nHi ${name},\n\nWe have successfully passed your contact details over to the team at ${agencyName}.\n\nOne of their hiring experts will be in touch with you shortly at this email address to discuss opportunities regarding your search for ${searchedRole || 'roles'} in ${location || 'your area'}.\n\nBest regards,\nThe AmIUnderpaid Team`
      }
    });

    return { success: true, leadId: leadRef.id };
  } catch (error: any) {
    console.error('Failed to process lead:', error);
    throw createError({ statusCode: 500, message: 'Internal server error processing lead' });
  }
});
