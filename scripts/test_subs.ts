import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking users...");
  const { data: users, error: uErr } = await supabase.from('users').select('id, email').limit(5);
  console.log("Users:", users, uErr);

  console.log("Checking subscriptions...");
  const { data: subs, error: sErr } = await supabase.from('subscriptions').select('*').limit(5);
  console.log("Subscriptions:", subs, sErr);
  
  if (users?.length > 0) {
    const userId = users[0].id;
    console.log("Trying to insert sub for user:", userId);
    const { data: ins, error: insErr } = await supabase.from('subscriptions').insert({
      user_id: userId,
      name: 'Test Sub',
      amount: 1000,
      billing_day: 1
    }).select();
    console.log("Insert result:", ins, insErr);
  }
}
check();
