/**
 * PDF Export Performance Test
 * 
 * This utility measures the performance of PDF export functionality
 * to ensure it completes within the 3.3 second requirement (Req 13.1)
 * 
 * Usage:
 * 1. Import this in Generator.jsx
 * 2. Call testPDFExportPerformance() with sample schedule data
 * 3. Check console for results
 */

/**
 * Creates sample schedule data for testing
 */
export function createSampleScheduleData() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const subjects = [
    'Data Structures',
    'Algorithms',
    'Database Systems',
    'Operating Systems',
    'Computer Networks',
    'Software Engineering',
    'Web Development',
    'Mobile Development'
  ];
  const types = ['ن', 'ت', 'ع']; // Lecture, Section, Lab
  const groups = ['1', '2', '3', '4', '5'];
  const places = ['Hall A', 'Hall B', 'Lab 1', 'Lab 2', 'Room 301', 'Room 302'];
  
  const schedule = [];
  let id = 1;
  
  // Create a realistic schedule with 20-25 items
  days.forEach((day, dayIndex) => {
    const itemsPerDay = Math.floor(Math.random() * 3) + 3; // 3-5 items per day
    
    for (let i = 0; i < itemsPerDay; i++) {
      const startHour = 8 + (i * 2);
      const endHour = startHour + 2;
      
      schedule.push({
        id: id++,
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        type: types[Math.floor(Math.random() * types.length)],
        day: day,
        slot: {
          start: `${startHour}:00 AM`,
          end: `${endHour}:00 ${endHour >= 12 ? 'PM' : 'AM'}`
        },
        group: groups[Math.floor(Math.random() * groups.length)],
        place: places[Math.floor(Math.random() * places.length)]
      });
    }
  });
  
  return schedule;
}

/**
 * Measures the time taken for PDF export
 * @param {Function} exportFunction - The PDF export function to test
 * @param {Object} scheduleRef - Reference to the schedule DOM element
 * @param {string} fileName - Name for the PDF file
 * @returns {Promise<Object>} Test results with timing information
 */
export async function measurePDFExportTime(exportFunction, scheduleRef, fileName = 'test-schedule.pdf') {
  const startTime = performance.now();
  
  try {
    await exportFunction(fileName, 'manual');
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    
    return {
      success: true,
      duration: duration,
      passed: duration <= 3.3,
      message: duration <= 3.3 
        ? `✓ PDF export completed in ${duration.toFixed(2)}s (within 3.3s requirement)`
        : `✗ PDF export took ${duration.toFixed(2)}s (exceeds 3.3s requirement)`
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    return {
      success: false,
      duration: duration,
      passed: false,
      error: error.message,
      message: `✗ PDF export failed after ${duration.toFixed(2)}s: ${error.message}`
    };
  }
}

/**
 * Runs multiple iterations of the PDF export test
 * @param {Function} exportFunction - The PDF export function to test
 * @param {Object} scheduleRef - Reference to the schedule DOM element
 * @param {number} iterations - Number of test iterations (default: 5)
 * @returns {Promise<Object>} Aggregated test results
 */
export async function runPDFPerformanceTest(exportFunction, scheduleRef, iterations = 5) {
  console.log(`🧪 Starting PDF Export Performance Test (${iterations} iterations)...`);
  console.log('━'.repeat(60));
  
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\nIteration ${i + 1}/${iterations}:`);
    
    // Wait a bit between iterations to avoid overwhelming the browser
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const result = await measurePDFExportTime(
      exportFunction, 
      scheduleRef, 
      `test-schedule-${i + 1}.pdf`
    );
    
    console.log(result.message);
    results.push(result);
  }
  
  // Calculate statistics
  const successfulResults = results.filter(r => r.success);
  const durations = successfulResults.map(r => r.duration);
  
  if (durations.length === 0) {
    console.log('\n❌ All tests failed!');
    return {
      passed: false,
      allPassed: false,
      successRate: 0,
      results: results
    };
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const allPassed = results.every(r => r.passed);
  const passRate = (results.filter(r => r.passed).length / results.length) * 100;
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('━'.repeat(60));
  console.log(`Total Iterations: ${iterations}`);
  console.log(`Successful Exports: ${successfulResults.length}/${iterations}`);
  console.log(`Pass Rate: ${passRate.toFixed(1)}% (within 3.3s requirement)`);
  console.log(`Average Duration: ${avgDuration.toFixed(2)}s`);
  console.log(`Min Duration: ${minDuration.toFixed(2)}s`);
  console.log(`Max Duration: ${maxDuration.toFixed(2)}s`);
  console.log(`Requirement: ≤ 3.3s`);
  console.log('━'.repeat(60));
  
  if (allPassed) {
    console.log('✅ All tests PASSED! PDF export meets performance requirement.');
  } else {
    console.log('⚠️  Some tests FAILED! PDF export may need optimization.');
    console.log(`   ${results.filter(r => !r.passed).length} out of ${iterations} iterations exceeded 3.3s`);
  }
  
  return {
    passed: allPassed,
    allPassed: allPassed,
    successRate: passRate,
    avgDuration: avgDuration,
    minDuration: minDuration,
    maxDuration: maxDuration,
    requirement: 3.3,
    results: results,
    recommendation: allPassed 
      ? 'Performance is acceptable. No optimization needed.'
      : maxDuration > 5.0
        ? 'Critical: Consider optimizing html2canvas scale, reducing DOM complexity, or implementing progressive rendering.'
        : 'Minor optimization recommended: Review canvas scale settings and DOM structure.'
  };
}

/**
 * Analyzes potential bottlenecks in PDF export
 * @param {number} duration - The measured export duration
 * @returns {Object} Analysis with potential bottlenecks and recommendations
 */
export function analyzePDFBottlenecks(duration) {
  const bottlenecks = [];
  const recommendations = [];
  
  if (duration > 3.3) {
    bottlenecks.push('Export exceeds 3.3s requirement');
    
    if (duration > 5.0) {
      bottlenecks.push('Critical performance issue (>5s)');
      recommendations.push('Reduce html2canvas scale from 2 to 1.5');
      recommendations.push('Simplify DOM structure in schedule display');
      recommendations.push('Consider lazy loading or progressive rendering');
    } else if (duration > 4.0) {
      bottlenecks.push('Significant delay (>4s)');
      recommendations.push('Review html2canvas configuration');
      recommendations.push('Optimize CSS complexity in schedule cards');
    } else {
      bottlenecks.push('Minor performance issue (3.3-4s)');
      recommendations.push('Fine-tune html2canvas scale parameter');
      recommendations.push('Review onclone callback complexity');
    }
  }
  
  // Common optimization recommendations
  recommendations.push('Ensure schedule DOM is fully rendered before export');
  recommendations.push('Consider caching canvas if exporting multiple times');
  recommendations.push('Profile with Chrome DevTools Performance tab for detailed analysis');
  
  return {
    duration: duration,
    meetsRequirement: duration <= 3.3,
    bottlenecks: bottlenecks,
    recommendations: recommendations
  };
}

/**
 * Creates a test button that can be added to the Generator page
 * @param {Function} exportFunction - The PDF export function
 * @param {Object} scheduleRef - Reference to the schedule DOM element
 * @returns {Function} Click handler for the test button
 */
export function createTestButtonHandler(exportFunction, scheduleRef) {
  return async () => {
    const testResults = await runPDFPerformanceTest(exportFunction, scheduleRef, 5);
    
    // Store results in sessionStorage for later review
    sessionStorage.setItem('pdfPerformanceTestResults', JSON.stringify(testResults));
    
    return testResults;
  };
}
