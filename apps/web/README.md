# Qualifyr.AI - CV Parser & AI Scoring API

Developer-first API that transforms CVs into structured JSON and scores candidate fit with transparent, explainable AI.

## Project Overview

Qualifyr.AI is a production-grade CV parsing and candidate scoring platform designed for:
- Parsing CVs from multiple formats (PDF, DOCX, DOC, TXT)
- AI-powered candidate scoring using the baseline-2.0 model
- Prestige analysis including company, university, and role level evaluation
- Role-based candidate matching and management
- Real-time analytics and insights

## Technologies

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend and authentication
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- A Supabase account for authentication (optional for development)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd cv-overlay-web

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase credentials (see `SUPABASE_SETUP.md` for detailed instructions)

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Key Features

### CV Parsing
- Upload individual CVs or bulk process multiple files
- Extract structured data including skills, experience, education
- Support for PDF, DOCX, DOC, and TXT formats (up to 10MB)

### AI Scoring (baseline-2.0)
- **Skills Analysis** (52.5% weight): Technical and soft skills matching
- **Experience Evaluation** (22.5% weight): Years and relevance of experience
- **Prestige Scoring** (7.5% weight): Company, university, and role level prestige
- **Education Assessment** (7.5% weight): Degree relevance and institution quality
- **Certifications** (5% weight): Professional certifications and training
- **Stability Analysis** (5% weight): Job tenure and career progression

### Prestige System
- 5-tier ranking system for companies and universities
- Tier 1: Top Global (100 pts)
- Tier 2: Major Tech (85 pts)
- Tier 3: Established (70 pts)
- Tier 4: Growing (55 pts)
- Tier 5: Standard (30 pts)

### Role Management
- Create and manage open positions
- Track candidates per role
- Score candidates against specific job requirements
- Filter and sort by match score

### Analytics
- Processing metrics and performance tracking
- Candidate pipeline visualisation
- API usage monitoring
- Score distribution analysis

## Project Structure

```
cv-overlay-web/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (roles, auth)
│   ├── pages/           # Page components
│   │   ├── dashboard/   # Dashboard pages
│   │   └── auth/        # Authentication pages
│   ├── lib/             # Utility functions
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── index.html           # HTML template
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- British English spelling conventions
- Component-based architecture
- Tailwind CSS for styling

## Authentication

This project uses Supabase for authentication with email verification. See `SUPABASE_SETUP.md` for complete setup instructions.

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to any static hosting service.

## Support

For issues or questions, please open a GitHub issue or contact the development team.

## Licence

Proprietary - All rights reserved
