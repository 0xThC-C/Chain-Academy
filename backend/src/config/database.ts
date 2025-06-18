// Database configuration placeholder
// This file will be used when implementing database integration

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'chain_academy',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production',
  };
};

// TODO: Implement database connection using TypeORM, Prisma, or similar
// Example table schemas:
/*
Users:
- address (primary key)
- nonce
- created_at
- updated_at

Profiles:
- address (foreign key to users)
- username
- bio
- avatar
- is_mentor
- skills (JSON)
- hourly_rate
- currency
- availability (JSON)
- rating
- total_sessions
- created_at
- updated_at

Mentorships:
- id (primary key)
- mentor_address (foreign key)
- title
- description
- category
- skills (JSON)
- duration
- price
- currency
- max_students
- is_active
- created_at
- updated_at

Sessions:
- id (primary key)
- mentorship_id (foreign key)
- mentor_address (foreign key)
- student_address (foreign key)
- scheduled_at
- duration
- price
- currency
- status
- transaction_hash
- room_id
- feedback (JSON)
- created_at
- updated_at

Earnings:
- id (primary key)
- session_id (foreign key)
- address (foreign key)
- amount
- currency
- platform_fee
- net_amount
- status
- transaction_hash
- earned_at
*/