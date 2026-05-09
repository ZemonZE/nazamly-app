import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemCard } from './ProblemCard';

describe('ProblemCard', () => {
  const mockProblem = {
    _id: '1',
    title: 'Two Sum',
    topic: 'Arrays',
    difficulty: 1,
    solvedStatus: 'unsolved',
    acCount: 42,
    estimatedMinutes: 15,
    supportedLanguages: ['cpp', 'js', 'python'],
    tags: ['hash-table', 'array'],
    descriptionMd: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
  };

  it('renders problem title', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
  });

  it('displays topic badge', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('Arrays')).toBeInTheDocument();
  });

  it('displays difficulty badge with correct label', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('displays acceptance count', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays estimated time', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it('displays supported languages', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('cpp')).toBeInTheDocument();
    expect(screen.getByText('js')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('displays tags', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('hash-table')).toBeInTheDocument();
    expect(screen.getByText('array')).toBeInTheDocument();
  });

  it('displays truncated description', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText(/Given an array of integers/)).toBeInTheDocument();
  });

  it('shows solved status icon', () => {
    const solvedProblem = { ...mockProblem, solvedStatus: 'solved' };
    render(<ProblemCard problem={solvedProblem} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('shows attempted status icon', () => {
    const attemptedProblem = { ...mockProblem, solvedStatus: 'attempted' };
    render(<ProblemCard problem={attemptedProblem} />);
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('shows unsolved status icon', () => {
    render(<ProblemCard problem={mockProblem} />);
    expect(screen.getByText('○')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ProblemCard problem={mockProblem} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    await user.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ProblemCard problem={mockProblem} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies solved styling when problem is solved', () => {
    const solvedProblem = { ...mockProblem, solvedStatus: 'solved' };
    const { container } = render(<ProblemCard problem={solvedProblem} />);
    
    const card = container.querySelector('.bg-green-50\\/30');
    expect(card).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalProblem = {
      _id: '2',
      title: 'Minimal Problem',
      solvedStatus: 'unsolved',
    };
    
    render(<ProblemCard problem={minimalProblem} />);
    expect(screen.getByText('Minimal Problem')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProblemCard problem={mockProblem} className="custom-class" />
    );
    
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('displays medium difficulty with correct styling', () => {
    const mediumProblem = { ...mockProblem, difficulty: 2 };
    render(<ProblemCard problem={mediumProblem} />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('displays hard difficulty with correct styling', () => {
    const hardProblem = { ...mockProblem, difficulty: 3 };
    render(<ProblemCard problem={hardProblem} />);
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const longProblem = { ...mockProblem, descriptionMd: longDescription };
    render(<ProblemCard problem={longProblem} />);
    
    const description = screen.getByText(/A+\.\.\./);
    expect(description.textContent.length).toBeLessThan(longDescription.length);
  });

  it('removes markdown formatting from description preview', () => {
    const markdownProblem = {
      ...mockProblem,
      descriptionMd: '# Heading\n**Bold** text with `code`',
    };
    render(<ProblemCard problem={markdownProblem} />);
    
    const description = screen.getByText(/Heading/);
    expect(description.textContent).not.toContain('#');
    expect(description.textContent).not.toContain('**');
    expect(description.textContent).not.toContain('`');
  });
});
