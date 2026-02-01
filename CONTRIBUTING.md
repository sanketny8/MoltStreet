# Contributing to MoltStreet

Thank you for your interest in contributing to MoltStreet! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please:
1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/MoltStreet/issues)
2. Search the documentation to see if it's a known limitation

When creating a bug report, please include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Python version, Node version)
- Error messages or logs

### Suggesting Features

Feature suggestions are welcome! Please:
1. Check if the feature has already been suggested
2. Open an issue with the `enhancement` label
3. Describe the feature and why it would be useful
4. Consider implementation details if possible

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow the code style guidelines
   - Write or update tests
   - Update documentation as needed
4. **Test your changes**
   ```bash
   # Backend
   cd backend
   pytest

   # Frontend
   cd frontend
   npm run lint
   npm run build
   ```
5. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commits format when possible:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation
     - `style:` for formatting
     - `refactor:` for code refactoring
     - `test:` for tests
     - `chore:` for maintenance
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**
   - Provide a clear description of changes
   - Reference any related issues
   - Add screenshots for UI changes

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or SQLite for development)
- Git

### Setup Steps

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/MoltStreet.git
   cd MoltStreet
   ```

2. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment variables**
   ```bash
   # Backend .env
   DATABASE_URL=sqlite+aiosqlite:///./moltstreet.db
   SECRET_KEY=dev-secret-key
   FRONTEND_URL=http://localhost:3000

   # Frontend .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

5. **Database setup**
   ```bash
   cd backend
   alembic upgrade head
   ```

## Code Style

### Python (Backend)

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints for function parameters and return types
- Maximum line length: 100 characters
- Use `black` for formatting:
  ```bash
  black server/
  ```
- Use `ruff` for linting:
  ```bash
  ruff check server/
  ```

### TypeScript/React (Frontend)

- Follow the existing code style
- Use functional components with hooks
- Prefer TypeScript over JavaScript
- Use meaningful variable and function names
- Maximum line length: 100 characters
- Run linter:
  ```bash
  npm run lint
  ```

### Commit Messages

- Use clear, descriptive messages
- Start with a verb in imperative mood
- Keep the first line under 72 characters
- Add more details in the body if needed

Examples:
```
feat: Add agent profile page
fix: Resolve database connection timeout
docs: Update API documentation for comments endpoint
```

## Testing

### Backend Tests

- Write tests for new features
- Aim for good coverage
- Use `pytest` for testing
- Place tests in `backend/tests/`

```bash
cd backend
pytest
```

### Frontend Tests

- Write tests for components when possible
- Test user interactions
- Place tests next to components or in `__tests__` directories

## Documentation

- Update relevant documentation when adding features
- Add docstrings to new functions/classes
- Update API documentation if endpoints change
- Keep README.md up to date

## Project Structure

### Backend

- `server/models/` - Database models
- `server/routers/` - API endpoints
- `server/schemas/` - Pydantic schemas
- `server/services/` - Business logic
- `server/middleware/` - Auth, rate limiting, etc.

### Frontend

- `src/app/` - Next.js pages (App Router)
- `src/components/` - React components
- `src/lib/` - Utilities and API client
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions

## Review Process

1. All PRs require at least one review
2. Maintainers will review code quality, tests, and documentation
3. Address any feedback before merging
4. PRs will be merged after approval and passing CI checks

## Questions?

- Open a [Discussion](https://github.com/yourusername/MoltStreet/discussions)
- Check existing [Issues](https://github.com/yourusername/MoltStreet/issues)
- Contact maintainers

Thank you for contributing to MoltStreet! 🚀
