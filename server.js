const express = require('express')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const app = express()
const port = 3000

app.use(express.json())
app.use(cookieParser())

const secretKey = 'mysecretkey123'

const db = new sqlite3.Database('./carpool.db', (err) => {
  if (err) console.log(err.message)
  else {
    console.log('db ok')
    setupTables()
  }
})

function setupTables() {
  db.run('CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )')
  db.run('CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    from_place TEXT,
    to_place TEXT,
    seats INTEGER,
    price REAL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )')
  console.log('tables ok')
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token
  if (!token) return res.status(401).json({error:'no token'})
  try {
    const decoded = jwt.verify(token, secretKey)
    req.user = decoded
    next()
  } catch(e) {
    res.status(403).json({error:'bad token'})
  }
}

app.post('/signup', async (req, res) => {
  const {username, email, password} = req.body
  if (!username || !email || !password) {
    return res.status(400).json({error:'missing'})
  }

  const hashed = await bcrypt.hash(password, 10)

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({error:'db error'})
    if (row) return res.status(400).json({error:'username exists'})

    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashed], function(err) {
      if (err) return res.status(500).json({error:'insert error'})
      res.status(201).json({message:'user created', id:this.lastID})
    })
  })
})

app.post('/login', async (req, res) => {
  const {username, password} = req.body
  if (!username || !password) return res.status(400).json({error:'need both'})

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({error:'wrong'})

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({error:'wrong'})

    const token = jwt.sign({userId:user.id, username:user.username}, secretKey, {expiresIn:'1h'})

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 3600000
    })

    res.json({message:'ok', user:{id:user.id, username:user.username}})
  })
})

app.post('/rides', authMiddleware, (req, res) => {
  const userId = req.user.userId
  const {from, to, seats, price} = req.body

  if (!from || !to) return res.status(400).json({error:'need from and to'})

  db.run('INSERT INTO rides (user_id, from_place, to_place, seats, price) VALUES (?, ?, ?, ?, ?)',
  [userId, from, to, seats || 1, price || 0], function(err) {
    if (err) return res.status(500).json({error:'save failed'})
    res.json({message:'ride created', rideId:this.lastID})
  })
})

app.get('/rides/search', (req, res) => {
  const {from, to} = req.query

  let query = 'SELECT * FROM rides WHERE 1=1'
  let params = []

  if (from) {
    query += ' AND from_place LIKE ?'
    params.push('%' + from + '%')
  }
  if (to) {
    query += ' AND to_place LIKE ?'
    params.push('%' + to + '%')
  }

  db.all(query, params, (err, rides) => {
    if (err) return res.status(500).json({error:'search failed'})
    res.json({rides:rides, count:rides.length})
  })
})

app.get('/profile', authMiddleware, (req, res) => {
  const userId = req.user.userId
  db.get('SELECT id, username, email, created FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({error:'not found'})
    res.json({user:user})
  })
})

app.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({message:'logged out'})
})

app.listen(port, () => {
  console.log('server on http://localhost:${port}')
})
