import { sendSms, toE164 } from "#/server/api/lib/sms.js";

async function testSms() {
  // Test technician number
  const techRaw = "0558641826";
  const techPhone = toE164("+233", techRaw);
  console.log(`Technician raw: ${techRaw} -> E.164: ${techPhone} -> smsonlinegh: ${techPhone.replace(/^\+/, "")}`);
  
  // Test student number
  const studentCountryCode = "233";
  const studentRaw = "558641826";
  const studentPhone = toE164(studentCountryCode, studentRaw);
  console.log(`Student raw: ${studentCountryCode} ${studentRaw} -> E.164: ${studentPhone} -> smsonlinegh: ${studentPhone.replace(/^\+/, "")}`);

  // Test sending
  const techMsg = "TEST: KNH Repair assignment test for technician";
  const studentMsg = "TEST: KNH Repair assignment test for student";
  
  console.log("\n--- Sending to technician ---");
  try {
    await sendSms(techPhone, techMsg);
    console.log("Technician SMS sent successfully!");
  } catch (e) {
    console.error("Technician SMS failed:", e);
  }

  console.log("\n--- Sending to student ---");
  try {
    await sendSms(studentPhone, studentMsg);
    console.log("Student SMS sent successfully!");
  } catch (e) {
    console.error("Student SMS failed:", e);
  }
}

testSms();