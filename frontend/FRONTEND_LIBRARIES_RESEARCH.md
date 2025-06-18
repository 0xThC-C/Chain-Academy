# Frontend Libraries Research for Chain Academy V2

This document provides comprehensive research on the most up-to-date frontend libraries and best practices for the Chain Academy V2 decentralized mentorship platform.

## Table of Contents
- [Next.js & React Framework](#nextjs--react-framework)
- [Styling & UI Framework](#styling--ui-framework)
- [Icons & Assets](#icons--assets)
- [State Management](#state-management)
- [Form Handling](#form-handling)
- [TypeScript Configuration](#typescript-configuration)
- [Migration Strategy](#migration-strategy)
- [Best Practices Guide](#best-practices-guide)

## Next.js & React Framework

### Next.js 15 with App Router
**Recommendation**: Migrate to Next.js 15 with App Router for the most modern React experience.

**Installation**:
```bash
npx create-next-app@latest chain-academy-v2 --typescript --tailwind --app
cd chain-academy-v2
npm install
```

**Key Features & Benefits**:
- **App Router**: File-based routing with improved performance and developer experience
- **Server Components**: Default server rendering for better performance
- **Streaming**: Built-in streaming for faster page loads
- **TypeScript Integration**: First-class TypeScript support out of the box
- **Built-in Font Optimization**: Using `next/font` for Google Fonts

**Example App Structure**:
```typescript
// app/layout.tsx - Root Layout (Required)
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

```typescript
// app/page.tsx - Home Page
export default function Page() {
  return <h1>Welcome to Chain Academy V2</h1>
}
```

### Modern React Patterns

**React 18+ Features to Leverage**:
- **Server Components**: For static content and data fetching
- **Client Components**: For interactive elements (use `"use client"` directive)
- **Suspense**: For loading states and data fetching
- **Concurrent Features**: Built-in with Next.js 15

**Client Component Example**:
```typescript
// components/WalletConnector.tsx
"use client"

import { useState, useEffect } from 'react'

export default function WalletConnector() {
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    // Client-side wallet connection logic
  }, [])

  return (
    <button onClick={() => setIsConnected(!isConnected)}>
      {isConnected ? 'Disconnect' : 'Connect Wallet'}
    </button>
  )
}
```

## Styling & UI Framework

### Tailwind CSS 4.x (Latest)
**Recommendation**: Use Tailwind CSS for utility-first styling with built-in dark mode support.

**Installation & Configuration**:
```bash
npm install tailwindcss@latest postcss autoprefixer
npx tailwindcss init -p
```

**Tailwind Configuration for Chain Academy**:
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Chain Academy Brand Colors
        primary: {
          50: '#fef2f2',
          500: '#ef4444', // Red primary
          900: '#7f1d1d',
        },
        neutral: {
          0: '#ffffff', // Pure white
          1000: '#000000', // Pure black
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
```

**Global CSS Setup**:
```css
/* app/globals.css */
@import 'tailwindcss';

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 255, 255, 255;
  --background-end-rgb: 255, 255, 255;
}

[data-theme='dark'] {
  --foreground-rgb: 255, 255, 255;
  --background-start-rgb: 0, 0, 0;
  --background-end-rgb: 0, 0, 0;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
    to bottom,
    transparent,
    rgb(var(--background-end-rgb))
  ) rgb(var(--background-start-rgb));
}
```

**Dark Mode Implementation**:
```typescript
// components/ThemeToggle.tsx
"use client"

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check localStorage and system preference
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
    
    setIsDark(shouldBeDark)
    document.documentElement.className = shouldBeDark ? 'dark' : ''
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.className = newTheme ? 'dark' : ''
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}
```

### UI Component Libraries

**Recommendation**: Use Headless UI + shadcn/ui for accessible, customizable components.

**Headless UI Installation**:
```bash
npm install @headlessui/react
```

**shadcn/ui Setup** (Optional but recommended):
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

**Custom Button Component Example**:
```typescript
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variants
          {
            'bg-primary-500 text-white hover:bg-primary-600': variant === 'primary',
            'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100': variant === 'secondary',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800': variant === 'ghost',
          },
          // Sizes
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
```

## Icons & Assets

### Heroicons (Recommended)
**Installation**:
```bash
npm install @heroicons/react
```

**Usage Examples**:
```typescript
// Solid icons (24x24)
import { BeakerIcon, UserIcon } from '@heroicons/react/24/solid'

// Outline icons (24x24)
import { 
  Bars3Icon, 
  XMarkIcon,
  WalletIcon 
} from '@heroicons/react/24/outline'

// Icon component example
export function WalletButton() {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-md">
      <WalletIcon className="h-5 w-5" />
      Connect Wallet
    </button>
  )
}
```

**Icon Sizing Classes**:
```css
/* Common icon sizes */
.icon-xs { @apply h-3 w-3; }
.icon-sm { @apply h-4 w-4; }
.icon-md { @apply h-5 w-5; }
.icon-lg { @apply h-6 w-6; }
.icon-xl { @apply h-8 w-8; }
```

**Alternative Icon Libraries**:
- **Lucide React**: Modern alternative with more icons
- **Phosphor Icons**: More comprehensive icon set
- **Tabler Icons**: 5800+ MIT-licensed SVG icons

## State Management

### Zustand (Recommended)
**Installation**:
```bash
npm install zustand
```

**Basic Store Setup**:
```typescript
// stores/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  address: string
  ensName?: string
  isConnected: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  connect: (address: string) => void
  disconnect: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      connect: (address: string) =>
        set({ 
          user: { address, isConnected: true },
          isLoading: false 
        }),
      disconnect: () => 
        set({ 
          user: null,
          isLoading: false 
        }),
      setLoading: (isLoading: boolean) => 
        set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
```

**Advanced Store with Slices Pattern**:
```typescript
// stores/useMentorshipStore.ts
import { create, StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'

// Mentorship slice
interface MentorshipSlice {
  mentorships: Mentorship[]
  addMentorship: (mentorship: Mentorship) => void
  updateMentorship: (id: string, updates: Partial<Mentorship>) => void
}

// Booking slice
interface BookingSlice {
  bookings: Booking[]
  createBooking: (booking: Booking) => void
  cancelBooking: (id: string) => void
}

// Combined store type
type StoreState = MentorshipSlice & BookingSlice

const createMentorshipSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  MentorshipSlice
> = (set) => ({
  mentorships: [],
  addMentorship: (mentorship) =>
    set(
      (state) => ({ mentorships: [...state.mentorships, mentorship] }),
      undefined,
      'mentorship/add'
    ),
  updateMentorship: (id, updates) =>
    set(
      (state) => ({
        mentorships: state.mentorships.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }),
      undefined,
      'mentorship/update'
    ),
})

const createBookingSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  BookingSlice
> = (set) => ({
  bookings: [],
  createBooking: (booking) =>
    set(
      (state) => ({ bookings: [...state.bookings, booking] }),
      undefined,
      'booking/create'
    ),
  cancelBooking: (id) =>
    set(
      (state) => ({
        bookings: state.bookings.filter((b) => b.id !== id),
      }),
      undefined,
      'booking/cancel'
    ),
})

export const useMentorshipStore = create<StoreState>()(
  devtools((...args) => ({
    ...createMentorshipSlice(...args),
    ...createBookingSlice(...args),
  }))
)
```

**Store Usage in Components**:
```typescript
// components/WalletStatus.tsx
"use client"

import { useAuthStore } from '@/stores/useAuthStore'

export default function WalletStatus() {
  const { user, isLoading, connect, disconnect } = useAuthStore()

  if (isLoading) {
    return <div>Connecting...</div>
  }

  if (!user?.isConnected) {
    return (
      <button onClick={() => connect('0x...')}>
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span>Connected: {user.address}</span>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

### Alternative State Management Options

**React Context + useReducer** (For smaller apps):
```typescript
// contexts/AppContext.tsx
"use client"

import { createContext, useContext, useReducer, ReactNode } from 'react'

type State = {
  theme: 'light' | 'dark'
  user: User | null
}

type Action = 
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_USER'; payload: User | null }

const AppContext = createContext<{
  state: State
  dispatch: React.Dispatch<Action>
} | null>(null)

function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_USER':
      return { ...state, user: action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    theme: 'light',
    user: null,
  })

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
```

## Form Handling

### React Hook Form (Recommended)
**Installation**:
```bash
npm install react-hook-form @hookform/resolvers zod
```

**Basic Form Setup**:
```typescript
// components/MentorshipForm.tsx
"use client"

import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const mentorshipSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive'),
  duration: z.number().min(15, 'Minimum 15 minutes'),
  category: z.string().min(1, 'Category is required'),
})

type MentorshipFormData = z.infer<typeof mentorshipSchema>

export default function MentorshipForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MentorshipFormData>({
    resolver: zodResolver(mentorshipSchema),
  })

  const onSubmit: SubmitHandler<MentorshipFormData> = async (data) => {
    try {
      // Submit to API
      console.log('Submitting:', data)
      // Reset form on success
      reset()
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          {...register('title')}
          type="text"
          className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm"
          placeholder="React Fundamentals"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm"
          placeholder="Learn React fundamentals..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium">
            Price (USDC)
          </label>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium">
            Duration (minutes)
          </label>
          <input
            {...register('duration', { valueAsNumber: true })}
            type="number"
            className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm"
          />
          {errors.duration && (
            <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Mentorship'}
      </button>
    </form>
  )
}
```

**Advanced Form with Field Arrays**:
```typescript
// For dynamic skill/tag inputs
import { useFieldArray } from 'react-hook-form'

const { fields, append, remove } = useFieldArray({
  control,
  name: "skills"
})

// In JSX:
{fields.map((field, index) => (
  <div key={field.id} className="flex gap-2">
    <input
      {...register(`skills.${index}.name`)}
      placeholder="Skill name"
    />
    <button
      type="button"
      onClick={() => remove(index)}
      className="text-red-500"
    >
      Remove
    </button>
  </div>
))}

<button
  type="button"
  onClick={() => append({ name: '' })}
  className="text-primary-500"
>
  Add Skill
</button>
```

## TypeScript Configuration

### Optimized tsconfig.json
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Type Definitions
```typescript
// types/index.ts
export interface User {
  id: string
  address: string
  ensName?: string
  avatar?: string
  bio?: string
  skills: string[]
  isMentor: boolean
  reputation: number
  totalSessions: number
  createdAt: Date
}

export interface Mentorship {
  id: string
  mentorId: string
  title: string
  description: string
  category: string
  price: number // in USDC
  duration: number // in minutes
  skills: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  mentorshipId: string
  menteeId: string
  scheduledAt: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  paymentTxHash?: string
  rating?: number
  feedback?: string
  createdAt: Date
}

// Utility types
export type ApiResponse<T> = {
  data: T
  success: boolean
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<{
  items: T[]
  total: number
  page: number
  limit: number
}>
```

## Migration Strategy

### Phase 1: Project Setup (Week 1)
1. **Initialize Next.js 15 project**:
   ```bash
   npx create-next-app@latest chain-academy-v2 --typescript --tailwind --app
   ```

2. **Install core dependencies**:
   ```bash
   npm install zustand @heroicons/react react-hook-form @hookform/resolvers zod
   npm install @headlessui/react clsx tailwind-merge
   npm install --save-dev @types/node
   ```

3. **Setup basic file structure**:
   ```
   src/
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx
   │   └── globals.css
   ├── components/
   │   ├── ui/
   │   └── layout/
   ├── lib/
   │   └── utils.ts
   ├── stores/
   │   └── index.ts
   └── types/
       └── index.ts
   ```

### Phase 2: Core Components (Week 2)
1. **Implement base UI components**:
   - Button, Input, Card, Modal
   - Navigation, Header, Footer
   - Theme toggle, Loading states

2. **Setup state management**:
   - Auth store for wallet connection
   - UI store for theme/modal states
   - Data stores for mentorships/sessions

### Phase 3: Feature Implementation (Weeks 3-4)
1. **Form implementations**:
   - Mentorship creation form
   - User profile form
   - Session booking form

2. **Data integration**:
   - API integration layer
   - Web3 wallet integration
   - Error handling and loading states

### Phase 4: Testing & Optimization (Week 5)
1. **Testing setup**:
   ```bash
   npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
   ```

2. **Performance optimization**:
   - Bundle analysis
   - Image optimization
   - Code splitting

## Best Practices Guide

### Component Structure
```typescript
// Good component structure
interface ComponentProps {
  // Props interface
}

export default function Component({ ...props }: ComponentProps) {
  // 1. Hooks
  const [state, setState] = useState()
  const { data } = useQuery()
  
  // 2. Derived state
  const computedValue = useMemo(() => {}, [dependencies])
  
  // 3. Effects
  useEffect(() => {}, [])
  
  // 4. Event handlers
  const handleClick = useCallback(() => {}, [])
  
  // 5. Early returns
  if (loading) return <Spinner />
  if (error) return <ErrorMessage />
  
  // 6. Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### File Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with "use" prefix (`useAuth.ts`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`User.types.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

### Import Order
```typescript
// 1. React and Next.js
import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// 2. Third-party libraries
import { useForm } from 'react-hook-form'
import { create } from 'zustand'

// 3. Internal utilities
import { cn, formatCurrency } from '@/lib/utils'

// 4. Internal components
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// 5. Types
import type { User, Mentorship } from '@/types'
```

### Performance Optimization
```typescript
// Use React.memo for expensive components
export default React.memo(function ExpensiveComponent({ data }) {
  return <div>{/* Complex rendering */}</div>
})

// Use useCallback for event handlers
const handleSubmit = useCallback((data) => {
  // Handler logic
}, [dependency])

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])

// Use dynamic imports for code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>
})
```

### Error Boundaries
```typescript
// components/ErrorBoundary.tsx
"use client"

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600">
              Something went wrong
            </h2>
            <p className="mt-2 text-neutral-600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Summary

This research provides a modern, scalable foundation for Chain Academy V2's frontend:

- **Next.js 15 + App Router**: Latest React features with excellent performance
- **Tailwind CSS**: Utility-first styling with built-in dark mode
- **Zustand**: Lightweight, TypeScript-friendly state management
- **React Hook Form**: Performant form handling with validation
- **Heroicons**: Consistent, accessible icon library
- **TypeScript**: Full type safety throughout the application

The recommended stack prioritizes developer experience, performance, accessibility, and maintainability while aligning with the project's decentralized, professional requirements.