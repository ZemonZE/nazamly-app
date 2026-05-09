import { CodeBlock } from './CodeBlock';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const sampleCodes = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    return 0;
}`,
  javascript: `function greet(name) {
    console.log(\`Hello, \${name}!\`);
}

greet('World');`,
  python: `def greet(name):
    print(f"Hello, {name}!")

greet('World')`,
  java: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`,
};

export function CodeBlockTest() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">CodeBlock Component Test</h1>
      
      {Object.entries(sampleCodes).map(([lang, code]) => (
        <Card key={lang}>
          <CardHeader>
            <CardTitle className="capitalize">{lang}</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={code} language={lang} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
