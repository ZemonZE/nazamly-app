import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  createSampleScheduleData, 
  runPDFPerformanceTest,
  analyzePDFBottlenecks 
} from '@/utils/pdfPerformanceTest';

/**
 * PDF Performance Test Page
 * 
 * This page tests the PDF export functionality to verify it meets
 * the 3.3 second performance requirement (Req 13.1)
 */
export default function PDFPerformanceTest() {
  const [scheduleData, setScheduleData] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const scheduleRef = useRef(null);

  // Generate sample schedule data on mount
  useEffect(() => {
    const sampleData = createSampleScheduleData();
    setScheduleData(sampleData);
  }, []);

  // Group schedule by day
  const scheduleByDay = scheduleData.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {});

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  // PDF Export function (same as Generator.jsx)
  const exportPDF = async (fileName = 'test-schedule.pdf') => {
    const captureTarget = scheduleRef.current;
    if (!captureTarget) return;

    setExporting(true);

    const FIXED_WIDTH_PX = 1000;
    const TYPE_AR_MAP = {
      'ن': 'محاضرة',
      'ت': 'سكشن',
      'ع': 'معمل',
    };

    const DAYS_AR_MAP = {
      'Sunday': 'الأحد',
      'Monday': 'الاثنين',
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
    };

    try {
      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: FIXED_WIDTH_PX,
        windowWidth: FIXED_WIDTH_PX,
        onclone: (doc) => {
          const clonedSchedule = doc.querySelector('.gen-schedule');
          if (clonedSchedule) {
            clonedSchedule.setAttribute('dir', 'rtl');
            clonedSchedule.setAttribute('lang', 'ar');
            clonedSchedule.style.width = FIXED_WIDTH_PX + 'px';
            clonedSchedule.style.maxWidth = FIXED_WIDTH_PX + 'px';
            clonedSchedule.style.minWidth = FIXED_WIDTH_PX + 'px';
            clonedSchedule.style.overflow = 'visible';
            clonedSchedule.style.direction = 'rtl';

            const captionDiv = doc.createElement('div');
            captionDiv.style.cssText = `
              text-align: center;
              padding: 18px 14px;
              font-family: 'Arial', 'Tajawal', sans-serif;
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              border-bottom: 2px solid #e2e8f0;
              margin-bottom: 14px;
              direction: rtl;
            `;
            captionDiv.textContent = 'جدولي الدراسي - NAZAMLY';
            clonedSchedule.insertBefore(captionDiv, clonedSchedule.firstChild);
          }

          doc.documentElement.setAttribute('dir', 'rtl');
          doc.body.setAttribute('dir', 'rtl');
          doc.body.style.direction = 'rtl';

          // Translate day names
          doc.querySelectorAll('.gen-day-title').forEach((el) => {
            const dayText = (el.textContent || '').trim();
            if (DAYS_AR_MAP[dayText]) {
              el.textContent = DAYS_AR_MAP[dayText];
            }
          });

          // Translate type badges
          doc.querySelectorAll('.type-badge').forEach((badge) => {
            const raw = (badge.textContent || '').trim();
            badge.textContent = TYPE_AR_MAP[raw] || badge.textContent;
          });
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      const pdfWidthMM = 210;
      const pdfHeightMM = (canvas.height * pdfWidthMM) / canvas.width;
      const pdf = new jsPDF({
        orientation: pdfHeightMM > pdfWidthMM ? 'p' : 'l',
        unit: 'mm',
        format: [pdfWidthMM, pdfHeightMM],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMM, pdfHeightMM);
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF Export Error:', err);
      throw err;
    } finally {
      setExporting(false);
    }
  };

  // Run performance test
  const handleRunTest = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      const results = await runPDFPerformanceTest(exportPDF, scheduleRef, 5);
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({
        passed: false,
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  // Single export test
  const handleSingleExport = async () => {
    const startTime = performance.now();
    await exportPDF('single-test.pdf');
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    const analysis = analyzePDFBottlenecks(duration);
    console.log('Single Export Analysis:', analysis);
    
    alert(`PDF exported in ${duration.toFixed(2)}s\n${analysis.meetsRequirement ? '✓ Meets requirement' : '✗ Exceeds requirement'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Export Performance Test</CardTitle>
            <CardDescription>
              Testing PDF export to verify it completes within 3.3 seconds (Requirement 13.1)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={handleRunTest} 
                disabled={testing || exporting}
                className="flex-1"
              >
                {testing ? 'Running Test...' : 'Run Performance Test (5 iterations)'}
              </Button>
              <Button 
                onClick={handleSingleExport} 
                disabled={testing || exporting}
                variant="outline"
                className="flex-1"
              >
                {exporting ? 'Exporting...' : 'Single Export Test'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• Performance test will run 5 iterations and measure average time</p>
              <p>• Single export test will export once and show the duration</p>
              <p>• Check browser console for detailed logs</p>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${testResults.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-2xl font-bold mb-2">
                    {testResults.passed ? '✅ PASSED' : '❌ FAILED'}
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Pass Rate:</strong> {testResults.successRate?.toFixed(1)}%</p>
                    <p><strong>Average Duration:</strong> {testResults.avgDuration?.toFixed(2)}s</p>
                    <p><strong>Min Duration:</strong> {testResults.minDuration?.toFixed(2)}s</p>
                    <p><strong>Max Duration:</strong> {testResults.maxDuration?.toFixed(2)}s</p>
                    <p><strong>Requirement:</strong> ≤ 3.3s</p>
                  </div>
                </div>

                {testResults.recommendation && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold mb-2">Recommendation:</p>
                    <p className="text-sm">{testResults.recommendation}</p>
                  </div>
                )}

                {testResults.results && (
                  <div className="space-y-2">
                    <p className="font-semibold">Individual Results:</p>
                    {testResults.results.map((result, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-mono">Iteration {idx + 1}:</span> {result.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Schedule Display */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Schedule (for testing)</CardTitle>
            <CardDescription>
              This schedule will be used for PDF export testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={scheduleRef} className="gen-schedule bg-white p-4 rounded-lg border">
              {days.map((day) => {
                const dayItems = scheduleByDay[day] || [];
                if (dayItems.length === 0) return null;

                return (
                  <div key={day} className="gen-day-card mb-4 border rounded-lg overflow-hidden">
                    <div className="gen-day-title bg-slate-800 text-white p-3 font-bold">
                      {day}
                    </div>
                    <div className="gen-day-items">
                      {dayItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="gen-item grid grid-cols-5 gap-4 p-3 border-b hover:bg-gray-50"
                        >
                          <div className="gen-item-time">
                            {item.slot.start} - {item.slot.end}
                          </div>
                          <div className="gen-subject font-semibold">
                            {item.subject}
                          </div>
                          <div>
                            <span className="type-badge inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                              {item.type}
                            </span>
                          </div>
                          <div className="gen-col-value">{item.group}</div>
                          <div className="gen-col-value">{item.place}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
