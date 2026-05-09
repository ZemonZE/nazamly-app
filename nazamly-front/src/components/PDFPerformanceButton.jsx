import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { runPDFPerformanceTest } from '@/utils/pdfPerformanceTest';

/**
 * PDF Performance Test Button Component
 * 
 * This component can be added to the Generator page to provide
 * quick access to performance testing without navigating away.
 * 
 * Usage:
 * <PDFPerformanceButton exportFunction={exportPDF} scheduleRef={scheduleRef} />
 */
export default function PDFPerformanceButton({ exportFunction, scheduleRef }) {
  const [testing, setTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setShowResults(false);

    try {
      const testResults = await runPDFPerformanceTest(exportFunction, scheduleRef, 3);
      setResults(testResults);
      setShowResults(true);
    } catch (error) {
      console.error('Performance test failed:', error);
      setResults({
        passed: false,
        error: error.message,
      });
      setShowResults(true);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleTest}
        disabled={testing}
        variant="ghost"
        size="sm"
        className="text-xs"
      >
        {testing ? '⏱️ Testing...' : '🧪 Test Performance'}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF Export Performance Test Results</DialogTitle>
            <DialogDescription>
              Testing against 3.3 second requirement (Req 13.1)
            </DialogDescription>
          </DialogHeader>

          {results && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  results.passed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="text-2xl font-bold mb-2">
                  {results.passed ? '✅ PASSED' : '❌ FAILED'}
                </div>
                {results.error ? (
                  <p className="text-sm text-red-600">{results.error}</p>
                ) : (
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Pass Rate:</strong> {results.successRate?.toFixed(1)}%
                    </p>
                    <p>
                      <strong>Average:</strong> {results.avgDuration?.toFixed(2)}s
                    </p>
                    <p>
                      <strong>Range:</strong> {results.minDuration?.toFixed(2)}s -{' '}
                      {results.maxDuration?.toFixed(2)}s
                    </p>
                    <p>
                      <strong>Requirement:</strong> ≤ 3.3s
                    </p>
                  </div>
                )}
              </div>

              {results.recommendation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="font-semibold mb-1">Recommendation:</p>
                  <p>{results.recommendation}</p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Check browser console for detailed logs
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
