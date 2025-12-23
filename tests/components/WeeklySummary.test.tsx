import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import WeeklySummary from '../../src/apps/Finances/income/components/WeeklySummary';
import { useIncomeStore } from '../../src/stores/useIncomeStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';

vi.mock('../../src/stores/useIncomeStore');
vi.mock('../../src/stores/useSettingsStore');

describe('WeeklySummary', () => {
  const mockAddIncomeWeeklyTarget = vi.fn();
  const mockUpdateIncomeWeeklyTarget = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIncomeStore).mockReturnValue({
      incomeWeeklyTargets: [
        { id: '1', amount: 1000 },
      ],
      addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
      updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
    } as any);

    vi.mocked(useSettingsStore).mockReturnValue({
      incomeCurrency: 'USD',
      incomeDefaultWeeklyTarget: 1000,
    } as any);
  });

  it('should display weekly target label', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText(/weekly target/i)).toBeInTheDocument();
  });

  it('should display target amount', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText('$1000')).toBeInTheDocument();
  });

  it('should display amount earned', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    expect(screen.getByText(/\$300 earned/i)).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    // 300/1000 = 30%
    expect(screen.getByText(/30%/i)).toBeInTheDocument();
  });

  it('should display remaining amount when target not reached', () => {
    render(<WeeklySummary weeklyTotal={300} selectedWeek={1} />);
    // 1000 - 300 = 700
    expect(screen.getByText(/\$700/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  it('should show success message when target reached', () => {
    render(<WeeklySummary weeklyTotal={1200} selectedWeek={1} />);
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
    expect(input).toHaveValue(1000);
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
    render(<WeeklySummary weeklyTotal={1500} selectedWeek={1} />);
    // 1500/1000 = 150%, should display as 100%
    expect(screen.getByText(/100%/i)).toBeInTheDocument();
  });

  it('should use default target for new week', () => {
    vi.mocked(useIncomeStore).mockReturnValue({
      incomeWeeklyTargets: [],
      addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
      updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
    } as any);

    render(<WeeklySummary weeklyTotal={200} selectedWeek={5} />);
    // Default target should be 1000
    expect(screen.getByText('$1000')).toBeInTheDocument();
  });

  describe('custom default weekly target from settings', () => {
    it('should use custom default target from settings', () => {
      vi.mocked(useIncomeStore).mockReturnValue({
        incomeWeeklyTargets: [],
        addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
        updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
      } as any);

      vi.mocked(useSettingsStore).mockReturnValue({
        incomeCurrency: 'USD',
        incomeDefaultWeeklyTarget: 750,
      } as any);

      render(<WeeklySummary weeklyTotal={300} selectedWeek={5} />);
      expect(screen.getByText('$750')).toBeInTheDocument();
    });

    it('should calculate progress based on custom default target', () => {
      vi.mocked(useIncomeStore).mockReturnValue({
        incomeWeeklyTargets: [],
        addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
        updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
      } as any);

      vi.mocked(useSettingsStore).mockReturnValue({
        incomeCurrency: 'USD',
        incomeDefaultWeeklyTarget: 500,
      } as any);

      render(<WeeklySummary weeklyTotal={250} selectedWeek={5} />);
      // 250/500 = 50%
      expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });

    it('should calculate remaining amount based on custom default target', () => {
      vi.mocked(useIncomeStore).mockReturnValue({
        incomeWeeklyTargets: [],
        addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
        updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
      } as any);

      vi.mocked(useSettingsStore).mockReturnValue({
        incomeCurrency: 'USD',
        incomeDefaultWeeklyTarget: 800,
      } as any);

      render(<WeeklySummary weeklyTotal={300} selectedWeek={5} />);
      // 800 - 300 = 500 remaining
      expect(screen.getByText(/\$500/i)).toBeInTheDocument();
      expect(screen.getByText(/remaining/i)).toBeInTheDocument();
    });

    it('should prefer saved target over default from settings', () => {
      vi.mocked(useIncomeStore).mockReturnValue({
        incomeWeeklyTargets: [
          { id: '5', amount: 1500 },
        ],
        addIncomeWeeklyTarget: mockAddIncomeWeeklyTarget,
        updateIncomeWeeklyTarget: mockUpdateIncomeWeeklyTarget,
      } as any);

      vi.mocked(useSettingsStore).mockReturnValue({
        incomeCurrency: 'USD',
        incomeDefaultWeeklyTarget: 1000,
      } as any);

      render(<WeeklySummary weeklyTotal={300} selectedWeek={5} />);
      // Should use saved target (1500), not default (1000)
      expect(screen.getByText('$1500')).toBeInTheDocument();
    });
  });
});
