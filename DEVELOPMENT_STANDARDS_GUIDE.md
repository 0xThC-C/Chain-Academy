# CHAIN ACADEMY V2 - DEVELOPMENT STANDARDS GUIDE

> This guide ensures harmony between all code generated by different agents and developers, preventing conflicts and maintaining consistency across the entire Chain Academy V2 stack.

## 1. ARCHITECTURE PRINCIPLES

### Separation of Concerns
- **Frontend**: UI logic, user interactions, wallet connections
- **Backend**: Business logic, API endpoints, WebRTC signaling
- **Smart Contracts**: Payment escrow, on-chain reputation, decentralized logic
- **Database**: User preferences, session metadata, off-chain data

### Integration Points
```
Frontend <---> Backend API <---> Database
    |                              |
    +---> Smart Contracts <--------+
```

### Data Flow Patterns
- **User Actions**: Frontend → Backend API → Smart Contract → Events → Frontend
- **State Management**: Local State → Context/Redux → Backend Cache → Blockchain
- **Real-time Updates**: WebRTC → Signaling Server → Peer Connection

## 2. NAMING CONVENTIONS

### File Naming
```typescript
// ✅ DO
components/MentorshipCard.tsx      // React components - PascalCase
hooks/useWalletConnection.ts       // Custom hooks - camelCase with 'use' prefix
utils/formatAddress.ts             // Utility functions - camelCase
types/mentorship.types.ts          // Type definitions - camelCase with .types suffix
api/mentorship-routes.ts           // API routes - kebab-case
contracts/Mentorship.sol           // Smart contracts - PascalCase

// ❌ DON'T
components/mentorship-card.tsx     // Wrong case for components
hooks/WalletConnection.ts          // Missing 'use' prefix
utils/format_address.ts            // Snake_case in TypeScript
```

### Variable Naming
```typescript
// Frontend/Backend TypeScript
const mentorshipPrice = 100;              // camelCase for variables
const PLATFORM_FEE_PERCENTAGE = 10;       // UPPER_SNAKE_CASE for constants
interface MentorshipSession { }           // PascalCase for interfaces/types

// Smart Contracts Solidity
uint256 public platformFee;               // camelCase for state variables
uint256 private constant PERCENTAGE_BASE = 100;  // UPPER_SNAKE_CASE for constants
mapping(address => Mentor) public mentors;       // camelCase for mappings
```

### Component Naming
```typescript
// ✅ DO
export const MentorshipCard: React.FC<Props> = () => { }
export default function ProfilePage() { }

// ❌ DON'T
export const mentorship_card = () => { }
export const MentorshipCardComponent = () => { }  // Redundant 'Component' suffix
```

## 3. CODE ORGANIZATION

### Directory Structure
```
chain-academy-v2/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        // Shared components
│   │   │   ├── mentorship/    // Feature-specific components
│   │   │   └── profile/
│   │   ├── hooks/             // Custom React hooks
│   │   ├── utils/             // Utility functions
│   │   ├── types/             // TypeScript type definitions
│   │   ├── services/          // API service layers
│   │   ├── contexts/          // React contexts
│   │   └── pages/             // Page components
├── backend/
│   ├── src/
│   │   ├── routes/            // Express routes
│   │   ├── controllers/       // Route controllers
│   │   ├── services/          // Business logic
│   │   ├── models/            // Database models
│   │   ├── middleware/        // Express middleware
│   │   ├── utils/             // Utility functions
│   │   └── types/             // Shared TypeScript types
└── contracts/
    ├── contracts/             // Solidity contracts
    ├── scripts/               // Deployment scripts
    └── test/                  // Contract tests
```

### Import/Export Patterns
```typescript
// ✅ DO - Named exports for utilities and components
export const formatAddress = (address: string) => { };
export const MentorshipCard: React.FC = () => { };

// ✅ DO - Default export for pages
export default function HomePage() { }

// ✅ DO - Barrel exports for clean imports
// components/index.ts
export { MentorshipCard } from './MentorshipCard';
export { ProfileCard } from './ProfileCard';

// ❌ DON'T - Mix default and named exports unnecessarily
export default formatAddress;
export { formatAddress };
```

### Component Composition Rules
```typescript
// ✅ DO - Compose with clear prop interfaces
interface MentorCardProps {
  mentor: Mentor;
  onSelect: (mentorId: string) => void;
}

export const MentorCard: React.FC<MentorCardProps> = ({ mentor, onSelect }) => {
  return (
    <div className="p-4 border rounded-lg">
      <h3>{mentor.name}</h3>
      <button onClick={() => onSelect(mentor.id)}>Select</button>
    </div>
  );
};

// ❌ DON'T - Prop drilling or unclear interfaces
export const MentorCard = (props: any) => { };
```

## 4. INTEGRATION STANDARDS

### Frontend ↔ Backend API Contracts
```typescript
// Shared types (in shared/types or duplicated)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Backend endpoint
app.post('/api/mentorships', async (req, res) => {
  const response: ApiResponse<Mentorship> = {
    success: true,
    data: mentorship
  };
  res.json(response);
});

// Frontend service
export const createMentorship = async (data: CreateMentorshipDto): Promise<Mentorship> => {
  const response = await fetch('/api/mentorships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result: ApiResponse<Mentorship> = await response.json();
  if (!result.success) throw new Error(result.error?.message);
  return result.data!;
};
```

### Frontend ↔ Web3 Interaction Patterns
```typescript
// ✅ DO - Use wagmi hooks consistently
import { useContractWrite, usePrepareContractWrite } from 'wagmi';

export const useCreateMentorship = () => {
  const { config } = usePrepareContractWrite({
    address: MENTORSHIP_CONTRACT_ADDRESS,
    abi: MentorshipABI,
    functionName: 'createMentorship',
  });
  
  const { write, isLoading, isSuccess } = useContractWrite(config);
  
  return { createMentorship: write, isLoading, isSuccess };
};

// ❌ DON'T - Direct ethers.js calls in components
const contract = new ethers.Contract(address, abi, signer);
await contract.createMentorship();
```

### Backend ↔ Database Patterns
```typescript
// ✅ DO - Use service layer for database operations
// services/mentorshipService.ts
export class MentorshipService {
  async createMentorship(data: CreateMentorshipDto): Promise<Mentorship> {
    // Business logic validation
    if (data.price < MIN_PRICE) {
      throw new ValidationError('Price too low');
    }
    
    // Database operation
    return await MentorshipModel.create(data);
  }
}

// ❌ DON'T - Direct database calls in routes
app.post('/mentorships', async (req, res) => {
  const mentorship = await db.query('INSERT INTO mentorships...'); // Wrong
});
```

## 5. TYPESCRIPT STANDARDS

### Interface Definitions
```typescript
// ✅ DO - Clear, specific interfaces
interface Mentor {
  id: string;
  address: string;
  name: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  completedSessions: number;
}

interface CreateMentorshipDto {
  title: string;
  description: string;
  duration: number; // in minutes
  price: number;    // in USDC/USDT
  maxParticipants: number;
}

// ❌ DON'T - Overly generic or any types
interface Data {
  [key: string]: any;
}
```

### Type Sharing Between Layers
```typescript
// shared/types/mentorship.ts - Types used by both frontend and backend
export interface MentorshipBase {
  id: string;
  mentorAddress: string;
  title: string;
  price: number;
}

// frontend/types/mentorship.ts - Frontend-specific extensions
import { MentorshipBase } from '@shared/types';

export interface MentorshipUI extends MentorshipBase {
  formattedPrice: string;
  isBookmarked: boolean;
}

// backend/types/mentorship.ts - Backend-specific extensions
import { MentorshipBase } from '@shared/types';

export interface MentorshipDB extends MentorshipBase {
  createdAt: Date;
  updatedAt: Date;
}
```

### Generic Patterns
```typescript
// ✅ DO - Use generics for reusable patterns
export function createApiHandler<TRequest, TResponse>(
  handler: (req: TRequest) => Promise<TResponse>
): RequestHandler {
  return async (req, res, next) => {
    try {
      const result = await handler(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}

// ✅ DO - Constrain generics appropriately
export function sortByProperty<T extends Record<string, any>>(
  items: T[],
  property: keyof T
): T[] {
  return items.sort((a, b) => a[property] - b[property]);
}
```

## 6. STYLING STANDARDS

### Tailwind Class Organization
```typescript
// ✅ DO - Organized by: positioning, sizing, spacing, borders, colors, text, effects
<div className="
  relative flex items-center justify-between
  w-full h-16 px-4 py-2
  border border-gray-200 rounded-lg
  bg-white dark:bg-black
  text-gray-900 dark:text-white
  hover:shadow-lg transition-shadow
">

// ❌ DON'T - Random order
<div className="hover:shadow-lg px-4 bg-white flex h-16 text-gray-900 border w-full">
```

### Component Styling Patterns
```typescript
// ✅ DO - Use consistent variant patterns
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const buttonVariants = {
  primary: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  danger: 'bg-red-100 text-red-600 hover:bg-red-200'
};

const buttonSizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  return (
    <button 
      className={`
        ${buttonVariants[variant]} 
        ${buttonSizes[size]} 
        rounded-lg font-medium transition-colors
        ${className}
      `}
      {...props}
    />
  );
};
```

### Dark/Light Mode Consistency
```typescript
// ✅ DO - Always provide both light and dark variants
<div className="bg-white dark:bg-black text-gray-900 dark:text-white">
<div className="border-gray-200 dark:border-gray-800">
<div className="hover:bg-gray-100 dark:hover:bg-gray-900">

// ❌ DON'T - Forget dark mode variants
<div className="bg-white text-gray-900">  // Missing dark variants
```

## 7. TESTING STANDARDS

### Unit Test Patterns
```typescript
// Frontend component test
describe('MentorshipCard', () => {
  it('should display mentor information', () => {
    const mentor = createMockMentor();
    render(<MentorshipCard mentor={mentor} />);
    
    expect(screen.getByText(mentor.name)).toBeInTheDocument();
    expect(screen.getByText(`$${mentor.hourlyRate}/hr`)).toBeInTheDocument();
  });
});

// Backend service test
describe('MentorshipService', () => {
  it('should validate minimum price', async () => {
    const service = new MentorshipService();
    const invalidData = { ...validData, price: 0 };
    
    await expect(service.createMentorship(invalidData))
      .rejects.toThrow('Price too low');
  });
});
```

### Smart Contract Testing
```solidity
// ✅ DO - Test both success and failure cases
describe("Mentorship Contract", function () {
  it("Should create mentorship with correct fee split", async function () {
    const [owner, mentor, student] = await ethers.getSigners();
    const price = ethers.utils.parseUnits("100", 6); // 100 USDC
    
    await mentorship.connect(mentor).createSession(price, duration);
    await usdc.connect(student).approve(mentorship.address, price);
    await mentorship.connect(student).bookSession(sessionId);
    
    const mentorShare = price.mul(90).div(100);
    const platformShare = price.mul(10).div(100);
    
    expect(await mentorship.mentorEarnings(mentor.address)).to.equal(mentorShare);
    expect(await mentorship.platformEarnings()).to.equal(platformShare);
  });
});
```

## 8. ERROR HANDLING

### Frontend Error Boundaries
```typescript
// ✅ DO - Implement error boundaries for feature sections
export class MentorshipErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mentorship error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h3 className="text-red-600 dark:text-red-400">
            Something went wrong loading mentorships
          </h3>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Responses
```typescript
// ✅ DO - Consistent error format
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

// Middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};
```

### Web3 Error Management
```typescript
// ✅ DO - Handle specific Web3 errors
export const handleWeb3Error = (error: any): string => {
  if (error.code === 4001) {
    return 'Transaction rejected by user';
  }
  if (error.code === -32603) {
    return 'Insufficient funds for transaction';
  }
  if (error.message?.includes('nonce')) {
    return 'Transaction nonce error - please refresh and try again';
  }
  return 'Transaction failed - please try again';
};

// Usage in component
const { write, error } = useContractWrite(config);

useEffect(() => {
  if (error) {
    toast.error(handleWeb3Error(error));
  }
}, [error]);
```

## 9. PERFORMANCE STANDARDS

### Bundle Optimization
```typescript
// ✅ DO - Use dynamic imports for large components
const MentorshipVideoRoom = lazy(() => import('./components/MentorshipVideoRoom'));

// ✅ DO - Tree-shake imports
import { parseUnits } from 'ethers/lib/utils';  // Specific import

// ❌ DON'T - Import entire libraries
import * as ethers from 'ethers';  // Imports everything
```

### Database Query Patterns
```typescript
// ✅ DO - Use pagination and selective fields
export const getMentorships = async (page: number, limit: number) => {
  return await MentorshipModel.find()
    .select('id title price mentorAddress rating')
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();  // Returns plain objects instead of Mongoose documents
};

// ✅ DO - Use indexes for frequently queried fields
// In schema definition
mentorshipSchema.index({ mentorAddress: 1, createdAt: -1 });

// ❌ DON'T - Fetch all data
const allMentorships = await MentorshipModel.find();  // No pagination
```

### Web3 Call Optimization
```typescript
// ✅ DO - Batch contract reads with multicall
import { useContractReads } from 'wagmi';

const { data } = useContractReads({
  contracts: [
    { ...mentorshipContract, functionName: 'mentorRating', args: [address] },
    { ...mentorshipContract, functionName: 'totalSessions', args: [address] },
    { ...mentorshipContract, functionName: 'earnings', args: [address] }
  ]
});

// ❌ DON'T - Make multiple separate calls
const rating = await contract.mentorRating(address);
const sessions = await contract.totalSessions(address);
const earnings = await contract.earnings(address);
```

## 10. SECURITY STANDARDS

### Input Validation Patterns
```typescript
// Backend validation with Joi or similar
import Joi from 'joi';

const createMentorshipSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  price: Joi.number().min(10).max(10000).required(),
  duration: Joi.number().min(30).max(240).required()
});

export const validateCreateMentorship = (data: any) => {
  const { error, value } = createMentorshipSchema.validate(data);
  if (error) throw new ValidationError(error.details[0].message);
  return value;
};

// Frontend validation before submission
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
```

### Authentication Flows
```typescript
// ✅ DO - Use Sign-In with Ethereum (SIWE)
import { SiweMessage } from 'siwe';

export const generateNonce = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const verifySignature = async (message: string, signature: string) => {
  try {
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });
    return fields;
  } catch (error) {
    throw new ApiError('INVALID_SIGNATURE', 'Invalid signature');
  }
};

// ❌ DON'T - Store passwords or use traditional auth
// No password fields, no JWT without wallet verification
```

### Smart Contract Security
```solidity
// ✅ DO - Use checks-effects-interactions pattern
function withdrawEarnings() external nonReentrant {
    uint256 earnings = mentorEarnings[msg.sender];
    require(earnings > 0, "No earnings to withdraw");
    
    // Effects
    mentorEarnings[msg.sender] = 0;
    
    // Interactions
    (bool success, ) = msg.sender.call{value: earnings}("");
    require(success, "Transfer failed");
    
    emit EarningsWithdrawn(msg.sender, earnings);
}

// ✅ DO - Use OpenZeppelin contracts
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
```

## SPECIAL CHAIN ACADEMY REQUIREMENTS

### Decentralization Focus
- No centralized user data storage beyond necessary session metadata
- All reputation and history on-chain
- IPFS for large content storage when needed
- No KYC or personal information collection

### Mentorship-Specific Patterns
```typescript
// Session state management
enum SessionState {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled'
}

// WebRTC room patterns
interface MentorshipRoom {
  sessionId: string;
  mentorPeerId: string;
  studentPeerIds: string[];
  startTime: Date;
  scheduledDuration: number;
}
```

### Multi-Chain Considerations
```typescript
// ✅ DO - Abstract chain-specific logic
export const getContractAddress = (chainId: number): string => {
  const addresses: Record<number, string> = {
    1: '0x...', // Ethereum Mainnet
    137: '0x...', // Polygon
    42161: '0x...', // Arbitrum
    10: '0x...', // Optimism
    8453: '0x...' // Base
  };
  return addresses[chainId] || throw new Error('Unsupported chain');
};

// ✅ DO - Handle chain-specific token addresses
export const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  // ... other chains
};
```

## CONCLUSION

This guide is a living document that should be updated as the project evolves. All developers and agents should reference this guide to ensure consistent, high-quality code across the Chain Academy V2 platform.

### Quick Reference Checklist
- [ ] Following naming conventions for files and variables
- [ ] Organizing code according to directory structure
- [ ] Using TypeScript interfaces over any/unknown types
- [ ] Implementing proper error handling at all layers
- [ ] Including both light and dark mode styles
- [ ] Writing tests for new features
- [ ] Validating all user inputs
- [ ] Optimizing bundle size and database queries
- [ ] Following security best practices
- [ ] Maintaining decentralization principles

Remember: **Consistency is key to maintainable code!**