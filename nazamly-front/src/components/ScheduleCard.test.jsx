import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleCard } from './ScheduleCard';

describe('ScheduleCard', () => {
  const mockSchedule = {
    id: 1,
    subject: "Data Structures",
    type: "ن",
    day: "Saturday",
    slot: { start: "8:00 AM", end: "10:00 AM" },
    group: "G1",
    place: "Room 101"
  };

  it('renders schedule information correctly', () => {
    render(<ScheduleCard schedule={mockSchedule} />);
    
    expect(screen.getByText("Data Structures")).toBeInTheDocument();
    expect(screen.getByText("ن")).toBeInTheDocument();
    expect(screen.getByText("8:00 AM - 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("G1")).toBeInTheDocument();
    expect(screen.getByText("Room 101")).toBeInTheDocument();
  });

  it('displays placeholder for missing group and place', () => {
    const scheduleWithoutGroupPlace = {
      ...mockSchedule,
      group: "",
      place: ""
    };
    
    render(<ScheduleCard schedule={scheduleWithoutGroupPlace} />);
    
    const placeholders = screen.getAllByText("—");
    expect(placeholders).toHaveLength(2);
  });

  it('renders delete button when onDelete is provided', () => {
    const onDelete = vi.fn();
    render(<ScheduleCard schedule={mockSchedule} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button');
    expect(deleteButton).toBeInTheDocument();
  });

  it('does not render delete button when onDelete is not provided', () => {
    render(<ScheduleCard schedule={mockSchedule} />);
    
    const deleteButton = screen.queryByRole('button');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('calls onDelete with schedule id when delete button is clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(<ScheduleCard schedule={mockSchedule} onDelete={onDelete} />);
    
    const deleteButton = container.querySelector('button');
    deleteButton.click();
    
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('applies correct type badge colors', () => {
    const { rerender } = render(<ScheduleCard schedule={mockSchedule} />);
    
    let badge = screen.getByText("ن");
    expect(badge).toHaveClass("bg-blue-50", "text-blue-600");
    
    rerender(<ScheduleCard schedule={{ ...mockSchedule, type: "ت" }} />);
    badge = screen.getByText("ت");
    expect(badge).toHaveClass("bg-sky-50", "text-sky-600");
    
    rerender(<ScheduleCard schedule={{ ...mockSchedule, type: "ع" }} />);
    badge = screen.getByText("ع");
    expect(badge).toHaveClass("bg-amber-50", "text-amber-600");
  });
});
