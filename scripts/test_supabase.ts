import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection to:', supabaseUrl);
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    console.log('Successfully fetched users:', users);
  }

  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);

  if (transError) {
    console.error('Error fetching transactions:', transError);
  } else {
    console.log('Successfully fetched transactions:', transactions);
  }
}

test();
