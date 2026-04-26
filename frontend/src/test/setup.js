import '@testing-library/jest-dom'
import React from 'react'
global.React = React

// Recharts uses ResizeObserver internally — jsdom doesn't implement it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
