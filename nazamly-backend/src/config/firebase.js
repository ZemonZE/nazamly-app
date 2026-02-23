const admin = require("firebase-admin");
// اللي فوق ديه الباكج اللي بنستخدمها عشان نتعامل مع الفايربيز من خلال السيرفر
const serviceAccount = require("../../nazamly-c242c-firebase-adminsdk-fbsvc-4269b3e825.json");
// الملف اللي فيه بيانات الاتصال بين السيرفر والفايربيز
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// من الاخر بشغله زي ما هو كده عشان يقدر يتصل بالفايربيز ويستخدمه في باقي الكود
// ana ele katb elkalam dah y4bab m4 chatg
module.exports = admin;