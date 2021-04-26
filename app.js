const express = require('express')
const app = express()
const mustacheExpress = require('mustache-express')
const pgp = require('pg-promise')()
const cors = require('cors')
const bcrypt = require('bcrypt')
const session = require('express-session')
const path = require('path')

const PORT = 3000
const CONN_STRING = "groves://localhost:5432/newsdb"
const SALT_ROUNDS = 10

const VIEWS_PATH = path.join(__dirname, '/views')

// configuring view engine
app.engine('mustache',mustacheExpress(VIEWS_PATH + '/partials', '.mustache'))
app.set('views',VIEWS_PATH)
app.set('view engine','mustache')

app.use(cors())
app.use(express.urlencoded({extended: false}))
app.use(session({
    secret: 'asiaffdkfj1',
    resave: false,
    saveUninitialized: false
}))

const db = pgp(CONN_STRING)

app.get('/users/add-article',(req,res) => {
    res.render('add-article')
})

app.post('/users/add-article', (req, res) => {

    let title = req.body.title
    let description = req.body.description
    let userid = req.session.user.userid

    db.none('INSERT INTO articles(title,body,userid) VALUES($1,$2,$3)', [title,description,userid])
    .then(() => {
        res.render('articles')
    })
})

app.get('/users/articles', (req, res) => {
    res.render('articles', {username: req.session.user.username})
})

app.post('/login',(req,res) => {
    let username = req.body.username
    let password = req.body.password

    db.oneOrNone('SELECT userid,username,password FROM users WHERE username = $1',[username])
    .then((user) => {
        if(user) {
            bcrypt.compare(password,user.password,function(error,result) {
                if(result) {

                    // put username and userid in the session
                    if(req.session) {
                        req.session.user = {
                            userid: user.userid, username: user.username
                        }
                    }

                    res.redirect('/users/articles')
                } else {
                    res.render('login', {message: "Invalid username or password"})
                }
            })
        } else {
            res.render('login', {message: "Invalid username or password"})
        }
    })
})

app.get('/login',(req,res) => {
    res.render('login')
})

app.post('/register', (req,res) => {
    let username = req.body.username
    let password = req.body.password

    db.oneOrNone('SELECT userid FROM users WHERE username = $1', [username])
    .then((user) => {
        console.log(res.getHeaders())
        if(user) {
            res.render('register',{message: "Username already exists!"})
        } else {
            //insert new user into table, hash password
            bcrypt.hash(password,SALT_ROUNDS, function(error,hash) {
                if(error == null){
                    db.none('INSERT INTO users(username,password) VALUES($1,$2)', [username,hash])
                    .then(() => {
                        // (node:99473) UnhandledPromiseRejectionWarning: Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
                        res.send('SUCCESSFUL INSERT')
                    }).catch(
                        res.render('register',{message: 'uh-oh'})
                    )
                }
            })
        }
    })
})

app.get('/register', (req,res) => {
    res.render('register')
})

app.listen(PORT, (req, res) => {
    console.log(`server is running on port ${PORT}...`)
})