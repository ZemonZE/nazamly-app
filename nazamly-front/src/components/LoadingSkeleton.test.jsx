import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders card skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelector('.space-y-4')).toBeInTheDocument();
  });

  it('renders specified number of card skeletons', () => {
    const { container } = render(<LoadingSkeleton type="card" count={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders list skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="list" count={2} />);
    const listItems = container.querySelectorAll('.flex.items-center');
    expect(listItems.length).toBeGreaterThanOrEqual(2);
  });

  it('renders text skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="text" count={4} />);
    const textLines = container.querySelectorAll('.h-4.w-full');
    expect(textLines.length).toBe(4);
  });

  it('renders table skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="table" count={3} />);
    expect(container.querySelector('.space-y-3')).toBeInTheDocument();
  });

  it('renders schedule skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="schedule" count={2} />);
    const scheduleCards = container.querySelectorAll('.grid.grid-cols-2');
    expect(scheduleCards.length).toBeGreaterThanOrEqual(2);
  });

  it('renders question skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="question" count={2} />);
    expect(container.querySelector('.space-y-4')).toBeInTheDocument();
  });

  it('renders problem skeleton type', () => {
    const { container } = render(<LoadingSkeleton type="problem" count={1} />);
    expect(container.querySelector('.space-y-4')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSkeleton className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('returns null for invalid type', () => {
    const { container } = render(<LoadingSkeleton type="invalid" />);
    expect(container.firstChild).toBeNull();
  });
});
