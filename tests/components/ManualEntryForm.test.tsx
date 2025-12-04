import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ManualEntryForm from '../../src/apps/Finances/income/components/ManualEntryForm';
import type { IncomeEntry } from '../../src/types/income';

describe('ManualEntryForm', () => {
  const mockOnEntryChange = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultNewEntry: Omit<IncomeEntry, 'id'> = {
    date: '2024-01-15',
    amount: 0,
    hours: 0,
    minutes: 0,
  };

  const availableDates = [
    { value: '2024-01-15', label: 'Mon, Jan 15' },
    { value: '2024-01-16', label: 'Tue, Jan 16' },
    { value: '2024-01-17', label: 'Wed, Jan 17' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields', () => {
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Amount ($)')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
  });

  it('should display submit button', () => {
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
  });

  it('should call onEntryChange when amount is changed', async () => {
    const user = userEvent.setup();
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '150');

    expect(mockOnEntryChange).toHaveBeenCalled();
  });

  it('should call onEntryChange when hours are changed', async () => {
    const user = userEvent.setup();
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    const hoursInputs = screen.getAllByPlaceholderText('0');
    await user.type(hoursInputs[0], '8');

    expect(mockOnEntryChange).toHaveBeenCalled();
  });

  it('should have submit button with correct type', () => {
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /add entry/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should display helper text about optional fields', () => {
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/hours and minutes are optional/i)).toBeInTheDocument();
  });

  it('should have required attribute on amount field', () => {
    render(
      <ManualEntryForm
        newEntry={defaultNewEntry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    expect(amountInput).toBeRequired();
  });

  it('should accept amount with decimal values', () => {
    const entry = { ...defaultNewEntry, amount: 123.45 };

    render(
      <ManualEntryForm
        newEntry={entry}
        availableDates={availableDates}
        onEntryChange={mockOnEntryChange}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    expect(amountInput).toHaveValue(123.45);
  });
});
