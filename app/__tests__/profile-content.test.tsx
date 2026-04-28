import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { ProfileContent } from '../(app)/profile/profile-content'
import type { Profile } from '@/lib/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock isMonday so the editor renders in a predictable state
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return { ...actual, isMonday: vi.fn(() => false) }
})

// Mock Supabase client (not needed for these render-only tests)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { signOut: vi.fn() },
  })),
}))

function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    full_name: 'Test User',
    target_type: null,
    daily_target: 5,
    onboarding_completed: true,
    current_streak: 0,
    longest_streak: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Property 2: Null daily_target defaults to 1
// Feature: monday-target-update, Property 2: Null daily_target defaults to 1
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------
describe('Property 2: Null daily_target defaults to 1', () => {
  it('passes currentTarget=1 to DailyTargetEditor when daily_target is null', () => {
    fc.assert(
      fc.property(
        // Generate profile objects where daily_target is always null
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          full_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
          target_type: fc.constant(null),
          daily_target: fc.constant(null),
          onboarding_completed: fc.boolean(),
          current_streak: fc.nat({ max: 100 }),
          longest_streak: fc.nat({ max: 100 }),
          created_at: fc.constant('2024-01-01T00:00:00Z'),
          updated_at: fc.constant('2024-01-01T00:00:00Z'),
        }),
        (profile) => {
          const { unmount } = render(
            <ProfileContent profile={profile} email="test@example.com" />,
          )

          // The DailyTargetEditor input should show "1" as the default value
          const input = screen.getByRole('spinbutton', { name: /daily target/i })
          expect((input as HTMLInputElement).value).toBe('1')

          unmount()
        },
      ),
      { numRuns: 20 },
    )
  }, 15000)

  it('passes the actual daily_target value when it is not null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (dailyTarget) => {
          const profile = buildProfile({ daily_target: dailyTarget })
          const { unmount } = render(
            <ProfileContent profile={profile} email="test@example.com" />,
          )

          const input = screen.getByRole('spinbutton', { name: /daily target/i })
          expect((input as HTMLInputElement).value).toBe(String(dailyTarget))

          unmount()
        },
      ),
      { numRuns: 20 },
    )
  })
})
