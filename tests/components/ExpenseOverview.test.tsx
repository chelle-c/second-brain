import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpenseOverview } from '../../src/apps/Finances/expenses/components/ExpenseOverview';
import { useExpenseStore } from '../../src/stores/useExpenseStore';

// Mock the expense store
vi.mock('../../src/stores/useExpenseStore');

// Mock child components
vi.mock('../../src/apps/Finances/expenses/components/MonthNavigation', () => ({
  MonthNavigation: () => <div data-testid="month-navigation">Month Navigation</div>,
}));

vi.mock('../../src/components/AnimatedToggle', () => ({
  AnimatedToggle: ({ value, options }: any) => (
    <div data-testid="animated-toggle">
      Current mode: {value}
      {options.map((opt: any) => (
        <button key={opt.value}>{opt.label}</button>
      ))}
    </div>
  ),
}));

// Mock custom PieChart component
vi.mock('../../src/components/charts', () => ({
  PieChart: ({ data }: any) => <div data-testid="pie-chart">{data?.length || 0} categories</div>,
}));

describe('ExpenseOverview', () => {
  const mockGetTotalByCategoryFiltered = vi.fn();
  const mockGetMonthlyTotalFiltered = vi.fn();
  const mockSetOverviewMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetTotalByCategoryFiltered.mockReturnValue({
      Housing: 1200,
      Food: 400,
      Transport: 300,
    });
    mockGetMonthlyTotalFiltered.mockReturnValue(1900);

    vi.mocked(useExpenseStore).mockReturnValue({
      selectedMonth: new Date('2024-01-15'),
      getTotalByCategoryFiltered: mockGetTotalByCategoryFiltered,
      getMonthlyTotalFiltered: mockGetMonthlyTotalFiltered,
      overviewMode: 'all',
      setOverviewMode: mockSetOverviewMode,
      categoryColors: {
        Housing: '#3b82f6',
        Food: '#10b981',
        Transport: '#f59e0b',
      },
      showPaidExpenses: true,
    } as any);
  });

  it('should render the expense overview title', () => {
    render(<ExpenseOverview />);
    expect(screen.getByText('Expense Overview')).toBeInTheDocument();
  });

  it('should display the monthly total', () => {
    render(<ExpenseOverview />);
    // Check for the total amount (without the $ sign which is removed)
    expect(screen.getByText(/1,900/)).toBeInTheDocument();
  });

  it('should display category totals in the legend', () => {
    render(<ExpenseOverview />);

    // Categories appear in both top categories and legend, so use getAllByText
    expect(screen.getAllByText('Housing').length).toBeGreaterThan(0);
    expect(screen.getByText(/\$1,200/)).toBeInTheDocument();
    expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
    expect(screen.getByText(/\$400/)).toBeInTheDocument();
    expect(screen.getAllByText('Transport').length).toBeGreaterThan(0);
    expect(screen.getByText(/\$300/)).toBeInTheDocument();
  });

  it('should render the pie chart', () => {
    render(<ExpenseOverview />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should display top categories breakdown', () => {
    render(<ExpenseOverview />);

    expect(screen.getByText('Top Categories:')).toBeInTheDocument();
    // Housing should be top (1200/1900 = 63%)
    expect(screen.getByText('63%')).toBeInTheDocument();
    // Food should be second (400/1900 = 21%)
    expect(screen.getByText('21%')).toBeInTheDocument();
  });

  it('should show view mode toggle with options', () => {
    render(<ExpenseOverview />);

    const toggle = screen.getByTestId('animated-toggle');
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('should display correct label for "remaining" mode', () => {
    vi.mocked(useExpenseStore).mockReturnValue({
      selectedMonth: new Date('2024-01-15'),
      getTotalByCategoryFiltered: mockGetTotalByCategoryFiltered,
      getMonthlyTotalFiltered: mockGetMonthlyTotalFiltered,
      overviewMode: 'remaining',
      setOverviewMode: mockSetOverviewMode,
      categoryColors: {},
      showPaidExpenses: false,
    } as any);

    render(<ExpenseOverview />);
    expect(screen.getByText('Remaining Unpaid')).toBeInTheDocument();
  });

  it('should display correct label for "required" mode with paid expenses shown', () => {
    vi.mocked(useExpenseStore).mockReturnValue({
      selectedMonth: new Date('2024-01-15'),
      getTotalByCategoryFiltered: mockGetTotalByCategoryFiltered,
      getMonthlyTotalFiltered: mockGetMonthlyTotalFiltered,
      overviewMode: 'required',
      setOverviewMode: mockSetOverviewMode,
      categoryColors: {},
      showPaidExpenses: true,
    } as any);

    render(<ExpenseOverview />);
    expect(screen.getByText('Total Required Expenses')).toBeInTheDocument();
  });

  it('should display correct label for "all" mode with paid expenses shown', () => {
    vi.mocked(useExpenseStore).mockReturnValue({
      selectedMonth: new Date('2024-01-15'),
      getTotalByCategoryFiltered: mockGetTotalByCategoryFiltered,
      getMonthlyTotalFiltered: mockGetMonthlyTotalFiltered,
      overviewMode: 'all',
      setOverviewMode: mockSetOverviewMode,
      categoryColors: {},
      showPaidExpenses: true,
    } as any);

    render(<ExpenseOverview />);
    expect(screen.getByText('All Monthly Expenses')).toBeInTheDocument();
  });

  it('should show placeholder data when no expenses exist', () => {
    mockGetTotalByCategoryFiltered.mockReturnValue({});
    mockGetMonthlyTotalFiltered.mockReturnValue(0);

    render(<ExpenseOverview />);

    expect(screen.getByText(/Example distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Add expenses to see your data/i)).toBeInTheDocument();
  });

  it('should return null when selectedMonth is not set', () => {
    vi.mocked(useExpenseStore).mockReturnValue({
      selectedMonth: null,
      getTotalByCategoryFiltered: mockGetTotalByCategoryFiltered,
      getMonthlyTotalFiltered: mockGetMonthlyTotalFiltered,
      overviewMode: 'all',
      setOverviewMode: mockSetOverviewMode,
      categoryColors: {},
      showPaidExpenses: true,
    } as any);

    const { container } = render(<ExpenseOverview />);
    expect(container.firstChild).toBeNull();
  });

  it('should render month navigation component', () => {
    render(<ExpenseOverview />);
    expect(screen.getByTestId('month-navigation')).toBeInTheDocument();
  });
});
