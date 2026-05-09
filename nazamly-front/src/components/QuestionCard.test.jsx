import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionCard from './QuestionCard';

describe('QuestionCard', () => {
  const mockMCQQuestion = {
    questionText: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correctAnswer: 'Paris',
    difficulty: 2,
    type: 'mcq',
  };

  const mockTFQuestion = {
    questionText: 'The Earth is flat.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    difficulty: 1,
    type: 'tf',
  };

  const mockEssayQuestion = {
    questionText: 'Explain the concept of recursion.',
    correctAnswer: 'Recursion is when a function calls itself...',
    difficulty: 3,
    type: 'essay',
  };

  it('renders MCQ question correctly', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('renders True/False question correctly', () => {
    render(
      <QuestionCard
        question={mockTFQuestion}
        questionNumber={2}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('The Earth is flat.')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('renders essay question with textarea', () => {
    render(
      <QuestionCard
        question={mockEssayQuestion}
        questionNumber={3}
        selectedAnswer=""
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('Explain the concept of recursion.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your answer here...')).toBeInTheDocument();
  });

  it('calls onSelectAnswer when option is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={handleSelect}
      />
    );

    const parisButton = screen.getByText('Paris').closest('button');
    fireEvent.click(parisButton);

    expect(handleSelect).toHaveBeenCalledWith('Paris');
  });

  it('shows selected answer styling', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer="Paris"
        onSelectAnswer={vi.fn()}
      />
    );

    const parisButton = screen.getByText('Paris').closest('button');
    expect(parisButton).toHaveClass('qb-option-selected');
  });

  it('shows correct/incorrect feedback when submitted', () => {
    const { container } = render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer="London"
        onSelectAnswer={vi.fn()}
        submitted={true}
        showExplanation={true}
      />
    );

    const buttons = container.querySelectorAll('.qb-option-btn');
    const londonButton = Array.from(buttons).find(btn => btn.textContent.includes('London'));
    const parisButton = Array.from(buttons).find(btn => btn.querySelector('.qb-option-text')?.textContent === 'Paris');

    expect(londonButton).toHaveClass('qb-option-wrong');
    expect(parisButton).toHaveClass('qb-option-correct');
  });

  it('displays explanation when submitted and showExplanation is true', () => {
    const questionWithExplanation = {
      ...mockMCQQuestion,
      explanation: 'Paris is the capital and largest city of France.',
    };

    render(
      <QuestionCard
        question={questionWithExplanation}
        questionNumber={1}
        selectedAnswer="Paris"
        onSelectAnswer={vi.fn()}
        submitted={true}
        showExplanation={true}
      />
    );

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Paris is the capital and largest city of France.')).toBeInTheDocument();
    expect(screen.getByText('Correct Answer:')).toBeInTheDocument();
  });

  it('disables options when submitted', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer="Paris"
        onSelectAnswer={vi.fn()}
        submitted={true}
      />
    );

    const buttons = screen.getAllByRole('button').filter(btn => 
      btn.textContent.includes('London') || 
      btn.textContent.includes('Paris') || 
      btn.textContent.includes('Berlin') || 
      btn.textContent.includes('Madrid')
    );

    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows difficulty badge', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('shows question type badge', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('MCQ')).toBeInTheDocument();
  });

  it('renders report button when onReport is provided', () => {
    const handleReport = vi.fn();
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
        onReport={handleReport}
      />
    );

    const reportButton = screen.getByText('Report Issue').closest('button');
    expect(reportButton).toBeInTheDocument();

    fireEvent.click(reportButton);
    expect(handleReport).toHaveBeenCalled();
  });

  it('shows reported state when reported is true', () => {
    render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
        onReport={vi.fn()}
        reported={true}
      />
    );

    expect(screen.getByText('Reported')).toBeInTheDocument();
  });

  it('handles essay question answer changes', () => {
    const handleSelect = vi.fn();
    render(
      <QuestionCard
        question={mockEssayQuestion}
        questionNumber={3}
        selectedAnswer=""
        onSelectAnswer={handleSelect}
      />
    );

    const textarea = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(textarea, { target: { value: 'My answer' } });

    expect(handleSelect).toHaveBeenCalledWith('My answer');
  });

  it('applies custom className', () => {
    const { container } = render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('shows unanswered styling when not submitted and no answer selected', () => {
    const { container } = render(
      <QuestionCard
        question={mockMCQQuestion}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
        submitted={false}
      />
    );

    const card = container.querySelector('.nse-unanswered');
    expect(card).toBeInTheDocument();
  });

  it('displays AI confidence score when provided', () => {
    const questionWithConfidence = {
      ...mockMCQQuestion,
      aiConfidenceScore: 95,
    };

    render(
      <QuestionCard
        question={questionWithConfidence}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('95% conf.')).toBeInTheDocument();
  });

  it('displays derived concept when provided', () => {
    const questionWithConcept = {
      ...mockMCQQuestion,
      derivedFromConcept: 'Geography',
    };

    render(
      <QuestionCard
        question={questionWithConcept}
        questionNumber={1}
        selectedAnswer={undefined}
        onSelectAnswer={vi.fn()}
      />
    );

    expect(screen.getByText(/Geography/)).toBeInTheDocument();
  });
});
