# EDPOS System

## Overview

This is a modern Point of Sale (POS) system built for retail businesses. The application features a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence and Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with persistent data storage
- **Session Management**: PostgreSQL-based session storage
- **Data Storage**: Migrated from in-memory to PostgreSQL database

### Development Environment
- **Monorepo Structure**: Shared schema and types between frontend and backend
- **Hot Reload**: Vite dev server with HMR for frontend development
- **Development Server**: tsx for TypeScript execution in development

## Key Components

### Database Schema (shared/schema.ts)
- **Categories**: Product categorization with icons
- **Products**: Inventory items with SKU, pricing, stock tracking
- **Transactions**: Sales records with payment details
- **Transaction Items**: Line items for each transaction
- **Employees**: Staff information with roles and contact details
- **Attendance Records**: Employee clock-in/out, break times, and overtime tracking

### Frontend Components
- **POS Interface**: Main point-of-sale interface with product grid and shopping cart
- **Product Management**: Modal for adding/editing products
- **Receipt System**: Print-ready receipt generation
- **Category Navigation**: Sidebar for product filtering
- **Employee Management**: CRUD operations for staff management with role-based access
- **Attendance Management**: Time tracking with clock-in/out, break management, and statistics

### Backend Services
- **Storage Layer**: Abstract storage interface with PostgreSQL database implementation
- **API Routes**: RESTful endpoints for products, categories, transactions, employees, and attendance
- **Data Validation**: Zod schemas for request/response validation
- **Database Relations**: Proper foreign key relationships between entities
- **Time Tracking**: Automated calculation of work hours, overtime, and break time

## Data Flow

1. **Product Display**: Frontend fetches products and categories from backend API
2. **Cart Management**: Local state management for shopping cart with real-time updates
3. **Transaction Processing**: Cart items sent to backend for transaction creation
4. **Inventory Updates**: Stock levels automatically updated on successful transactions
5. **Receipt Generation**: Transaction data formatted for receipt display and printing

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for Neon
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing solution
- **date-fns**: Date manipulation utilities

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant API for components
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution for development
- **drizzle-kit**: Database migration and introspection tools

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Setup**: Drizzle migrations applied to PostgreSQL instance

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)
- **REPL_ID**: Replit-specific environment detection

### Production Deployment
- Built application served as static files with Express
- Database migrations run via `drizzle-kit push`
- Session storage uses PostgreSQL with connect-pg-simple

### Development Features
- **Replit Integration**: Cartographer plugin for enhanced development experience
- **Error Overlay**: Runtime error modal for development debugging
- **Hot Module Replacement**: Instant updates during development

The architecture supports both development flexibility and production scalability, with clear separation between frontend and backend concerns while maintaining type safety across the entire stack.