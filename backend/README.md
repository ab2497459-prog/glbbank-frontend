# GLB Bank Backend

A full Node.js, Express.js, and MongoDB backend for the GLB Bank frontend project.

## Features
- User registration and login
- JWT authentication
- Protected profile route
- Account creation
- Transfer, deposit, and withdrawal transactions

## Run
npm install
npm run dev

## API Overview
- POST /api/auth/register
- POST /api/auth/login
- GET /api/profile
- GET /api/accounts
- POST /api/accounts
- GET /api/transactions
- POST /api/transactions/transfer
- POST /api/transactions/deposit
- POST /api/transactions/withdraw

## Setup
1. Install dependencies: npm install
2. Start MongoDB locally
3. Run the server: npm run dev

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users
- POST /api/accounts
- GET /api/accounts
- POST /api/transactions
- GET /api/transactions
