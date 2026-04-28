import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isMonday, validateTarget } from '../utils'

// Feature: monday-target-update, Property 1: Monday gate allows edits only on Monday
// Validates: Requirements 2.1, 2.2, 2.4
describe('isMonday', () => {
  it('returns true for a known Monday date', () => {
    // 2024-01-01 is a Monday
    expect(isMonday(new Date('2024-01-01'))).toBe(true)
  })

  it('returns false for known non-Monday dates', () => {
    expect(isMonday(new Date('2024-01-02'))).toBe(false) // Tuesday
    expect(isMonday(new Date('2024-01-07'))).toBe(false) // Sunday
  })

  it('Property 1: isMonday(d) === (d.getDay() === 1) for arbitrary dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
        (d) => {
          return isMonday(d) === (d.getDay() === 1)
        }
      ),
      { numRuns: 1000 }
    )
  })
})

// Feature: monday-target-update, Property 3: Input validation rejects non-positive and non-integer values
// Validates: Requirements 3.1, 3.3
describe('validateTarget', () => {
  it('returns error for empty string', () => {
    expect(validateTarget('')).toBe('Please enter a number')
  })

  it('returns error for whitespace-only string', () => {
    expect(validateTarget('   ')).toBe('Please enter a number')
  })

  it('returns error for non-integer strings', () => {
    expect(validateTarget('1.5')).toBe('Must be a whole number')
    expect(validateTarget('abc')).toBe('Must be a whole number')
    expect(validateTarget('1.0')).toBe('Must be a whole number')
  })

  it('returns error for values less than 1', () => {
    expect(validateTarget('0')).toBe('Must be at least 1')
    expect(validateTarget('-1')).toBe('Must be at least 1')
    expect(validateTarget('-100')).toBe('Must be at least 1')
  })

  it('returns null for valid positive integers', () => {
    expect(validateTarget('1')).toBeNull()
    expect(validateTarget('5')).toBeNull()
    expect(validateTarget('20')).toBeNull()
    expect(validateTarget('21')).toBeNull()
  })

  it('Property 3: arbitrary non-positive-integer strings return a non-null error', () => {
    // Generate strings that are NOT valid positive integers >= 1
    const nonPositiveIntegerString = fc.oneof(
      // empty / whitespace
      fc.constant(''),
      fc.stringMatching(/^\s+$/),
      // decimal numbers (use Math.fround to satisfy fast-check 32-bit float constraint)
      fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true }).map(
        (n) => n.toFixed(2)
      ),
      // zero or negative integers
      fc.integer({ min: -10000, max: 0 }).map(String),
      // arbitrary non-numeric strings (at least one non-digit char, not a leading minus)
      fc.stringMatching(/[^0-9\-]/)
    )

    fc.assert(
      fc.property(nonPositiveIntegerString, (s) => {
        return validateTarget(s) !== null
      }),
      { numRuns: 500 }
    )
  })

  it('Property 3: valid positive integer strings (>= 1) return null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }).map(String),
        (s) => {
          return validateTarget(s) === null
        }
      ),
      { numRuns: 500 }
    )
  })
})
