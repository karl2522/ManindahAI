import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { addToOutbox, OutboxOp, OutboxInput } from '../lib/outbox';
import { flushOutbox } from '../services/syncService';

interface OfflineMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  // We need to know how to construct the outbox item
  getOutboxInput: (variables: TVariables) => OutboxInput;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => Promise<unknown> | unknown;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => Promise<unknown> | unknown;
}

export function useOfflineMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: OfflineMutationOptions<TData, TError, TVariables, TContext>
) {
  const { mutationFn, getOutboxInput, ...mutationOptions } = options;

  if (!mutationFn) {
    throw new Error('mutationFn is required for useOfflineMutation');
  }

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: async (variables: TVariables) => {
      try {
        // 1. Try to run the actual mutation
        return await mutationFn(variables);
      } catch (error) {
        // 2. If it fails (likely network), queue it in the outbox
        const input = getOutboxInput(variables);
        console.log(`[OfflineMutation] Failed, queuing ${input.op}:`, error);
        
        await addToOutbox(input);

        // 3. Trigger a background sync attempt
        flushOutbox().catch(console.error);

        // We throw so the UI knows it didn't complete immediately
        throw error;
      }
    },
  });
}
