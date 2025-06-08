# Discord Master

A modern Discord bot management and monitoring platform built with TypeScript, React, and Express.

## Features

- Discord bot integration with advanced command management
- Real-time monitoring and analytics
- Modern web interface built with React and Tailwind CSS
- Secure authentication system
- Database integration with PostgreSQL
- WebSocket support for real-time updates

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Radix UI Components
- React Query
- Wouter for routing
- Framer Motion for animations

### Backend
- Express.js
- TypeScript
- PostgreSQL with Drizzle ORM
- WebSocket support
- Passport.js for authentication
- Discord.js for bot integration

## Prerequisites

- Node.js (Latest LTS version recommended)
- PostgreSQL database
- Discord Bot Token
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd discord-master
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=your_postgresql_connection_string
DISCORD_BOT_TOKEN=your_discord_bot_token
SESSION_SECRET=your_session_secret
```

4. Set up the database:
```bash
npm run db:push
```

## Development

To start the development server:

```bash
npm run dev
```

This will start both the frontend and backend servers in development mode.

## Building for Production

To build the project for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Docker Deployment

The project includes Docker support. To run using Docker:

```bash
docker-compose up
```

## Project Structure

```
├── client/           # Frontend React application
├── server/           # Backend Express application
│   ├── api/         # API routes and controllers
│   ├── db/          # Database models and migrations
│   ├── features/    # Feature-specific modules
│   └── utils/       # Utility functions
├── shared/          # Shared types and utilities
└── dist/            # Production build output
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 