# CarpoolMile4
# Carpool App - Milestone 4

## What This Is
Backend server for my carpool app coursework. Made with Node.js and 
SQLite.

## What It Does
1. Lets users sign up and log in
2. Stores passwords safely with bcrypt
3. Uses JWT tokens and secure cookies
4. Drivers can post rides
5. Passengers can search for rides

## How to Run
1. Install Node.js
2. Run: `npm install`
3. Run: `node server.js`
4. Server starts on: http://localhost:3000

## Test It
```bash
# Sign up
curl -X POST http://localhost:3000/signup -d 
'{"username":"test","password":"test","email":"test@test.com"}'

# Log in

curl -X POST http://localhost:3000/login -d 
'{"username":"test","password":"test"}'

