const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    envVars[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // 1. Fetch data from DB
    const { data: localidades, error: locErr } = await supabase.from('localidades').select('*');
    if (locErr) throw locErr;
    
    const { data: clientes, error: cliErr } = await supabase.from('clientes').select('*');
    if (cliErr) throw cliErr;
    
    const { data: agroveterinarias, error: agroErr } = await supabase.from('agroveterinarias').select('*');
    if (agroErr) throw agroErr;
    
    const { data: agroProductos, error: prodErr } = await supabase.from('agroveterinaria_productos').select('*');
    if (prodErr) throw prodErr;

    // 2. Select 5 clients per localidad
    const selectedClients = [];
    const usedDnis = new Set();
    
    const targetLocalities = ['Asillo', 'Ayaviri', 'Azángaro', 'Chupaca'];
    
    for (const locName of targetLocalities) {
      const localidad = localidades.find(l => l.nombre === locName);
      if (!localidad) continue;
      
      const clientsInLoc = clientes.filter(c => c.localidad_id === localidad.id);
      
      // Take first 5 clients
      const clientsToSelect = clientsInLoc.slice(0, 5);
      
      for (const client of clientsToSelect) {
        selectedClients.push({ client, localidad });
        usedDnis.add(client.dni);
      }
    }
    
    // 3. Prepare inserts
    const canjesToInsert = [];
    
    for (const { client, localidad } of selectedClients) {
      // Find an agroveterinaria in this locality
      const agrosInLoc = agroveterinarias.filter(a => a.localidad_id === localidad.id);
      if (agrosInLoc.length === 0) continue;
      
      const selectedAgro = agrosInLoc[0]; // Just pick the first one available
      
      // Find a product for this agroveterinaria
      const prodsForAgro = agroProductos.filter(ap => ap.agroveterinaria_id === selectedAgro.id);
      if (prodsForAgro.length === 0) continue;
      
      const selectedProd = prodsForAgro[0]; // Pick first product
      
      const precio = Number(selectedProd.precio_venta);
      const descuento_pct = Number(selectedProd.descuento_pct);
      const monto_descontado = (precio * descuento_pct) / 100;
      const total_pagado = precio - monto_descontado;
      
      canjesToInsert.push({
        cliente_dni: client.dni,
        agroveterinaria_id: selectedAgro.id,
        producto_id: selectedProd.producto_id,
        precio: precio,
        descuento_pct: descuento_pct,
        monto_descontado: monto_descontado,
        total_pagado: total_pagado,
        fecha: new Date().toISOString()
      });
    }
    
    console.log(`Prepared ${canjesToInsert.length} canjes to insert.`);
    
    // 4. Insert into DB
    if (canjesToInsert.length > 0) {
      // Delete existing canjes just in case to avoid duplicates (the user said "No elimines ningún dato existente" but of the other tables. The canjes table should be empty, but if there's any, it might conflict, so I'll just insert).
      // Since it's public insert, I might not have delete permission if there's no delete policy, so I'll just insert and let it fail if duplicated.
      
      const { data, error } = await supabase.from('canjes').insert(canjesToInsert).select('cliente_dni');
      if (error) {
        console.error("Error inserting canjes:", error);
      } else {
        console.log("Successfully inserted canjes.");
        console.log("LIST OF DNIs:");
        canjesToInsert.forEach(c => console.log(c.cliente_dni));
      }
    } else {
      console.log("No canjes prepared.");
    }
    
  } catch (err) {
    console.error("Script error:", err);
  }
}

main();
