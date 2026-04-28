import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DailyTargetEditor } from '../daily-target-editor'

// Mock isMonday to always return true so the input is enabled in tests
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    isMonday: vi.fn(() => true),
  }
})

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockCreateClient = vi.mocked(createClient)

function buildSupabaseMock(
  resolveWith: { error: null | { message: string } },
  delay = 0,
) {
  mockCreateClient.mockReturnValue({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() =>
          delay > 0
            ? new Promise((resolve) =>
                setTimeout(() => resolve(resolveWith), delay),
              )
            : Promise.resolve(resolveWith),
        ),
      })),
    })),
  } as unknown as ReturnType<typeof createClient>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Property 7: Submit is disabled while saving
// Feature: monday-target-update, Property 7: Submit is disabled while saving
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------
describe('Property 7: Submit is disabled while saving', () => {
  it('disables the submit button while a save is in progress', async () => {
    // Use a never-resolving promise to keep the save in-flight indefinitely
    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => new Promise(() => {})), // never resolves
        })),
      })),
    } as unknown as ReturnType<typeof createClient>)

    const { unmount } = render(
      <DailyTargetEditor
        currentTarget={5}
        userId="user-1"
        onTargetUpdated={vi.fn()}
      />,
    )

    const input = screen.getByRole('spinbutton', { name: /daily target/i })
    const submitBtn = screen.getByRole('button', { name: /save/i })

    // Set a valid value and submit
    fireEvent.change(input, { target: { value: '5' } })

    // Wrap in act to flush the synchronous state update from form submit
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })

    // Button should be disabled while the promise is pending
    expect(submitBtn).toBeDisabled()

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Property 5: Successful save propagates new target in-session
// Feature: monday-target-update, Property 5: Successful save propagates new target in-session
// Validates: Requirements 4.1, 4.2, 5.1
// ---------------------------------------------------------------------------
describe('Property 5: Successful save propagates new target in-session', () => {
  it('calls onTargetUpdated with the exact parsed integer for arbitrary valid targets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (target) => {
          buildSupabaseMock({ error: null })
          const onTargetUpdated = vi.fn()

          const { unmount } = render(
            <DailyTargetEditor
              currentTarget={1}
              userId="user-1"
              onTargetUpdated={onTargetUpdated}
            />,
          )

          const input = screen.getByRole('spinbutton', { name: /daily target/i })

          fireEvent.change(input, { target: { value: String(target) } })

          await act(async () => {
            fireEvent.submit(input.closest('form')!)
          })

          await waitFor(() =>
            expect(onTargetUpdated).toHaveBeenCalledWith(target),
          )

          unmount()
          vi.clearAllMocks()
        },
      ),
      { numRuns: 20 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 6: Failed save retains previous value
// Feature: monday-target-update, Property 6: Failed save retains previous value
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------
describe('Property 6: Failed save retains previous value', () => {
  it('reverts inputValue to currentTarget after a failed save for arbitrary valid targets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        async (currentTarget, newTarget) => {
          buildSupabaseMock({ error: { message: 'DB error' } })
          const onTargetUpdated = vi.fn()

          const { unmount } = render(
            <DailyTargetEditor
              currentTarget={currentTarget}
              userId="user-1"
              onTargetUpdated={onTargetUpdated}
            />,
          )

          const input = screen.getByRole('spinbutton', { name: /daily target/i })

          fireEvent.change(input, { target: { value: String(newTarget) } })

          await act(async () => {
            fireEvent.submit(input.closest('form')!)
          })

          // After failure, input should revert to currentTarget
          await waitFor(() =>
            expect((input as HTMLInputElement).value).toBe(
              String(currentTarget),
            ),
          )
          expect(onTargetUpdated).not.toHaveBeenCalled()

          unmount()
          vi.clearAllMocks()
        },
      ),
      { numRuns: 20 },
    )
  })
})
