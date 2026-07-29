import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dexsmsoqyfbtfhaxfagp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRleHNtc29xeWZidGZoYXhmYWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTczMTYsImV4cCI6MjEwMDQzMzMxNn0.kU1R5a_MMdRS1jBxFGfVWTKK9JZOFtmZdnSDQ_RyrBM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
      .from('canje_detalles')
      .select('*');

  console.log('Result:', JSON.stringify({data, error}, null, 2));
}

test();
