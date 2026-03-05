const { detectConflict } = require('../utils/timeHelpers');

// TODO: [INTEGRATION - ABDO] Uncomment the line below once the timeTable model is merged.
// const StudentSchedule = require('../models/timeTable.model'); 

const checkScheduleConflicts = async (req, res, next) => {
    try {
        const newSessions = req.body.sessions;

        if (!newSessions || !Array.isArray(newSessions) || newSessions.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid request. Please provide an array of sessions.' 
            });
        }

        // TODO: [INTEGRATION - ABDO] Replace the empty array below with the actual DB query.
        // NOTE: We are querying directly using the Firebase UID stored in the token.
        /* const firebaseUid = req.user.uid;
        const userSchedule = await StudentSchedule.findOne({ firebaseUid: firebaseUid });
        const existingSessions = userSchedule && userSchedule.sessions ? userSchedule.sessions : [];
        */
        
        // TEMPORARY PLACEHOLDER: Remove this line once the above block is active.
        const existingSessions = []; 

        const conflictResult = detectConflict(newSessions, existingSessions);

        if (conflictResult.hasConflict) {
            return res.status(409).json({
                success: false,
                message: conflictResult.message
            });
        }

        next();

    } catch (error) {
        console.error("Error in conflict detection middleware:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error during conflict verification.' 
        });
    }
};

module.exports = { checkScheduleConflicts };