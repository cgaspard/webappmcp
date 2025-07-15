# Contributing to WebApp MCP Server

First off, thank you for considering contributing to WebApp MCP Server! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed and what you expected
- Include screenshots if relevant
- Include your environment details (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed enhancement
- Provide specific examples to demonstrate how it would work
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes (`npm test`)
4. Make sure your code lints (`npm run lint`)
5. Update documentation as needed
6. Issue the pull request

## Development Process

1. **Setup your environment**:
   ```bash
   git clone https://github.com/cgaspard/webappmcp.git
   cd webappmcp
   npm install
   npm run build
   ```

2. **Make your changes**:
   - Write your code following the existing style
   - Add tests for new functionality
   - Update documentation

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

4. **Run the example**:
   ```bash
   cd examples/todos
   npm start
   ```

## Project Structure

```
webappmcp/
├── packages/
│   ├── server/       # MCP server implementation
│   ├── middleware/   # Express middleware
│   └── client/       # Browser client library
├── examples/         # Example applications
└── docs/            # Documentation
```

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write tests for new features

## Testing

- Unit tests use Jest
- Integration tests test the full stack
- Test files should be colocated with source files
- Aim for good test coverage of critical paths

## Documentation

- Update README.md if you change functionality
- Update CLAUDE.md for AI-specific features
- Add JSDoc comments for new functions
- Include examples in documentation

## Commit Messages

- Use clear and meaningful commit messages
- Start with a verb in present tense ("Add", "Fix", "Update")
- Keep the first line under 72 characters
- Reference issues and pull requests when relevant

Example:
```
Add support for custom DOM selectors

- Implement wildcard selector support
- Add tests for new selector patterns
- Update documentation with examples

Fixes #123
```

## Questions?

Feel free to open an issue with your question or reach out in discussions.

Thank you for contributing! 🎉