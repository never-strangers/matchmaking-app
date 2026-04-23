const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jlcqtfxqaxbvnbnvsptb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3F0ZnhxYXhidm5ibnZzcHRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzUzMDcxNywiZXhwIjoyMDc5MTA2NzE3fQ.gTI3fUIGlUTxIkXzw-cjpi673rI0nurgULw5rIM07OM', { auth: { persistSession: false } });

const EVENT_ID = '24b97504-0130-4a7e-b9b3-881c6485bd5c';

const USERS = [
  {
    id: '15dbd8ee-9c31-4848-920f-3c3f28e57f69',
    email: 'ty.reodica@gmail.com',
    name: 'Tyrone Reodica',
    display_name: 'Tyrone',
    gender: 'male',
    city: 'mnl',
    instagram: 'tyronereodica',
    dob: '1996-09-09',
    attracted_to: ['men', 'women'],
    looking_for: ['friends', 'date'],
  },
  {
    id: 'c9b5f2d2-a826-48e0-9264-42c28eb7c352',
    email: 'dhaveyg123@gmail.com',
    name: 'Dave Bernaldez',
    display_name: 'Dave',
    gender: 'male',
    city: 'mnl',
    instagram: 'davebernaldez',
    dob: '1995-07-25',
    attracted_to: ['men'],
    looking_for: ['date'],
  },
];

async function main() {
  for (const user of USERS) {
    console.log('
Processing ' + user.name + '...');

    var profileData = {
      id: user.id,
      email: user.email,
      name: user.name,
      display_name: user.display_name,
      full_name: user.name,
      gender: user.gender,
      city: user.city,
      instagram: user.instagram,
      dob: user.dob,
      attracted_to: user.attracted_to,
      status: 'approved',
      updated_at: new Date().toISOString(),
    };

    var profileRes = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
    if (profileRes.error) {
      console.error('  Profile upsert failed: ' + profileRes.error.message);
      continue;
    }
    console.log('  Profile upserted & approved');

    var attendeeRes = await supabase.from('event_attendees').upsert({
      event_id: EVENT_ID,
      profile_id: user.id,
      payment_status: 'paid',
      ticket_status: 'confirmed',
      checked_in: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,profile_id' });

    if (attendeeRes.error) {
      console.error('  Add to event failed: ' + attendeeRes.error.message);
    } else {
      console.log('  Added to event');
    }
  }
  console.log('
Done.');
}

main().catch(function(err) { console.error(err); process.exit(1); });
