'use client'

// Stub file - @project/anchor module not available
// This counter feature is disabled until the anchor package is properly configured

export function useCounterProgram() {
  return {
    program: null,
    programId: null,
    accounts: { data: [], isLoading: false, refetch: () => {} },
    getProgramAccount: { data: null, isLoading: false },
    initialize: { mutate: () => {}, isPending: false },
  }
}

export function useCounterProgramAccount({ account }: { account: any }) {
  return {
    accountQuery: { data: null, isLoading: false },
    closeMutation: { mutate: () => {}, isPending: false },
    decrementMutation: { mutate: () => {}, isPending: false },
    incrementMutation: { mutate: () => {}, isPending: false },
    setMutation: { mutate: () => {}, isPending: false },
  }
}
