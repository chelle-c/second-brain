import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import WeeklySummary from '../../src/apps/Finances/income/components/WeeklySummary';
import { useIncomeStore } from '../../src/stores/useIncomeStore';

vi.mock('../../src/stores/useIncomeStore');

describe('WeeklySummary', () => {
  const mockAddIncomeWeeklyTarget = vi.fn();
  const mockUpdateIncomeWeeklyTarget = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIncomeStore).mockReturnValue({
      incomeWeeklyTargets: [
        { id: '1', amount: 575 },
      ],
      addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
      updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
    } as any);
  });

  it('should display weekly target label', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText(/weekly target/i)).toBeInTheDocument();
  });

  it('should display target amount', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText('$575')).toBeInTheDocument();
  });

  it('should display amount earned', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText(/\$300 earned/i)).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    // 300/575 = 52.17%
    expect(screen.getByText(/52%/i)).toBeInTheDocument();
  });

  it('should display remaining amount when target not reached', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    // 575 - 300 = 275
    expect(screen.getByText(/\$275/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  it('should show success message when target reached', () => {
    render(<WeeklySummary weeklyTotal={600} selectedWeek={1} />);
    expect(screen.getByText(/target reached/i)).toBeInTheDocument();
  });

  it('should show "no earnings yet" when total is 0', () => {
    render(<WeeklySummary weeklyTotal={0} selectedWeek={1} />);
    expect(screen.getByText(/no earnings yet/i)).toBeInTheDocument();
  });

  it('should show edit button for target', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    const editButton = screen.getByTitle('Edit target');
    expect(editButton).toBeInTheDocument();
  });

  it('should allow editing target amount', async () => {
    const user = userEvent.setup();
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);

    const editButton = screen.getByTitle('Edit target');
    await user.click(editButton);

    // Input should appear
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(575);
  });

  it('should show save and cancel buttons when editing', async () => {
    const user = userEvent.setup();
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);

    const editButton = screen.getByTitle('Edit target');
    await user.click(editButton);

    // Should have 2 buttons (save and cancel)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should cap progress bar at 100%', () => {
    render(<WeeklySummary weeklyTotal={1000} selectedWeek={1} />);
    // 1000/575 = 173.91%, should display as 100%
    expect(screen.getByText(/100%/i)).toBeInTheDocument();
  });

  it('should use default target for new week', () => {
    vi.mocked(useIncomeStore).mockReturnValue({
      incomeWeeklyTargets: [],
      addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
      updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
    } as any);

    render(<WeeklySummary weeklyTotal={200} selectedWeek={5} />);
    // Default target should be 575
    expect(screen.getByText('$575')).toBeInTheDocument();
  });
});
