const xlsx = require('xlsx');
const wb = xlsx.readFile('data/Diseño_Módulo_Beneficios_Servicios.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
console.log(JSON.stringify(xlsx.utils.sheet_to_json(sheet), null, 2));
