// Progressive Escrow Contract Configuration
// This file exports the current active version (V8) contracts

export * from './ProgressiveEscrowV8';

// Re-export for backward compatibility
export { 
  PROGRESSIVE_ESCROW_ADDRESSES as CONTRACT_ADDRESSES,
  PROGRESSIVE_ESCROW_V8_ABI as CONTRACT_ABI,
  CONTRACT_VERSION,
  V8_FEATURES as CURRENT_FEATURES
} from './ProgressiveEscrowV8';

console.log('📦 Chain Academy Frontend - Using Progressive Escrow V8 Contracts');
console.log('✅ V8 Features: Enhanced State Machine, Auto-Recovery, Dispute Resolution');