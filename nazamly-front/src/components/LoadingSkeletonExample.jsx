import { useState, useEffect } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function LoadingSkeletonExample() {
  const [loading, setLoading] = useState(false);
  const [skeletonType, setSkeletonType] = useState('card');

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const types = ['card', 'list', 'text', 'table', 'schedule', 'question', 'problem'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LoadingSkeleton Component Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {types.map((type) => (
              <Button
                key={type}
                variant={skeletonType === type ? 'default' : 'outline'}
                onClick={() => setSkeletonType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
          
          <Button onClick={simulateLoading} disabled={loading}>
            {loading ? 'Loading...' : 'Simulate Loading'}
          </Button>
        </CardContent>
      </Card>

      <div>
        {loading ? (
          <LoadingSkeleton type={skeletonType} count={3} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Content Loaded</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is the actual content that appears after loading completes.</p>
              <p className="text-muted-foreground mt-2">
                The LoadingSkeleton component shows a placeholder while async operations are in progress.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Basic Usage</h3>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`import { LoadingSkeleton } from '@/components/LoadingSkeleton';

<LoadingSkeleton />

<LoadingSkeleton type="list" count={5} />

<LoadingSkeleton type="text" count={3} className="max-w-md" />`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Available Types</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code className="bg-muted px-1 rounded">card</code> - Card layout with header and content</li>
              <li><code className="bg-muted px-1 rounded">list</code> - List items with avatar and text</li>
              <li><code className="bg-muted px-1 rounded">text</code> - Simple text lines</li>
              <li><code className="bg-muted px-1 rounded">table</code> - Table rows</li>
              <li><code className="bg-muted px-1 rounded">schedule</code> - Schedule card layout</li>
              <li><code className="bg-muted px-1 rounded">question</code> - Quiz question card layout</li>
              <li><code className="bg-muted px-1 rounded">problem</code> - Coding problem card layout</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Props</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code className="bg-muted px-1 rounded">type</code> - Skeleton type (default: "card")</li>
              <li><code className="bg-muted px-1 rounded">count</code> - Number of skeleton items (default: 1)</li>
              <li><code className="bg-muted px-1 rounded">className</code> - Additional CSS classes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
