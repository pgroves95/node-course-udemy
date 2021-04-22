const express = require('express')
const app = express()
const mustacheExpress = require('mustache-express')
const pgp = require('pg-promise')()
const cors = require('cors')
const bcrypt = require('bcrypt')
const session = require('express-session')

const PORT = 3000
const CONN_STRING = "groves://localhost:5432/newsdb"
const SALT_ROUNDS = 10

// configuring view engine
app.engine('mustache',mustacheExpress())
app.set('views','./views')
app.set('view engine','mustache')

app.use(cors())
app.use(express.urlencoded({extended: false}))
app.use(session({
    secret: 'asiaffdkfj1',
    resave: false,
    saveUninitialized: false
}))

const db = pgp(CONN_STRING)

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

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}...`)
})