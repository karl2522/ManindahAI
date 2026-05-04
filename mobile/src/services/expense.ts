import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────

export type Expense = {
  expense_id: string;
  store_id: string;
  name: string;
  amount: number;
  date: string;
  created_at: string;
};

export type CreateExpenseInput = {
  store_id: string;
  name: string;
  amount: number;
  date?: string; // defaults to now on the DB side
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'store_id'>>;

// ─── Service ─────────────────────────────────────────────────────────

export const ExpenseService = {
  /**
   * Get all expenses for a store, newest first.
   */
  async getByStoreId(store_id: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', store_id)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);

    return data as Expense[];
  },

  /**
   * Get expenses within a date range (inclusive). For daily/monthly summaries.
   */
  async getByDateRange(
    store_id: string,
    startDate: string,
    endDate: string
  ): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', store_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch expenses by date range: ${error.message}`);

    return data as Expense[];
  },

  /**
   * Create a new expense entry.
   */
  async create(input: CreateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create expense: ${error.message}`);

    return data as Expense;
  },

  /**
   * Update an existing expense.
   */
  async update(expense_id: string, input: UpdateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(input)
      .eq('expense_id', expense_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update expense: ${error.message}`);

    return data as Expense;
  },

  /**
   * Delete an expense by ID.
   */
  async delete(expense_id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('expense_id', expense_id);

    if (error) throw new Error(`Failed to delete expense: ${error.message}`);
  },

  /**
   * Get total expenses for a store within a date range.
   * Useful for P&L summaries.
   */
  async getTotalByDateRange(
    store_id: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const expenses = await this.getByDateRange(store_id, startDate, endDate);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  },
};
