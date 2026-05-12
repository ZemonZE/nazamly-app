# Nazamly Frontend

React + Vite frontend application for the Nazamly platform.

## Features
- Student authentication (Firebase)
- Course materials management
- AI-powered question generation
- Coding problems and submissions
- GPA calculator and planner
- Schedule generator

## Tech Stack
- React 19
- Vite
- Firebase Authentication
- Tailwind CSS
- Radix UI Components
- React Router

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Environment Variables

Create a `.env` file:
```
VITE_API_URL=http://localhost:5000
```

For production, the `.env.production` file is used.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Connect your GitHub repo to Vercel
2. Add environment variable: `VITE_API_URL` with your backend URL
3. Deploy

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── services/       # API service layers
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
└── firebase.js     # Firebase configuration
```

## License

Private
