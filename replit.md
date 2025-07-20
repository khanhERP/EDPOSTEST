# EDPOS System

## Overview

This is a comprehensive restaurant management system (EDPOS) built for table-based dining operations. The application features a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence and Drizzle ORM for database operations. The system focuses on table management, order processing, employee management, and attendance tracking specifically designed for restaurant operations.

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
- **Categories**: Product categorization with icons for menu organization
- **Products**: Menu items with SKU, pricing, stock tracking and descriptions
- **Tables**: Restaurant table management with capacity, status, and QR codes
- **Orders**: Table-based order system with customer info, status workflow, and payment tracking
- **Order Items**: Individual menu items within each order with quantities and special requests
- **Transactions**: Legacy POS sales records (maintained for compatibility)
- **Transaction Items**: Legacy line items (maintained for compatibility)
- **Employees**: Staff information with roles and contact details
- **Attendance Records**: Employee clock-in/out, break times, and overtime tracking

### Frontend Components
- **Table Grid**: Visual table layout showing real-time status and occupancy
- **Order Dialog**: Complete ordering interface with menu selection and cart management
- **Order Management**: Kitchen and service staff order tracking with status updates
- **Table Management**: Administrative interface for adding/editing tables
- **POS Interface**: Legacy point-of-sale interface (maintained for compatibility)
- **Product Management**: Menu item administration with categories and pricing
- **Receipt System**: Print-ready receipt generation
- **Employee Management**: CRUD operations for staff management with role-based access
- **Attendance Management**: Time tracking with clock-in/out, break management, and statistics

### Backend Services
- **Storage Layer**: Abstract storage interface with PostgreSQL database implementation
- **API Routes**: RESTful endpoints for tables, orders, products, categories, employees, and attendance
- **Order Workflow**: Automated status transitions and table management
- **Data Validation**: Zod schemas for request/response validation with restaurant-specific rules
- **Database Relations**: Proper foreign key relationships between tables, orders, products, and employees
- **Time Tracking**: Automated calculation of work hours, overtime, and break time
- **Table Status Management**: Real-time table availability and reservation system

## Data Flow

1. **Table Selection**: Staff selects available table from visual grid interface
2. **Order Creation**: Menu items added to cart with special requests and customer information
3. **Order Processing**: Order submitted with automatic table status update to "occupied"
4. **Kitchen Workflow**: Orders progress through status stages (pending → confirmed → preparing → ready → served)
5. **Payment Processing**: Orders marked as paid with automatic table status reset to "available"
6. **Inventory Updates**: Stock levels automatically updated on successful orders
7. **Employee Tracking**: Staff clock-in/out with automatic work hour calculations

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