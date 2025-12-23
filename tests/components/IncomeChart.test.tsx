import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IncomeChart from '../../src/apps/Finances/income/components/IncomeChart';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useThemeStore } from '../../src/stores/useThemeStore';
import type { IncomeDayData } from '../../src/types/income';

vi.mock('../../src/stores/useSettingsStore');
vi.mock('../../src/stores/useThemeStore');

// Mock the BarChart component to capture the data passed to it
let capturedChartData: any[] = [];
vi.mock('../../src/components/charts', () => ({
  BarChart: ({ data }: { data: any[] }) => {
    capturedChartData = data;
    return (
      <div data-testid="bar-chart">
        {data.map((d, i) => (
          <div key={i} data-testid={`bar-${i}`}>
            <span data-testid={`label-${i}`}>{d.label}</span>
            <span data-testid={`secondary-label-${i}`}>{d.secondaryLabel}</span>
            <span data-testid={`value-${i}`}>{d.value}</span>
          </div>
        ))}
      </div>
    );
  },
}));

describe('IncomeChart', () => {
  const mockWeeklyData: IncomeDayData[] = [
    { name: 'Mon', amount: 100, date: new Date('2024-01-15'), isCurrentDay: false },
    { name: 'Tue', amount: 150, date: new Date('2024-01-16'), isCurrentDay: false },
    { name: 'Wed', amount: 200, date: new Date('2024-01-17'), isCurrentDay: true },
    { name: 'Thu', amount: 0, date: new Date('2024-01-18'), isCurrentDay: false },
    { name: 'Fri', amount: 175, date: new Date('2024-01-19'), isCurrentDay: false },
    { name: 'Sat', amount: 50, date: new Date('2024-01-20'), isCurrentDay: false },
    { name: 'Sun', amount: 0, date: new Date('2024-01-21'), isCurrentDay: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    capturedChartData = [];

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

  it('should render the chart title', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);
    expect(screen.getByText('Daily Income')).toBeInTheDocument();
  });

  it('should render the bar chart', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should pass day names as labels', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);

    expect(screen.getByTestId('label-0')).toHaveTextContent('Mon');
    expect(screen.getByTestId('label-1')).toHaveTextContent('Tue');
    expect(screen.getByTestId('label-2')).toHaveTextContent('Wed');
  });

  it('should include secondary labels with formatted dates', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);

    // Dates should be formatted as M/d (e.g., "1/15")
    // Check that secondary labels contain expected date patterns
    const label0 = screen.getByTestId('secondary-label-0');
    const label1 = screen.getByTestId('secondary-label-1');
    const label2 = screen.getByTestId('secondary-label-2');

    // Each should match a date pattern like "1/15" or "01/15"
    expect(label0.textContent).toMatch(/^\d{1,2}\/\d{1,2}$/);
    expect(label1.textContent).toMatch(/^\d{1,2}\/\d{1,2}$/);
    expect(label2.textContent).toMatch(/^\d{1,2}\/\d{1,2}$/);
  });

  it('should pass correct values to the chart', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);

    expect(screen.getByTestId('value-0')).toHaveTextContent('100');
    expect(screen.getByTestId('value-1')).toHaveTextContent('150');
    expect(screen.getByTestId('value-2')).toHaveTextContent('200');
  });

  it('should include all 7 days in the chart data', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);

    expect(capturedChartData).toHaveLength(7);
  });

  it('should include secondaryLabel property in chart data', () => {
    render(<IncomeChart weeklyData={mockWeeklyData} />);

    capturedChartData.forEach((day) => {
      expect(day).toHaveProperty('secondaryLabel');
      expect(day.secondaryLabel).toMatch(/^\d{1,2}\/\d{1,2}$/); // Matches M/d format
    });
  });
});
