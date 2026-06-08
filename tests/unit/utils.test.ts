import { describe, test, expect } from 'vitest'
import { getReadingTime } from '../../src/utils/readingTime'
import { formatDate } from '../../src/utils/formatDate'
import { slugify } from '../../src/utils/slugify'

describe('getReadingTime', () => {
  test('200 words = 1 min read', () => {
    const text = 'word '.repeat(200)
    expect(getReadingTime(text)).toBe('1 min read')
  })
  test('400 words = 2 min read', () => {
    const text = 'word '.repeat(400)
    expect(getReadingTime(text)).toBe('2 min read')
  })
  test('empty string = 1 min read (minimum)', () => {
    expect(getReadingTime('')).toBe('1 min read')
  })
})

describe('formatDate', () => {
  test('formats date correctly', () => {
    const date = new Date('2025-06-03')
    expect(formatDate(date)).toBe('June 3, 2025')
  })
  test('pads single-digit days without zero', () => {
    const date = new Date('2025-01-07')
    expect(formatDate(date)).toBe('January 7, 2025')
  })
})

describe('slugify', () => {
  test('lowercases and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  test('replaces underscores with hyphens', () => {
    expect(slugify('First_Principles')).toBe('first-principles')
  })
  test('collapses consecutive hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })
  test('removes special characters', () => {
    expect(slugify('What is X, really?')).toBe('what-is-x-really')
  })
  test('trims whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })
})
