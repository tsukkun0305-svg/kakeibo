import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }
  const userId = users[0].id;
  console.log("User ID:", userId);

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, item_name, amount, transaction_date, source_subscription_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) console.error("Error:", error);
  else console.log(JSON.stringify(txs, null, 2));
}
check();
