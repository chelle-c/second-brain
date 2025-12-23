import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MonthlyView from '../../src/apps/Finances/income/components/MonthlyView';
import { useIncomeStore } from '../../src/stores/useIncomeStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useThemeStore } from '../../src/stores/useThemeStore';

vi.mock('../../src/stores/useIncomeStore');
vi.mock('../../src/stores/useSettingsStore');
vi.mock('../../src/stores/useThemeStore');

// Mock the BarChart component
vi.mock('../../src/components/charts', () => ({
  BarChart: ({ data }: { data: any[] }) => (
    <div data-testid="bar-chart">{data.length} months</div>
  ),
}));

// Mock getMonthlyData
vi.mock('../../src/lib/dateUtils', () => ({
  getMonthlyData: vi.fn(),
}));

import { getMonthlyData } from '../../src/lib/dateUtils';

describe('MonthlyView', () => {
  const mockOnYearChange = vi.fn();
  const mockYears = [2022, 2023, 2024, 2025];

  const mockMonthlyDataWithEntries = [
    { month: 'January', amount: 1000, hours: 40 },
    { month: 'February', amount: 1200, hours: 48 },
    { month: 'March', amount: 800, hours: 32 },
    { month: 'April', amount: 0, hours: 0 },
    { month: 'May', amount: 0, hours: 0 },
    { month: 'June', amount: 0, hours: 0 },
    { month: 'July', amount: 0, hours: 0 },
    { month: 'August', amount: 0, hours: 0 },
    { month: 'September', amount: 0, hours: 0 },
    { month: 'October', amount: 0, hours: 0 },
    { month: 'November', amount: 0, hours: 0 },
    { month: 'December', amount: 0, hours: 0 },
  ];

  const mockEmptyMonthlyData = Array(12).fill(null).map((_, i) => ({
    month: new Date(2024, i).toLocaleString('default', { month: 'long' }),
    amount: 0,
    hours: 0,
  }));

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIncomeStore).mockReturnValue({
      incomeEntries: [],
    } as any);

    vi.mocked(useSettingsStore).mockReturnValue({
      incomeCurrency: 'USD',
    } as any);

    vi.mocked(useThemeStore).mockReturnValue({
      resolvedTheme: 'light',
      palette: 'default',
    } as any);

    // Mock getComputedStyle for the primary color
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: () => '#3b82f6',
    }));
  });

  describe('with income data', () => {
    beforeEach(() => {
      vi.mocked(getMonthlyData).mockReturnValue(mockMonthlyDataWithEntries);
    });

    it('should render the monthly overview title', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByText('Monthly Overview')).toBeInTheDocument();
    });

    it('should render the year selector', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display total amount', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      // Total: 1000 + 1200 + 800 = 3000
      expect(screen.getByText('$3000')).toBeInTheDocument();
    });

    it('should display total hours', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      // Hours: 40 + 48 + 32 = 120
      expect(screen.getByText('120.0h')).toBeInTheDocument();
    });

    it('should render the bar chart', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render Monthly Breakdown section', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByText('Monthly Breakdown')).toBeInTheDocument();
    });
  });

  describe('empty state (no income data)', () => {
    beforeEach(() => {
      vi.mocked(getMonthlyData).mockReturnValue(mockEmptyMonthlyData);
    });

    it('should display empty state message', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByText('No income entries for 2024')).toBeInTheDocument();
    });

    it('should still display Monthly Overview title in empty state', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByText('Monthly Overview')).toBeInTheDocument();
    });

    it('should render year selector in empty state', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have year selector available in empty state for navigation', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );

      // Verify the combobox (year selector) exists and can be used
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
      expect(selectTrigger).not.toBeDisabled();
    });

    it('should display correct year in empty state message', () => {
      render(
        <MonthlyView
          selectedYear={2022}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );
      expect(screen.getByText('No income entries for 2022')).toBeInTheDocument();
    });
  });

  describe('year selector functionality', () => {
    beforeEach(() => {
      vi.mocked(getMonthlyData).mockReturnValue(mockMonthlyDataWithEntries);
    });

    it('should render year selector as combobox', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    it('should display selected year in the trigger', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );

      // The combobox should show the selected year
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should have year selector enabled for interaction', () => {
      render(
        <MonthlyView
          selectedYear={2024}
          onYearChange={mockOnYearChange}
          years={mockYears}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).not.toBeDisabled();
    });
  });
});
