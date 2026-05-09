import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BuggyComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('This is a simulated error!');
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Component</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This component is working correctly. Click the button below to trigger an error.
        </p>
      </CardContent>
    </Card>
  );
};

function ErrorBoundaryExample() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [key, setKey] = useState(0);

  const handleReset = () => {
    setShouldThrow(false);
    setKey(prev => prev + 1);
  };

  const handleGoHome = () => {
    setShouldThrow(false);
    setKey(prev => prev + 1);
    alert('Navigating to home...');
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ErrorBoundary Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This example demonstrates the ErrorBoundary component. Click the button below to trigger an error.
          </p>
          <Button 
            onClick={() => setShouldThrow(true)}
            variant="destructive"
          >
            Trigger Error
          </Button>
        </CardContent>
      </Card>

      <ErrorBoundary 
        key={key}
        onReset={handleReset}
        fallbackAction={handleGoHome}
        fallbackActionLabel="Go Home"
        showDetails={true}
      >
        <BuggyComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
}

export default ErrorBoundaryExample;
