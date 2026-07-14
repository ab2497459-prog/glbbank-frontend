require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name,data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'accounts');
  if (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
})();
