import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { resetMockBackend } from '@/data/network/mockBackend'

beforeEach(() => {
  resetMockBackend()
})

afterEach(() => {
  resetMockBackend()
})
