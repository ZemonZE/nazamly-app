const fs = require('fs');
const file = 'd:/nazamly-app/nazamly-backend/src/controllers/admin.controller.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const correctClosing = `    res.status(200).json({
      message: \\\`Profiling complete! DoctorInsight created for Dr. \${courseInstance.doctorId.name} — \${courseInstance.courseId.courseName}.\\\`,
      questionsAnalyzed: archivedQuestions.length,
      insight,
    });
  } catch (error) {
    console.error('Error triggering profiling:', error.message);
    res.status(500).json({ error: 'Profiling failed', details: error.message });
  }
};`;

lines.splice(544, 206, correctClosing);
fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed syntax boundaries.');
