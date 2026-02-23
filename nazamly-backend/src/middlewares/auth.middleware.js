const admin = require("../config/firebase");

const requireAuth = async (req , res , next)=>{
    /*
        طيب تعالي نشرح الموضوع ببساطه
        اي حد لما يجي يعمل لوجين او ريجستر هيبقا له توكن 
        لما نيجي نتعامل مع بوست مان هتفهموه كويس 
        لما نيجي نعمل ريكوست لازم نبعت التوكن ده في الهيدر عشان السيرفر يقدر يتأكد ان الشخص ده مسموح له يدخل ولا لأ
        السيرفر هيستقبل الريكوست ويشوف هل فيه توكن ولا لأ 
        لو مفيش هيرجع 401 Unauthorized

        ممكن يكون قريب من الgateway
        
    */
    try{
        const token = req.headers.authorization?.split("Bearer ")[1];
        if(!token) return res.status(401).json({message:"Unauthorized"});

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        
        next();
        // next() ببساطه بتعدي للراوت للي بعده 
    }
    catch(err){
        console.error(err);
        res.status(401).json({message:"Unauthorized"});
    }
}

module.exports = requireAuth;