import { ProblemCard } from './ProblemCard';

const exampleProblems = [
  {
    _id: '1',
    title: 'Two Sum',
    topic: 'Arrays',
    difficulty: 1,
    solvedStatus: 'solved',
    acCount: 1234,
    estimatedMinutes: 15,
    supportedLanguages: ['cpp', 'js', 'python'],
    tags: ['hash-table', 'array'],
    descriptionMd: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  },
  {
    _id: '2',
    title: 'Reverse Linked List',
    topic: 'Linked Lists',
    difficulty: 2,
    solvedStatus: 'attempted',
    acCount: 987,
    estimatedMinutes: 20,
    supportedLanguages: ['cpp', 'python', 'java'],
    tags: ['linked-list', 'recursion'],
    descriptionMd: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  },
  {
    _id: '3',
    title: 'Median of Two Sorted Arrays',
    topic: 'Binary Search',
    difficulty: 3,
    solvedStatus: 'unsolved',
    acCount: 456,
    estimatedMinutes: 45,
    supportedLanguages: ['cpp', 'js', 'python', 'java'],
    tags: ['array', 'binary-search', 'divide-and-conquer'],
    descriptionMd: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
  },
];

export default function ProblemCardExample() {
  const handleProblemClick = (problemId) => {
    console.log('Navigating to problem:', problemId);
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ProblemCard Component Examples</h1>
      
      <div className="space-y-4">
        {exampleProblems.map(problem => (
          <ProblemCard
            key={problem._id}
            problem={problem}
            onClick={() => handleProblemClick(problem._id)}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h2 className="text-lg font-semibold mb-2">Usage Example</h2>
        <pre className="text-sm bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`import { ProblemCard } from '@/components/ProblemCard';
import { useNavigate } from 'react-router-dom';

function ProblemsList({ problems }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {problems.map(problem => (
        <ProblemCard
          key={problem._id}
          problem={problem}
          onClick={() => navigate(\`/problems/\${problem._id}\`)}
        />
      ))}
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
}
