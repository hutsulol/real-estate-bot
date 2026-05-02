require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    'https://ixxvfvtdomhenwqhpyqj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eHZmdnRkb21oZW53cWhweXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTU5NDQsImV4cCI6MjA5MzI5MTk0NH0.vN_PmGqaLsffZLRkFgFRckQhTGoIQnW22u_o12Bpuho'
);

const data = JSON.parse(fs.readFileSync('final-data.json', 'utf-8'));

(async () => {
  console.log('Загружаем в базу...');

  for (let item of data) {
    const { error } = await supabase.from('apartments').insert({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
      rooms: item.rooms,
      district: item.district,
      residential_complex: item.residential_complex,
      street: item.street,
      link: item.link,
      deal_type: item.deal_type // 🔥 ВАЖНО
    });

    if (error) {
      console.log(error);
    }
  }

  console.log('Готово 🚀');
})();