# Chain Academy V2 Frontend

This is the frontend application for Chain Academy V2, a decentralized cryptocurrency and blockchain mentorship platform.

## Features

- **Responsive Design**: Built with Tailwind CSS and follows a Discord-style professional interface
- **Dark/Light Mode**: Persistent theme toggle with user preference storage
- **Multi-Wallet Support**: Connect with MetaMask, WalletConnect, and other injected wallets
- **Multi-Chain Support**: Ethereum, Polygon, Arbitrum, Optimism, and Base networks
- **Modern UI Components**: Clean, professional interface using Heroicons
- **TypeScript**: Full type safety throughout the application

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling with custom design system
- **wagmi** for Web3 wallet integration
- **React Router** for navigation
- **Heroicons** for consistent iconography
- **TanStack Query** for state management

## Color Scheme

The application follows a strict black/white/red color scheme as specified:
- **Primary Black**: #000000
- **Primary White**: #FFFFFF
- **Primary Red**: #FF0000

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your WalletConnect Project ID in `.env`:
```
REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint (when configured)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx       # Main navigation header
│   └── WalletConnection.tsx  # Wallet connection component
├── pages/              # Main page components
│   ├── HomePage.tsx    # Landing page with hero section
│   ├── MentorshipGallery.tsx  # Browse mentors
│   └── UserDashboard.tsx      # User dashboard with 4 tabs
├── contexts/           # React contexts
│   └── ThemeContext.tsx       # Dark/light mode management
├── config/             # Configuration files
│   └── wagmi.ts        # Wallet and chain configuration
└── App.tsx             # Main application component
```

## Key Features

### 1. HomePage
- Hero section with call-to-action
- Feature highlights
- How it works section
- Testimonials
- Professional landing experience

### 2. MentorshipGallery
- Browse available mentors
- Advanced filtering (category, price, rating)
- Search functionality
- Mentor cards with detailed information
- Responsive grid layout

### 3. UserDashboard
Four main sections:
- **Profile**: User profile management
- **Create Mentorship**: Create mentorship offerings
- **My Mentorships**: View scheduled/completed sessions
- **Financial**: Earnings and transaction history

### 4. WalletConnection
- Multi-wallet support (MetaMask, WalletConnect, Injected)
- Network switching for supported chains
- Connection status indicator
- Clean dropdown interface

## Design Principles

1. **Privacy-First**: No personal information collection
2. **Professional Interface**: Discord-inspired clean design
3. **Accessibility**: Proper contrast ratios and semantic HTML
4. **Responsive**: Mobile-first approach with Tailwind breakpoints
5. **Performance**: Optimized components and lazy loading

## Next Steps

1. Integrate with smart contracts for payment processing
2. Add WebRTC functionality for video calls
3. Implement real-time chat features
4. Add more advanced filtering options
5. Integrate with IPFS for decentralized storage