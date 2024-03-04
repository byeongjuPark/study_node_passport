const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const Localstrategy = require('passport-local').Strategy;

const app = express();

app.set('port', process.env.PORT||8080);

// 가상 데이터
let fakeUser = {
    username: 'abc123',
    password: 'asdasd'
}

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser('passportExample'));
app.use(session({
    resave:false,
    saveUninitialized: false,
    secret:'passportExample',
    cookie:{
        httpOnly:true,
        secure:false
    }
}));

app.use(passport.initialize());     // passport 초기화
app.use(passport.session());        // passport session 연동 - req.session에 passport 관련 정보를 저장

// passport는 세션을 내부적으로 사용 - 세션을 활성화 후 사용

// 세션처리 - serializeUser / 로그인 성공 후 1회 호출 / 사용자의 식별자를 session에 저장
passport.serializeUser(function(user, done){
    console.log('serializerUser', user);
    done(null, user.username); 
});

// 세션처리 - deserializeUser / 로그인 후 페이지 방문마다 실제 데이터 주입
passport.deserializeUser(function(id, done){
    console.log('deserializeUser');
    done(null, fakeUser);   //done() - req.user에 전달
});

// done의 첫 번째 인자는 오류 여부, 두 번째 인자는 결과 값, 세 번째 인자는 실패 했을 경우에 작성

passport.use(new Localstrategy(
    function(username, password, done){
        if(username === fakeUser.username){
            if(password === fakeUser.password){
                return done(null, fakeUser);
            }else{
                return done(null, false, {message: "password incorrect"});
            }
        }else{
            return done(null, false, {message:"username incorrect"});
        }
    }
));


// routing
app.get('/', (req, res)=>{
    if(!req.user){ // 로그인 X
        res.sendFile(__dirname + '/index.html');
    } else { // 로그인 O
        const user = req.user.username;
        const html = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
        </head>
        <body>
            <p>${user}님 안녕하세요!</p>
            <button type="button" onclick="location.href='/logout'">
            Log Out </button>
        </body>
        </html>
        `
        res.send(html);
    }
});

// passport Login : strategy-Local
// Autenticate Requsets
app.post('/login',
    passport.authenticate('local', {failureRedirect:'/'}),
    function(req, res){
        res.send('Login success..!');
    });


/* 버전으로 인해 사용법 변경
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });
*/
app.get('/logout', function (req, res) {
    req.logout(function(err){
        if(err){return next(err);}
        res.redirect('/');
    });
});

// 404 error process
app.use((req, res, next) =>{
    const error = new Error(`${req.method} ${req.url} 해당 주소가 없습니다.`);
    error.status = 404;
    next(error);
});

// error process MW
app.use((err, req, res, next) =>{
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'development' ? err : {};
    res.status(err.status || 500);
    res.send('error Occurred');
});

// connecting server
app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 서버 실행 중 ..');
})