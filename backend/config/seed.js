require("dotenv").config({ path: "../.env" });
const db = require("./db");
const bcrypt = require("bcryptjs");

async function seed() {
  // Admin user
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@2024", 12);
  await db.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ($1,$2,$3,'admin')
    ON CONFLICT (email) DO NOTHING
  `, ["Admin", process.env.ADMIN_EMAIL || "admin@smartsalon.in", hash]);

  // Services
  const services = [
    ["Signature Haircut","Precision cut tailored to your face shape and lifestyle.",599,45,"✂️","Hair"],
    ["Beard Sculpting","Expert beard shaping, lining, and hot-towel finish.",399,30,"🪒","Grooming"],
    ["Hair Coloring","Full color, highlights, balayage, or ombre.",1499,90,"🎨","Hair"],
    ["Luxury Facial","Deep cleanse, exfoliation, and hydration ritual.",999,60,"💆","Skin"],
    ["Hair Spa","Scalp massage + deep conditioning treatment.",799,60,"🌿","Hair"],
    ["Bridal Package","Head-to-toe preparation for your perfect day.",4999,180,"👑","Special"],
  ];
  for (const [name,desc,price,dur,icon,cat] of services) {
    await db.query(`
      INSERT INTO services (name,description,price,duration,icon,category)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
    `, [name,desc,price,dur,icon,cat]);
  }

  // Time slots
  const slots = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00"];
  for (const s of slots) {
    await db.query(`INSERT INTO time_slot_configs (slot_time) VALUES ($1) ON CONFLICT DO NOTHING`, [s]);
  }

  // Courses
  const courses = [
    ["Professional Hair Cutting Mastery","Master precision cutting techniques used by top stylists.",4999,8,12,"BESTSELLER"],
    ["Advanced Color Techniques","Balayage, ombre, highlights — complete color mastery.",6999,10,16,"NEW"],
    ["Men's Grooming Professional","Beard sculpting, skin care, and barbering essentials.",3499,6,9,"POPULAR"],
  ];
  for (const [title,desc,price,dur,lessons,tag] of courses) {
    await db.query(`
      INSERT INTO courses (title,description,price,duration_hrs,lesson_count,tag)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
    `, [title,desc,price,dur,lessons,tag]);
  }

  console.log("✅ Seed complete");
}

module.exports = { run: seed };

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
